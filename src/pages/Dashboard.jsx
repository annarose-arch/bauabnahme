import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";

const COLORS = {
  bg: "#0a0a0a",
  panel: "#141414",
  card: "#1a1a1a",
  text: "#f0ece4",
  muted: "#b9b0a3",
  gold: "#d4a853",
  border: "rgba(212,168,83,0.25)"
};

const STATUS_COLORS = {
  offen: "#d4a853",
  bearbeitet: "#4b7bec",
  gesendet: "#d4a853",
  archiviert: "#80c783",
  geloescht: "#8b8b8b"
};

const STATUS_OPTIONS = ["offen", "bearbeitet", "gesendet", "archiviert"];
const LANGUAGE_OPTIONS = ["DE", "FR", "IT", "EN"];

const inputStyle = {
  minHeight: 40,
  borderRadius: 8,
  border: `1px solid ${COLORS.border}`,
  background: "#111",
  color: COLORS.text,
  padding: "0 10px"
};

const primaryBtn = {
  minHeight: 38,
  borderRadius: 8,
  border: "none",
  background: COLORS.gold,
  color: "#111",
  fontWeight: 700,
  cursor: "pointer",
  padding: "0 12px"
};

function toNumber(value) {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function calcHours(from, to) {
  if (!from || !to) return 0;
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  const s = fh * 60 + fm;
  const e = th * 60 + tm;
  if (e <= s) return 0;
  return Math.round((((e - s) / 60) + Number.EPSILON) * 100) / 100;
}

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (_e) {
    return fallback;
  }
}

function parseReport(report) {
  return parseJson(report?.description, {});
}

function parseCustomerMeta(customer) {
  return parseJson(customer?.address, {});
}

