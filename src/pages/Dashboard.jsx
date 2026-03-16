import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";

const STATUS_COLORS = {
  offen: "#d4a853",
  bearbeitet: "#4b7bec",
  gesendet: "#d4a853",
  archiviert: "#80c783",
  geloescht: "#8b8b8b"
};

const STATUS_OPTIONS = ["offen", "bearbeitet", "gesendet", "archiviert"];

const COLORS = {
  bg: "#0a0a0a",
  panel: "#141414",
  card: "#1a1a1a",
  text: "#f0ece4",
  muted: "#b9b0a3",
  gold: "#d4a853",
  border: "rgba(212,168,83,0.25)"
};

const INPUT_STYLE = {
  minHeight: 40,
  borderRadius: 8,
  border: `1px solid ${COLORS.border}`,
  background: "#111",
  color: COLORS.text,
  padding: "0 10px"
};

const PRIMARY_BTN = {
  minHeight: 40,
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
  const start = fh * 60 + fm;
  const end = th * 60 + tm;
  if (end <= start) return 0;
  return Math.round((((end - start) / 60) + Number.EPSILON) * 100) / 100;
}

function parsePayload(report) {
  if (!report?.description) return {};
  try {
    return JSON.parse(report.description);
  } catch (_e) {
    return {};
  }
}

