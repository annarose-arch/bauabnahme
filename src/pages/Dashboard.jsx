import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import { COLORS, STATUS_COLORS, inputStyle } from "../lib/constants.js";
import { toNumber, calcHours, parseCustomerMeta } from "../lib/utils.js";
import RenderView from "./RenderView.jsx";

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

  /* Initial load: customers, projects, active reports */
  useEffect(() => {
    if (!userId) {
      /* eslint-disable react-hooks/set-state-in-effect -- reset lists when session ends */
      setCustomers([]);
      setProjects([]);
      setReports([]);
      setTrashReports([]);
      /* eslint-enable react-hooks/set-state-in-effect */
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
        const list = data || [];
        const ids = list.map((c) => c.id);
        if (!ids.length) {
          setProjects([]);
        } else {
          const { data: proj, error: projErr } = await supabase
            .from("projects")
            .select("*")
            .in("customer_id", ids)
            .order("created_at", { ascending: false });
          if (projErr) setProjects([]);
          else setProjects(proj || []);
        }
      }
      await fetchReports();
    };
    load();
  }, [userId]);

  useEffect(() => {
    if (view === "reports") {
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- view-scoped loading flag */
      setLoading(true);
      fetchReports().finally(() => setLoading(false));
    }
  }, [view]);

  useEffect(() => {
    if (view === "trash") {
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- view-scoped loading flag */
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

  const renderStatus = (status) => (
    <span style={{ color: STATUS_COLORS[status] || COLORS.muted, fontWeight: 700 }}>{status || "-"}</span>
  );

  const resetOverlays = () => {
    setOpenedReport(null);
    setSelectedCustomerDetail(null);
  };

  const navBtn = (active) => ({
    ...inputStyle,
    minHeight: 42,
    cursor: "pointer",
    textAlign: "left",
    background: active ? "rgba(212,168,83,0.12)" : "#111"
  });

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" }}>
        <aside style={{ borderRight: `1px solid ${COLORS.border}`, background: COLORS.panel, padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 16 }}>
            Bau<span style={{ color: COLORS.gold }}>Abnahme</span>
          </div>
          <nav style={{ display: "grid", gap: 8 }}>
            <button type="button" onClick={() => { resetOverlays(); setView("home"); }} style={navBtn(view === "home")}>Start</button>
            <button type="button" onClick={() => { resetOverlays(); setView("customers"); }} style={navBtn(view === "customers")}>Kunden</button>
            <button type="button" onClick={() => { resetOverlays(); setView("new-report"); }} style={navBtn(view === "new-report")}>Neuer Rapport</button>
            <button type="button" onClick={() => { resetOverlays(); setView("reports"); }} style={navBtn(view === "reports")}>Alle Rapporte</button>
            <button type="button" onClick={() => { resetOverlays(); setView("katalog"); }} style={navBtn(view === "katalog")}>Katalog</button>
            <button type="button" onClick={() => { resetOverlays(); setView("rechnungen"); }} style={navBtn(view === "rechnungen")}>Rechnungen</button>
            <button type="button" onClick={() => { resetOverlays(); setView("trash"); }} style={navBtn(view === "trash")}>Papierkorb</button>
            <button type="button" onClick={() => { resetOverlays(); setView("settings"); }} style={navBtn(view === "settings")}>Einstellungen</button>
          </nav>
        </aside>

        <main style={{ padding: 20 }}>
          {notice ? (
            <div style={{ marginBottom: 12, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 12px", color: COLORS.muted }}>
              {notice}
            </div>
          ) : null}
          <RenderView
            view={view}
            openedReport={openedReport}
            setOpenedReport={setOpenedReport}
            selectedCustomerDetail={selectedCustomerDetail}
            setSelectedCustomerDetail={setSelectedCustomerDetail}
            renderStatus={renderStatus}
            userEmail={userEmail}
            reports={reports}
            trashReports={trashReports}
            customers={customers}
            projects={projects}
            loading={loading}
            openReports={openReports}
            customerForm={customerForm}
            setCustomerForm={setCustomerForm}
            reportForm={reportForm}
            setReportForm={setReportForm}
            workRows={workRows}
            setWorkRows={setWorkRows}
            materialRows={materialRows}
            setMaterialRows={setMaterialRows}
            customerProjects={customerProjects}
            vat={vat}
            total={total}
            handleCustomerSelectInReport={handleCustomerSelectInReport}
            handleProjectSelectInReport={handleProjectSelectInReport}
            handleSaveReport={handleSaveReport}
            handleAddCustomer={handleAddCustomer}
            handleDeleteCustomer={handleDeleteCustomer}
            handleAddProject={handleAddProject}
            handleMoveToTrash={handleMoveToTrash}
            handleRestore={handleRestore}
            handleHardDelete={handleHardDelete}
            handleUpdateReportStatus={handleUpdateReportStatus}
            setView={setView}
            language={language}
            setLanguage={setLanguage}
            showUpgrade={showUpgrade}
            setShowUpgrade={setShowUpgrade}
            setNotice={setNotice}
            onLogout={onLogout}
            onNavigate={onNavigate}
          />
        </main>
      </div>
    </div>
  );
}