export default function Dashboard({ session, onLogout, onNavigate }) {
  const userId = session?.user?.id;
  const userEmail = session?.user?.email || "";

  const [view, setView] = useState("home");
  const [reports, setReports] = useState([]);
  const [trashReports, setTrashReports] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [openedReport, setOpenedReport] = useState(null);
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState(null);

  const [language, setLanguage] = useState(
    () => localStorage.getItem("bauabnahme_language_pref") || "DE"
  );
  const [showUpgrade, setShowUpgrade] = useState(false);

  const [customerForm, setCustomerForm] = useState({
    company: "",
    firstName: "",
    lastName: "",
    address: "",
    zip: "",
    city: "",
    phone: "",
    email: "",
    costCenter: "",
    projectName: "",
    projectNumber: ""
  });

  const [reportForm, setReportForm] = useState({
    selectedCustomerId: "",
    selectedProjectId: "",
    customer: "",
    address: "",
    orderNo: "",
    customerEmail: "",
    date: new Date().toISOString().slice(0, 10),
    status: "offen",
    expenses: "",
    notes: "",
    beforePhoto: "",
    afterPhoto: "",
    signerName: "",
    signatureImage: ""
  });

  const [workRows, setWorkRows] = useState([{ employee: "", from: "", to: "", rate: "" }]);
  const [materialRows, setMaterialRows] = useState([{ name: "", qty: "", unit: "", price: "" }]);

  const customerProjects = useMemo(
    () => projects.filter((p) => String(p.customer_id) === String(reportForm.selectedCustomerId)),
    [projects, reportForm.selectedCustomerId]
  );

  const workSubtotal = useMemo(
    () =>
      workRows.reduce((sum, row) => {
        const h = calcHours(row.from, row.to);
        return sum + h * toNumber(row.rate);
      }, 0),
    [workRows]
  );
  const materialSubtotal = useMemo(
    () => materialRows.reduce((sum, row) => sum + toNumber(row.qty) * toNumber(row.price), 0),
    [materialRows]
  );
  const expenses = toNumber(reportForm.expenses);
  const subtotal = workSubtotal + materialSubtotal + expenses;
  const vat = subtotal * 0.081;
  const total = subtotal + vat;

  const openReports = reports.filter((r) => (r.status || "").toLowerCase() === "offen").length;

  const fetchCustomers = async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("user_id", userId)
      .order("id", { ascending: false });
    if (error) {
      setCustomers([]);
      return;
    }
    setCustomers(data || []);
  };

  const fetchProjects = async (customerList = null) => {
    const list = customerList || customers;
    if (!list.length) {
      setProjects([]);
      return;
    }
    const ids = list.map((c) => c.id);
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .in("customer_id", ids)
      .order("created_at", { ascending: false });
    if (error) {
      setProjects([]);
      return;
    }
    setProjects(data || []);
  };

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .neq("status", "geloescht")
      .order("created_at", { ascending: false });
    if (error) {
      setReports([]);
      return;
    }
    setReports(data || []);
  };

  const fetchTrash = async () => {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("status", "geloescht");
    if (error) {
      setTrashReports([]);
      return;
    }
    setTrashReports(data || []);
  };

  useEffect(() => {
    localStorage.setItem("bauabnahme_language_pref", language);
  }, [language]);

  useEffect(() => {
    if (!userId) {
      setCustomers([]);
      setProjects([]);
      setReports([]);
      setTrashReports([]);
      return;
    }
    const load = async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", userId)
        .order("id", { ascending: false });
      if (!error) {
        setCustomers(data || []);
        await fetchProjects(data || []);
      }
      await fetchReports();
    };
    load();
  }, [userId]);

  useEffect(() => {
    if (view === "reports") {
      setLoading(true);
      fetchReports().finally(() => setLoading(false));
    }
  }, [view]);

  useEffect(() => {
    if (view === "trash") {
      setLoading(true);
      fetchTrash().finally(() => setLoading(false));
    }
  }, [view]);

  const handleAddCustomer = async () => {
    if (!userId || !customerForm.company.trim()) {
      setNotice("Firmenname fehlt.");
      return;
    }

    const kundennummer = `K-${String(customers.length + 1).padStart(3, "0")}`;
    const meta = {
      kundennummer,
      costCenter: customerForm.costCenter.trim(),
      firstName: customerForm.firstName.trim(),
      lastName: customerForm.lastName.trim(),
      address: customerForm.address.trim(),
      zip: customerForm.zip.trim(),
      city: customerForm.city.trim()
    };

    const { data, error } = await supabase
      .from("customers")
      .insert({
        user_id: userId,
        name: customerForm.company.trim(),
        address: JSON.stringify(meta),
        phone: customerForm.phone.trim(),
        email: customerForm.email.trim()
      })
      .select("*")
      .single();

    if (error) {
      setNotice("Kunde konnte nicht gespeichert werden.");
      return;
    }

    setCustomers((prev) => [data, ...prev]);
    setNotice("Kunde gespeichert.");

    if (customerForm.projectName.trim()) {
      const { data: projectData } = await supabase
        .from("projects")
        .insert({
          customer_id: data.id,
          name: customerForm.projectName.trim(),
          projektnummer: customerForm.projectNumber.trim()
        })
        .select("*")
        .single();
      if (projectData) setProjects((prev) => [projectData, ...prev]);
    }

    setCustomerForm({
      company: "",
      firstName: "",
      lastName: "",
      address: "",
      zip: "",
      city: "",
      phone: "",
      email: "",
      costCenter: "",
      projectName: "",
      projectNumber: ""
    });
  };

  const handleAddProject = async (customerId, name, projectNo) => {
    if (!name.trim()) return;
    const { data, error } = await supabase
      .from("projects")
      .insert({
        customer_id: customerId,
        name: name.trim(),
        projektnummer: projectNo.trim()
      })
      .select("*")
      .single();
    if (error) {
      setNotice("Projekt konnte nicht gespeichert werden.");
      return;
    }
    setProjects((prev) => [data, ...prev]);
    setNotice("Projekt hinzugefügt.");
  };

  const handleDeleteCustomer = async (customer) => {
    const ok = window.confirm("Kunde löschen?");
    if (!ok) return;
    const { error } = await supabase.from("customers").delete().eq("id", customer.id);
    if (error) {
      setNotice("Kunde konnte nicht gelöscht werden.");
      return;
    }
    setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
    setProjects((prev) => prev.filter((p) => p.customer_id !== customer.id));
    if (selectedCustomerDetail?.id === customer.id) setSelectedCustomerDetail(null);
  };

  const handleCustomerSelectInReport = (customerId) => {
    const customer = customers.find((c) => String(c.id) === String(customerId));
    if (!customer) return;
    const meta = parseCustomerMeta(customer);
    setReportForm((prev) => ({
      ...prev,
      selectedCustomerId: String(customer.id),
      selectedProjectId: "",
      customer: customer.name || "",
      customerEmail: customer.email || "",
      address: meta.address || ""
    }));
  };

  const handleProjectSelectInReport = (projectId) => {
    setReportForm((prev) => ({ ...prev, selectedProjectId: String(projectId) }));
  };

  const handleSaveReport = async () => {
    if (!userId || !reportForm.customer.trim()) {
      setNotice("Kundenname fehlt.");
      return;
    }

    const selectedProject = customerProjects.find((p) => String(p.id) === String(reportForm.selectedProjectId));

    const payload = {
      customer: reportForm.customer.trim(),
      customerEmail: reportForm.customerEmail.trim(),
      address: reportForm.address.trim(),
      orderNo: reportForm.orderNo.trim(),
      date: reportForm.date,
      status: reportForm.status,
      customerId: reportForm.selectedCustomerId || null,
      projectId: reportForm.selectedProjectId || null,
      projectName: selectedProject?.name || "",
      projektnummer: selectedProject?.projektnummer || "",
      photos: {
        before: reportForm.beforePhoto,
        after: reportForm.afterPhoto
      },
      workRows: workRows.map((row) => ({
        ...row,
        hours: calcHours(row.from, row.to),
        total: calcHours(row.from, row.to) * toNumber(row.rate)
      })),
      materialRows: materialRows.map((row) => ({
        ...row,
        total: toNumber(row.qty) * toNumber(row.price)
      })),
      costs: {
        expenses,
        notes: reportForm.notes
      },
      totals: {
        subtotal,
        vat,
        total
      },
      signature: {
        name: reportForm.signerName,
        image: reportForm.signatureImage
      }
    };

    const { error } = await supabase.from("reports").insert({
      user_id: userId,
      customer: reportForm.customer.trim(),
      date: reportForm.date,
      status: reportForm.status,
      description: JSON.stringify(payload)
    });

    if (error) {
      setNotice("Rapport konnte nicht gespeichert werden.");
      return;
    }

    await fetchReports();
    setView("reports");
    setNotice("Rapport gespeichert.");
  };

  const handleMoveToTrash = async (report) => {
    const ok = window.confirm("Sicher löschen?");
    if (!ok) return;
    const { error } = await supabase.from("reports").update({ status: "geloescht" }).eq("id", report.id);
    if (error) {
      setNotice("Konnte nicht in Papierkorb verschieben.");
      return;
    }
    setReports((prev) => prev.filter((r) => r.id !== report.id));
    setTrashReports((prev) => [{ ...report, status: "geloescht" }, ...prev.filter((r) => r.id !== report.id)]);
    if (openedReport?.id === report.id) setOpenedReport(null);
  };

  const handleRestore = async (report) => {
    const { error } = await supabase.from("reports").update({ status: "offen" }).eq("id", report.id);
    if (error) {
      setNotice("Wiederherstellen fehlgeschlagen.");
      return;
    }
    setTrashReports((prev) => prev.filter((r) => r.id !== report.id));
    setReports((prev) => [{ ...report, status: "offen" }, ...prev.filter((r) => r.id !== report.id)]);
  };

  const handleHardDelete = async (report) => {
    const ok = window.confirm("Endgültig löschen?");
    if (!ok) return;
    const { error } = await supabase.from("reports").delete().eq("id", report.id);
    if (error) {
      setNotice("Endgültig löschen fehlgeschlagen.");
      return;
    }
    setTrashReports((prev) => prev.filter((r) => r.id !== report.id));
  };

  const handleUpdateReportStatus = async (reportId, status) => {
    const { error } = await supabase.from("reports").update({ status }).eq("id", reportId);
    if (error) {
      setNotice("Status konnte nicht geändert werden.");
      return;
    }
    setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status } : r)));
    setOpenedReport((prev) => (prev?.id === reportId ? { ...prev, status } : prev));
  };

  const openPdfEmailWindow = (report) => {
    const p = parseReport(report);
    const work = p.workRows || [];
    const material = p.materialRows || [];
    const totals = p.totals || {};
    const costs = p.costs || {};
    const photos = p.photos || {};
    const sig = p.signature || {};

    const customerName = report.customer || p.customer || "-";
    const customerEmail = p.customerEmail || "";
    const projectNo = p.projektnummer || "-";
    const subject = `BauAbnahme Rapport - ${customerName} - ${report.date || p.date || "-"}`;
    const body = [
      "BauAbnahme Rapport",
      "",
      `Kunde: ${customerName}`,
      `Datum: ${report.date || p.date || "-"}`,
      `Projektnummer: ${projectNo}`,
      `Zwischensumme CHF: ${Number(totals.subtotal || 0).toFixed(2)}`,
      `MwSt 8.1% CHF: ${Number(totals.vat || 0).toFixed(2)}`,
      `TOTAL CHF: ${Number(totals.total || 0).toFixed(2)}`
    ].join("\n");
    const mailto = `mailto:${encodeURIComponent(customerEmail)}?cc=${encodeURIComponent(userEmail)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    const win = window.open("", "_blank", "width=980,height=760");
    if (!win) return;

    const workRowsHtml = work
      .map((row, i) => `<tr><td>${i + 1}</td><td>${row.employee || "-"}</td><td>${row.from || "-"} - ${row.to || "-"}</td><td>${Number(row.hours || 0).toFixed(2)}</td><td>CHF ${Number(row.total || 0).toFixed(2)}</td></tr>`)
      .join("");
    const matRowsHtml = material
      .map((row, i) => `<tr><td>${i + 1}</td><td>${row.name || "-"}</td><td>${row.qty || 0} ${row.unit || ""}</td><td>CHF ${Number(row.total || 0).toFixed(2)}</td></tr>`)
      .join("");

    win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Rapport ${report.id}</title>
<style>
body { font-family: Arial, sans-serif; color: #222; margin: 24px; }
.top { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:16px; }
.brand { font-size:28px; font-weight:700; color:#d4a853; }
.btn { background:#d4a853; border:none; color:#111; padding:10px 14px; border-radius:8px; font-weight:700; text-decoration:none; }
.card { border:1px solid rgba(212,168,83,0.4); border-radius:10px; padding:12px; margin-bottom:12px; }
table { width:100%; border-collapse:collapse; margin-top:6px; }
th,td { border:1px solid #ddd; padding:6px 8px; font-size:13px; text-align:left; }
.total { color:#d4a853; font-size:24px; font-weight:800; text-align:right; }
.photos { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.photos img, .sig img { width:100%; max-height:220px; object-fit:cover; border:1px solid rgba(212,168,83,0.4); border-radius:8px; }
@media print { .actions { display:none; } }
</style>
</head>
<body>
  <div class="top">
    <div class="brand">BauAbnahme</div>
    <div class="actions">
      <button class="btn" onclick="window.print()">Drucken/Speichern als PDF</button>
      <a class="btn" href="${mailto}">Per E-Mail senden</a>
    </div>
  </div>
  <div class="card">
    <div><strong>Kunde:</strong> ${customerName}</div>
    <div><strong>Datum:</strong> ${report.date || p.date || "-"}</div>
    <div><strong>Auftrag-Nr:</strong> ${p.orderNo || "-"}</div>
    <div><strong>Projektnummer:</strong> ${projectNo}</div>
    <div><strong>Adresse:</strong> ${p.address || "-"}</div>
  </div>
  ${(photos.before || photos.after) ? `<div class="card"><h3>Fotos</h3><div class="photos"><div>${photos.before ? `<img src="${photos.before}" alt="Vorher" />` : "Kein Vorher Foto"}</div><div>${photos.after ? `<img src="${photos.after}" alt="Nachher" />` : "Kein Nachher Foto"}</div></div></div>` : ""}
  <div class="card"><h3>Arbeitsstunden</h3><table><thead><tr><th>#</th><th>Mitarbeiter</th><th>Zeit</th><th>Stunden</th><th>Total</th></tr></thead><tbody>${workRowsHtml || "<tr><td colspan='5'>Keine Daten</td></tr>"}</tbody></table></div>
  <div class="card"><h3>Material</h3><table><thead><tr><th>#</th><th>Bezeichnung</th><th>Menge</th><th>Total</th></tr></thead><tbody>${matRowsHtml || "<tr><td colspan='4'>Keine Daten</td></tr>"}</tbody></table></div>
  <div class="card">
    <div><strong>Spesen:</strong> CHF ${Number(costs.expenses || 0).toFixed(2)}</div>
    <div><strong>Notizen:</strong> ${costs.notes || "-"}</div>
    <div><strong>MwSt 8.1%:</strong> CHF ${Number(totals.vat || 0).toFixed(2)}</div>
    <div class="total">TOTAL CHF ${Number(totals.total || 0).toFixed(2)}</div>
  </div>
  ${sig.image ? `<div class="card sig"><h3>Unterschrift</h3><div>${sig.name || "-"}</div><img src="${sig.image}" alt="Unterschrift" /></div>` : ""}
</body>
</html>`);
    win.document.close();
  };

  const linkedReportsForCustomer = (customer) => reports.filter((r) => (r.customer || "") === (customer?.name || ""));
  const customerRevenue = (customer) =>
    linkedReportsForCustomer(customer).reduce((sum, r) => sum + toNumber(parseReport(r)?.totals?.total), 0);

  const renderStatus = (status) => (
    <span style={{ color: STATUS_COLORS[status] || COLORS.muted, fontWeight: 700 }}>{status || "-"}</span>
  );

  const renderCustomerDetail = () => {
    if (!selectedCustomerDetail) return null;
    const meta = parseCustomerMeta(selectedCustomerDetail);
    const linked = linkedReportsForCustomer(selectedCustomerDetail);
    const revenue = customerRevenue(selectedCustomerDetail);

    let projectName = "";
    let projectNo = "";

    return (
      <section style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 18 }}>
        <h2 style={{ marginTop: 0 }}>{selectedCustomerDetail.name}</h2>
        <div style={{ display: "grid", gap: 5, marginBottom: 12 }}>
          <div><strong>Kundennummer:</strong> {meta.kundennummer || "-"}</div>
          <div><strong>Kostenstelle:</strong> {meta.costCenter || "-"}</div>
          <div><strong>Ansprechperson:</strong> {[meta.firstName, meta.lastName].filter(Boolean).join(" ") || "-"}</div>
          <div><strong>Adresse:</strong> {meta.address || "-"}, {meta.zip || "-"} {meta.city || "-"}</div>
          <div><strong>Telefon:</strong> {selectedCustomerDetail.phone || "-"}</div>
          <div><strong>E-Mail:</strong> {selectedCustomerDetail.email || "-"}</div>
        </div>

        <h3 style={{ marginBottom: 8 }}>Projekte</h3>
        <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
          <input placeholder="Project name" value={projectName} onChange={(e) => { projectName = e.target.value; }} style={inputStyle} />
          <input placeholder="Projektnummer" value={projectNo} onChange={(e) => { projectNo = e.target.value; }} style={inputStyle} />
          <button
            type="button"
            onClick={(e) => {
              const parent = e.currentTarget.parentElement;
              const nameInput = parent.querySelector("input:nth-of-type(1)");
              const noInput = parent.querySelector("input:nth-of-type(2)");
              handleAddProject(selectedCustomerDetail.id, nameInput.value, noInput.value);
              nameInput.value = "";
              noInput.value = "";
            }}
            style={primaryBtn}
          >
            Projekt hinzufügen
          </button>
        </div>

        <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
          {projects
            .filter((p) => String(p.customer_id) === String(selectedCustomerDetail.id))
            .map((p) => (
              <div key={p.id} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 10px" }}>
                <strong>{p.name}</strong> · <span style={{ color: COLORS.muted }}>{p.projektnummer || "-"}</span>
              </div>
            ))}
        </div>

        <h3>Linked Rapports</h3>
        <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
          {linked.length === 0 ? <div style={{ color: COLORS.muted }}>Keine Rapporte.</div> : linked.map((r) => (
            <div key={r.id} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 10px", display: "flex", justifyContent: "space-between" }}>
              <span>R-{r.id} · {r.date || "-"}</span>
              <span>CHF {toNumber(parseReport(r)?.totals?.total).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div style={{ color: COLORS.gold, fontWeight: 800, fontSize: 22 }}>Gesamtumsatz CHF {revenue.toFixed(2)}</div>
        <div style={{ marginTop: 10 }}>
          <button type="button" onClick={() => setSelectedCustomerDetail(null)} style={{ ...primaryBtn, background: "#2a2a2a", color: COLORS.text }}>Zurück</button>
        </div>
      </section>
    );
  };

  const renderReportDetail = () => {
    if (!openedReport) return null;
    const p = parseReport(openedReport);
    const work = p.workRows || [];
    const material = p.materialRows || [];
    const totals = p.totals || {};
    const costs = p.costs || {};
    const photos = p.photos || {};
    const sig = p.signature || {};

    return (
      <section style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 18 }}>
        <h2 style={{ marginTop: 0 }}>Rapport Details</h2>
        <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
          <div><strong>Kunde:</strong> {openedReport.customer || p.customer || "-"}</div>
          <div><strong>Adresse:</strong> {p.address || "-"}</div>
          <div><strong>Datum:</strong> {openedReport.date || p.date || "-"}</div>
          <div><strong>Auftrag-Nr:</strong> {p.orderNo || "-"}</div>
          <div><strong>Projektnummer:</strong> {p.projektnummer || "-"}</div>
          <div><strong>Status:</strong> {renderStatus(openedReport.status)}</div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ marginRight: 8, color: COLORS.muted }}>Status ändern</label>
          <select
            value={openedReport.status || "offen"}
            onChange={(e) => handleUpdateReportStatus(openedReport.id, e.target.value)}
            style={{ ...inputStyle, width: 220 }}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {(photos.before || photos.after) ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>{photos.before ? <img src={photos.before} alt="Vorher" style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 8, border: `1px solid ${COLORS.border}` }} /> : "Kein Vorher Foto"}</div>
            <div>{photos.after ? <img src={photos.after} alt="Nachher" style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 8, border: `1px solid ${COLORS.border}` }} /> : "Kein Nachher Foto"}</div>
          </div>
        ) : null}

        <h3>Work hours</h3>
        <div style={{ overflowX: "auto", marginBottom: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={{ border: `1px solid ${COLORS.border}`, padding: 6 }}>Mitarbeiter</th><th style={{ border: `1px solid ${COLORS.border}`, padding: 6 }}>Von</th><th style={{ border: `1px solid ${COLORS.border}`, padding: 6 }}>Bis</th><th style={{ border: `1px solid ${COLORS.border}`, padding: 6 }}>Stunden</th><th style={{ border: `1px solid ${COLORS.border}`, padding: 6 }}>Total</th></tr></thead>
            <tbody>{work.length === 0 ? <tr><td colSpan={5} style={{ border: `1px solid ${COLORS.border}`, padding: 6, color: COLORS.muted }}>Keine Daten</td></tr> : work.map((row, i) => (
              <tr key={`rw-${i}`}>
                <td style={{ border: `1px solid ${COLORS.border}`, padding: 6 }}>{row.employee || "-"}</td>
                <td style={{ border: `1px solid ${COLORS.border}`, padding: 6 }}>{row.from || "-"}</td>
                <td style={{ border: `1px solid ${COLORS.border}`, padding: 6 }}>{row.to || "-"}</td>
                <td style={{ border: `1px solid ${COLORS.border}`, padding: 6 }}>{Number(row.hours || 0).toFixed(2)}</td>
                <td style={{ border: `1px solid ${COLORS.border}`, padding: 6 }}>{Number(row.total || 0).toFixed(2)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>

        <h3>Material</h3>
        <div style={{ overflowX: "auto", marginBottom: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={{ border: `1px solid ${COLORS.border}`, padding: 6 }}>Bezeichnung</th><th style={{ border: `1px solid ${COLORS.border}`, padding: 6 }}>Menge</th><th style={{ border: `1px solid ${COLORS.border}`, padding: 6 }}>Einheit</th><th style={{ border: `1px solid ${COLORS.border}`, padding: 6 }}>Total</th></tr></thead>
            <tbody>{material.length === 0 ? <tr><td colSpan={4} style={{ border: `1px solid ${COLORS.border}`, padding: 6, color: COLORS.muted }}>Keine Daten</td></tr> : material.map((row, i) => (
              <tr key={`rm-${i}`}>
                <td style={{ border: `1px solid ${COLORS.border}`, padding: 6 }}>{row.name || "-"}</td>
                <td style={{ border: `1px solid ${COLORS.border}`, padding: 6 }}>{row.qty || "-"}</td>
                <td style={{ border: `1px solid ${COLORS.border}`, padding: 6 }}>{row.unit || "-"}</td>
                <td style={{ border: `1px solid ${COLORS.border}`, padding: 6 }}>{Number(row.total || 0).toFixed(2)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div><strong>Spesen:</strong> CHF {Number(costs.expenses || 0).toFixed(2)}</div>
          <div><strong>Notizen:</strong> {costs.notes || "-"}</div>
          <div><strong>MwSt 8.1%:</strong> CHF {Number(totals.vat || 0).toFixed(2)}</div>
          <div style={{ color: COLORS.gold, fontWeight: 800, fontSize: 24 }}>Total CHF {Number(totals.total || 0).toFixed(2)}</div>
        </div>

        {sig.image ? <img src={sig.image} alt="Signatur" style={{ width: 280, maxWidth: "100%", border: `1px solid ${COLORS.border}`, borderRadius: 8, marginBottom: 10 }} /> : null}

        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setOpenedReport(null)} style={{ ...primaryBtn, background: "#2a2a2a", color: COLORS.text }}>Zurück</button>
          <button type="button" onClick={() => openPdfEmailWindow(openedReport)} style={primaryBtn}>PDF E-Mail</button>
        </div>
      </section>
    );
  };

  const renderSettings = () => (
    <section style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 18 }}>
      <h2 style={{ marginTop: 0 }}>Einstellungen</h2>
      <p style={{ color: COLORS.muted }}>Benutzer: {userEmail || "-"}</p>
      <div style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 8, color: COLORS.muted }}>Sprache wählen</label>
        <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ ...inputStyle, width: 180 }}>
          {LANGUAGE_OPTIONS.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <button type="button" onClick={() => setShowUpgrade((p) => !p)} style={primaryBtn}>Konto Upgrade</button>
        <button
          type="button"
          onClick={() => {
            const ok = window.confirm("Konto pausieren?");
            if (ok) setNotice("Konto pausiert.");
          }}
          style={{ ...primaryBtn, background: "#2a2a2a", color: COLORS.text }}
        >
          Konto pausieren
        </button>
        <button
          type="button"
          onClick={() => {
            const first = window.confirm("Konto wirklich löschen?");
            if (!first) return;
            const second = window.confirm("Letzte Bestätigung: Konto endgültig löschen?");
            if (second) setNotice("Konto-Löschung angefragt.");
          }}
          style={{ minHeight: 38, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.text, padding: "0 12px", cursor: "pointer" }}
        >
          Konto löschen
        </button>
      </div>
      {showUpgrade ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
          <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 10 }}><strong>Starter</strong><div style={{ color: COLORS.muted }}>CHF 0</div></div>
          <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 10 }}><strong>Pro</strong><div style={{ color: COLORS.muted }}>CHF 29</div></div>
          <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 10 }}><strong>Team</strong><div style={{ color: COLORS.muted }}>CHF 79</div></div>
        </div>
      ) : null}
      <div style={{ marginTop: 12 }}>
        <button
          type="button"
          onClick={() => {
            if (onLogout) return onLogout();
            if (onNavigate) onNavigate("/");
          }}
          style={primaryBtn}
        >
          Logout
        </button>
      </div>
    </section>
  );

  const renderView = () => {
    if (openedReport) return renderReportDetail();
    if (selectedCustomerDetail) return renderCustomerDetail();

    if (view === "home") {
      return (
        <section style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 18 }}>
          <h2 style={{ marginTop: 0 }}>Start</h2>
          <p style={{ color: COLORS.muted }}>Willkommen {userEmail || "-"}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
            <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 12 }}>
              <div style={{ color: COLORS.muted, fontSize: 13 }}>Total reports</div>
              <strong style={{ fontSize: 24 }}>{reports.length}</strong>
            </div>
            <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 12 }}>
              <div style={{ color: COLORS.muted, fontSize: 13 }}>Open reports</div>
              <strong style={{ fontSize: 24 }}>{openReports}</strong>
            </div>
            <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 12 }}>
              <div style={{ color: COLORS.muted, fontSize: 13 }}>Customers</div>
              <strong style={{ fontSize: 24 }}>{customers.length}</strong>
            </div>
          </div>
        </section>
      );
    }

    if (view === "customers") {
      return (
        <section style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 18 }}>
          <h2 style={{ marginTop: 0 }}>Kunden</h2>
          <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
            <input placeholder="Firmenname" value={customerForm.company} onChange={(e) => setCustomerForm((p) => ({ ...p, company: e.target.value }))} style={inputStyle} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input placeholder="Vorname" value={customerForm.firstName} onChange={(e) => setCustomerForm((p) => ({ ...p, firstName: e.target.value }))} style={inputStyle} />
              <input placeholder="Nachname" value={customerForm.lastName} onChange={(e) => setCustomerForm((p) => ({ ...p, lastName: e.target.value }))} style={inputStyle} />
            </div>
            <input placeholder="Adresse" value={customerForm.address} onChange={(e) => setCustomerForm((p) => ({ ...p, address: e.target.value }))} style={inputStyle} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input placeholder="PLZ" value={customerForm.zip} onChange={(e) => setCustomerForm((p) => ({ ...p, zip: e.target.value }))} style={inputStyle} />
              <input placeholder="Ort" value={customerForm.city} onChange={(e) => setCustomerForm((p) => ({ ...p, city: e.target.value }))} style={inputStyle} />
            </div>
            <input placeholder="Telefon" value={customerForm.phone} onChange={(e) => setCustomerForm((p) => ({ ...p, phone: e.target.value }))} style={inputStyle} />
            <input placeholder="Email" value={customerForm.email} onChange={(e) => setCustomerForm((p) => ({ ...p, email: e.target.value }))} style={inputStyle} />
            <input placeholder="Kostenstelle" value={customerForm.costCenter} onChange={(e) => setCustomerForm((p) => ({ ...p, costCenter: e.target.value }))} style={inputStyle} />
            <h4 style={{ marginBottom: 0 }}>Projekt hinzufügen</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input placeholder="Project name" value={customerForm.projectName} onChange={(e) => setCustomerForm((p) => ({ ...p, projectName: e.target.value }))} style={inputStyle} />
              <input placeholder="Projektnummer" value={customerForm.projectNumber} onChange={(e) => setCustomerForm((p) => ({ ...p, projectNumber: e.target.value }))} style={inputStyle} />
            </div>
            <button type="button" onClick={handleAddCustomer} style={primaryBtn}>Speichern</button>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {customers.map((c) => (
              <div key={c.id} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 12px", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <button type="button" onClick={() => setSelectedCustomerDetail(c)} style={{ border: "none", background: "transparent", color: COLORS.text, fontWeight: 700, cursor: "pointer", textAlign: "left", padding: 0 }}>
                  {c.name || "-"}
                </button>
                <button type="button" onClick={() => handleDeleteCustomer(c)} style={{ minHeight: 34, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.text, padding: "0 12px", cursor: "pointer" }}>Delete</button>
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (view === "new-report") {
      return (
        <section style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 18 }}>
          <h2 style={{ marginTop: 0 }}>Neuer Rapport</h2>
          <div style={{ display: "grid", gap: 10 }}>
            <select value={reportForm.selectedCustomerId} onChange={(e) => handleCustomerSelectInReport(e.target.value)} style={inputStyle}>
              <option value="">Customer auswählen</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select value={reportForm.selectedProjectId} onChange={(e) => handleProjectSelectInReport(e.target.value)} style={inputStyle}>
              <option value="">Project auswählen</option>
              {customerProjects.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.projektnummer || "-"})</option>
              ))}
            </select>
            <input placeholder="Kundenname" value={reportForm.customer} onChange={(e) => setReportForm((p) => ({ ...p, customer: e.target.value }))} style={inputStyle} />
            <input placeholder="Adresse" value={reportForm.address} onChange={(e) => setReportForm((p) => ({ ...p, address: e.target.value }))} style={inputStyle} />
            <input placeholder="Kunde E-Mail" value={reportForm.customerEmail} onChange={(e) => setReportForm((p) => ({ ...p, customerEmail: e.target.value }))} style={inputStyle} />
            <input placeholder="Auftrag-Nr" value={reportForm.orderNo} onChange={(e) => setReportForm((p) => ({ ...p, orderNo: e.target.value }))} style={inputStyle} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input type="date" value={reportForm.date} onChange={(e) => setReportForm((p) => ({ ...p, date: e.target.value }))} style={inputStyle} />
              <select value={reportForm.status} onChange={(e) => setReportForm((p) => ({ ...p, status: e.target.value }))} style={inputStyle}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <h3 style={{ marginBottom: 0 }}>Work hours</h3>
            <button type="button" onClick={() => setWorkRows((prev) => [...prev, { employee: "", from: "", to: "", rate: "" }])} style={{ ...primaryBtn, width: 160 }}>Add row</button>
            {workRows.map((row, i) => {
              const h = calcHours(row.from, row.to);
              const t = h * toNumber(row.rate);
              return (
                <div key={`w-${i}`} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", gap: 8 }}>
                  <input placeholder="Mitarbeiter" value={row.employee} onChange={(e) => setWorkRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, employee: e.target.value } : r)))} style={inputStyle} />
                  <input type="time" value={row.from} onChange={(e) => setWorkRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, from: e.target.value } : r)))} style={inputStyle} />
                  <input type="time" value={row.to} onChange={(e) => setWorkRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, to: e.target.value } : r)))} style={inputStyle} />
                  <input readOnly value={h.toFixed(2)} style={{ ...inputStyle, color: COLORS.gold }} />
                  <input placeholder="Ansatz CHF" value={row.rate} onChange={(e) => setWorkRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, rate: e.target.value } : r)))} style={inputStyle} />
                  <input readOnly value={t.toFixed(2)} style={{ ...inputStyle, color: COLORS.gold }} />
                </div>
              );
            })}

            <h3 style={{ marginBottom: 0 }}>Material</h3>
            <button type="button" onClick={() => setMaterialRows((prev) => [...prev, { name: "", qty: "", unit: "", price: "" }])} style={{ ...primaryBtn, width: 160 }}>Add row</button>
            {materialRows.map((row, i) => {
              const t = toNumber(row.qty) * toNumber(row.price);
              return (
                <div key={`m-${i}`} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 8 }}>
                  <input placeholder="Bezeichnung" value={row.name} onChange={(e) => setMaterialRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, name: e.target.value } : r)))} style={inputStyle} />
                  <input placeholder="Menge" value={row.qty} onChange={(e) => setMaterialRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, qty: e.target.value } : r)))} style={inputStyle} />
                  <input placeholder="Einheit" value={row.unit} onChange={(e) => setMaterialRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, unit: e.target.value } : r)))} style={inputStyle} />
                  <input placeholder="Preis" value={row.price} onChange={(e) => setMaterialRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, price: e.target.value } : r)))} style={inputStyle} />
                  <input readOnly value={t.toFixed(2)} style={{ ...inputStyle, color: COLORS.gold }} />
                </div>
              );
            })}

            <input placeholder="Spesen CHF" value={reportForm.expenses} onChange={(e) => setReportForm((p) => ({ ...p, expenses: e.target.value }))} style={inputStyle} />
            <textarea placeholder="Notizen" value={reportForm.notes} onChange={(e) => setReportForm((p) => ({ ...p, notes: e.target.value }))} rows={4} style={{ ...inputStyle, minHeight: 90, padding: 10 }} />
            <div style={{ color: COLORS.muted }}>MwSt 8.1%: CHF {vat.toFixed(2)}</div>
            <div style={{ color: COLORS.gold, fontSize: 28, fontWeight: 800 }}>Total CHF {total.toFixed(2)}</div>
            <button type="button" onClick={handleSaveReport} style={primaryBtn}>Rapport speichern</button>
          </div>
        </section>
      );
    }

    if (view === "reports") {
      return (
        <section style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 18 }}>
          <h2 style={{ marginTop: 0 }}>Alle Rapporte</h2>
          {loading ? <p style={{ color: COLORS.muted }}>Lade Rapporte...</p> : (
            <div style={{ display: "grid", gap: 8 }}>
              {reports.map((r) => {
                const p = parseReport(r);
                return (
                  <div key={r.id} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,168,83,0.2)", borderRadius: 10, padding: "12px 14px", display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                      <strong>{r.customer || "-"}</strong>
                      {renderStatus((r.status || "").toLowerCase())}
                    </div>
                    <div style={{ color: COLORS.muted }}>Datum: {r.date || "-"}</div>
                    <div style={{ color: COLORS.muted }}>Auftrag-Nr: {p.orderNo || "-"}</div>
                    <div style={{ color: COLORS.muted }}>Projektnummer: {p.projektnummer || "-"}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" onClick={() => setOpenedReport(r)} style={{ ...primaryBtn, minHeight: 34 }}>Öffnen</button>
                      <button type="button" onClick={() => handleMoveToTrash(r)} style={{ minHeight: 34, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.text, padding: "0 12px", cursor: "pointer" }}>Löschen</button>
                      <button type="button" onClick={() => openPdfEmailWindow(r)} style={{ minHeight: 34, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.text, padding: "0 12px", cursor: "pointer" }}>PDF Email</button>
                      <select value={r.status || "offen"} onChange={(e) => handleUpdateReportStatus(r.id, e.target.value)} style={{ ...inputStyle, minHeight: 34 }}>
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      );
    }

    if (view === "trash") {
      return (
        <section style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 18 }}>
          <h2 style={{ marginTop: 0 }}>Papierkorb</h2>
          {loading ? <p style={{ color: COLORS.muted }}>Lade Papierkorb...</p> : (
            <div style={{ display: "grid", gap: 8 }}>
              {trashReports.map((r) => (
                <div key={r.id} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,168,83,0.2)", borderRadius: 10, padding: "12px 14px", display: "grid", gap: 8 }}>
                  <strong>{r.customer || "-"}</strong>
                  <div style={{ color: COLORS.muted }}>{r.date || "-"}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" onClick={() => handleRestore(r)} style={{ ...primaryBtn, minHeight: 34 }}>Wiederherstellen</button>
                    <button type="button" onClick={() => handleHardDelete(r)} style={{ minHeight: 34, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.text, padding: "0 12px", cursor: "pointer" }}>Endgültig löschen</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      );
    }

    if (view === "settings") return renderSettings();
    return null;
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" }}>
        <aside style={{ borderRight: `1px solid ${COLORS.border}`, background: COLORS.panel, padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 16 }}>
            Bau<span style={{ color: COLORS.gold }}>Abnahme</span>
          </div>
          <nav style={{ display: "grid", gap: 8 }}>
            <button type="button" onClick={() => { setOpenedReport(null); setSelectedCustomerDetail(null); setView("home"); }} style={{ ...inputStyle, minHeight: 42, cursor: "pointer", textAlign: "left", background: view === "home" ? "rgba(212,168,83,0.12)" : "#111" }}>Start</button>
            <button type="button" onClick={() => { setOpenedReport(null); setSelectedCustomerDetail(null); setView("customers"); }} style={{ ...inputStyle, minHeight: 42, cursor: "pointer", textAlign: "left", background: view === "customers" ? "rgba(212,168,83,0.12)" : "#111" }}>Kunden</button>
            <button type="button" onClick={() => { setOpenedReport(null); setSelectedCustomerDetail(null); setView("new-report"); }} style={{ ...inputStyle, minHeight: 42, cursor: "pointer", textAlign: "left", background: view === "new-report" ? "rgba(212,168,83,0.12)" : "#111" }}>Neuer Rapport</button>
            <button type="button" onClick={() => { setOpenedReport(null); setSelectedCustomerDetail(null); setView("reports"); }} style={{ ...inputStyle, minHeight: 42, cursor: "pointer", textAlign: "left", background: view === "reports" ? "rgba(212,168,83,0.12)" : "#111" }}>Alle Rapporte</button>
            <button type="button" onClick={() => { setOpenedReport(null); setSelectedCustomerDetail(null); setView("trash"); }} style={{ ...inputStyle, minHeight: 42, cursor: "pointer", textAlign: "left", background: view === "trash" ? "rgba(212,168,83,0.12)" : "#111" }}>Papierkorb</button>
            <button type="button" onClick={() => { setOpenedReport(null); setSelectedCustomerDetail(null); setView("settings"); }} style={{ ...inputStyle, minHeight: 42, cursor: "pointer", textAlign: "left", background: view === "settings" ? "rgba(212,168,83,0.12)" : "#111" }}>Einstellungen</button>
          </nav>
        </aside>

        <main style={{ padding: 20 }}>
          {notice ? (
            <div style={{ marginBottom: 12, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 12px", color: COLORS.muted }}>
              {notice}
            </div>
          ) : null}
          {renderView()}
        </main>
      </div>
    </div>
  );
}
