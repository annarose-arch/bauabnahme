import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "../supabase";
import { buildPdfHtml, formatDateCH, generateInvoice } from "../exportUtils";

const BG = "#0a0a0a", PANEL = "#141414", CARD = "#1a1a1a";
const TEXT = "#f0ece4", MUTED = "#b9b0a3", GOLD = "#d4a853";
const BORDER = "rgba(212,168,83,0.25)", DANGER = "#e05c5c";

const iStyle = { minHeight: 40, borderRadius: 8, border: `1px solid ${BORDER}`, background: PANEL, color: TEXT, padding: "0 10px" };
const pBtn = { minHeight: 38, borderRadius: 8, border: "none", background: GOLD, color: "#111", fontWeight: 700, cursor: "pointer", padding: "0 14px" };
const gBtn = { minHeight: 38, borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: TEXT, cursor: "pointer", padding: "0 14px" };
const dBtn = { minHeight: 34, borderRadius: 8, border: `1px solid ${DANGER}`, background: "transparent", color: DANGER, cursor: "pointer", padding: "0 10px", fontSize: 13 };

function toNum(v) { const n = parseFloat(v); return isFinite(n) ? n : 0; }

function calcHours(from, to) {
  if (!from || !to || from.length < 4 || to.length < 4) return 0;
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  if ([fh, fm, th, tm].some(isNaN)) return 0;
  const s = fh * 60 + fm;
  let e = th * 60 + tm;
  if (e <= s) e += 1440;
  const d = e - s;
  if (d <= 0 || d > 1440) return 0;
  return Math.round(d / 60 * 100) / 100;
}

function parseJson(v, fb = {}) { try { return JSON.parse(v) || fb; } catch { return fb; } }
function parseReport(r) { return parseJson(r?.description, {}); }
function parseCustomerMeta(c) { return parseJson(c?.address, {}); }

function SignaturePad({ value, onChange }) {
  const ref = useRef(null);
  const drawing = useRef(false);
  const last = useRef(null);
  const getPos = (e, c) => {
    const r = c.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (cx - r.left) * (c.width / r.width), y: (cy - r.top) * (c.height / r.height) };
  };
  const start = (e) => { e.preventDefault(); drawing.current = true; last.current = getPos(e, ref.current); };
  const draw = (e) => {
    e.preventDefault();
    if (!drawing.current) return;
    const c = ref.current, ctx = c.getContext("2d"), p = getPos(e, c);
    ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last.current = p;
  };
  const end = (e) => { e.preventDefault(); if (!drawing.current) return; drawing.current = false; onChange(ref.current.toDataURL()); };
  const clear = () => { ref.current.getContext("2d").clearRect(0, 0, 600, 160); onChange(""); };
  useEffect(() => { if (!value && ref.current) ref.current.getContext("2d").clearRect(0, 0, 600, 160); }, [value]);
  return (
    <div>
      <canvas ref={ref} width={600} height={160}
        style={{ display: "block", width: "100%", height: 160, border: `1px solid ${BORDER}`, borderRadius: 8, background: "#111", touchAction: "none", cursor: "crosshair" }}
        onMouseDown={start} onMouseMove={draw} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={draw} onTouchEnd={end} />
      <button type="button" onClick={clear} style={{ ...gBtn, marginTop: 6, fontSize: 13, minHeight: 32 }}>Unterschrift löschen</button>
    </div>
  );
}

function PhotoUpload({ label, value, onChange }) {
  const ref = useRef(null);
  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => onChange(ev.target.result);
    r.readAsDataURL(f);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ color: MUTED, fontSize: 13 }}>{label}</span>
      {value ? (
        <div style={{ position: "relative" }}>
          <img src={value} alt={label} style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 8, border: `1px solid ${BORDER}` }} />
          <button type="button" onClick={() => onChange("")} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: 13 }}>✕</button>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()} style={{ ...gBtn, minHeight: 80, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 4, fontSize: 13, color: MUTED }}>
          <span style={{ fontSize: 24 }}>📷</span><span>Foto hinzufügen</span>
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={onFile} />
    </div>
  );
}

export default function Dashboard({ session, onLogout, onNavigate, isDemo = false }) {
  const userId = session?.user?.id;
  const userEmail = session?.user?.email || "";

  const [view, setView] = useState("home");
  const [reports, setReports] = useState([]);
  const [trashReports, setTrashReports] = useState([]);
  const [archivedReports, setArchivedReports] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [openedReport, setOpenedReport] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingReport, setEditingReport] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [settingsLang, setSettingsLang] = useState(() => localStorage.getItem("bauabnahme_language_pref") || "DE");
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(null);
  const [showProjectSuggestions, setShowProjectSuggestions] = useState(false);
  const [invoiceModal, setInvoiceModal] = useState(null);
  const [invoiceDiscount, setInvoiceDiscount] = useState("0");
  const [invoiceSkonto, setInvoiceSkonto] = useState("0");
  const [invoicePayDays, setInvoicePayDays] = useState("30");
  const [invoiceSkontoDays, setInvoiceSkontoDays] = useState("10");
  const [invoices, setInvoices] = useState(() => {
    try { return JSON.parse(localStorage.getItem("bauabnahme_invoices") || "[]"); } catch { return []; }
  });
  const [openedInvoice, setOpenedInvoice] = useState(null); // stored invoice object
  const [editingInvoice, setEditingInvoice] = useState(null); // invoice being edited

  // Fortlaufende Nummern
  const [nextRapportNr, setNextRapportNrState] = useState(() => parseInt(localStorage.getItem("bauabnahme_next_rapport_nr") || "1001"));
  const [nextInvoiceNr, setNextInvoiceNrState] = useState(() => parseInt(localStorage.getItem("bauabnahme_next_invoice_nr") || "1001"));
  const bumpRapportNr = () => {
    const next = nextRapportNr + 1;
    setNextRapportNrState(next);
    localStorage.setItem("bauabnahme_next_rapport_nr", String(next));
    return nextRapportNr;
  };
  const bumpInvoiceNr = () => {
    const next = nextInvoiceNr + 1;
    setNextInvoiceNrState(next);
    localStorage.setItem("bauabnahme_next_invoice_nr", String(next));
    return nextInvoiceNr;
  };

  const saveInvoiceToStorage = (inv) => {
    const updated = invoices.filter(i => i.id !== inv.id);
    updated.unshift(inv);
    setInvoices(updated);
    localStorage.setItem("bauabnahme_invoices", JSON.stringify(updated));
  };

  const deleteInvoice = (id) => {
    const updated = invoices.filter(i => i.id !== id);
    setInvoices(updated);
    localStorage.setItem("bauabnahme_invoices", JSON.stringify(updated));
  };

  // Katalog: Mitarbeiter & Material
  const [catalog, setCatalog] = useState(() => {
    try { return JSON.parse(localStorage.getItem("bauabnahme_catalog") || '{"employees":[],"materials":[]}'); } catch { return {employees:[],materials:[]}; }
  });
  const [catalogTab, setCatalogTab] = useState("employees");
  const [newEmployee, setNewEmployee] = useState({ name: "", rate: "" });
  const [newMaterial, setNewMaterial] = useState({ name: "", unit: "", price: "" });

  const saveCatalog = (updated) => {
    setCatalog(updated);
    localStorage.setItem("bauabnahme_catalog", JSON.stringify(updated));
  };

  const emptyForm = {
    selectedCustomerId: "", selectedProjectId: "", customer: "", address: "", zip: "", city: "",
    orderNo: "", customerEmail: "", date: new Date().toISOString().slice(0, 10),
    status: "offen", expenses: "", notes: "", beforePhoto: "", afterPhoto: "",
    signerName: "", signatureImage: ""
  };

  const [customerForm, setCustomerForm] = useState({ company: "", firstName: "", lastName: "", address: "", zip: "", city: "", phone: "", email: "", costCenter: "", projectName: "", projectNumber: "" });
  const [reportForm, setReportForm] = useState(emptyForm);
  const [workRows, setWorkRows] = useState([{ employee: "", from: "", to: "", rate: "" }]);
  const [materialRows, setMaterialRows] = useState([{ name: "", qty: "", unit: "", price: "" }]);

  const customerProjects = useMemo(() => projects.filter(p => String(p.customer_id) === String(reportForm.selectedCustomerId)), [projects, reportForm.selectedCustomerId]);
  const workSubtotal = useMemo(() => workRows.reduce((s, r) => s + calcHours(r.from, r.to) * toNum(r.rate), 0), [workRows]);
  const materialSubtotal = useMemo(() => materialRows.reduce((s, r) => s + toNum(r.qty) * toNum(r.price), 0), [materialRows]);
  const expenses = toNum(reportForm.expenses);
  const subtotal = workSubtotal + materialSubtotal + expenses;
  const vat = subtotal * 0.081;
  const total = subtotal + vat;

  const showNotice = useCallback((msg) => { setNotice(msg); setTimeout(() => setNotice(""), 4000); }, []);

  const fetchCustomers = async () => {
    if (!userId) return [];
    const { data } = await supabase.from("customers").select("*").eq("user_id", userId).order("id", { ascending: false });
    setCustomers(data || []);
    return data || [];
  };

  const fetchProjects = async (list) => {
    if (!list?.length) { setProjects([]); return; }
    const { data } = await supabase.from("projects").select("*").in("customer_id", list.map(c => c.id));
    setProjects(data || []);
  };

  const fetchReports = async () => {
    if (!userId) return;
    // Sortierung nach id (desc) statt created_at – created_at existiert nicht in allen Tabellen
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("user_id", userId)
      .neq("status", "geloescht")
      .order("id", { ascending: false });
    if (error) {
      console.error("fetchReports error:", error);
      showNotice("Ladefehler: " + error.message);
      return;
    }
    const all = data || [];
    setReports(all.filter(r => r.status !== "archiviert" && r.status !== "gesendet"));
    setArchivedReports(all.filter(r => r.status === "archiviert" || r.status === "gesendet"));
  };

  const fetchTrash = async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "geloescht")
      .order("id", { ascending: false });
    if (error) { console.error("fetchTrash error:", error); return; }
    setTrashReports(data || []);
  };

  useEffect(() => {
    if (isDemo) {
      const demoReports = JSON.parse(localStorage.getItem("demo_reports") || "[]");
      setReports(demoReports.filter(r => r.status !== "geloescht" && r.status !== "archiviert" && r.status !== "gesendet"));
      setArchivedReports(demoReports.filter(r => r.status === "archiviert" || r.status === "gesendet"));
      setTrashReports(demoReports.filter(r => r.status === "geloescht"));
      return;
    }
    if (!userId) return;
    fetchCustomers().then(c => fetchProjects(c));
    fetchReports();
  }, [userId, isDemo]);

  // Kein Re-fetch bei View-Wechsel – State wird direkt aktualisiert
  // fetchReports/fetchTrash nur beim Login und nach Mutationen aufgerufen

  const goTo = (v) => { setOpenedReport(null); setSelectedCustomer(null); setEditingReport(null); setView(v); setMobileSidebarOpen(false); };

  const handleCustomerSelect = (id) => {
    const c = customers.find(x => String(x.id) === String(id));
    if (!c) return;
    const m = parseCustomerMeta(c);
    setReportForm(p => ({ ...p, selectedCustomerId: String(c.id), selectedProjectId: "", customer: c.name || "", customerEmail: c.email || "", address: m.address || "", zip: m.zip || "", city: m.city || "" }));
  };

  const handleSave = async () => {
    if (!reportForm.customer.trim()) { showNotice("Bitte Firmenname eingeben."); return; }
    const sp = customerProjects.find(p => String(p.id) === String(reportForm.selectedProjectId));
    const rapportNr = editingReport ? (parseReport(editingReport).rapportNr || editingReport.id) : bumpRapportNr();
    const payload = {
      rapportNr, customer: reportForm.customer.trim(), customerEmail: reportForm.customerEmail.trim(),
      address: reportForm.address.trim(), zip: reportForm.zip||"", city: reportForm.city||"",
      orderNo: reportForm.orderNo.trim(), date: reportForm.date, status: reportForm.status,
      customerId: reportForm.selectedCustomerId || null, projectId: reportForm.selectedProjectId || null,
      projectName: sp?.name || reportForm.projectSearch || "", projektnummer: sp?.projektnummer || "",
      photos: { before: reportForm.beforePhoto, after: reportForm.afterPhoto },
      workRows: workRows.map(r => ({ ...r, hours: calcHours(r.from, r.to), total: calcHours(r.from, r.to) * toNum(r.rate) })),
      materialRows: materialRows.map(r => ({ ...r, total: toNum(r.qty) * toNum(r.price) })),
      costs: { expenses, notes: reportForm.notes },
      totals: { subtotal, vat, total },
      signature: { name: reportForm.signerName, image: reportForm.signatureImage }
    };
    const row = { user_id: userId, customer: reportForm.customer.trim(), date: reportForm.date, status: reportForm.status, description: JSON.stringify(payload) };
    if (!userId) { showNotice("Fehler: Kein Benutzer. Bitte neu einloggen."); return; }
    if (isDemo) {
      const demoReports = JSON.parse(localStorage.getItem("demo_reports") || "[]");
      if (editingReport) {
        const idx = demoReports.findIndex(r => r.id === editingReport.id);
        if (idx >= 0) demoReports[idx] = { ...row, id: editingReport.id };
      } else {
        demoReports.unshift({ ...row, id: Date.now(), created_at: new Date().toISOString() });
      }
      localStorage.setItem("demo_reports", JSON.stringify(demoReports));
      setReports(demoReports.filter(r => r.status !== "geloescht" && r.status !== "archiviert" && r.status !== "gesendet"));
    } else {
      // FIX: Sicherstellen dass user_id korrekt gesetzt und RLS passt
      const saveRow = { ...row, user_id: userId };
      let saveError = null;
      if (editingReport) {
        const { error } = await supabase
          .from("reports")
          .update(saveRow)
          .eq("id", editingReport.id)
          .eq("user_id", userId);
        saveError = error;
      } else {
        const { error } = await supabase
          .from("reports")
          .insert([saveRow]);
        saveError = error;
      }
      if (saveError) {
        const msg = saveError.message || saveError.details || saveError.hint || JSON.stringify(saveError);
        showNotice("❌ Fehler: " + msg);
        console.error("Save error:", saveError);
        return;
      }
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
    const deletedReport = { ...r, status: "geloescht" };
    if (isDemo) {
      const all = JSON.parse(localStorage.getItem("demo_reports") || "[]");
      const updated = all.map(x => x.id === r.id ? deletedReport : x);
      localStorage.setItem("demo_reports", JSON.stringify(updated));
    } else {
      const { error: trashErr } = await supabase
        .from("reports")
        .update({ status: "geloescht" })
        .eq("id", r.id)
        .eq("user_id", userId);
      if (trashErr) { showNotice("Fehler: " + trashErr.message); return; }
    }
    // State direkt aktualisieren – kein fetchReports/fetchTrash nötig
    setReports(p => p.filter(x => x.id !== r.id));
    setArchivedReports(p => p.filter(x => x.id !== r.id));
    setTrashReports(p => [...p, deletedReport]);
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
    const restored = { ...r, status: "offen" };
    setTrashReports(p => p.filter(x => x.id !== r.id));
    setReports(p => [restored, ...p]);
  };

  const hardDelete = async (r) => {
    if (!window.confirm("Endgültig löschen?")) return;
    if (isDemo) {
      const all = JSON.parse(localStorage.getItem("demo_reports") || "[]").filter(x => x.id !== r.id);
      localStorage.setItem("demo_reports", JSON.stringify(all));
      setTrashReports(all.filter(x => x.status === "geloescht"));
    } else {
        const {error: delErr} = await supabase.from("reports").delete().eq("id", r.id).eq("user_id", userId);
      if (delErr) { showNotice("Fehler: " + delErr.message); return; }
    }
    // State direkt aktualisieren
    setTrashReports(p => p.filter(x => x.id !== r.id));
    setArchivedReports(p => p.filter(x => x.id !== r.id));
    setReports(p => p.filter(x => x.id !== r.id));
    showNotice("Gelöscht.");
  };

  const updateStatus = async (id, status) => {
    if (isDemo) {
      const all = JSON.parse(localStorage.getItem("demo_reports") || "[]");
      const updated = all.map(x => x.id === id ? { ...x, status } : x);
      localStorage.setItem("demo_reports", JSON.stringify(updated));
      setReports(updated.filter(r => r.status !== "geloescht" && r.status !== "archiviert" && r.status !== "gesendet"));
      setArchivedReports(updated.filter(r => r.status === "archiviert" || r.status === "gesendet"));
      setOpenedReport(null);
      return;
    }
    // Supabase Update
    const { error } = await supabase
      .from("reports")
      .update({ status })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) { showNotice("Fehler: " + error.message); return; }

    // Nach Supabase-Update: kompletten State neu laden (sicher & korrekt)
    await fetchReports();
    setOpenedReport(null);
    if (status === "archiviert" || status === "gesendet") {
      showNotice("✅ Rapport zum Kunden verschoben.");
    }
  };
    if (!win) return;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>Rechnung ${invoiceNr}</title>