export default function Dashboard({ session, onLogout, onNavigate }) {
  const userId = session?.user?.id;
  const userEmail = session?.user?.email || "";

  const [view, setView] = useState("home");
  const [reports, setReports] = useState([]);
  const [trashReports, setTrashReports] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [openedReport, setOpenedReport] = useState(null);

  const [customerForm, setCustomerForm] = useState({
    company: "",
    firstName: "",
    lastName: "",
    address: "",
    zip: "",
    city: "",
    phone: "",
    email: ""
  });

  const [reportForm, setReportForm] = useState({
    customer: "",
    address: "",
    orderNo: "",
    date: new Date().toISOString().slice(0, 10),
    status: "offen",
    expenses: "",
    notes: "",
    customerEmail: ""
  });

  const [workRows, setWorkRows] = useState([{ employee: "", from: "", to: "", rate: "" }]);
  const [materialRows, setMaterialRows] = useState([{ name: "", qty: "", unit: "", price: "" }]);

  const workSubtotal = useMemo(
    () =>
      workRows.reduce((sum, row) => {
        const hours = calcHours(row.from, row.to);
        return sum + hours * toNumber(row.rate);
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
    const { data, error } = await supabase.from("reports").select("*").eq("status", "geloescht");
    if (error) {
      setTrashReports([]);
      return;
    }
    setTrashReports(data || []);
  };

  useEffect(() => {
    if (!userId) {
      setCustomers([]);
      setReports([]);
      setTrashReports([]);
      return;
    }
    fetchCustomers();
    fetchReports();
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

  const saveCustomer = async () => {
    if (!userId || !customerForm.company.trim()) {
      setNotice("Firmenname fehlt.");
      return;
    }
    const addressJson = JSON.stringify({
      address: customerForm.address,
      zip: customerForm.zip,
      city: customerForm.city,
      firstName: customerForm.firstName,
      lastName: customerForm.lastName
    });
    const { data, error } = await supabase
      .from("customers")
      .insert({
        user_id: userId,
        name: customerForm.company.trim(),
        address: addressJson,
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
    setCustomerForm({
      company: "",
      firstName: "",
      lastName: "",
      address: "",
      zip: "",
      city: "",
      phone: "",
      email: ""
    });
    setNotice("Kunde gespeichert.");
  };

  const deleteCustomer = async (customer) => {
    const ok = window.confirm("Kunde löschen?");
    if (!ok) return;
    const { error } = await supabase.from("customers").delete().eq("id", customer.id);
    if (error) {
      setNotice("Kunde konnte nicht gelöscht werden.");
      return;
    }
    setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
  };

  const saveReport = async () => {
    if (!userId || !reportForm.customer.trim()) {
      setNotice("Kundenname fehlt.");
      return;
    }
    const payload = {
      customer: reportForm.customer.trim(),
      address: reportForm.address.trim(),
      orderNo: reportForm.orderNo.trim(),
      customerEmail: reportForm.customerEmail.trim(),
      date: reportForm.date,
      status: reportForm.status,
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

    setView("reports");
    await fetchReports();
    setNotice("Rapport gespeichert.");
  };

  const updateReportStatus = async (reportId, nextStatus) => {
    const { error } = await supabase.from("reports").update({ status: nextStatus }).eq("id", reportId);
    if (error) {
      setNotice("Status konnte nicht geändert werden.");
      return;
    }
    setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status: nextStatus } : r)));
    setTrashReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status: nextStatus } : r)));
    setOpenedReport((prev) => (prev?.id === reportId ? { ...prev, status: nextStatus } : prev));
  };

  const moveToTrash = async (report) => {
    const ok = window.confirm("Sicher löschen?");
    if (!ok) return;
    const { error } = await supabase.from("reports").update({ status: "geloescht" }).eq("id", report.id);
    if (error) {
      setNotice("Konnte nicht in Papierkorb verschieben.");
      return;
    }
    setReports((prev) => prev.filter((r) => r.id !== report.id));
    setTrashReports((prev) => [{ ...report, status: "geloescht" }, ...prev.filter((r) => r.id !== report.id)]);
  };

  const restoreReport = async (report) => {
    const { error } = await supabase.from("reports").update({ status: "offen" }).eq("id", report.id);
    if (error) {
      setNotice("Wiederherstellen fehlgeschlagen.");
      return;
    }
    setTrashReports((prev) => prev.filter((r) => r.id !== report.id));
    setReports((prev) => [{ ...report, status: "offen" }, ...prev.filter((r) => r.id !== report.id)]);
  };

  const hardDeleteReport = async (report) => {
    const ok = window.confirm("Endgültig löschen?");
    if (!ok) return;
    const { error } = await supabase.from("reports").delete().eq("id", report.id);
    if (error) {
      setNotice("Endgültig löschen fehlgeschlagen.");
      return;
    }
    setTrashReports((prev) => prev.filter((r) => r.id !== report.id));
  };

  const openPdfEmail = (report) => {
    const p = parsePayload(report);
    const work = p.workRows || [];
    const material = p.materialRows || [];
    const totals = p.totals || {};
    const costs = p.costs || {};
    const customerName = report.customer || p.customer || "-";
    const customerEmail = report.customer_email || p.customerEmail || "";

    const subject = `BauAbnahme Rapport - ${customerName} - ${report.date || p.date || "-"}`;
    const body = [
      "BauAbnahme Rapport",
      "",
      `Kunde: ${customerName}`,
      `Datum: ${report.date || p.date || "-"}`,
      `Auftrag-Nr: ${report.auftrag_nr || p.orderNo || "-"}`,
      `Zwischensumme CHF: ${Number(totals.subtotal || 0).toFixed(2)}`,
      `MwSt 8.1% CHF: ${Number(totals.vat || 0).toFixed(2)}`,
      `TOTAL CHF: ${Number(totals.total || 0).toFixed(2)}`
    ].join("\n");

    const mailto = `mailto:${encodeURIComponent(customerEmail)}?cc=${encodeURIComponent(userEmail)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const win = window.open("", "_blank", "width=980,height=760");
    if (!win) return;

    const workRowsHtml = work
      .map(
        (row, i) =>
          `<tr><td>${i + 1}</td><td>${row.employee || "-"}</td><td>${row.from || "-"} - ${row.to || "-"}</td><td>${Number(row.hours || 0).toFixed(2)}</td><td>CHF ${Number(row.total || 0).toFixed(2)}</td></tr>`
      )
      .join("");

    const matRowsHtml = material
      .map(
        (row, i) =>
          `<tr><td>${i + 1}</td><td>${row.name || "-"}</td><td>${row.qty || 0} ${row.unit || ""}</td><td>CHF ${Number(row.total || 0).toFixed(2)}</td></tr>`
      )
      .join("");

    win.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Rapport ${report.id}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #222; margin: 24px; }
    .top { display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:18px; }
    .brand { font-size:28px; font-weight:700; color:#d4a853; }
    .btn { background:#d4a853; border:none; color:#111; padding:10px 14px; border-radius:8px; font-weight:700; cursor:pointer; text-decoration:none; display:inline-block; }
    .card { border:1px solid rgba(212,168,83,0.4); border-radius:10px; padding:12px; margin-bottom:12px; }
    table { width:100%; border-collapse: collapse; margin-top:6px; }
    th, td { border:1px solid #ddd; padding:6px 8px; font-size:13px; text-align:left; }
    th { background:#f6f3eb; }
    .total { color:#d4a853; font-size:24px; font-weight:800; text-align:right; }
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
    <div><strong>Rapport Nr:</strong> ${report.id}</div>
    <div><strong>Kunde:</strong> ${customerName}</div>
    <div><strong>Datum:</strong> ${report.date || p.date || "-"}</div>
    <div><strong>Auftrag-Nr:</strong> ${report.auftrag_nr || p.orderNo || "-"}</div>
    <div><strong>Adresse:</strong> ${p.address || "-"}</div>
  </div>
  <div class="card">
    <h3>Arbeitsstunden</h3>
    <table><thead><tr><th>#</th><th>Mitarbeiter</th><th>Zeit</th><th>Stunden</th><th>Total</th></tr></thead><tbody>${workRowsHtml || "<tr><td colspan='5'>Keine Daten</td></tr>"}</tbody></table>
  </div>
  <div class="card">
    <h3>Material</h3>
    <table><thead><tr><th>#</th><th>Bezeichnung</th><th>Menge</th><th>Total</th></tr></thead><tbody>${matRowsHtml || "<tr><td colspan='4'>Keine Daten</td></tr>"}</tbody></table>
  </div>
  <div class="card">
    <div><strong>Spesen:</strong> CHF ${Number(costs.expenses || 0).toFixed(2)}</div>
    <div><strong>Notizen:</strong> ${costs.notes || "-"}</div>
    <div><strong>MwSt 8.1%:</strong> CHF ${Number(totals.vat || 0).toFixed(2)}</div>
    <div class="total">TOTAL CHF ${Number(totals.total || 0).toFixed(2)}</div>
  </div>
</body>
</html>`);
    win.document.close();
  };

  const renderStatus = (status) => (
    <span style={{ color: STATUS_COLORS[status] || COLORS.muted, fontWeight: 700 }}>{status || "-"}</span>
  );

  const renderReportDetail = () => {
    if (!openedReport) return null;
    const p = parsePayload(openedReport);
    return (
      <section style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 18 }}>
        <h2 style={{ marginTop: 0 }}>Rapport Details</h2>
        <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
          <div><strong>Kunde:</strong> {openedReport.customer || p.customer || "-"}</div>
          <div><strong>Adresse:</strong> {p.address || "-"}</div>
          <div><strong>Datum:</strong> {openedReport.date || p.date || "-"}</div>
          <div><strong>Auftrag-Nr:</strong> {openedReport.auftrag_nr || p.orderNo || "-"}</div>
          <div><strong>Status:</strong> {renderStatus(openedReport.status)}</div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ color: COLORS.muted, marginRight: 8 }}>Status ändern</label>
          <select
            value={openedReport.status || "offen"}
            onChange={(e) => updateReportStatus(openedReport.id, e.target.value)}
            style={{ ...INPUT_STYLE, width: 220 }}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setOpenedReport(null)} style={{ ...PRIMARY_BTN, background: "#2a2a2a", color: COLORS.text }}>Zurück</button>
          <button type="button" onClick={() => openPdfEmail(openedReport)} style={PRIMARY_BTN}>PDF E-Mail</button>
        </div>
      </section>
    );
  };

  const renderView = () => {
    if (openedReport) return renderReportDetail();

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
            <input placeholder="Firmenname" value={customerForm.company} onChange={(e) => setCustomerForm((p) => ({ ...p, company: e.target.value }))} style={INPUT_STYLE} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input placeholder="Vorname" value={customerForm.firstName} onChange={(e) => setCustomerForm((p) => ({ ...p, firstName: e.target.value }))} style={INPUT_STYLE} />
              <input placeholder="Nachname" value={customerForm.lastName} onChange={(e) => setCustomerForm((p) => ({ ...p, lastName: e.target.value }))} style={INPUT_STYLE} />
            </div>
            <input placeholder="Adresse" value={customerForm.address} onChange={(e) => setCustomerForm((p) => ({ ...p, address: e.target.value }))} style={INPUT_STYLE} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input placeholder="PLZ" value={customerForm.zip} onChange={(e) => setCustomerForm((p) => ({ ...p, zip: e.target.value }))} style={INPUT_STYLE} />
              <input placeholder="Ort" value={customerForm.city} onChange={(e) => setCustomerForm((p) => ({ ...p, city: e.target.value }))} style={INPUT_STYLE} />
            </div>
            <input placeholder="Telefon" value={customerForm.phone} onChange={(e) => setCustomerForm((p) => ({ ...p, phone: e.target.value }))} style={INPUT_STYLE} />
            <input placeholder="Email" value={customerForm.email} onChange={(e) => setCustomerForm((p) => ({ ...p, email: e.target.value }))} style={INPUT_STYLE} />
            <button type="button" onClick={saveCustomer} style={PRIMARY_BTN}>Speichern</button>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {customers.map((c) => (
              <div key={c.id} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 12px", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div>
                  <strong>{c.name || "-"}</strong>
                  <div style={{ color: COLORS.muted }}>{c.email || "-"}</div>
                </div>
                <button type="button" onClick={() => deleteCustomer(c)} style={{ minHeight: 34, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.text, padding: "0 12px", cursor: "pointer" }}>Delete</button>
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
            <input placeholder="Kundenname" value={reportForm.customer} onChange={(e) => setReportForm((p) => ({ ...p, customer: e.target.value }))} style={INPUT_STYLE} />
            <input placeholder="Adresse" value={reportForm.address} onChange={(e) => setReportForm((p) => ({ ...p, address: e.target.value }))} style={INPUT_STYLE} />
            <input placeholder="Auftrag-Nr" value={reportForm.orderNo} onChange={(e) => setReportForm((p) => ({ ...p, orderNo: e.target.value }))} style={INPUT_STYLE} />
            <input placeholder="Kunde E-Mail" value={reportForm.customerEmail} onChange={(e) => setReportForm((p) => ({ ...p, customerEmail: e.target.value }))} style={INPUT_STYLE} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input type="date" value={reportForm.date} onChange={(e) => setReportForm((p) => ({ ...p, date: e.target.value }))} style={INPUT_STYLE} />
              <select value={reportForm.status} onChange={(e) => setReportForm((p) => ({ ...p, status: e.target.value }))} style={INPUT_STYLE}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <h3 style={{ marginBottom: 0 }}>Work hours</h3>
            <button type="button" onClick={() => setWorkRows((prev) => [...prev, { employee: "", from: "", to: "", rate: "" }])} style={{ ...PRIMARY_BTN, width: 160 }}>Add row</button>
            {workRows.map((row, i) => {
              const h = calcHours(row.from, row.to);
              const t = h * toNumber(row.rate);
              return (
                <div key={`w-${i}`} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", gap: 8 }}>
                  <input placeholder="Mitarbeiter" value={row.employee} onChange={(e) => setWorkRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, employee: e.target.value } : r)))} style={INPUT_STYLE} />
                  <input type="time" value={row.from} onChange={(e) => setWorkRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, from: e.target.value } : r)))} style={INPUT_STYLE} />
                  <input type="time" value={row.to} onChange={(e) => setWorkRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, to: e.target.value } : r)))} style={INPUT_STYLE} />
                  <input readOnly value={h.toFixed(2)} style={{ ...INPUT_STYLE, color: COLORS.gold }} />
                  <input placeholder="Ansatz CHF" value={row.rate} onChange={(e) => setWorkRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, rate: e.target.value } : r)))} style={INPUT_STYLE} />
                  <input readOnly value={t.toFixed(2)} style={{ ...INPUT_STYLE, color: COLORS.gold }} />
                </div>
              );
            })}

            <h3 style={{ marginBottom: 0 }}>Material</h3>
            <button type="button" onClick={() => setMaterialRows((prev) => [...prev, { name: "", qty: "", unit: "", price: "" }])} style={{ ...PRIMARY_BTN, width: 160 }}>Add row</button>
            {materialRows.map((row, i) => {
              const t = toNumber(row.qty) * toNumber(row.price);
              return (
                <div key={`m-${i}`} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 8 }}>
                  <input placeholder="Bezeichnung" value={row.name} onChange={(e) => setMaterialRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, name: e.target.value } : r)))} style={INPUT_STYLE} />
                  <input placeholder="Menge" value={row.qty} onChange={(e) => setMaterialRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, qty: e.target.value } : r)))} style={INPUT_STYLE} />
                  <input placeholder="Einheit" value={row.unit} onChange={(e) => setMaterialRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, unit: e.target.value } : r)))} style={INPUT_STYLE} />
                  <input placeholder="Preis" value={row.price} onChange={(e) => setMaterialRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, price: e.target.value } : r)))} style={INPUT_STYLE} />
                  <input readOnly value={t.toFixed(2)} style={{ ...INPUT_STYLE, color: COLORS.gold }} />
                </div>
              );
            })}

            <input placeholder="Spesen CHF" value={reportForm.expenses} onChange={(e) => setReportForm((p) => ({ ...p, expenses: e.target.value }))} style={INPUT_STYLE} />
            <textarea placeholder="Notizen" value={reportForm.notes} onChange={(e) => setReportForm((p) => ({ ...p, notes: e.target.value }))} rows={4} style={{ ...INPUT_STYLE, minHeight: 90, padding: 10 }} />
            <div style={{ color: COLORS.muted }}>MwSt 8.1%: CHF {vat.toFixed(2)}</div>
            <div style={{ color: COLORS.gold, fontSize: 28, fontWeight: 800 }}>Total CHF {total.toFixed(2)}</div>
            <button type="button" onClick={saveReport} style={PRIMARY_BTN}>Rapport speichern</button>
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
                const p = parsePayload(r);
                return (
                  <div key={r.id} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,168,83,0.2)", borderRadius: 10, padding: "12px 14px", display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                      <strong>{r.customer || "-"}</strong>
                      {renderStatus((r.status || "").toLowerCase())}
                    </div>
                    <div style={{ color: COLORS.muted }}>Datum: {r.date || "-"}</div>
                    <div style={{ color: COLORS.muted }}>Auftrag-Nr: {r.auftrag_nr || p.orderNo || "-"}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" onClick={() => setOpenedReport(r)} style={{ ...PRIMARY_BTN, minHeight: 34 }}>Öffnen</button>
                      <button type="button" onClick={() => moveToTrash(r)} style={{ minHeight: 34, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.text, padding: "0 12px", cursor: "pointer" }}>Löschen</button>
                      <button type="button" onClick={() => openPdfEmail(r)} style={{ minHeight: 34, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.text, padding: "0 12px", cursor: "pointer" }}>PDF Email</button>
                      <select value={r.status || "offen"} onChange={(e) => updateReportStatus(r.id, e.target.value)} style={{ ...INPUT_STYLE, minHeight: 34 }}>
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
                    <button type="button" onClick={() => restoreReport(r)} style={{ ...PRIMARY_BTN, minHeight: 34 }}>Wiederherstellen</button>
                    <button type="button" onClick={() => hardDeleteReport(r)} style={{ minHeight: 34, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.text, padding: "0 12px", cursor: "pointer" }}>Endgültig löschen</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      );
    }

    if (view === "settings") {
      return (
        <section style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 18 }}>
          <h2 style={{ marginTop: 0 }}>Einstellungen</h2>
          <p style={{ color: COLORS.muted }}>Benutzer: {userEmail || "-"}</p>
          <button
            type="button"
            onClick={() => {
              if (onLogout) return onLogout();
              if (onNavigate) onNavigate("/");
            }}
            style={PRIMARY_BTN}
          >
            Logout
          </button>
        </section>
      );
    }

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
            <button type="button" onClick={() => setView("home")} style={{ ...INPUT_STYLE, minHeight: 42, cursor: "pointer", textAlign: "left", background: view === "home" ? "rgba(212,168,83,0.12)" : "#111" }}>Start</button>
            <button type="button" onClick={() => setView("customers")} style={{ ...INPUT_STYLE, minHeight: 42, cursor: "pointer", textAlign: "left", background: view === "customers" ? "rgba(212,168,83,0.12)" : "#111" }}>Kunden</button>
            <button type="button" onClick={() => setView("new-report")} style={{ ...INPUT_STYLE, minHeight: 42, cursor: "pointer", textAlign: "left", background: view === "new-report" ? "rgba(212,168,83,0.12)" : "#111" }}>Neuer Rapport</button>
            <button type="button" onClick={() => setView("reports")} style={{ ...INPUT_STYLE, minHeight: 42, cursor: "pointer", textAlign: "left", background: view === "reports" ? "rgba(212,168,83,0.12)" : "#111" }}>Alle Rapporte</button>
            <button type="button" onClick={() => setView("trash")} style={{ ...INPUT_STYLE, minHeight: 42, cursor: "pointer", textAlign: "left", background: view === "trash" ? "rgba(212,168,83,0.12)" : "#111" }}>Papierkorb</button>
            <button type="button" onClick={() => setView("settings")} style={{ ...INPUT_STYLE, minHeight: 42, cursor: "pointer", textAlign: "left", background: view === "settings" ? "rgba(212,168,83,0.12)" : "#111" }}>Einstellungen</button>
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
