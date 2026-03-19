import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "../supabase";

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


function formatDateCH(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("de-CH");
}

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

  const emptyForm = {
    selectedCustomerId: "", selectedProjectId: "", customer: "", address: "",
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
    setReportForm(p => ({ ...p, selectedCustomerId: String(c.id), selectedProjectId: "", customer: c.name || "", customerEmail: c.email || "", address: m.address || "" }));
  };

  const handleSave = async () => {
    if (!reportForm.customer.trim()) { showNotice("Bitte Firmenname eingeben."); return; }
    const sp = customerProjects.find(p => String(p.id) === String(reportForm.selectedProjectId));
    const rapportNr = editingReport ? (parseReport(editingReport).rapportNr || editingReport.id) : (10000 + (Date.now() % 90000));
    const payload = {
      rapportNr, customer: reportForm.customer.trim(), customerEmail: reportForm.customerEmail.trim(),
      address: reportForm.address.trim(), orderNo: reportForm.orderNo.trim(), date: reportForm.date, status: reportForm.status,
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
    setReportForm({ selectedCustomerId: String(p.customerId || ""), selectedProjectId: String(p.projectId || ""), customer: r.customer || "", address: p.address || "", orderNo: p.orderNo || "", customerEmail: p.customerEmail || "", date: r.date || emptyForm.date, status: r.status || "offen", expenses: p.costs?.expenses ? String(p.costs.expenses) : "", notes: p.costs?.notes || "", beforePhoto: p.photos?.before || "", afterPhoto: p.photos?.after || "", signerName: p.signature?.name || "", signatureImage: p.signature?.image || "" });
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


  function buildPdfHtml(report, p, firmName, firmLogo, firmAddress, firmContact, firmPhone, firmEmail, isPro, isDemoMode, mailto) {
    const work = p.workRows || [], mat = p.materialRows || [], tot = p.totals || {};
    const costs = p.costs || {}, photos = p.photos || {}, sig = p.signature || {};
    const name = report.customer || "-";
    const wHtml = work.map((r,i) => `<tr><td>${i+1}</td><td>${r.employee||"-"}</td><td>${r.from||"-"}–${r.to||"-"}</td><td>${Number(r.hours||0).toFixed(2)}</td><td>CHF ${Number(r.total||0).toFixed(2)}</td></tr>`).join("");
    const mHtml = mat.map((r,i) => `<tr><td>${i+1}</td><td>${r.name||"-"}</td><td>${r.qty||0} ${r.unit||""}</td><td>CHF ${Number(r.total||0).toFixed(2)}</td></tr>`).join("");
    return `<!doctype html><html><head><meta charset="utf-8"/>
<title>Rapport ${p.rapportNr||report.id}</title>
<style>
body{font-family:Arial,sans-serif;color:#222;margin:24px;font-size:14px}
.letterhead{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid #d4a853}
.firm-info{display:flex;align-items:center;gap:14px}
.firm-details{font-size:12px;color:#444;line-height:1.6}
.firm-name{font-size:18px;font-weight:800;color:#111;margin-bottom:2px}
.report-header{text-align:right}
.report-title{font-size:20px;font-weight:700;color:#d4a853}
.btn{background:#d4a853;border:none;color:#111;padding:10px 14px;border-radius:8px;font-weight:700;text-decoration:none;margin-right:8px;cursor:pointer;font-size:14px}
.card{border:1px solid rgba(212,168,83,0.4);border-radius:10px;padding:12px;margin-bottom:12px}
table{width:100%;border-collapse:collapse;margin-top:6px}
th,td{border:1px solid #ddd;padding:6px 8px;font-size:13px;text-align:left}
th{background:#f9f4ec}
.total{color:#d4a853;font-size:24px;font-weight:800;text-align:right}
.watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:80px;font-weight:900;color:rgba(212,168,83,0.12);white-space:nowrap;pointer-events:none;z-index:1000}
@media print{.noprint{display:none}}
</style></head><body>
${isDemoMode?'<div class="watermark">ENTWURF</div>':""}
<div class="noprint" style="margin-bottom:14px">
${!isPro?'<div style="background:#fff8e6;border:2px solid #d4a853;border-radius:8px;padding:10px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center"><strong>⭐ Testversion</strong><a href="https://buy.stripe.com/bJe5kD18Cc2m3y59Ux9AA02" style="background:#d4a853;color:#111;padding:6px 12px;border-radius:6px;font-weight:700;text-decoration:none">Pro CHF 29/Mt →</a></div>':""}
<button class="btn noprint" onclick="window.print()">💾 PDF / Drucken</button>
<a class="btn noprint" href="${mailto}">📧 E-Mail öffnen</a>
</div>
<div class="letterhead">
  <div class="firm-info">
    ${firmLogo?`<img src="${firmLogo}" alt="Logo" style="height:65px;max-width:180px;object-fit:contain"/>`:""}
    <div>
      <div class="firm-name">${firmName}</div>
      <div class="firm-details">
        ${firmContact?`<div>${firmContact}</div>`:""}
        ${firmAddress?`<div>${firmAddress}</div>`:""}
        ${firmPhone?`<div>${firmPhone}</div>`:""}
        ${firmEmail?`<div>${firmEmail}</div>`:""}
      </div>
    </div>
  </div>
  <div class="report-header">
    <div class="report-title">Rapport</div>
    <div style="font-size:13px;color:#555">Nr. ${p.rapportNr||report.id}</div>
    <div style="font-size:13px;color:#555">${formatDateCH(report.date)}</div>
  </div>
</div>
<div class="card">
  <table><tbody>
    <tr><td><b>Rapport-Nr:</b></td><td>${p.rapportNr||"-"}</td><td><b>Datum:</b></td><td>${formatDateCH(report.date)}</td></tr>
    <tr><td><b>Kunde:</b></td><td>${name}</td><td><b>Auftrag-Nr:</b></td><td>${p.orderNo||"-"}</td></tr>
    ${p.projectName?`<tr><td><b>Projekt:</b></td><td colspan="3">${p.projectName}</td></tr>`:""}
    <tr><td><b>Adresse:</b></td><td colspan="3">${p.address||"-"}</td></tr>
  </tbody></table>
</div>
${photos.before||photos.after?`<div class="card"><h3>Fotos</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${photos.before?`<div><p><b>Vorher</b></p><img src="${photos.before}" style="width:100%;max-height:200px;object-fit:cover;border-radius:8px"/></div>`:""}${photos.after?`<div><p><b>Nachher</b></p><img src="${photos.after}" style="width:100%;max-height:200px;object-fit:cover;border-radius:8px"/></div>`:""}</div></div>`:""}
<div class="card"><h3>Arbeitsstunden</h3><table><thead><tr><th>#</th><th>Mitarbeiter</th><th>Zeit</th><th>Stunden</th><th>Total</th></tr></thead><tbody>${wHtml||"<tr><td colspan=\'5\'>Keine Daten</td></tr>"}</tbody></table></div>
<div class="card"><h3>Material / Kranrapport</h3><table><thead><tr><th>#</th><th>Bezeichnung</th><th>Menge</th><th>Total</th></tr></thead><tbody>${mHtml||"<tr><td colspan=\'4\'>Keine Daten</td></tr>"}</tbody></table></div>
<div class="card">
  <div><b>Spesen:</b> CHF ${Number(costs.expenses||0).toFixed(2)}</div>
  ${costs.notes?`<div><b>Notizen:</b> ${costs.notes}</div>`:""}
  <div><b>Subtotal:</b> CHF ${Number(tot.subtotal||0).toFixed(2)}</div>
  <div><b>MwSt 8.1%:</b> CHF ${Number(tot.vat||0).toFixed(2)}</div>
  <div class="total">TOTAL CHF ${Number(tot.total||0).toFixed(2)}</div>
</div>
${sig.image?`<div class="card"><h3>Unterschrift</h3><div style="margin-bottom:4px"><b>${sig.name||"-"}</b></div><img src="${sig.image}" style="width:280px;border:1px solid rgba(212,168,83,0.4);border-radius:8px"/></div>`:""}
<div style="margin-top:24px;padding-top:12px;border-top:1px solid #eee;text-align:center;font-size:11px;color:#aaa">
  Erstellt mit <a href="https://bauabnahme.app" style="color:#d4a853;text-decoration:none">bauabnahme.app</a>
</div>
</body></html>`;
  }

  const openPDF = (report) => {
    const p = parseReport(report);
    const isPro = localStorage.getItem("bauabnahme_plan") === "pro" || localStorage.getItem("bauabnahme_plan") === "team";
    const isDemoMode = !userId || userId === "demo-user";
    const meta = session?.user?.user_metadata || {};
    const firmName = meta.company_name || "BauAbnahme";
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
    const firmName = meta.company_name || "BauAbnahme";
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
              </div>
            </div>
          );
        })}
        </div>
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
        <input placeholder="Adresse" value={reportForm.address} onChange={e=>setReportForm(p=>({...p,address:e.target.value}))} style={iStyle}/>
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
          return <div key={i} style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${BORDER}`, borderRadius:8, padding:"10px 12px", marginBottom:6 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:8, marginBottom:8 }}>
              <input placeholder="Mitarbeiter" value={row.employee} onChange={e=>setWorkRows(p=>p.map((r,j)=>j===i?{...r,employee:e.target.value}:r))} style={iStyle}/>
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
          return <div key={i} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr auto", gap:8, alignItems:"center", marginBottom:6 }}>
            <input placeholder="Bezeichnung" value={row.name} onChange={e=>setMaterialRows(p=>p.map((r,j)=>j===i?{...r,name:e.target.value}:r))} style={iStyle}/>
            <input placeholder="Menge" value={row.qty} onChange={e=>setMaterialRows(p=>p.map((r,j)=>j===i?{...r,qty:e.target.value}:r))} style={iStyle}/>
            <input placeholder="Einheit" value={row.unit} onChange={e=>setMaterialRows(p=>p.map((r,j)=>j===i?{...r,unit:e.target.value}:r))} style={iStyle}/>
            <input placeholder="Preis" value={row.price} onChange={e=>setMaterialRows(p=>p.map((r,j)=>j===i?{...r,price:e.target.value}:r))} style={iStyle}/>
            <button type="button" onClick={()=>setMaterialRows(p=>p.filter((_,j)=>j!==i))} style={{ ...dBtn, minWidth:34 }} disabled={materialRows.length===1}>✕</button>
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
        </div>

        {/* Sprache */}
        <div style={{marginBottom:20}}>
          <div style={{color:MUTED,fontSize:13,marginBottom:10}}>🌍 Sprache</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {[["DE","🇩🇪"],["FR","🇫🇷"],["IT","🇮🇹"],["EN","🇬🇧"]].map(([code,flag])=>(
              <button key={code} type="button" onClick={()=>{
                setSettingsLang(code);
                localStorage.setItem("bauabnahme_language_pref", code);
                // Sprache ohne Reload wechseln
              }}
                style={{display:"flex",alignItems:"center",gap:4,padding:"6px 10px",borderRadius:8,cursor:"pointer",
                  border:settingsLang===code?`2px solid ${GOLD}`:`1px solid ${BORDER}`,
                  background:settingsLang===code?"rgba(212,168,83,0.15)":"transparent",
                  color:settingsLang===code?GOLD:MUTED,fontSize:13,fontWeight:settingsLang===code?700:400}}>
                <span style={{fontSize:16}}>{flag}</span>
                <span>{code}</span>
              </button>
            ))}
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

        {/* Konto-Aktionen */}
        <div style={{marginBottom:20,border:`1px solid ${BORDER}`,borderRadius:10,padding:14}}>
          <div style={{color:MUTED,fontSize:13,marginBottom:12}}>⚙️ Konto-Aktionen</div>
          <div style={{display:"grid",gap:8}}>
            <button type="button" onClick={()=>{if(onLogout)onLogout();else if(onNavigate)onNavigate("/");}} style={{...pBtn,justifyContent:"flex-start",display:"flex",alignItems:"center",gap:8}}>
              🚪 Logout
            </button>
            <button type="button" onClick={()=>{if(window.confirm("Konto wirklich pausieren?"))showNotice("Konto pausiert. Bitte kontaktiere den Support.");}}
              style={{...gBtn,justifyContent:"flex-start",display:"flex",alignItems:"center",gap:8}}>
              ⏸ Konto pausieren
            </button>
            <button type="button" onClick={()=>{if(window.confirm("Konto wirklich löschen? Alle Daten gehen verloren!"))if(window.confirm("Letzte Bestätigung — wirklich löschen?"))showNotice("Löschung angefragt. Support wird dich kontaktieren.");}}
              style={{...gBtn,justifyContent:"flex-start",display:"flex",alignItems:"center",gap:8,color:"#e05c5c",borderColor:"#e05c5c"}}>
              🗑 Konto löschen
            </button>
          </div>
        </div>

        {/* Support */}
        <div style={{border:`1px solid ${BORDER}`,borderRadius:10,padding:14,background:"rgba(212,168,83,0.03)"}}>
          <div style={{color:GOLD,fontWeight:700,marginBottom:8}}>💬 Support</div>
          <p style={{color:MUTED,fontSize:14,marginTop:0,marginBottom:12}}>
            Bei Fragen oder Problemen stehen wir dir gerne zur Verfügung.
          </p>
          <a href="mailto:support@bauabnahme.app" style={{...pBtn,textDecoration:"none",display:"inline-flex",alignItems:"center",gap:8}}>
            ✉️ support@bauabnahme.app
          </a>
        </div>

        {/* Impressum & Datenschutz */}
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
        <div style={{border:`1px solid ${BORDER}`,borderRadius:10,padding:14}}>
          <div style={{color:MUTED,fontSize:13,marginBottom:12}}>📄 Rechtliches</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <button type="button" onClick={()=>setShowLegalModal("impressum")} style={{...gBtn,fontSize:13}}>Impressum</button>
            <button type="button" onClick={()=>setShowLegalModal("datenschutz")} style={{...gBtn,fontSize:13}}>Datenschutz</button>
          </div>
        </div>

      </>);
    }
    return null;
  };

  const navItems = [
    {key:"home",label:"Start"},{key:"customers",label:"Kunden"},
    {key:"new-report",label:"Neuer Rapport"},{key:"reports",label:"Offene Rapporte"},
    {key:"trash",label:"Papierkorb"},{key:"settings",label:"Einstellungen"}
  ];
  const activeView = editingReport?"new-report":openedReport?"reports":selectedCustomer?"customers":view;

  return (
    <div style={{minHeight:"100vh",background:BG,color:TEXT,fontFamily:"Inter,system-ui,sans-serif"}}>
      <style>{`*{box-sizing:border-box}input,select,textarea{max-width:100%}@media(max-width:768px){.dash-sidebar{display:none!important}.dash-sidebar.open{display:block!important;position:fixed;top:0;left:0;width:240px;height:100vh;z-index:200;overflow-y:auto}.dash-mh{display:flex!important}.dash-grid{grid-template-columns:1fr!important}}@media(min-width:769px){.dash-mh{display:none!important}}`}</style>

      <div className="dash-mh" style={{display:"none",position:"sticky",top:0,zIndex:150,background:PANEL,borderBottom:`1px solid ${BORDER}`,padding:"12px 16px",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{fontWeight:700,fontSize:18}}>Bau<span style={{color:GOLD}}>Abnahme</span></div>
        <button type="button" onClick={()=>setMobileSidebarOpen(p=>!p)} style={{...gBtn,minHeight:36,padding:"0 12px"}}>{mobileSidebarOpen?"✕":"☰"}</button>
      </div>

      {mobileSidebarOpen&&<div onClick={()=>setMobileSidebarOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:199}}/>}

      <div className="dash-grid" style={{display:"grid",gridTemplateColumns:"240px 1fr",minHeight:"100vh"}}>
        <aside className={`dash-sidebar${mobileSidebarOpen?" open":""}`} style={{borderRight:`1px solid ${BORDER}`,background:PANEL,padding:16}}>
          <div style={{fontWeight:700,fontSize:20,marginBottom:18}}>Bau<span style={{color:GOLD}}>Abnahme</span></div>
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