<style>*{box-sizing:border-box}@page{margin:16mm;size:A4}body{font-family:Arial,sans-serif;color:#111;margin:0;padding:32px;font-size:14px;max-width:800px;margin:0 auto}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:16px;border-bottom:2px solid #111}.firm-name{font-size:22px;font-weight:900}.firm-details{font-size:12px;color:#333;line-height:1.7;margin-top:4px}.invoice-label{font-size:28px;font-weight:900;text-align:right}.invoice-meta{font-size:13px;color:#333;text-align:right;line-height:1.9}.address-block{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:8px}.address-box{border-left:3px solid #111;padding:10px 14px}.address-label{font-size:10px;text-transform:uppercase;color:#666;font-weight:700;margin-bottom:4px;letter-spacing:1px}.project-line{margin:16px 0 24px;padding:8px 0;border-bottom:1px solid #ddd;font-size:14px;font-style:italic;color:#333}table{width:100%;border-collapse:collapse;margin-bottom:16px}th{background:#111;color:#fff;padding:8px 10px;font-size:12px;text-align:left;font-weight:700}td{padding:7px 10px;font-size:13px;border-bottom:1px solid #eee}.section-title{font-size:11px;text-transform:uppercase;letter-spacing:1.5px;font-weight:800;margin:20px 0 6px;border-bottom:2px solid #111;padding-bottom:4px}.totals-box{display:flex;justify-content:flex-end;margin-bottom:20px}.totals-inner{width:320px}.totals-row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#333;border-bottom:1px solid #eee}.totals-total{display:flex;justify-content:space-between;padding:10px 0 6px;font-size:20px;font-weight:900;border-top:2px solid #111;margin-top:4px}.skonto-box{background:#f5f5f5;border-left:3px solid #555;padding:10px 14px;font-size:12px;color:#333;margin-bottom:20px}.qr-section{border-top:2px solid #111;margin-top:28px;padding-top:18px;display:flex;gap:24px;align-items:flex-start}.qr-left{flex:1}.qr-title{font-size:15px;font-weight:800;margin-bottom:12px}.qr-fields{display:grid;gap:6px;font-size:12px;color:#333;line-height:1.6}.qr-label{font-size:10px;text-transform:uppercase;color:#666;font-weight:700;letter-spacing:1px}.qr-img{border:1px solid #ccc;padding:6px;background:#fff}.no-iban{background:#f5f5f5;border:2px dashed #999;border-radius:6px;padding:14px;font-size:13px;color:#555;text-align:center}.btn{background:#111;border:none;color:#fff;padding:10px 16px;border-radius:6px;font-weight:700;cursor:pointer;font-size:14px;margin-right:8px}@media print{.noprint{display:none}a[href]:after{content:none!important}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>
${inv.status==="entwurf"?'<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:80px;font-weight:900;color:rgba(0,0,0,0.06);white-space:nowrap;pointer-events:none;z-index:1000">ENTWURF</div>':""}
<div class="noprint" style="margin-bottom:20px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
  <button class="btn" onclick="window.print()">💾 Drucken / PDF</button>
</div>
<div class="header">
  <div>${firmLogo?`<img src="${firmLogo}" style="height:60px;max-width:160px;object-fit:contain;margin-bottom:8px;display:block"/>`:""}
    <div class="firm-name">${firmName||firmContact||""}</div>
    <div class="firm-details">${firmContact&&firmName?`<div>${firmContact}</div>`:""}${firmAddress?`<div>${firmAddress}, ${firmZip} ${firmCity}</div>`:""}${firmPhone?`<div>${firmPhone}</div>`:""}${firmEmail?`<div>${firmEmail}</div>`:""}${firmIban?`<div>IBAN: ${firmIban}</div>`:""}</div>
  </div>
  <div><div class="invoice-label">RECHNUNG</div>
    <div class="invoice-meta"><div><b>Nr.:</b> ${invoiceNr}</div><div><b>Datum:</b> ${formatDateCH(date)}</div><div><b>Fällig:</b> ${dueDate}</div>${p.orderNo?`<div><b>Auftrag-Nr:</b> ${p.orderNo}</div>`:""}</div>
  </div>
</div>
<div class="address-block">
  <div class="address-box"><div class="address-label">Rechnungssteller</div><strong>${firmName||firmContact||"-"}</strong><br/>${firmAddress?`${firmAddress}<br/>${firmZip} ${firmCity}`:""}</div>
  <div class="address-box"><div class="address-label">Rechnungsempfänger</div><strong>${customer}</strong><br/>${p.address||"-"}${(()=>{const zc=[p.zip,p.city].filter(Boolean).join(" ");return zc?`<br/>${zc}`:"";})()} </div>
</div>
${p.projectName?`<div class="project-line">${p.projectName}</div>`:`<div style="margin-bottom:24px"></div>`}
${validWork.length>0?`<div class="section-title">Arbeitsleistungen</div><table><thead><tr><th>Mitarbeiter</th><th style="text-align:center">Zeit</th><th style="text-align:center">Stunden</th><th style="text-align:right">Betrag</th></tr></thead><tbody>${wHtml}</tbody></table>`:""}
${validMat.length>0?`<div class="section-title">Material</div><table><thead><tr><th>Bezeichnung</th><th style="text-align:center">Menge</th><th style="text-align:center">Preis</th><th style="text-align:right">Betrag</th></tr></thead><tbody>${mHtml}</tbody></table>`:""}
<div class="totals-box"><div class="totals-inner">
  ${toNum(costs.expenses)>0?`<div class="totals-row"><span>Spesen</span><span>CHF ${Number(costs.expenses||0).toFixed(2)}</span></div>`:""}
  <div class="totals-row"><span>Subtotal</span><span>CHF ${subtotal.toFixed(2)}</span></div>
  ${(discountPct||0)>0?`<div class="totals-row"><span>Rabatt ${discountPct}%</span><span>− CHF ${discountAmt.toFixed(2)}</span></div>`:""}
  ${(skontoPct||0)>0?`<div class="totals-row" style="color:#555;font-size:12px"><span>Skonto ${skontoPct}% (bei Zahlung bis ${skontoDueDate})</span><span>− CHF ${skontoAmt.toFixed(2)}</span></div>`:""}
  <div class="totals-row"><span>MwSt 8.1%</span><span>CHF ${vat.toFixed(2)}</span></div>
  <div class="totals-total"><span>TOTAL CHF</span><span>${Number(totalAmount).toFixed(2)}</span></div>
</div></div>
${(skontoPct||0)>0?`<div class="skonto-box">Bei Zahlung innert 10 Tagen bis <b>${skontoDueDate}</b>: Zahlbetrag <b>CHF ${(totalAmount-skontoAmt).toFixed(2)}</b></div>`:""}
${costs.notes?`<div style="border-left:3px solid #111;padding:10px 14px;font-size:13px;margin-bottom:20px;color:#333"><b>Bemerkungen:</b> ${costs.notes}</div>`:""}
<div class="qr-section">
  <div class="qr-left"><div class="qr-title">Zahlung – Swiss QR-Bill</div>
    <div class="qr-fields">
      <div><div class="qr-label">Konto / Zahlbar an</div><div style="font-weight:700">${firmIban||"— IBAN in Einstellungen hinterlegen —"}</div></div>
      <div><div class="qr-label">Betrag</div><div style="font-size:16px;font-weight:900">CHF ${Number(totalAmount).toFixed(2)}</div></div>
      <div><div class="qr-label">Zahlbar bis</div><div>${dueDate}</div></div>
      <div><div class="qr-label">Mitteilung</div><div>Rechnung ${invoiceNr}</div></div>
    </div>
  </div>
  ${qrUrl?`<div><div style="font-size:11px;color:#666;margin-bottom:6px;text-align:center">QR-Code scannen</div><img src="${qrUrl}" class="qr-img" width="180" height="180" alt="Swiss QR Code"/></div>`:`<div class="no-iban">⚠️ Bitte IBAN in<br/><b>Einstellungen → Firmenprofil</b><br/>hinterlegen</div>`}
</div>
</body></html>`);
    win.document.close();
  };

  const openPDF = (report) => {
    const p = parseReport(report);
    const isPro = localStorage.getItem("bauabnahme_plan") === "pro" || localStorage.getItem("bauabnahme_plan") === "team";
    const isDemoMode = !userId || userId === "demo-user";
    const meta = session?.user?.user_metadata || {};
    const firmName = meta.company_name || "";
    const firmLogo = meta.company_logo || "";
    const firmAddress = meta.address ? `${meta.address}, ${meta.zip||""} ${meta.city||""}` : "";
    const firmContact = [meta.first_name, meta.last_name].filter(Boolean).join(" ");
    const firmPhone = meta.phone ? `Tel: ${meta.phone}` : "";
    const firmEmail = meta.email || userEmail;
    const name = report.customer || "-";
    const email = p.customerEmail || "";
    const subj = `Rapport Nr. ${p.rapportNr||report.id} – ${name} – ${formatDateCH(report.date)}`;
    const body = `Guten Tag\n\nIm Anhang finden Sie den Rapport Nr. ${p.rapportNr||"-"}\n\nKunde: ${name}\nDatum: ${formatDateCH(report.date)}\nTOTAL CHF: ${Number(p.totals?.total||0).toFixed(2)}\n\nFreundliche Grüsse\n${firmContact||firmName}`;
    const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
    const win = window.open("", "_blank", "width=980,height=760");
    if (!win) return;
    win.document.write(buildPdfHtml(report, p, firmName, firmLogo, firmAddress, firmContact, firmPhone, firmEmail, isPro, isDemoMode, mailto));
    win.document.close();
  };

  const downloadAndEmail = async (report) => {
    const p = parseReport(report);
    const isPro = localStorage.getItem("bauabnahme_plan") === "pro" || localStorage.getItem("bauabnahme_plan") === "team";
    const isDemoMode = !userId || userId === "demo-user";
    const meta = session?.user?.user_metadata || {};
    const firmName = meta.company_name || "";
    const firmLogo = meta.company_logo || "";
    const firmAddress = meta.address ? `${meta.address}, ${meta.zip||""} ${meta.city||""}` : "";
    const firmContact = [meta.first_name, meta.last_name].filter(Boolean).join(" ");
    const firmPhone = meta.phone ? `Tel: ${meta.phone}` : "";
    const firmEmail = meta.email || userEmail;
    const name = report.customer || "-";
    const email = p.customerEmail || "";
    const subj = `Rapport Nr. ${p.rapportNr||report.id} – ${name} – ${formatDateCH(report.date)}`;
    const body = `Guten Tag\n\nIm Anhang finden Sie den Abnahmerapport Nr. ${p.rapportNr||"-"}\n\nKunde: ${name}\nDatum: ${formatDateCH(report.date)}\nProjekt: ${p.projectName||"-"}\nTOTAL CHF: ${Number(p.totals?.total||0).toFixed(2)}\n\nFreundliche Grüsse\n${firmContact||firmName}`;
    const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
    const win = window.open("", "_blank", "width=980,height=760");
    if (!win) return;
    win.document.write(buildPdfHtml(report, p, firmName, firmLogo, firmAddress, firmContact, firmPhone, firmEmail, isPro, isDemoMode, mailto));
    win.document.close();
    // Auto-archivierung nach Versand (async)
    await updateStatus(report.id, "archiviert");
    showNotice("✅ Rapport gesendet und ins Kundenarchiv verschoben.");
  };

  const section = (children) => (
    <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
      {children}
    </section>
  );

  const renderView = () => {
    if (openedReport) {
      const p = parseReport(openedReport);
      const work = p.workRows || [], mat = p.materialRows || [], tot = p.totals || {}, costs = p.costs || {}, photos = p.photos || {}, sig = p.signature || {};
      return section(<>
        <h2 style={{ marginTop: 0 }}>Rapport Details</h2>
        <div style={{ display: "grid", gap: 5, marginBottom: 12 }}>
          <div><b>Rapport-Nr:</b> <span style={{ color: GOLD }}>{p.rapportNr || "-"}</span></div>
          <div><b>Kunde:</b> {openedReport.customer || "-"}</div>
          <div><b>Datum:</b> {openedReport.date || "-"}</div>
          <div><b>Auftrag-Nr:</b> {p.orderNo || "-"}</div>
          <div><b>Status:</b> <span style={{ color: GOLD }}>{openedReport.status}</span></div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{color:MUTED,fontSize:12,marginBottom:8}}>Status ändern:</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {["offen","bearbeitet","gesendet","archiviert"].map(s => (
              <button key={s} type="button"
                onClick={() => updateStatus(openedReport.id, s)}
                style={{
                  minHeight:34, borderRadius:8, padding:"0 14px", fontSize:13, cursor:"pointer",
                  fontWeight: openedReport.status===s ? 700 : 400,
                  background: openedReport.status===s ? GOLD : "transparent",
                  color: openedReport.status===s ? "#111" : (s==="gesendet"||s==="archiviert" ? GOLD : TEXT),
                  border: openedReport.status===s ? "none" : `1px solid ${s==="gesendet"||s==="archiviert" ? GOLD : BORDER}`,
                }}>
                {s==="gesendet" ? "📤 gesendet" : s==="archiviert" ? "📁 archiviert" : s}
              </button>
            ))}
          </div>
          {(openedReport.status==="gesendet"||openedReport.status==="archiviert") &&
            <div style={{fontSize:12,color:GOLD,marginTop:6}}>✅ Wird zum Kunden verschoben</div>}
        </div>
        {(photos.before || photos.after) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {["before","after"].map(k => <div key={k}><div style={{ color: MUTED, fontSize: 12 }}>{k==="before"?"Vorher":"Nachher"}</div>{photos[k]?<img src={photos[k]} style={{ width:"100%", maxHeight:180, objectFit:"cover", borderRadius:8 }}/>:<span style={{color:MUTED}}>Kein Foto</span>}</div>)}
          </div>
        )}
        <div style={{ marginBottom: 12 }}>
          <div><b>MwSt 8.1%:</b> CHF {Number(tot.vat||0).toFixed(2)}</div>
          <div style={{ color: GOLD, fontWeight: 800, fontSize: 22 }}>Total CHF {Number(tot.total||0).toFixed(2)}</div>
        </div>
        {sig.image && <img src={sig.image} style={{ width:280, border:`1px solid ${BORDER}`, borderRadius:8, marginBottom:12 }}/>}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <button type="button" onClick={() => { setOpenedReport(null); }} style={gBtn}>Zurück</button>
          <button type="button" onClick={() => startEdit(openedReport)} style={pBtn}>✏️ Bearbeiten</button>
          <button type="button" onClick={() => openPDF(openedReport)} style={pBtn}>🖨 PDF / Drucken</button>
          <button type="button" onClick={() => downloadAndEmail(openedReport)} style={{...pBtn, background:"transparent", border:`1px solid ${GOLD}`, color:GOLD}}>📧 Per E-Mail senden</button>
          <button type="button" onClick={() => openInvoice(openedReport)} style={{...pBtn, background:"#1a472a", border:`1px solid #2d7a45`, color:"#7ddb9a"}}>🧾 Rechnung erstellen</button>
        </div>
      </>);
    }

    if (selectedCustomer) {
      const m = parseCustomerMeta(selectedCustomer);
      // FIX: Alle Rapporte des Kunden – aktive + archivierte
      const allCustomerReports = [...reports, ...archivedReports];
      const linked = allCustomerReports.filter(r => {
        const rp = parseReport(r);
        return String(rp.customerId) === String(selectedCustomer.id) || r.customer === selectedCustomer.name;
      });
      const revenue = linked.reduce((s, r) => s + toNum(parseReport(r)?.totals?.total), 0);
      return section(<>
        <h2 style={{ marginTop:0 }}>{selectedCustomer.name}</h2>
        <div style={{ display:"grid", gap:4, marginBottom:14 }}>
          <div><b>Kundennummer:</b> {m.kundennummer||"-"}</div>
          <div><b>Ansprechperson:</b> {[m.firstName,m.lastName].filter(Boolean).join(" ")||"-"}</div>
          <div><b>Adresse:</b> {m.address||"-"}, {m.zip||"-"} {m.city||"-"}</div>
          <div><b>Telefon:</b> {selectedCustomer.phone||"-"}</div>
          <div><b>E-Mail:</b> {selectedCustomer.email||"-"}</div>
        </div>
        <h3>Verknüpfte Rapporte ({linked.length})</h3>
        {linked.length === 0 && <p style={{color:MUTED,fontSize:13}}>Noch keine Rapporte für diesen Kunden.</p>}
        <div style={{display:"grid",gap:8,marginBottom:14}}>
        {linked.map(r => {
          const rp = parseReport(r);
          return (
            <div key={r.id} style={{ border:`1px solid ${r.status==="archiviert"||r.status==="gesendet"?GOLD:BORDER}`, borderRadius:10, padding:"12px 14px", background:"rgba(255,255,255,0.02)" }}>
              {/* Rapport-Info – klickbar zum Öffnen */}
              <button type="button" onClick={()=>{ setSelectedCustomer(null); setOpenedReport(r); }}
                style={{display:"block",width:"100%",textAlign:"left",background:"transparent",border:"none",cursor:"pointer",marginBottom:10,padding:0}}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:6 }}>
                  <div>
                    <div style={{marginBottom:3}}>
                      <strong style={{color:GOLD,fontSize:15}}>Nr. {rp.rapportNr||"—"}</strong>
                      <span style={{color:MUTED,fontSize:13}}> · {formatDateCH(r.date)}</span>
                    </div>
                    {rp.projectName&&<div style={{color:TEXT,fontSize:13,fontWeight:500}}>📋 {rp.projectName}</div>}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                    <span style={{fontSize:12,color:r.status==="archiviert"||r.status==="gesendet"?GOLD:MUTED,border:`1px solid ${r.status==="archiviert"||r.status==="gesendet"?GOLD:BORDER}`,borderRadius:4,padding:"2px 8px",fontWeight:700}}>{r.status}</span>
                    <span style={{fontWeight:800,color:GOLD,fontSize:15}}>CHF {toNum(rp.totals?.total).toFixed(2)}</span>
                  </div>
                </div>
              </button>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",borderTop:`1px solid ${BORDER}`,paddingTop:8}}>
                <button type="button" onClick={()=>{ setSelectedCustomer(null); startEdit(r); }} style={{...gBtn,minHeight:32,fontSize:13}}>✏️ Bearbeiten</button>
                <button type="button" onClick={()=>openPDF(r)} style={{...gBtn,minHeight:32,fontSize:13}}>🖨 PDF</button>
                <button type="button" onClick={()=>openInvoice(r)} style={{...gBtn,minHeight:32,fontSize:13,color:"#7ddb9a",borderColor:"#2d7a45"}}>🧾 Rechnung</button>
                <button type="button" onClick={async()=>{
                  if(!window.confirm("Rapport in den Papierkorb verschieben?"))return;
                  const deleted={...r,status:"geloescht"};
                  if(isDemo){
                    const all=JSON.parse(localStorage.getItem("demo_reports")||"[]");
                    localStorage.setItem("demo_reports",JSON.stringify(all.map(x=>x.id===r.id?deleted:x)));
                  } else {
                    const{error}=await supabase.from("reports").update({status:"geloescht"}).eq("id",r.id).eq("user_id",userId);
                    if(error){showNotice("Fehler: "+error.message);return;}
                  }
                  setArchivedReports(p=>p.filter(x=>x.id!==r.id));
                  setReports(p=>p.filter(x=>x.id!==r.id));
                  setTrashReports(p=>[...p,deleted]);
                  showNotice("🗑 Rapport in den Papierkorb verschoben.");
                }} style={{...dBtn,minHeight:32,fontSize:13}}>🗑 Löschen</button>
              </div>
            </div>
          );
        })}
        </div>
        {/* Rechnungen für diesen Kunden */}
        {(() => {
          const custInvoices = invoices.filter(inv =>
            String(inv.customerId) === String(selectedCustomer.id) || inv.customer === selectedCustomer.name
          );
          if (custInvoices.length === 0) return null;
          return <>
            <h3 style={{marginBottom:8,marginTop:4}}>🧾 Rechnungen ({custInvoices.length})</h3>
            <div style={{display:"grid",gap:8,marginBottom:14}}>
              {custInvoices.map(inv=>(
                <div key={inv.id} style={{border:`1px solid ${inv.status==="versendet"?GOLD:BORDER}`,borderRadius:10,padding:"12px 14px",background:"rgba(255,255,255,0.02)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <div>
                      <strong style={{color:GOLD}}>{inv.invoiceNr}</strong>
                      <span style={{color:MUTED,fontSize:12,marginLeft:8}}>{formatDateCH(inv.date)}</span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontWeight:800,color:TEXT}}>CHF {Number(inv.totalAmount).toFixed(2)}</span>
                      <span style={{fontSize:11,padding:"2px 8px",borderRadius:4,fontWeight:700,
                        border:`1px solid ${inv.status==="versendet"?GOLD:BORDER}`,
                        color:inv.status==="versendet"?GOLD:MUTED}}>
                        {inv.status==="versendet"?"✅ Versendet":"📝 Entwurf"}
                      </span>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap",borderTop:`1px solid ${BORDER}`,paddingTop:8}}>
                    <button type="button" onClick={()=>reopenInvoice(inv)} style={{...gBtn,minHeight:32,fontSize:13}}>🖨 Öffnen</button>
                    {inv.status==="entwurf"&&<button type="button" onClick={()=>{
                      saveInvoiceToStorage({...inv,status:"versendet"});
                      showNotice("✅ Als versendet markiert.");
                    }} style={{...pBtn,minHeight:32,fontSize:13}}>✅ Versendet</button>}
                    <button type="button" onClick={()=>{if(window.confirm("Rechnung löschen?"))deleteInvoice(inv.id);}} style={{...dBtn,minHeight:32,fontSize:13}}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </>;
        })()}
        <div style={{ color:GOLD, fontWeight:800, fontSize:20, marginTop:4, marginBottom:14 }}>Gesamtumsatz CHF {revenue.toFixed(2)}</div>
        <button type="button" onClick={() => setSelectedCustomer(null)} style={gBtn}>Zurück</button>
      </>);
    }

    if (view === "home") return section(<>
      <h2 style={{ marginTop:0 }}>Start</h2>
      <p style={{ color:MUTED }}>Willkommen, {userEmail||"Demo"}</p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
        {[{l:"Rapporte",v:reports.length},{l:"Offen",v:reports.filter(r=>r.status==="offen").length},{l:"Kunden",v:customers.length}].map(s=>(
          <div key={s.l} style={{ border:`1px solid ${BORDER}`, borderRadius:10, padding:14 }}>
            <div style={{ color:MUTED, fontSize:13 }}>{s.l}</div>
            <strong style={{ fontSize:26, color:GOLD }}>{s.v}</strong>
          </div>
        ))}
      </div>
    </>);

    if (view === "customers") return section(<>
      <h2 style={{ marginTop:0 }}>Kunden</h2>
      <div style={{ display:"grid", gap:8, marginBottom:14 }}>
        <input placeholder="Firmenname *" value={customerForm.company} onChange={e=>setCustomerForm(p=>({...p,company:e.target.value}))} style={iStyle}/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          <input placeholder="Vorname" value={customerForm.firstName} onChange={e=>setCustomerForm(p=>({...p,firstName:e.target.value}))} style={iStyle}/>
          <input placeholder="Nachname" value={customerForm.lastName} onChange={e=>setCustomerForm(p=>({...p,lastName:e.target.value}))} style={iStyle}/>
        </div>
        <input placeholder="Adresse" value={customerForm.address} onChange={e=>setCustomerForm(p=>({...p,address:e.target.value}))} style={iStyle}/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:8 }}>
          <input placeholder="PLZ" value={customerForm.zip} onChange={e=>setCustomerForm(p=>({...p,zip:e.target.value}))} style={iStyle}/>
          <input placeholder="Ort" value={customerForm.city} onChange={e=>setCustomerForm(p=>({...p,city:e.target.value}))} style={iStyle}/>
        </div>
        <input placeholder="Telefon" value={customerForm.phone} onChange={e=>setCustomerForm(p=>({...p,phone:e.target.value}))} style={iStyle}/>
        <input placeholder="Email" value={customerForm.email} onChange={e=>setCustomerForm(p=>({...p,email:e.target.value}))} style={iStyle}/>
        <button type="button" onClick={async()=>{
          if(!userId||!customerForm.company.trim()){showNotice("Firmenname fehlt.");return;}
          const meta={kundennummer:`K-${String(customers.length+1).padStart(3,"0")}`,firstName:customerForm.firstName,lastName:customerForm.lastName,address:customerForm.address,zip:customerForm.zip,city:customerForm.city};
          const{data,error}=await supabase.from("customers").insert({user_id:userId,name:customerForm.company.trim(),address:JSON.stringify(meta),phone:customerForm.phone,email:customerForm.email}).select("*").single();
          if(error){showNotice("Fehler.");return;}
          setCustomers(p=>[data,...p]);showNotice("Kunde gespeichert.");
          setCustomerForm({company:"",firstName:"",lastName:"",address:"",zip:"",city:"",phone:"",email:"",costCenter:"",projectName:"",projectNumber:""});
        }} style={pBtn}>Kunden speichern</button>
      </div>
      <div style={{ display:"grid", gap:8 }}>
        {customers.map(c=>(
          <div key={c.id} style={{ border:`1px solid ${BORDER}`, borderRadius:10, padding:"10px 12px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <button type="button" onClick={()=>setSelectedCustomer(c)} style={{ border:"none", background:"transparent", color:TEXT, fontWeight:700, cursor:"pointer" }}>{c.name}</button>
            <button type="button" onClick={async()=>{ if(!window.confirm("Löschen?"))return; await supabase.from("customers").delete().eq("id",c.id); setCustomers(p=>p.filter(x=>x.id!==c.id)); }} style={dBtn}>Löschen</button>
          </div>
        ))}
      </div>
    </>);

    if (view === "new-report") return section(<>
      <h2 style={{ marginTop:0 }}>{editingReport?"Rapport bearbeiten":"Neuer Rapport"}</h2>
      <div style={{ display:"grid", gap:10 }}>
        <div style={{ position:"relative" }}>
          <input placeholder="Firmenname eingeben..." value={reportForm.customer}
            onChange={e=>{ setReportForm(p=>({...p,customer:e.target.value,selectedCustomerId:""})); setShowCustomerSuggestions(true); }}
            onFocus={()=>setShowCustomerSuggestions(true)} onBlur={()=>setTimeout(()=>setShowCustomerSuggestions(false),150)}
            style={{ ...iStyle, width:"100%", boxSizing:"border-box" }} autoComplete="off"/>
          {showCustomerSuggestions && reportForm.customer.length>0 && customers.filter(c=>c.name.toLowerCase().includes(reportForm.customer.toLowerCase())).length>0 && (
            <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:50, background:CARD, border:`1px solid ${BORDER}`, borderRadius:8, marginTop:2, maxHeight:200, overflowY:"auto" }}>
              {customers.filter(c=>c.name.toLowerCase().includes(reportForm.customer.toLowerCase())).map(c=>(
                <button key={c.id} type="button" onMouseDown={()=>handleCustomerSelect(String(c.id))}
                  style={{ display:"block", width:"100%", textAlign:"left", padding:"10px 12px", background:"transparent", border:"none", color:TEXT, cursor:"pointer", borderBottom:`1px solid ${BORDER}` }}>
                  <strong>{c.name}</strong>
                </button>
              ))}
            </div>
          )}
        </div>
        <input placeholder="Projektname (optional)" value={reportForm.projectSearch||""} 
          onChange={e=>setReportForm(p=>({...p,projectSearch:e.target.value}))} style={iStyle}/>
        <input placeholder="Adresse (Strasse)" value={reportForm.address} onChange={e=>setReportForm(p=>({...p,address:e.target.value}))} style={iStyle}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:8}}>
          <input placeholder="PLZ" value={reportForm.zip||""} onChange={e=>setReportForm(p=>({...p,zip:e.target.value}))} style={iStyle}/>
          <input placeholder="Ort" value={reportForm.city||""} onChange={e=>setReportForm(p=>({...p,city:e.target.value}))} style={iStyle}/>
        </div>
        <input placeholder="Kunde E-Mail" value={reportForm.customerEmail} onChange={e=>setReportForm(p=>({...p,customerEmail:e.target.value}))} style={iStyle}/>
        <input placeholder="Auftrag-Nr" value={reportForm.orderNo} onChange={e=>setReportForm(p=>({...p,orderNo:e.target.value}))} style={iStyle}/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <input type="date" value={reportForm.date} onChange={e=>setReportForm(p=>({...p,date:e.target.value}))} style={iStyle}/>
          <select value={reportForm.status} onChange={e=>setReportForm(p=>({...p,status:e.target.value}))} style={iStyle}>
            {["offen","gesendet","archiviert"].map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
        <h3 style={{ marginBottom:4 }}>📷 Fotos</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <PhotoUpload label="Vorher" value={reportForm.beforePhoto} onChange={v=>setReportForm(p=>({...p,beforePhoto:v}))}/>
          <PhotoUpload label="Nachher" value={reportForm.afterPhoto} onChange={v=>setReportForm(p=>({...p,afterPhoto:v}))}/>
        </div>
        <h3 style={{ marginBottom:4 }}>⏱ Arbeitsstunden</h3>
        <button type="button" onClick={()=>setWorkRows(p=>[...p,{employee:"",from:"",to:"",rate:""}])} style={{ ...pBtn, width:180 }}>+ Zeile hinzufügen</button>
        {workRows.map((row,i)=>{
          const h=calcHours(row.from,row.to), t=h*toNum(row.rate);
          const isCustomEmp = row._customEmployee;
          return <div key={i} style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${BORDER}`, borderRadius:8, padding:"10px 12px", marginBottom:6 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:8, marginBottom:8 }}>
              {catalog.employees.length>0 && !isCustomEmp ? (
                <select value={row.employee||""} onChange={e=>{
                  if(e.target.value==="__custom__"){setWorkRows(p=>p.map((r,j)=>j===i?{...r,employee:"",_customEmployee:true}:r));return;}
                  const emp=catalog.employees.find(x=>x.name===e.target.value);
                  setWorkRows(p=>p.map((r,j)=>j===i?{...r,employee:e.target.value,rate:emp?.rate||r.rate,_customEmployee:false}:r));
                }} style={{...iStyle,width:"100%"}}>
                  <option value="">Mitarbeiter wählen...</option>
                  {catalog.employees.map(emp=><option key={emp.id} value={emp.name}>{emp.name}{emp.rate?` — CHF ${emp.rate}/h`:""}</option>)}
                  <option value="__custom__">✏️ Manuell eingeben</option>
                </select>
              ) : (
                <div style={{display:"flex",gap:6}}>
                  <input placeholder="Mitarbeiter" value={row.employee} onChange={e=>setWorkRows(p=>p.map((r,j)=>j===i?{...r,employee:e.target.value}:r))} style={{...iStyle,flex:1}}/>
                  {catalog.employees.length>0&&<button type="button" onClick={()=>setWorkRows(p=>p.map((r,j)=>j===i?{...r,_customEmployee:false,employee:""}:r))} style={{...gBtn,fontSize:11,minHeight:34,padding:"0 8px"}}>↩ Dropdown</button>}
                </div>
              )}
              <button type="button" onClick={()=>setWorkRows(p=>p.filter((_,j)=>j!==i))} style={{ ...dBtn, minWidth:34 }} disabled={workRows.length===1}>✕</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8 }}>
              <div><div style={{ color:MUTED, fontSize:11, marginBottom:3 }}>Von (HH:MM)</div><input placeholder="07:00" value={row.from} onChange={e=>setWorkRows(p=>p.map((r,j)=>j===i?{...r,from:e.target.value}:r))} style={iStyle}/></div>
              <div><div style={{ color:MUTED, fontSize:11, marginBottom:3 }}>Bis (HH:MM)</div><input placeholder="17:00" value={row.to} onChange={e=>setWorkRows(p=>p.map((r,j)=>j===i?{...r,to:e.target.value}:r))} style={iStyle}/></div>
              <div><div style={{ color:MUTED, fontSize:11, marginBottom:3 }}>Stunden</div><input readOnly value={h.toFixed(2)} style={{ ...iStyle, color:GOLD }}/></div>
              <div><div style={{ color:MUTED, fontSize:11, marginBottom:3 }}>CHF/h</div><input placeholder="110" value={row.rate} onChange={e=>setWorkRows(p=>p.map((r,j)=>j===i?{...r,rate:e.target.value}:r))} style={iStyle}/></div>
            </div>
            <div style={{ textAlign:"right", color:GOLD, fontWeight:700, fontSize:14, marginTop:6 }}>Total: CHF {t.toFixed(2)}</div>
          </div>;
        })}
        <div style={{ color:MUTED, fontSize:13 }}>Subtotal Arbeit: CHF {workSubtotal.toFixed(2)}</div>
        <h3 style={{ marginBottom:4 }}>🔧 Material / Kranrapport</h3>
        <button type="button" onClick={()=>setMaterialRows(p=>[...p,{name:"",qty:"",unit:"",price:""}])} style={{ ...pBtn, width:180 }}>+ Zeile hinzufügen</button>
        {materialRows.map((row,i)=>{
          const t=toNum(row.qty)*toNum(row.price);
          const isCustomMat = row._customMaterial;
          return <div key={i} style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${BORDER}`, borderRadius:8, padding:"10px 12px", marginBottom:6 }}>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8,marginBottom:6}}>
              {catalog.materials.length>0 && !isCustomMat ? (
                <select value={row.name||""} onChange={e=>{
                  if(e.target.value==="__custom__"){setMaterialRows(p=>p.map((r,j)=>j===i?{...r,name:"",_customMaterial:true}:r));return;}
                  const mat=catalog.materials.find(x=>x.name===e.target.value);
                  setMaterialRows(p=>p.map((r,j)=>j===i?{...r,name:e.target.value,unit:mat?.unit||r.unit,price:mat?.price||r.price,_customMaterial:false}:r));
                }} style={{...iStyle,width:"100%"}}>
                  <option value="">Material wählen...</option>
                  {catalog.materials.map(mat=><option key={mat.id} value={mat.name}>{mat.name}{mat.unit?` (${mat.unit})`:""}{mat.price?` — CHF ${mat.price}`:""}</option>)}
                  <option value="__custom__">✏️ Manuell eingeben</option>
                </select>
              ) : (
                <div style={{display:"flex",gap:6}}>
                  <input placeholder="Bezeichnung" value={row.name} onChange={e=>setMaterialRows(p=>p.map((r,j)=>j===i?{...r,name:e.target.value}:r))} style={{...iStyle,flex:1}}/>
                  {catalog.materials.length>0&&<button type="button" onClick={()=>setMaterialRows(p=>p.map((r,j)=>j===i?{...r,_customMaterial:false,name:""}:r))} style={{...gBtn,fontSize:11,minHeight:34,padding:"0 8px"}}>↩ Dropdown</button>}
                </div>
              )}
              <button type="button" onClick={()=>setMaterialRows(p=>p.filter((_,j)=>j!==i))} style={{ ...dBtn, minWidth:34 }} disabled={materialRows.length===1}>✕</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              <input placeholder="Menge" value={row.qty} onChange={e=>setMaterialRows(p=>p.map((r,j)=>j===i?{...r,qty:e.target.value}:r))} style={iStyle}/>
              <input placeholder="Einheit" value={row.unit} onChange={e=>setMaterialRows(p=>p.map((r,j)=>j===i?{...r,unit:e.target.value}:r))} style={iStyle}/>
              <input placeholder="CHF Preis" value={row.price} onChange={e=>setMaterialRows(p=>p.map((r,j)=>j===i?{...r,price:e.target.value}:r))} style={iStyle}/>
            </div>
            <div style={{textAlign:"right",color:GOLD,fontWeight:700,fontSize:14,marginTop:6}}>Total: CHF {t.toFixed(2)}</div>
          </div>;
        })}
        <div style={{ color:MUTED, fontSize:13 }}>Subtotal Material: CHF {materialSubtotal.toFixed(2)}</div>
        <input placeholder="Spesen CHF" value={reportForm.expenses} onChange={e=>setReportForm(p=>({...p,expenses:e.target.value}))} style={iStyle}/>
        <textarea placeholder="Notizen" value={reportForm.notes} onChange={e=>setReportForm(p=>({...p,notes:e.target.value}))} rows={3} style={{ ...iStyle, minHeight:80, padding:10 }}/>
        <h3 style={{ marginBottom:4 }}>✍️ Unterschrift</h3>
        <input placeholder="Name des Unterzeichners" value={reportForm.signerName} onChange={e=>setReportForm(p=>({...p,signerName:e.target.value}))} style={iStyle}/>
        <SignaturePad value={reportForm.signatureImage} onChange={v=>setReportForm(p=>({...p,signatureImage:v}))}/>
        <div style={{ color:MUTED }}>MwSt 8.1%: CHF {vat.toFixed(2)}</div>
        <div style={{ color:GOLD, fontSize:26, fontWeight:800 }}>Total CHF {total.toFixed(2)}</div>
        <div style={{ display:"flex", gap:8 }}>
          <button type="button" onClick={handleSave} style={pBtn}>{editingReport?"Änderungen speichern":"Rapport speichern"}</button>
          {editingReport && <button type="button" onClick={()=>{setEditingReport(null);setReportForm(emptyForm);setWorkRows([{employee:"",from:"",to:"",rate:""}]);setMaterialRows([{name:"",qty:"",unit:"",price:""}]);goTo("reports");}} style={gBtn}>Abbrechen</button>}
        </div>
      </div>
    </>);

    if (view === "reports") return section(<>
      <h2 style={{ marginTop:0 }}>Offene Rapporte</h2>
      {archivedReports.length>0&&<div style={{marginBottom:10,padding:"8px 12px",background:"rgba(212,168,83,0.08)",border:`1px solid ${BORDER}`,borderRadius:8,fontSize:13,color:MUTED}}>
        📁 {archivedReports.length} archivierte/gesendete Rapporte sind beim jeweiligen Kunden sichtbar.
      </div>}
      {loading?<p style={{color:MUTED}}>Lade...</p>:<div style={{display:"grid",gap:8}}>
        {reports.length===0&&<p style={{color:MUTED}}>Noch keine Rapporte.</p>}
        {reports.map(r=>{
          const p=parseReport(r);
          return <div key={r.id} style={{background:"rgba(255,255,255,0.03)",border:`1px solid rgba(212,168,83,0.2)`,borderRadius:10,padding:"12px 14px",display:"grid",gap:8}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <strong>{r.customer||"-"}</strong>
              <span style={{color:GOLD,fontWeight:700,fontSize:13}}>{r.status}</span>
            </div>
            <div style={{color:MUTED,fontSize:13}}>
              <strong style={{color:GOLD}}>Nr. {p.rapportNr||"—"}</strong>
              {p.projectName&&<span style={{color:TEXT}}> · {p.projectName}</span>}
              <span> · {formatDateCH(r.date)}</span>
            </div>
            <div style={{color:GOLD,fontWeight:700}}>CHF {toNum(p.totals?.total).toFixed(2)}</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button type="button" onClick={()=>setOpenedReport(r)} style={{...pBtn,minHeight:34}}>Öffnen</button>
              <button type="button" onClick={()=>startEdit(r)} style={{...gBtn,minHeight:34}}>✏️</button>
              <button type="button" onClick={()=>openPDF(r)} style={{...gBtn,minHeight:34}}>PDF</button>
              <button type="button" onClick={()=>moveToTrash(r)} style={dBtn}>Löschen</button>
            </div>
          </div>;
        })}
      </div>}
    </>);

    if (view === "invoices") return section(<>
      <h2 style={{marginTop:0}}>🧾 Rechnungen</h2>
      {invoices.length===0&&<p style={{color:MUTED}}>Noch keine Rechnungen erstellt.</p>}
      <div style={{display:"grid",gap:10}}>
        {invoices.map(inv=>(
          <div key={inv.id} style={{border:`1px solid ${inv.status==="versendet"?GOLD:BORDER}`,borderRadius:10,padding:"12px 14px",background:"rgba(255,255,255,0.02)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8,marginBottom:8}}>
              <div>
                <div style={{fontWeight:700,color:GOLD,fontSize:15}}>{inv.invoiceNr}</div>
                <div style={{color:TEXT,fontSize:14}}>{inv.customer}</div>
                <div style={{color:MUTED,fontSize:12,marginTop:2}}>{formatDateCH(inv.date)}{inv.reportData?.projectName&&` · ${inv.reportData.projectName}`}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontWeight:800,fontSize:17,color:TEXT}}>CHF {Number(inv.totalAmount).toFixed(2)}</div>
                <div style={{marginTop:4}}>
                  <span style={{fontSize:11,padding:"2px 8px",borderRadius:4,fontWeight:700,
                    background:inv.status==="versendet"?"rgba(212,168,83,0.15)":"rgba(255,255,255,0.05)",
                    border:`1px solid ${inv.status==="versendet"?GOLD:BORDER}`,
                    color:inv.status==="versendet"?GOLD:MUTED}}>
                    {inv.status==="versendet"?"✅ Versendet":"📝 Entwurf"}
                  </span>
                </div>
              </div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",borderTop:`1px solid ${BORDER}`,paddingTop:8}}>
              <button type="button" onClick={()=>reopenInvoice(inv)} style={{...pBtn,minHeight:32,fontSize:13}}>🖨 Öffnen / Drucken</button>
              {inv.status==="entwurf"&&<button type="button" onClick={()=>{
                const updated={...inv,status:"versendet"};
                saveInvoiceToStorage(updated);
                showNotice("✅ Rechnung als versendet markiert.");
              }} style={{...gBtn,minHeight:32,fontSize:13,color:GOLD,borderColor:GOLD}}>✅ Als versendet markieren</button>}
              {inv.status==="entwurf"&&<button type="button" onClick={()=>setInvoiceModal({...invoices.find(i=>i.id===inv.id), _reEdit:true})} style={{...gBtn,minHeight:32,fontSize:13}}>✏️ Rabatt/Skonto ändern</button>}
              <button type="button" onClick={()=>{if(window.confirm("Rechnung löschen?"))deleteInvoice(inv.id);}} style={{...dBtn,minHeight:32,fontSize:13}}>🗑 Löschen</button>
            </div>
          </div>
        ))}
      </div>
    </>);

    if (view === "trash") return section(<>
      <h2 style={{marginTop:0}}>Papierkorb</h2>
      {trashReports.length===0&&<p style={{color:MUTED}}>Papierkorb ist leer.</p>}
      {trashReports.map(r=>(
        <div key={r.id} style={{border:`1px solid ${BORDER}`,borderRadius:10,padding:"12px 14px",marginBottom:8}}>
          <strong>{r.customer||"-"}</strong>
          <div style={{color:MUTED,fontSize:13}}>{r.date||"-"}</div>
          <div style={{display:"flex",gap:8,marginTop:8}}>
            <button type="button" onClick={()=>restore(r)} style={pBtn}>Wiederherstellen</button>
            <button type="button" onClick={()=>hardDelete(r)} style={dBtn}>Endgültig löschen</button>
          </div>
        </div>
      ))}
    </>);

    if (view === "catalog") return section(<>
      <h2 style={{marginTop:0}}>📦 Katalog</h2>
      <p style={{color:MUTED,marginTop:0,fontSize:14}}>Hinterlege deine Mitarbeiter mit Stundensätzen und Materialien mit Preisen. Diese kannst du beim Erstellen von Rapporten per Dropdown auswählen.</p>
      {/* Tabs */}
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {[["employees","👷 Mitarbeiter"],["materials","🔧 Material"]].map(([k,l])=>(
          <button key={k} type="button" onClick={()=>setCatalogTab(k)}
            style={{...gBtn,fontWeight:catalogTab===k?700:400,borderColor:catalogTab===k?GOLD:BORDER,color:catalogTab===k?GOLD:TEXT,background:catalogTab===k?"rgba(212,168,83,0.1)":"transparent"}}>
            {l}
          </button>
        ))}
      </div>

      {catalogTab==="employees"&&<>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:8,marginBottom:12,alignItems:"center"}}>
          <input placeholder="Name (z.B. Max Muster)" value={newEmployee.name} onChange={e=>setNewEmployee(p=>({...p,name:e.target.value}))} style={iStyle}/>
          <input placeholder="CHF/h (z.B. 110)" value={newEmployee.rate} onChange={e=>setNewEmployee(p=>({...p,rate:e.target.value}))} style={iStyle}/>
          <button type="button" style={pBtn} onClick={()=>{
            if(!newEmployee.name.trim())return;
            saveCatalog({...catalog,employees:[...catalog.employees,{id:Date.now(),...newEmployee}]});
            setNewEmployee({name:"",rate:""});
            showNotice("✅ Mitarbeiter gespeichert.");
          }}>+ Hinzufügen</button>
        </div>
        {catalog.employees.length===0&&<p style={{color:MUTED,fontSize:13}}>Noch keine Mitarbeiter hinterlegt.</p>}
        {catalog.employees.map(emp=>(
          <div key={emp.id} style={{border:`1px solid ${BORDER}`,borderRadius:8,padding:"10px 12px",marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <strong>{emp.name}</strong>
              {emp.rate&&<span style={{color:MUTED,fontSize:13,marginLeft:10}}>CHF {emp.rate}/h</span>}
            </div>
            <button type="button" style={dBtn} onClick={()=>{
              saveCatalog({...catalog,employees:catalog.employees.filter(e=>e.id!==emp.id)});
            }}>✕</button>
          </div>
        ))}
      </>}

      {catalogTab==="materials"&&<>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr auto",gap:8,marginBottom:12,alignItems:"center"}}>
          <input placeholder="Bezeichnung (z.B. Beton B25)" value={newMaterial.name} onChange={e=>setNewMaterial(p=>({...p,name:e.target.value}))} style={iStyle}/>
          <input placeholder="Einheit (z.B. m³)" value={newMaterial.unit} onChange={e=>setNewMaterial(p=>({...p,unit:e.target.value}))} style={iStyle}/>
          <input placeholder="CHF Preis" value={newMaterial.price} onChange={e=>setNewMaterial(p=>({...p,price:e.target.value}))} style={iStyle}/>
          <button type="button" style={pBtn} onClick={()=>{
            if(!newMaterial.name.trim())return;
            saveCatalog({...catalog,materials:[...catalog.materials,{id:Date.now(),...newMaterial}]});
            setNewMaterial({name:"",unit:"",price:""});
            showNotice("✅ Material gespeichert.");
          }}>+ Hinzufügen</button>
        </div>
        {catalog.materials.length===0&&<p style={{color:MUTED,fontSize:13}}>Noch keine Materialien hinterlegt.</p>}
        {catalog.materials.map(mat=>(
          <div key={mat.id} style={{border:`1px solid ${BORDER}`,borderRadius:8,padding:"10px 12px",marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <strong>{mat.name}</strong>
              {mat.unit&&<span style={{color:MUTED,fontSize:13,marginLeft:8}}>{mat.unit}</span>}
              {mat.price&&<span style={{color:GOLD,fontSize:13,marginLeft:10}}>CHF {mat.price}</span>}
            </div>
            <button type="button" style={dBtn} onClick={()=>{
              saveCatalog({...catalog,materials:catalog.materials.filter(m=>m.id!==mat.id)});
            }}>✕</button>
          </div>
        ))}
      </>}
    </>);

    if (view === "settings") {
      const meta = session?.user?.user_metadata || {};
      const currentPlan = localStorage.getItem("bauabnahme_plan") || "starter";

      return section(<>
        <h2 style={{marginTop:0}}>Einstellungen</h2>

        {/* Firmenprofil */}
        <div style={{border:`1px solid ${BORDER}`,borderRadius:10,padding:14,marginBottom:16,background:"rgba(212,168,83,0.05)"}}>
          <div style={{color:GOLD,fontWeight:700,marginBottom:8}}>🏢 Firmenprofil</div>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:10}}>
            {meta.company_logo ? (
              <img src={meta.company_logo} alt="Logo" style={{height:60,maxWidth:160,objectFit:"contain",borderRadius:8,border:`1px solid ${BORDER}`,padding:4,background:"#fff"}}/>
            ) : (
              <div style={{width:80,height:60,border:`1px dashed ${BORDER}`,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",color:MUTED,fontSize:11}}>Kein Logo</div>
            )}
            <div>
              <div><strong>{meta.company_name||"-"}</strong></div>
              <div style={{color:MUTED}}>{[meta.first_name,meta.last_name].filter(Boolean).join(" ")}</div>
              {meta.address&&<div style={{color:MUTED,fontSize:13}}>{meta.address}, {meta.zip} {meta.city}</div>}
              {meta.phone&&<div style={{color:MUTED,fontSize:13}}>📞 {meta.phone}</div>}
              <div style={{color:MUTED,fontSize:13}}>✉️ {userEmail}</div>
            </div>
          </div>
          <div style={{marginTop:8}}>
            <div style={{color:MUTED,fontSize:12,marginBottom:6}}>Logo ändern:</div>
            <label style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 12px",border:`1px solid ${BORDER}`,borderRadius:8,cursor:"pointer",color:MUTED,fontSize:13}}>
              📁 Logo hochladen
              <input type="file" accept="image/*" style={{display:"none"}} onChange={async(e)=>{
                const f=e.target.files?.[0]; if(!f) return;
                const reader=new FileReader();
                reader.onload=async(ev)=>{
                  const logo=ev.target.result;
                  await supabase.auth.updateUser({data:{...meta,company_logo:logo}});
                  showNotice("✅ Logo gespeichert! Bitte neu einloggen um es zu sehen.");
                };
                reader.readAsDataURL(f);
              }}/>
            </label>
          </div>
          <div style={{marginTop:12}}>
            <div style={{color:MUTED,fontSize:12,marginBottom:6}}>🏦 IBAN (für Swiss QR-Rechnung):</div>
            <div style={{display:"flex",gap:8}}>
              <input placeholder="CH56 0483 5012 3456 7800 9" defaultValue={meta.iban||""} id="iban-input"
                style={{...iStyle,flex:1,fontFamily:"monospace",fontSize:13,letterSpacing:"0.5px"}}/>
              <button type="button" style={pBtn} onClick={async()=>{
                const val=document.getElementById("iban-input").value.trim();
                await supabase.auth.updateUser({data:{...meta,iban:val}});
                showNotice("✅ IBAN gespeichert!");
              }}>Speichern</button>
            </div>
            {meta.iban&&<div style={{color:GOLD,fontSize:12,marginTop:4}}>✓ {meta.iban}</div>}
          </div>
          {/* Fortlaufende Nummern */}
          <div style={{marginTop:12,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div>
              <div style={{color:MUTED,fontSize:12,marginBottom:6}}>📋 Nächste Rapport-Nr:</div>
              <div style={{display:"flex",gap:6}}>
                <input type="number" defaultValue={nextRapportNr} id="next-rapport-nr"
                  style={{...iStyle,flex:1,fontFamily:"monospace",fontSize:13}}/>
                <button type="button" style={{...pBtn,padding:"0 10px",fontSize:12}} onClick={()=>{
                  const val=parseInt(document.getElementById("next-rapport-nr").value)||1001;
                  setNextRapportNrState(val);
                  localStorage.setItem("bauabnahme_next_rapport_nr",String(val));
                  showNotice("✅ Rapport-Nr gespeichert!");
                }}>OK</button>
              </div>
              <div style={{color:MUTED,fontSize:11,marginTop:3}}>Nächster Rapport: {nextRapportNr}</div>
            </div>
            <div>
              <div style={{color:MUTED,fontSize:12,marginBottom:6}}>🧾 Nächste Rechnungs-Nr:</div>
              <div style={{display:"flex",gap:6}}>
                <input type="number" defaultValue={nextInvoiceNr} id="next-invoice-nr"
                  style={{...iStyle,flex:1,fontFamily:"monospace",fontSize:13}}/>
                <button type="button" style={{...pBtn,padding:"0 10px",fontSize:12}} onClick={()=>{
                  const val=parseInt(document.getElementById("next-invoice-nr").value)||1001;
                  setNextInvoiceNrState(val);
                  localStorage.setItem("bauabnahme_next_invoice_nr",String(val));
                  showNotice("✅ Rechnungs-Nr gespeichert!");
                }}>OK</button>
              </div>
              <div style={{color:MUTED,fontSize:11,marginTop:3}}>Nächste Rechnung: RE-{nextInvoiceNr}</div>
            </div>
          </div>
        </div>

        {/* Aktueller Plan */}
        <div style={{marginBottom:20,border:`1px solid ${BORDER}`,borderRadius:10,padding:14}}>
          <div style={{color:MUTED,fontSize:13,marginBottom:10}}>💳 Aktueller Plan</div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
            <span style={{fontSize:18,fontWeight:800,color:GOLD}}>
              {currentPlan==="pro"?"⭐ Pro":currentPlan==="team"?"🏆 Team":"🆓 Starter"}
            </span>
            {(currentPlan==="starter"||!currentPlan)&&<span style={{color:MUTED,fontSize:13}}>Upgrade für mehr Funktionen</span>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
            {[{n:"Starter",p:"CHF 0",link:null},{n:"Pro",p:"CHF 29/Mt",link:"https://buy.stripe.com/bJe5kD18Cc2m3y59Ux9AA02"},{n:"Team",p:"CHF 79/Mt",link:"https://buy.stripe.com/14A5kDbNgfey4C92s59AA01"}].map(pl=>(
              <div key={pl.n} style={{border:`2px solid ${pl.n.toLowerCase()===currentPlan?GOLD:BORDER}`,borderRadius:8,padding:10,background:pl.n.toLowerCase()===currentPlan?"rgba(212,168,83,0.1)":"transparent"}}>
                <div style={{fontWeight:700,color:pl.n.toLowerCase()===currentPlan?GOLD:TEXT}}>{pl.n}</div>
                <div style={{color:MUTED,fontSize:13}}>{pl.p}</div>
                {pl.link&&<a href={pl.link} target="_blank" rel="noopener noreferrer" style={{display:"block",marginTop:6,color:GOLD,fontSize:12,textDecoration:"none"}}>Abonnieren →</a>}
                {!pl.link&&pl.n!=="Starter"&&<div style={{color:MUTED,fontSize:11,marginTop:4}}>Link folgt</div>}
              </div>
            ))}
          </div>
          <button type="button" onClick={()=>{localStorage.setItem("bauabnahme_plan","pro");showNotice("✅ Pro Plan aktiviert!");}} style={{...gBtn,fontSize:12,color:GOLD,borderColor:GOLD,minHeight:30}}>
            ✓ Pro Plan aktivieren (nach Zahlung)
          </button>
        </div>

        {/* Support */}
        <div style={{border:`1px solid ${BORDER}`,borderRadius:10,padding:14,marginBottom:16,background:"rgba(212,168,83,0.03)"}}>
          <div style={{color:GOLD,fontWeight:700,marginBottom:8}}>💬 Support</div>
          <p style={{color:MUTED,fontSize:14,marginTop:0,marginBottom:12}}>
            Bei Fragen oder Problemen stehen wir dir gerne zur Verfügung.
          </p>
          <a href="mailto:support@bauabnahme.app" style={{...pBtn,textDecoration:"none",display:"inline-flex",alignItems:"center",gap:8}}>
            ✉️ support@bauabnahme.app
          </a>
        </div>

        {/* Rechtliches + Konto-Aktionen kombiniert */}
        {showLegalModal==="impressum"&&<div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setShowLegalModal(null)}>
          <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:14,padding:24,maxWidth:600,width:"100%",maxHeight:"85vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h2 style={{margin:0,color:GOLD}}>Impressum</h2><button onClick={()=>setShowLegalModal(null)} style={gBtn}>✕</button></div>
            <div style={{color:MUTED,lineHeight:1.7}}>
              <p><strong style={{color:TEXT}}>BauAbnahme</strong><br/>Eine Schweizer Softwarelösung für die Baubranche.</p>
              <p><strong style={{color:TEXT}}>Kontakt</strong><br/>E-Mail: <a href="mailto:support@bauabnahme.app" style={{color:GOLD}}>support@bauabnahme.app</a></p>
              <p><strong style={{color:TEXT}}>Haftungsausschluss</strong><br/>Die Inhalte wurden mit grösster Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität können wir keine Gewähr übernehmen.</p>
              <p><strong style={{color:TEXT}}>Urheberrecht</strong><br/>Alle Inhalte unterliegen dem schweizerischen Urheberrecht.</p>
            </div>
          </div>
        </div>}
        {showLegalModal==="datenschutz"&&<div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setShowLegalModal(null)}>
          <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:14,padding:24,maxWidth:600,width:"100%",maxHeight:"85vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h2 style={{margin:0,color:GOLD}}>Datenschutzerklärung</h2><button onClick={()=>setShowLegalModal(null)} style={gBtn}>✕</button></div>
            <div style={{color:MUTED,lineHeight:1.7}}>
              <p><strong style={{color:TEXT}}>1. Datenschutz</strong><br/>Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst und verarbeiten diese gemäss DSG / DSGVO.</p>
              <p><strong style={{color:TEXT}}>2. Erhobene Daten</strong><br/>E-Mail, Firmendaten, Kundendaten und Rapporte die Sie selbst erfassen, sowie Fotos und Unterschriften.</p>
              <p><strong style={{color:TEXT}}>3. Datenspeicherung</strong><br/>Alle Daten werden verschlüsselt auf Servern von Supabase (EU) gespeichert. Keine Weitergabe an Dritte.</p>
              <p><strong style={{color:TEXT}}>4. Ihre Rechte</strong><br/>Sie haben das Recht auf Auskunft, Berichtigung und Löschung Ihrer Daten. Kontakt: <a href="mailto:support@bauabnahme.app" style={{color:GOLD}}>support@bauabnahme.app</a></p>
            </div>
          </div>
        </div>}

        {/* Rechtliches & Konto-Aktionen — kompakt in einer Zeile */}
        <div style={{border:`1px solid ${BORDER}`,borderRadius:10,padding:12,marginBottom:12}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            <button type="button" onClick={()=>setShowLegalModal("impressum")} style={{...gBtn,fontSize:12,minHeight:32,padding:"0 10px"}}>Impressum</button>
            <button type="button" onClick={()=>setShowLegalModal("datenschutz")} style={{...gBtn,fontSize:12,minHeight:32,padding:"0 10px"}}>Datenschutz</button>
            <div style={{width:1,height:20,background:BORDER,margin:"0 4px"}}/>
            <button type="button" onClick={()=>{if(onLogout)onLogout();else if(onNavigate)onNavigate("/");}} style={{...gBtn,fontSize:12,minHeight:32,padding:"0 10px"}}>🚪 Logout</button>
            <button type="button" onClick={()=>{if(window.confirm("Konto wirklich pausieren?"))showNotice("Konto pausiert. Bitte kontaktiere den Support.");}} style={{...gBtn,fontSize:12,minHeight:32,padding:"0 10px"}}>⏸ Pausieren</button>
            <button type="button" onClick={()=>{if(window.confirm("Konto wirklich löschen? Alle Daten gehen verloren!"))if(window.confirm("Letzte Bestätigung — wirklich löschen?"))showNotice("Löschung angefragt. Support wird dich kontaktieren.");}} style={{...gBtn,fontSize:12,minHeight:32,padding:"0 10px",color:"#e05c5c",borderColor:"#e05c5c"}}>🗑 Löschen</button>
          </div>
        </div>

        {/* Sprache — ganz unten, kein Flaggen, nur Text */}
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{color:MUTED,fontSize:11}}>Sprache:</span>
          {["DE","FR","IT","EN"].map(code=>(
            <button key={code} type="button" onClick={()=>{setSettingsLang(code);localStorage.setItem("bauabnahme_language_pref",code);}}
              style={{padding:"3px 9px",borderRadius:6,cursor:"pointer",border:`1px solid ${settingsLang===code?GOLD:BORDER}`,
                background:settingsLang===code?"rgba(212,168,83,0.15)":"transparent",
                color:settingsLang===code?GOLD:MUTED,fontSize:12,fontWeight:settingsLang===code?700:400}}>
              {code}
            </button>
          ))}
        </div>

      </>);
    }
    return null;
    
const navItems = [
    {key:"home",label:"Start"},{key:"customers",label:"Kunden"},
    {key:"catalog",label:"Katalog"},{key:"new-report",label:"Neuer Rapport"},
    {key:"reports",label:"Offene Rapporte"},{key:"invoices",label:"Rechnungen"},
    {key:"trash",label:"Papierkorb"},{key:"settings",label:"Einstellungen"}
  ];
  const activeView = editingReport?"new-report":openedReport?"reports":selectedCustomer?"customers":view;

  return (
    <div style={{minHeight:"100vh",background:BG,color:TEXT,fontFamily:"Inter,system-ui,sans-serif"}}>
      <style>{`*{box-sizing:border-box}input,select,textarea{max-width:100%}@media(max-width:768px){.dash-sidebar{display:none!important}.dash-sidebar.open{display:block!important;position:fixed;top:0;left:0;width:240px;height:100vh;z-index:200;overflow-y:auto}.dash-mh{display:flex!important}.dash-grid{grid-template-columns:1fr!important}}@media(min-width:769px){.dash-mh{display:none!important}}`}</style>

      {/* Rechnung Modal — Rabatt, Skonto & Fristen */}
      {invoiceModal&&<div style={{position:"fixed",inset:0,zIndex:600,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setInvoiceModal(null)}>
        <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:28,maxWidth:460,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",overflowY:"auto",maxHeight:"90vh"}} onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
            <h2 style={{margin:0,color:GOLD,fontSize:18}}>🧾 Rechnung erstellen</h2>
            <button onClick={()=>setInvoiceModal(null)} style={{...gBtn,minHeight:32,padding:"0 10px",fontSize:16}}>✕</button>
          </div>
          <div style={{display:"grid",gap:16}}>

            {/* Zahlungsfrist */}
            <div style={{background:"rgba(255,255,255,0.03)",borderRadius:10,padding:14,border:`1px solid ${BORDER}`}}>
              <div style={{color:MUTED,fontSize:11,marginBottom:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px"}}>Zahlungsfrist</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
                {["10","20","30","45","60"].map(d=>(
                  <button key={d} type="button" onClick={()=>setInvoicePayDays(d)}
                    style={{minHeight:34,borderRadius:8,padding:"0 14px",cursor:"pointer",fontWeight:invoicePayDays===d?700:400,
                      background:invoicePayDays===d?GOLD:"transparent",color:invoicePayDays===d?"#111":MUTED,
                      border:`1px solid ${invoicePayDays===d?GOLD:BORDER}`,fontSize:13}}>
                    {d} Tage
                  </button>
                ))}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <input type="number" min="1" max="365" value={invoicePayDays} onChange={e=>setInvoicePayDays(e.target.value)}
                  style={{...iStyle,width:80,textAlign:"center",fontWeight:700}}/>
                <span style={{color:MUTED,fontSize:13}}>Tage → Fällig am <b style={{color:TEXT}}>{formatDateCH(new Date(new Date(invoiceModal.date).getTime()+(parseInt(invoicePayDays)||30)*86400000).toISOString().slice(0,10))}</b></span>
              </div>
            </div>

            {/* Rabatt */}
            <div style={{background:"rgba(255,255,255,0.03)",borderRadius:10,padding:14,border:`1px solid ${BORDER}`}}>
              <div style={{color:MUTED,fontSize:11,marginBottom:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px"}}>Rabatt</div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <input type="number" min="0" max="100" step="0.5" value={invoiceDiscount}
                  onChange={e=>setInvoiceDiscount(e.target.value)}
                  style={{...iStyle,width:90,fontSize:18,fontWeight:700,textAlign:"center"}}/>
                <span style={{color:TEXT,fontSize:20,fontWeight:700}}>%</span>
                {parseFloat(invoiceDiscount)>0&&<span style={{color:GOLD,fontSize:13}}>
                  − CHF {(Number(parseReport(invoiceModal).totals?.subtotal||0)*(parseFloat(invoiceDiscount)/100)).toFixed(2)}
                </span>}
              </div>
            </div>

            {/* Skonto */}
            <div style={{background:"rgba(255,255,255,0.03)",borderRadius:10,padding:14,border:`1px solid ${BORDER}`}}>
              <div style={{color:MUTED,fontSize:11,marginBottom:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px"}}>Skonto (Frühzahlerrabatt)</div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <input type="number" min="0" max="100" step="0.5" value={invoiceSkonto}
                  onChange={e=>setInvoiceSkonto(e.target.value)}
                  style={{...iStyle,width:90,fontSize:18,fontWeight:700,textAlign:"center"}}/>
                <span style={{color:TEXT,fontSize:20,fontWeight:700}}>%</span>
                {parseFloat(invoiceSkonto)>0&&<span style={{color:MUTED,fontSize:13}}>bei Zahlung innert</span>}
              </div>
              {parseFloat(invoiceSkonto)>0&&<>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
                  {["5","10","15","20","30"].map(d=>(
                    <button key={d} type="button" onClick={()=>setInvoiceSkontoDays(d)}
                      style={{minHeight:32,borderRadius:8,padding:"0 12px",cursor:"pointer",fontWeight:invoiceSkontoDays===d?700:400,
                        background:invoiceSkontoDays===d?GOLD:"transparent",color:invoiceSkontoDays===d?"#111":MUTED,
                        border:`1px solid ${invoiceSkontoDays===d?GOLD:BORDER}`,fontSize:13}}>
                      {d} Tage
                    </button>
                  ))}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <input type="number" min="1" max="60" value={invoiceSkontoDays} onChange={e=>setInvoiceSkontoDays(e.target.value)}
                    style={{...iStyle,width:80,textAlign:"center",fontWeight:700}}/>
                  <span style={{color:MUTED,fontSize:13}}>Tage → bis <b style={{color:TEXT}}>{formatDateCH(new Date(new Date(invoiceModal.date).getTime()+(parseInt(invoiceSkontoDays)||10)*86400000).toISOString().slice(0,10))}</b></span>
                </div>
              </>}
            </div>

            <div style={{display:"flex",gap:10,marginTop:4}}>
              <button type="button" onClick={()=>setInvoiceModal(null)} style={{...gBtn,flex:1}}>Abbrechen</button>
              <button type="button" style={{...pBtn,flex:2,fontSize:15}} onClick={()=>generateInvoice(invoiceModal,parseFloat(invoiceDiscount)||0,parseFloat(invoiceSkonto)||0,invoicePayDays,invoiceSkontoDays)}>
                Rechnung öffnen →
              </button>
            </div>
          </div>
        </div>
      </div>}

      <div className="dash-mh" style={{display:"none",position:"sticky",top:0,zIndex:150,background:PANEL,borderBottom:`1px solid ${BORDER}`,padding:"10px 16px",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{fontWeight:700,fontSize:18}}>Bau<span style={{color:GOLD}}>Abnahme</span></div>
        <button type="button" onClick={()=>setMobileSidebarOpen(p=>!p)} style={{...gBtn,minHeight:34,padding:"0 10px"}}>{mobileSidebarOpen?"✕":"☰"}</button>
      </div>

      {mobileSidebarOpen&&<div onClick={()=>setMobileSidebarOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:199}}/>}

      <div className="dash-grid" style={{display:"grid",gridTemplateColumns:"240px 1fr",minHeight:"100vh"}}>
        <aside className={`dash-sidebar${mobileSidebarOpen?" open":""}`} style={{borderRight:`1px solid ${BORDER}`,background:PANEL,padding:16}}>
          <div style={{fontWeight:700,fontSize:20,marginBottom:16}}>Bau<span style={{color:GOLD}}>Abnahme</span></div>
          <nav style={{display:"grid",gap:6}}>
            {navItems.map(item=>(
              <button key={item.key} type="button" onClick={()=>goTo(item.key)}
                style={{...iStyle,minHeight:42,cursor:"pointer",textAlign:"left",background:activeView===item.key?"rgba(212,168,83,0.15)":"#111",borderColor:activeView===item.key?GOLD:BORDER,color:activeView===item.key?GOLD:TEXT,fontWeight:activeView===item.key?700:400}}>
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main style={{padding:20,minWidth:0}}>
          {isDemo&&<div style={{marginBottom:12,background:"rgba(212,168,83,0.15)",border:`2px solid ${GOLD}`,borderRadius:10,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
            <span style={{color:GOLD,fontWeight:700}}>🎯 Demo-Modus — Daten werden nicht gespeichert</span>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>onNavigate("/login")} style={pBtn}>Registrieren</button>
              <button onClick={()=>onNavigate("/")} style={gBtn}>Zurück</button>
            </div>
          </div>}
          {notice&&<div style={{marginBottom:12,border:`1px solid ${BORDER}`,borderRadius:10,padding:"10px 14px",color:GOLD,background:"rgba(212,168,83,0.08)"}}>{notice}</div>}
          {renderView()}
        </main>
      </div>
    </div>
  );
}
