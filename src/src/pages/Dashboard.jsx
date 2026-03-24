import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../supabase";

// ── Lib ────────────────────────────────────────────────────────────────────
import { BG, PANEL, CARD, TEXT, GOLD, BORDER, iStyle, pBtn, gBtn } from "../lib/constants";
import { toNum, calcHours, parseReport, parseCustomerMeta, formatDateCH } from "../lib/utils";
import { buildRapportHtml, buildRechnungHtml, buildSwissQR } from "../lib/pdfBuilder";

// ── Shared UI ──────────────────────────────────────────────────────────────
import { NoticeBanner, DemoBanner, SectionCard } from "../components/UI";

// ── Features ───────────────────────────────────────────────────────────────
import { RapporteListe, RapportDetail, Papierkorb } from "../features/rapporte/RapporteViews";
import { RapportForm } from "../features/rapporte/RapportForm";
import { KundenView, KundenDetail } from "../features/kunden/KundenViews";
import { RechnungenView, RechnungModal } from "../features/rechnungen/RechnungenViews";
import { KatalogView } from "../features/katalog/KatalogView";
import { EinstellungenView } from "../features/einstellungen/EinstellungenView";

// ══════════════════════════════════════════════════════════════════════════
export default function Dashboard({ session, onLogout, onNavigate, isDemo = false }) {
  const userId    = session?.user?.id;
  const userEmail = session?.user?.email || "";

  // ── Navigation ───────────────────────────────────────────────────────────
  const [view, setView]                     = useState("home");
  const [openedReport, setOpenedReport]     = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingReport, setEditingReport]   = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const goTo = (v) => {
    setOpenedReport(null); setSelectedCustomer(null);
    setEditingReport(null); setView(v); setMobileSidebarOpen(false);
  };

  // ── Data ─────────────────────────────────────────────────────────────────
  const [reports, setReports]               = useState([]);
  const [trashReports, setTrashReports]     = useState([]);
  const [archivedReports, setArchivedReports] = useState([]);
  const [customers, setCustomers]           = useState([]);
  const [projects, setProjects]             = useState([]);
  const [notice, setNotice]                 = useState("");
  const showNotice = useCallback((msg) => { setNotice(msg); setTimeout(() => setNotice(""), 4000); }, []);

  // ── Invoices (localStorage) ───────────────────────────────────────────────
  const [invoices, setInvoices] = useState(() => {
    try { return JSON.parse(localStorage.getItem("bauabnahme_invoices") || "[]"); } catch { return []; }
  });
  const saveInvoiceToStorage = (inv) => {
    const updated = [inv, ...invoices.filter(i => i.id !== inv.id)];
    setInvoices(updated);
    localStorage.setItem("bauabnahme_invoices", JSON.stringify(updated));
  };
  const deleteInvoice = (id) => {
    const updated = invoices.filter(i => i.id !== id);
    setInvoices(updated);
    localStorage.setItem("bauabnahme_invoices", JSON.stringify(updated));
  };

  // ── Rapport/Invoice Nummern ───────────────────────────────────────────────
  const [nextRapportNr, setNextRapportNrState] = useState(() => parseInt(localStorage.getItem("bauabnahme_next_rapport_nr") || "1001"));
  const [nextInvoiceNr, setNextInvoiceNrState] = useState(() => parseInt(localStorage.getItem("bauabnahme_next_invoice_nr") || "1001"));
  const bumpRapportNr = () => { const n = nextRapportNr; setNextRapportNrState(n + 1); localStorage.setItem("bauabnahme_next_rapport_nr", String(n + 1)); return n; };
  const bumpInvoiceNr = () => { const n = nextInvoiceNr; setNextInvoiceNrState(n + 1); localStorage.setItem("bauabnahme_next_invoice_nr", String(n + 1)); return n; };

  // ── Catalog ───────────────────────────────────────────────────────────────
  const [catalog, setCatalog] = useState(() => {
    try { return JSON.parse(localStorage.getItem("bauabnahme_catalog") || '{"employees":[],"materials":[]}'); } catch { return { employees: [], materials: [] }; }
  });
  const saveCatalog = (updated) => { setCatalog(updated); localStorage.setItem("bauabnahme_catalog", JSON.stringify(updated)); };

  // ── Forms ─────────────────────────────────────────────────────────────────
  const emptyForm = { selectedCustomerId: "", selectedProjectId: "", customer: "", address: "", zip: "", city: "", orderNo: "", customerEmail: "", date: new Date().toISOString().slice(0, 10), status: "offen", expenses: "", notes: "", beforePhoto: "", afterPhoto: "", signerName: "", signatureImage: "" };
  const [customerForm, setCustomerForm] = useState({ company: "", firstName: "", lastName: "", address: "", zip: "", city: "", phone: "", email: "" });
  const [reportForm, setReportForm]     = useState(emptyForm);
  const [workRows, setWorkRows]         = useState([{ employee: "", from: "", to: "", rate: "" }]);
  const [materialRows, setMaterialRows] = useState([{ name: "", qty: "", unit: "", price: "" }]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);

  // ── Totals ────────────────────────────────────────────────────────────────
  const customerProjects = useMemo(() => projects.filter(p => String(p.customer_id) === String(reportForm.selectedCustomerId)), [projects, reportForm.selectedCustomerId]);
  const workSubtotal     = useMemo(() => workRows.reduce((s, r) => s + calcHours(r.from, r.to) * toNum(r.rate), 0), [workRows]);
  const materialSubtotal = useMemo(() => materialRows.reduce((s, r) => s + toNum(r.qty) * toNum(r.price), 0), [materialRows]);
  const expenses  = toNum(reportForm.expenses);
  const subtotal  = workSubtotal + materialSubtotal + expenses;
  const vat       = subtotal * 0.081;
  const total     = subtotal + vat;

  // ── Invoice Modal ─────────────────────────────────────────────────────────
  const [invoiceModal, setInvoiceModal]         = useState(null);
  const [invoiceDiscount, setInvoiceDiscount]   = useState("0");
  const [invoiceSkonto, setInvoiceSkonto]       = useState("0");
  const [invoicePayDays, setInvoicePayDays]     = useState("30");
  const [invoiceSkontoDays, setInvoiceSkontoDays] = useState("10");

  const openInvoice = (report) => {
    setInvoiceDiscount("0"); setInvoiceSkonto("0");
    setInvoicePayDays("30"); setInvoiceSkontoDays("10");
    setInvoiceModal(report);
  };

  // ══════════════════════════════════════════════════════════════════════════
  // Supabase helpers
  // ══════════════════════════════════════════════════════════════════════════
  const fetchCustomers = async () => {
    if (!userId) return [];
    const { data } = await supabase.from("customers").select("*").eq("user_id", userId).order("id", { ascending: false });
    setCustomers(data || []); return data || [];
  };
  const fetchProjects = async (list) => {
    if (!list?.length) { setProjects([]); return; }
    const { data } = await supabase.from("projects").select("*").in("customer_id", list.map(c => c.id));
    setProjects(data || []);
  };
  const fetchReports = async () => {
    if (!userId) return;
    const { data, error } = await supabase.from("reports").select("*").eq("user_id", userId).neq("status", "geloescht").order("id", { ascending: false });
    if (error) { showNotice("Ladefehler: " + error.message); return; }
    const all = data || [];
    setReports(all.filter(r => r.status !== "archiviert" && r.status !== "gesendet"));
    setArchivedReports(all.filter(r => r.status === "archiviert" || r.status === "gesendet"));
  };
  const fetchTrash = async () => {
    if (!userId) return;
    const { data, error } = await supabase.from("reports").select("*").eq("user_id", userId).eq("status", "geloescht").order("id", { ascending: false });
    if (error) return;
    setTrashReports(data || []);
  };

  useEffect(() => {
    if (isDemo) {
      const all = JSON.parse(localStorage.getItem("demo_reports") || "[]");
      setReports(all.filter(r => r.status !== "geloescht" && r.status !== "archiviert" && r.status !== "gesendet"));
      setArchivedReports(all.filter(r => r.status === "archiviert" || r.status === "gesendet"));
      setTrashReports(all.filter(r => r.status === "geloescht"));
      return;
    }
    if (!userId) return;
    fetchCustomers().then(c => fetchProjects(c));
    fetchReports();
  }, [userId, isDemo]);

  // ══════════════════════════════════════════════════════════════════════════
  // Mutations
  // ══════════════════════════════════════════════════════════════════════════
  const handleCustomerSelect = (id) => {
    const c = customers.find(x => String(x.id) === String(id)); if (!c) return;
    const m = parseCustomerMeta(c);
    setReportForm(p => ({ ...p, selectedCustomerId: String(c.id), selectedProjectId: "", customer: c.name || "", customerEmail: c.email || "", address: m.address || "", zip: m.zip || "", city: m.city || "" }));
  };

  const handleSave = async () => {
    if (!reportForm.customer.trim()) { showNotice("Bitte Firmenname eingeben."); return; }
    const sp = customerProjects.find(p => String(p.id) === String(reportForm.selectedProjectId));
    const rapportNr = editingReport ? (parseReport(editingReport).rapportNr || editingReport.id) : bumpRapportNr();
    const payload = {
      rapportNr, customer: reportForm.customer.trim(), customerEmail: reportForm.customerEmail.trim(),
      address: reportForm.address.trim(), zip: reportForm.zip || "", city: reportForm.city || "",
      orderNo: reportForm.orderNo.trim(), date: reportForm.date, status: reportForm.status,
      customerId: reportForm.selectedCustomerId || null, projectId: reportForm.selectedProjectId || null,
      projectName: sp?.name || reportForm.projectSearch || "", projektnummer: sp?.projektnummer || "",
      photos: { before: reportForm.beforePhoto, after: reportForm.afterPhoto },
      workRows: workRows.map(r => ({ ...r, hours: calcHours(r.from, r.to), total: calcHours(r.from, r.to) * toNum(r.rate) })),
      materialRows: materialRows.map(r => ({ ...r, total: toNum(r.qty) * toNum(r.price) })),
      costs: { expenses, notes: reportForm.notes },
      totals: { subtotal, vat, total },
      signature: { name: reportForm.signerName, image: reportForm.signatureImage },
    };
    const row = { user_id: userId, customer: reportForm.customer.trim(), date: reportForm.date, status: reportForm.status, description: JSON.stringify(payload) };

    if (isDemo) {
      const all = JSON.parse(localStorage.getItem("demo_reports") || "[]");
      if (editingReport) { const i = all.findIndex(r => r.id === editingReport.id); if (i >= 0) all[i] = { ...row, id: editingReport.id }; }
      else all.unshift({ ...row, id: Date.now(), created_at: new Date().toISOString() });
      localStorage.setItem("demo_reports", JSON.stringify(all));
      setReports(all.filter(r => r.status !== "geloescht" && r.status !== "archiviert" && r.status !== "gesendet"));
    } else {
      let err;
      if (editingReport) { ({ error: err } = await supabase.from("reports").update(row).eq("id", editingReport.id).eq("user_id", userId)); }
      else { ({ error: err } = await supabase.from("reports").insert([row])); }
      if (err) { showNotice("❌ Fehler: " + (err.message || err.details || JSON.stringify(err))); console.error(err); return; }
      await fetchReports();
    }
    setEditingReport(null); setReportForm(emptyForm);
    setWorkRows([{ employee: "", from: "", to: "", rate: "" }]);
    setMaterialRows([{ name: "", qty: "", unit: "", price: "" }]);
    showNotice(editingReport ? "Rapport aktualisiert." : "Rapport gespeichert.");
    goTo("reports");
  };

  const startEdit = (r) => {
    const p = parseReport(r);
    setReportForm({ selectedCustomerId: String(p.customerId || ""), selectedProjectId: String(p.projectId || ""), customer: r.customer || "", address: p.address || "", zip: p.zip || "", city: p.city || "", orderNo: p.orderNo || "", customerEmail: p.customerEmail || "", date: r.date || emptyForm.date, status: r.status || "offen", expenses: p.costs?.expenses ? String(p.costs.expenses) : "", notes: p.costs?.notes || "", beforePhoto: p.photos?.before || "", afterPhoto: p.photos?.after || "", signerName: p.signature?.name || "", signatureImage: p.signature?.image || "" });
    setWorkRows(p.workRows?.length ? p.workRows.map(r => ({ employee: r.employee || "", from: r.from || "", to: r.to || "", rate: r.rate ? String(r.rate) : "" })) : [{ employee: "", from: "", to: "", rate: "" }]);
    setMaterialRows(p.materialRows?.length ? p.materialRows.map(r => ({ name: r.name || "", qty: r.qty ? String(r.qty) : "", unit: r.unit || "", price: r.price ? String(r.price) : "" })) : [{ name: "", qty: "", unit: "", price: "" }]);
    setEditingReport(r); setOpenedReport(null); setView("new-report");
  };

  const moveToTrash = async (r) => {
    if (!window.confirm("Löschen?")) return;
    const deleted = { ...r, status: "geloescht" };
    if (isDemo) {
      const all = JSON.parse(localStorage.getItem("demo_reports") || "[]");
      localStorage.setItem("demo_reports", JSON.stringify(all.map(x => x.id === r.id ? deleted : x)));
    } else {
      const { error } = await supabase.from("reports").update({ status: "geloescht" }).eq("id", r.id).eq("user_id", userId);
      if (error) { showNotice("Fehler: " + error.message); return; }
    }
    setReports(p => p.filter(x => x.id !== r.id));
    setArchivedReports(p => p.filter(x => x.id !== r.id));
    setTrashReports(p => [...p, deleted]);
    if (openedReport?.id === r.id) setOpenedReport(null);
  };

  const restore = async (r) => {
    if (isDemo) {
      const all = JSON.parse(localStorage.getItem("demo_reports") || "[]");
      localStorage.setItem("demo_reports", JSON.stringify(all.map(x => x.id === r.id ? { ...x, status: "offen" } : x)));
    } else {
      const { error } = await supabase.from("reports").update({ status: "offen" }).eq("id", r.id).eq("user_id", userId);
      if (error) { showNotice("Fehler: " + error.message); return; }
    }
    setTrashReports(p => p.filter(x => x.id !== r.id));
    setReports(p => [{ ...r, status: "offen" }, ...p]);
  };

  const hardDelete = async (r) => {
    if (!window.confirm("Endgültig löschen?")) return;
    if (isDemo) {
      const all = JSON.parse(localStorage.getItem("demo_reports") || "[]").filter(x => x.id !== r.id);
      localStorage.setItem("demo_reports", JSON.stringify(all));
      setTrashReports(all.filter(x => x.status === "geloescht"));
    } else {
      const { error } = await supabase.from("reports").delete().eq("id", r.id).eq("user_id", userId);
      if (error) { showNotice("Fehler: " + error.message); return; }
    }
    setTrashReports(p => p.filter(x => x.id !== r.id));
    showNotice("Gelöscht.");
  };

  const updateStatus = async (id, status) => {
    if (isDemo) {
      const all = JSON.parse(localStorage.getItem("demo_reports") || "[]").map(x => x.id === id ? { ...x, status } : x);
      localStorage.setItem("demo_reports", JSON.stringify(all));
      setReports(all.filter(r => r.status !== "geloescht" && r.status !== "archiviert" && r.status !== "gesendet"));
      setArchivedReports(all.filter(r => r.status === "archiviert" || r.status === "gesendet"));
      setOpenedReport(null); return;
    }
    const { error } = await supabase.from("reports").update({ status }).eq("id", id).eq("user_id", userId);
    if (error) { showNotice("Fehler: " + error.message); return; }
    await fetchReports();
    setOpenedReport(null);
    if (status === "archiviert" || status === "gesendet") showNotice("✅ Rapport zum Kunden verschoben.");
  };

  const saveCustomer = async () => {
    if (!userId || !customerForm.company.trim()) { showNotice("Firmenname fehlt."); return; }
    const meta = { kundennummer: `K-${String(customers.length + 1).padStart(3, "0")}`, firstName: customerForm.firstName, lastName: customerForm.lastName, address: customerForm.address, zip: customerForm.zip, city: customerForm.city };
    const { data, error } = await supabase.from("customers").insert({ user_id: userId, name: customerForm.company.trim(), address: JSON.stringify(meta), phone: customerForm.phone, email: customerForm.email }).select("*").single();
    if (error) { showNotice("Fehler beim Speichern."); return; }
    setCustomers(p => [data, ...p]);
    showNotice("Kunde gespeichert.");
    setCustomerForm({ company: "", firstName: "", lastName: "", address: "", zip: "", city: "", phone: "", email: "" });
  };

  const deleteCustomer = async (c) => {
    if (!window.confirm("Löschen?")) return;
    await supabase.from("customers").delete().eq("id", c.id);
    setCustomers(p => p.filter(x => x.id !== c.id));
  };

  // ── PDF / Email ───────────────────────────────────────────────────────────
  const getFirmMeta = () => {
    const meta = session?.user?.user_metadata || {};
    return {
      firmName: meta.company_name || "",
      firmLogo: meta.company_logo || "",
      firmAddress: meta.address ? `${meta.address}, ${meta.zip || ""} ${meta.city || ""}` : "",
      firmContact: [meta.first_name, meta.last_name].filter(Boolean).join(" "),
      firmPhone: meta.phone ? `Tel: ${meta.phone}` : "",
      firmEmail: meta.email || userEmail,
      firmIban: meta.iban || "",
      firmZip: meta.zip || "",
      firmCity: meta.city || "",
    };
  };

  const openPDF = (report) => {
    const p = parseReport(report);
    const { firmName, firmLogo, firmAddress, firmContact, firmPhone, firmEmail } = getFirmMeta();
    const isPro = localStorage.getItem("bauabnahme_plan") === "pro" || localStorage.getItem("bauabnahme_plan") === "team";
    const isDemoMode = !userId || userId === "demo-user";
    const email = p.customerEmail || "";
    const subj = `Rapport Nr. ${p.rapportNr || report.id} – ${report.customer || "-"} – ${formatDateCH(report.date)}`;
    const body = `Guten Tag\n\nIm Anhang finden Sie den Rapport Nr. ${p.rapportNr || "-"}\n\nKunde: ${report.customer || "-"}\nDatum: ${formatDateCH(report.date)}\nTOTAL CHF: ${Number(p.totals?.total || 0).toFixed(2)}\n\nFreundliche Grüsse\n${firmContact || firmName}`;
    const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
    const win = window.open("", "_blank", "width=980,height=760"); if (!win) return;
    win.document.write(buildRapportHtml(report, p, firmName, firmLogo, firmAddress, firmContact, firmPhone, firmEmail, isPro, isDemoMode, mailto, customers, parseCustomerMeta));
    win.document.close();
  };

  const downloadAndEmail = async (report) => {
    openPDF(report);
    await updateStatus(report.id, "archiviert");
    showNotice("✅ Rapport gesendet und ins Kundenarchiv verschoben.");
  };

  const generateInvoice = async (report, discountPct, skontoPct, payDays, skontoDays) => {
    setInvoiceModal(null);
    const p = parseReport(report);
    const { firmName, firmLogo, firmAddress, firmContact, firmPhone, firmEmail, firmIban, firmZip, firmCity } = getFirmMeta();
    const isPro = localStorage.getItem("bauabnahme_plan") === "pro" || localStorage.getItem("bauabnahme_plan") === "team";
    const isDemoMode = !userId || userId === "demo-user";
    const custRecord = customers.find(c => String(c.id) === String(p.customerId) || c.name === report.customer);
    const custMeta = custRecord ? parseCustomerMeta(custRecord) : {};
    const custStreet = p.address || custMeta.address || "";
    const custZip = p.zip || custMeta.zip || "";
    const custCity = p.city || custMeta.city || "";
    const custAddr = [custStreet, [custZip, custCity].filter(Boolean).join(" ")].filter(Boolean).join("\n");
    const tot = p.totals || {}, costs = p.costs || {};
    const invoiceNr = `RE-${bumpInvoiceNr()}`;
    const validWork = (p.workRows || []).filter(r => r.employee || toNum(r.hours) > 0 || toNum(r.total) > 0);
    const validMat  = (p.materialRows || []).filter(r => r.name || toNum(r.qty) > 0);
    const sub = Number(tot.subtotal || 0);
    const discountAmt = sub * (discountPct / 100);
    const subAfterDiscount = sub - discountAmt;
    const vatAmt = subAfterDiscount * 0.081;
    const totalAmount = subAfterDiscount + vatAmt + toNum(costs.expenses);
    const skontoAmt = totalAmount * (skontoPct / 100);
    const payDaysNum = parseInt(payDays) || 30;
    const skontoDaysNum = parseInt(skontoDays) || 10;
    const dueDate = formatDateCH(new Date(new Date(report.date).getTime() + payDaysNum * 86400000).toISOString().slice(0, 10));
    const skontoDueDate = formatDateCH(new Date(new Date(report.date).getTime() + skontoDaysNum * 86400000).toISOString().slice(0, 10));
    const qrUrl = firmIban ? buildSwissQR(firmIban, totalAmount, firmName || firmContact, firmAddress, firmZip, firmCity, report.customer || "", custAddr, "", "", "", `Rechnung ${invoiceNr}`) : "";
    const firmDetails = [firmContact && firmName ? firmContact : "", firmAddress, firmPhone, firmEmail].filter(Boolean).join("<br/>");

    const win = window.open("", "_blank", "width=980,height=860"); if (!win) return;
    win.document.write(buildRechnungHtml({
      invoiceNr, firmName, firmLogo, firmContact, firmAddress, firmDetails,
      name: report.customer || "-", custAddr, custStreet, custZip, custCity,
      validWork, validMat, costs, subtotal: sub, discountPct, discountAmt,
      subtotalAfterDiscount: subAfterDiscount, vat: vatAmt, totalAmount,
      skontoPct, skontoAmt, payDays: payDaysNum, skontoDays: skontoDaysNum,
      dueDate, skontoDueDate, qrUrl, isPro, isDemoMode,
      reportDate: report.date, projectName: p.projectName,
    }));
    win.document.close();

    const inv = { id: Date.now(), invoiceNr, customer: report.customer, customerId: p.customerId, date: report.date, totalAmount, status: "entwurf", reportData: p };
    saveInvoiceToStorage(inv);
  };

  const reopenInvoice = (inv) => {
    const win = window.open("", "_blank", "width=980,height=860"); if (!win) return;
    const { firmName, firmLogo, firmContact, firmAddress, firmPhone, firmEmail } = getFirmMeta();
    const firmDetails = [firmContact && firmName ? firmContact : "", firmAddress, firmPhone, firmEmail].filter(Boolean).join("<br/>");
    const p = inv.reportData || {};
    win.document.write(buildRechnungHtml({
      invoiceNr: inv.invoiceNr, firmName, firmLogo, firmContact, firmAddress, firmDetails,
      name: inv.customer || "-", custAddr: "", custStreet: p.address || "", custZip: p.zip || "", custCity: p.city || "",
      validWork: (p.workRows || []).filter(r => r.employee || toNum(r.hours) > 0),
      validMat: (p.materialRows || []).filter(r => r.name || toNum(r.qty) > 0),
      costs: p.costs || {}, subtotal: Number(p.totals?.subtotal || 0),
      discountPct: 0, discountAmt: 0, subtotalAfterDiscount: Number(p.totals?.subtotal || 0),
      vat: Number(p.totals?.vat || 0), totalAmount: inv.totalAmount,
      skontoPct: 0, skontoAmt: 0, payDays: 30, skontoDays: 10,
      dueDate: "-", skontoDueDate: "-", qrUrl: "",
      isPro: localStorage.getItem("bauabnahme_plan") === "pro",
      isDemoMode: !userId, reportDate: inv.date, projectName: p.projectName,
    }));
    win.document.close();
  };

  // ══════════════════════════════════════════════════════════════════════════
  // Render
  // ══════════════════════════════════════════════════════════════════════════
  const renderView = () => {
    if (openedReport) return (
      <RapportDetail
        report={openedReport}
        onBack={() => setOpenedReport(null)}
        onEdit={startEdit} onPDF={openPDF} onEmail={downloadAndEmail}
        onInvoice={openInvoice} onStatusChange={updateStatus}
      />
    );

    if (selectedCustomer) return (
      <KundenDetail
        customer={selectedCustomer} reports={reports} archivedReports={archivedReports} invoices={invoices}
        onBack={() => setSelectedCustomer(null)}
        onOpenReport={r => { setSelectedCustomer(null); setOpenedReport(r); }}
        onEditReport={r => { setSelectedCustomer(null); startEdit(r); }}
        onPDF={openPDF} onInvoice={openInvoice}
        onDeleteReport={async (r) => {
          const deleted = { ...r, status: "geloescht" };
          if (!isDemo) { const { error } = await supabase.from("reports").update({ status: "geloescht" }).eq("id", r.id).eq("user_id", userId); if (error) { showNotice("Fehler: " + error.message); return; } }
          setArchivedReports(p => p.filter(x => x.id !== r.id));
          setReports(p => p.filter(x => x.id !== r.id));
          setTrashReports(p => [...p, deleted]);
          showNotice("🗑 Rapport in den Papierkorb verschoben.");
        }}
        onReopenInvoice={reopenInvoice}
        onMarkInvoiceSent={inv => { saveInvoiceToStorage({ ...inv, status: "versendet" }); showNotice("✅ Als versendet markiert."); }}
        onDeleteInvoice={deleteInvoice}
        showNotice={showNotice}
      />
    );

    if (view === "home") return (
      <SectionCard>
        <h2 style={{ marginTop: 0 }}>Start</h2>
        <p style={{ color: MUTED }}>Willkommen, {userEmail || "Demo"}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          {[{ l: "Rapporte", v: reports.length }, { l: "Offen", v: reports.filter(r => r.status === "offen").length }, { l: "Kunden", v: customers.length }].map(s => (
            <div key={s.l} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14 }}>
              <div style={{ color: MUTED, fontSize: 13 }}>{s.l}</div>
              <strong style={{ fontSize: 26, color: GOLD }}>{s.v}</strong>
            </div>
          ))}
        </div>
      </SectionCard>
    );

    if (view === "customers") return (
      <KundenView customerForm={customerForm} setCustomerForm={setCustomerForm} customers={customers}
        onSave={saveCustomer} onSelect={setSelectedCustomer} onDelete={deleteCustomer} />
    );

    if (view === "new-report") return (
      <RapportForm
        editingReport={editingReport} reportForm={reportForm} setReportForm={setReportForm}
        workRows={workRows} setWorkRows={setWorkRows} materialRows={materialRows} setMaterialRows={setMaterialRows}
        customers={customers} catalog={catalog}
        workSubtotal={workSubtotal} materialSubtotal={materialSubtotal} vat={vat} total={total}
        showCustomerSuggestions={showCustomerSuggestions} setShowCustomerSuggestions={setShowCustomerSuggestions}
        onCustomerSelect={handleCustomerSelect} onSave={handleSave}
        onCancel={() => { setEditingReport(null); setReportForm(emptyForm); setWorkRows([{ employee: "", from: "", to: "", rate: "" }]); setMaterialRows([{ name: "", qty: "", unit: "", price: "" }]); goTo("reports"); }}
      />
    );

    if (view === "reports") return (
      <RapporteListe reports={reports} archivedReports={archivedReports}
        onOpen={setOpenedReport} onEdit={startEdit} onPDF={openPDF} onDelete={moveToTrash} />
    );

    if (view === "invoices") return (
      <RechnungenView invoices={invoices} onReopen={reopenInvoice}
        onMarkSent={inv => { saveInvoiceToStorage({ ...inv, status: "versendet" }); showNotice("✅ Rechnung als versendet markiert."); }}
        onDelete={id => { if (window.confirm("Rechnung löschen?")) deleteInvoice(id); }} />
    );

    if (view === "trash") return (
      <Papierkorb trashReports={trashReports} onRestore={restore} onHardDelete={hardDelete} />
    );

    if (view === "catalog") return (
      <KatalogView catalog={catalog} onSaveCatalog={saveCatalog} showNotice={showNotice} />
    );

    if (view === "settings") return (
      <EinstellungenView
        session={session} userEmail={userEmail} showNotice={showNotice}
        onLogout={onLogout} onNavigate={onNavigate}
        nextRapportNr={nextRapportNr} setNextRapportNrState={setNextRapportNrState}
        nextInvoiceNr={nextInvoiceNr} setNextInvoiceNrState={setNextInvoiceNrState}
      />
    );

    return null;
  };

  // ── Layout ────────────────────────────────────────────────────────────────
  const MUTED = "#b9b0a3";
  const navItems = [
    { key: "home", label: "Start" }, { key: "customers", label: "Kunden" },
    { key: "catalog", label: "Katalog" }, { key: "new-report", label: "Neuer Rapport" },
    { key: "reports", label: "Offene Rapporte" }, { key: "invoices", label: "Rechnungen" },
    { key: "trash", label: "Papierkorb" }, { key: "settings", label: "Einstellungen" },
  ];
  const activeView = editingReport ? "new-report" : openedReport ? "reports" : selectedCustomer ? "customers" : view;

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, fontFamily: "Inter,system-ui,sans-serif" }}>
      <style>{`*{box-sizing:border-box}input,select,textarea{max-width:100%}@media(max-width:768px){.dash-sidebar{display:none!important}.dash-sidebar.open{display:block!important;position:fixed;top:0;left:0;width:240px;height:100vh;z-index:200;overflow-y:auto}.dash-mh{display:flex!important}.dash-grid{grid-template-columns:1fr!important}}@media(min-width:769px){.dash-mh{display:none!important}}`}</style>

      {/* Rechnung Modal */}
      <RechnungModal
        invoiceModal={invoiceModal} onClose={() => setInvoiceModal(null)}
        invoiceDiscount={invoiceDiscount} setInvoiceDiscount={setInvoiceDiscount}
        invoiceSkonto={invoiceSkonto} setInvoiceSkonto={setInvoiceSkonto}
        invoicePayDays={invoicePayDays} setInvoicePayDays={setInvoicePayDays}
        invoiceSkontoDays={invoiceSkontoDays} setInvoiceSkontoDays={setInvoiceSkontoDays}
        onGenerate={generateInvoice} parseReport={parseReport}
      />

      {/* Mobile Header */}
      <div className="dash-mh" style={{ display: "none", position: "sticky", top: 0, zIndex: 150, background: PANEL, borderBottom: `1px solid ${BORDER}`, padding: "10px 16px", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>Bau<span style={{ color: GOLD }}>Abnahme</span></div>
        <button type="button" onClick={() => setMobileSidebarOpen(p => !p)} style={{ ...gBtn, minHeight: 34, padding: "0 10px" }}>{mobileSidebarOpen ? "✕" : "☰"}</button>
      </div>

      {mobileSidebarOpen && <div onClick={() => setMobileSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 199 }} />}

      <div className="dash-grid" style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" }}>
        {/* Sidebar */}
        <aside className={`dash-sidebar${mobileSidebarOpen ? " open" : ""}`} style={{ borderRight: `1px solid ${BORDER}`, background: PANEL, padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 16 }}>Bau<span style={{ color: GOLD }}>Abnahme</span></div>
          <nav style={{ display: "grid", gap: 6 }}>
            {navItems.map(item => (
              <button key={item.key} type="button" onClick={() => goTo(item.key)}
                style={{ ...iStyle, minHeight: 42, cursor: "pointer", textAlign: "left", background: activeView === item.key ? "rgba(212,168,83,0.15)" : "#111", borderColor: activeView === item.key ? GOLD : BORDER, color: activeView === item.key ? GOLD : TEXT, fontWeight: activeView === item.key ? 700 : 400 }}>
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main style={{ padding: 20, minWidth: 0 }}>
          {isDemo && <DemoBanner onNavigate={onNavigate} pBtn={pBtn} gBtn={gBtn} />}
          <NoticeBanner message={notice} />
          {renderView()}
        </main>
      </div>
    </div>
  );
}
