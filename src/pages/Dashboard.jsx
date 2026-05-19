import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../supabase.js";
import { useTranslation } from "../lib/translations.js";
import { BG, PANEL, TEXT, GOLD, BORDER, MUTED, iStyle, pBtn, gBtn } from "../lib/constants.js";
import { toNum, calcHours, parseReport, parseCustomerMeta, formatDateCH } from "../lib/utils.js";
import { buildRapportHtml, buildRechnungHtml, buildSwissQR, buildOfferteHtml, buildMahnungHtml } from "../lib/pdfBuilder.js";
import { shareRapportAsPDF } from "../lib/pdfShare.js";
import { NoticeBanner, DemoBanner } from "../components/UI.jsx";
import { OnboardingModal } from "../components/OnboardingModal.jsx";
import { RechnungModal } from "../features/rechnungen/RechnungenViews.jsx";
import { lazy, Suspense } from "react";
const RenderView = lazy(() => import("./RenderView.jsx").then(m => ({default: m.RenderView})));

/** `reports.date` is Postgres `date` — must be YYYY-MM-DD, not a full ISO timestamp. */
function toPgDate(value) {
  if (typeof value === "string") {
    const s = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  const d = value instanceof Date ? value : new Date(value);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

const UI_LANG_CODES = new Set(["DE", "FR", "IT", "EN"]);
function normalizeUiLanguage(raw) {
  const u = String(raw || "DE").toUpperCase();
  return UI_LANG_CODES.has(u) ? u : "DE";
}

function invoiceIdEq(a, b) {
  return String(a) === String(b);
}

/**
 * Stored in `reports.description` only. Matches table columns: user_id, customer, date, status, description.
 * Omits internal UI keys (_customEmployee, etc.) from row spreads.
 */
function buildReportDescriptionPayload({
  rapportNr,
  reportForm,
  sp,
  workRows,
  materialRows,
  expenses,
  subtotal,
  vat,
  total
}) {
  return {
    rapportNr,
    customer: reportForm.customer.trim(),
    customerEmail: (reportForm.customerEmail || "").trim(),
    address: (reportForm.address || "").trim(),
    zip: reportForm.zip || "",
    city: reportForm.city || "",
    orderNo: (reportForm.orderNo || "").trim(),
    date: reportForm.date,
    status: reportForm.status,
    customerId: reportForm.selectedCustomerId || null,
    projectId: reportForm.selectedProjectId || null,
    projectName: sp?.name || reportForm.projectSearch || "",
    photos: {
      before: reportForm.beforePhoto || "",
      after: reportForm.afterPhoto || ""
    },
    workRows: workRows.map((r) => ({
      employee: r.employee || "",
      from: r.from || "",
      to: r.to || "",
      rate: r.rate || "",
      hours: calcHours(r.from, r.to),
      total: calcHours(r.from, r.to) * toNum(r.rate)
    })),
    materialRows: materialRows.map((r) => ({
      name: r.name || "",
      qty: r.qty || "",
      unit: r.unit || "",
      price: r.price || "",
      total: toNum(r.qty) * toNum(r.price)
    })),
    costs: { expenses, notes: reportForm.notes || "" },
    totals: {
      subtotal: Number.isFinite(subtotal) ? subtotal : 0,
      vat: Number.isFinite(vat) ? vat : 0,
      total: Number.isFinite(total) ? total : 0
    },
    customerSignature: { name: reportForm.customerSignerName || "", image: reportForm.customerSignatureImage || "" }, signature: {
      name: reportForm.signerName || "",
      image: reportForm.signatureImage || ""
    }
  };
}


const DEMO_DATA = {
  customers: [
    {id:1, name:"Gemeinde Musterstadt", phone:"041 123 45 67", email:"info@musterstadt.ch", address:JSON.stringify({kundennummer:"K-001",firstName:"Peter",lastName:"Müller",address:"Hauptstrasse 1",zip:"6000",city:"Luzern"})},
    {id:2, name:"Hans & Maria Meier", phone:"079 234 56 78", email:"meier@gmail.com", address:JSON.stringify({kundennummer:"K-002",firstName:"Hans",lastName:"Meier",address:"Seestrasse 12",zip:"8000",city:"Zürich"})},
    {id:3, name:"Immobilien AG Zürich", phone:"044 345 67 89", email:"info@immobilien-ag.ch", address:JSON.stringify({kundennummer:"K-003",firstName:"Sandra",lastName:"Weber",address:"Bahnhofstrasse 45",zip:"8001",city:"Zürich"})}
  ],
  reports: [
    {id:101, customer:"Gemeinde Musterstadt", date:"2026-04-10", status:"offen", user_id:"demo-user", description:{rapportNr:1001,projectName:"Dachsanierung Gemeindehaus",address:"Hauptstrasse 1",zip:"6000",city:"Luzern",workRows:[{employee:"Vorarbeiter",from:"07:00",to:"17:00",hours:10,rate:95},{employee:"Monteur",from:"07:00",to:"17:00",hours:10,rate:75},{employee:"Lehrling",from:"07:00",to:"12:00",hours:5,rate:35}],materialRows:[{name:"Dachziegel",qty:200,unit:"St",price:8.50},{name:"Unterdachbahn",qty:50,unit:"m2",price:12.00}],costs:{expenses:150,notes:"Fahrkosten inkl."},totals:{subtotal:2525,vat:204.53,total:2729.53}}},
    {id:102, customer:"Hans & Maria Meier", date:"2026-04-08", status:"gesendet", user_id:"demo-user", description:{rapportNr:1002,projectName:"Badezimmer Umbau",address:"Seestrasse 12",zip:"8000",city:"Zürich",workRows:[{employee:"Sanitärinstallateur",from:"08:00",to:"16:00",hours:8,rate:85},{employee:"Monteur",from:"08:00",to:"16:00",hours:8,rate:75}],materialRows:[{name:"Duschkabine",qty:1,unit:"St",price:1200},{name:"Fliesen",qty:25,unit:"m2",price:45}],costs:{expenses:0,notes:""},totals:{subtotal:2530,vat:205,total:2735}}},
    {id:103, customer:"Immobilien AG Zürich", date:"2026-04-05", status:"archiviert", user_id:"demo-user", description:{rapportNr:1003,projectName:"Fassadenrenovierung",address:"Bahnhofstrasse 45",zip:"8001",city:"Zürich",workRows:[{employee:"Vorarbeiter",from:"07:00",to:"17:00",hours:10,rate:95},{employee:"Monteur",from:"07:00",to:"17:00",hours:10,rate:75},{employee:"Monteur",from:"07:00",to:"17:00",hours:10,rate:75}],materialRows:[{name:"Fassadenfarbe",qty:40,unit:"L",price:18},{name:"Gerüst Miete",qty:5,unit:"Tage",price:250}],costs:{expenses:200,notes:"Entsorgungskosten"},totals:{subtotal:3420,vat:277,total:3697}}},
    {id:104, customer:"Gemeinde Musterstadt", date:"2026-04-15", status:"offen", user_id:"demo-user", description:{rapportNr:1004,projectName:"Elektroinstallation Schulhaus",address:"Schulweg 5",zip:"6000",city:"Luzern",workRows:[{employee:"Elektriker",from:"07:30",to:"16:30",hours:9,rate:90},{employee:"Lehrling",from:"07:30",to:"12:00",hours:4.5,rate:35}],materialRows:[{name:"Kabel NYM 3x1.5",qty:100,unit:"m",price:2.80},{name:"Steckdosen",qty:20,unit:"St",price:12}],costs:{expenses:50,notes:""},totals:{subtotal:1267,vat:102.6,total:1369.6}}},
    {id:105, customer:"Hans & Maria Meier", date:"2026-03-28", status:"archiviert", user_id:"demo-user", description:{rapportNr:1005,projectName:"Gartenanlage",address:"Seestrasse 12",zip:"8000",city:"Zürich",workRows:[{employee:"Gärtner",from:"08:00",to:"17:00",hours:9,rate:70}],materialRows:[{name:"Pflanzen",qty:15,unit:"St",price:35},{name:"Kies",qty:2,unit:"t",price:180}],costs:{expenses:0,notes:""},totals:{subtotal:1293,vat:104.7,total:1397.7}}}
  ],
  invoices: [
    {id:201, invoiceNr:"RE-1001", customer:"Hans & Maria Meier", customerId:2, date:"2026-04-09", totalAmount:2735, status:"bezahlt", subtotal:2530, vat:205, discount:0, discountAmt:0, skontoPct:2, skontoAmt:54.7, paymentDays:30, skontoDays:10},
    {id:202, invoiceNr:"RE-1002", customer:"Immobilien AG Zürich", customerId:3, date:"2026-04-06", totalAmount:3697, status:"versendet", subtotal:3420, vat:277, discount:0, discountAmt:0, skontoPct:2, skontoAmt:73.94, paymentDays:30, skontoDays:10},
    {id:203, invoiceNr:"RE-1003", customer:"Gemeinde Musterstadt", customerId:1, date:"2026-04-15", totalAmount:1369.60, status:"entwurf", subtotal:1267, vat:102.6, discount:0, discountAmt:0, skontoPct:2, skontoAmt:27.39, paymentDays:30, skontoDays:10},
    {id:204, invoiceNr:"RE-1004", customer:"Hans & Maria Meier", customerId:2, date:"2026-03-01", totalAmount:2735, status:"versendet", subtotal:2530, vat:205, discount:0, discountAmt:0, skontoPct:2, skontoAmt:54.7, paymentDays:30, skontoDays:10, mahnung_count:1, mahnung_at:"2026-04-01", mahnung_fee:30, mahnung_notes:"Bitte zahlen Sie umgehend."}
  ],
  offerten: [
    {id:301, offerte_nr:"OF-1001", customer:"Gemeinde Musterstadt", customer_id:1, date:"2026-04-01", valid_until:"2026-05-01", status:"offen", total:8500, description:{projectName:"Dachsanierung Gemeindehaus",address:"Hauptstrasse 1",zip:"6000",city:"Luzern",workRows:[{employee:"Vorarbeiter",from:"07:00",to:"17:00",hours:10,rate:95},{employee:"Monteur",from:"07:00",to:"17:00",hours:10,rate:75}],materialRows:[{name:"Dachziegel",qty:200,unit:"St",price:8.50},{name:"Unterdachbahn",qty:50,unit:"m2",price:12}],subtotal:7870,discountPct:0,skontoPct:2,skontoDays:10,payDays:30,total:8500,notes:"Inkl. Entsorgung"}},
    {id:302, offerte_nr:"OF-1002", customer:"Immobilien AG Zürich", customer_id:3, date:"2026-03-15", valid_until:"2026-04-15", status:"gesendet", total:12400, description:{projectName:"Fassadenrenovierung Bürogebäude",address:"Bahnhofstrasse 45",zip:"8001",city:"Zürich",workRows:[{employee:"Vorarbeiter",from:"07:00",to:"17:00",hours:10,rate:95},{employee:"Monteur",from:"07:00",to:"17:00",hours:10,rate:75},{employee:"Monteur",from:"07:00",to:"17:00",hours:10,rate:75}],materialRows:[{name:"Fassadenfarbe",qty:80,unit:"L",price:18},{name:"Gerüst Miete",qty:10,unit:"Tage",price:250}],subtotal:11480,discountPct:0,skontoPct:2,skontoDays:10,payDays:30,total:12400,notes:""}},
    {id:303, offerte_nr:"OF-1003", customer:"Hans & Maria Meier", customer_id:2, date:"2026-02-20", valid_until:"2026-03-20", status:"angenommen", total:3200, description:{projectName:"Badezimmer Umbau",address:"Seestrasse 12",zip:"8000",city:"Zürich",workRows:[{employee:"Sanitärinstallateur",from:"08:00",to:"16:00",hours:8,rate:85}],materialRows:[{name:"Duschkabine",qty:1,unit:"St",price:1200},{name:"Fliesen",qty:25,unit:"m2",price:45}],subtotal:2965,discountPct:0,skontoPct:2,skontoDays:10,payDays:30,total:3200,notes:"Inkl. Montage"}},
  ],
  team: [
    {id:1, member_email:"thomas.mueller@musterbau.ch", role:"admin", status:"accepted"},
    {id:2, member_email:"sara.weber@musterbau.ch", role:"member", status:"accepted"},
    {id:3, member_email:"mario.rossi@musterbau.ch", role:"member", status:"accepted"},
    {id:4, member_email:"lisa.schneider@musterbau.ch", role:"member", status:"accepted"},
    {id:5, member_email:"peter.keller@musterbau.ch", role:"member", status:"pending"},
  ],
  catalog: {
    employees:[
      {id:1, name:"Vorarbeiter", role:"Vorarbeiter", rate:95},
      {id:2, name:"Monteur", role:"Monteur", rate:75},
      {id:3, name:"Elektriker", role:"Elektriker", rate:90},
      {id:4, name:"Sanitärinstallateur", role:"Sanitärinstallateur", rate:85},
      {id:5, name:"Lehrling", role:"Lehrling", rate:35}
    ],
    materials:[
      {id:1, name:"Dachziegel", description:"Standard Dachziegel", unit:"St", price:8.50},
      {id:2, name:"Kabel NYM 3x1.5", description:"Elektrokabel", unit:"m", price:2.80},
      {id:3, name:"Fassadenfarbe", description:"Wetterschutzfarbe", unit:"L", price:18},
      {id:4, name:"Fliesen 30x30", description:"Bodenfliesen", unit:"m2", price:45},
      {id:5, name:"Schrauben 6x80", description:"Holzschrauben", unit:"Pkg", price:12}
    ]
  }
};

export default function Dashboard({ session, onLogout, onNavigate, isDemo = false }) {
  const userId    = session?.user?.id;
  // Auto-Logout nach 8 Stunden
  useEffect(() => {
    if (!userId || isDemo) return;
    const EIGHT_HOURS = 8 * 60 * 60 * 1000;
    if (!localStorage.getItem("bauabnahme_login_time")) { localStorage.setItem("bauabnahme_login_time", Date.now().toString()); }
const checkExpiry = () => { const t = parseInt(localStorage.getItem("bauabnahme_login_time") || "0"); if (Date.now() - t > EIGHT_HOURS) { localStorage.removeItem("bauabnahme_login_time"); onLogout(); } };
const onVisibility = () => { if (document.visibilityState === "visible") checkExpiry(); };
document.addEventListener("visibilitychange", onVisibility);
const timer = setInterval(checkExpiry, 60000);
return () => { document.removeEventListener("visibilitychange", onVisibility); clearInterval(timer); };
  }, [userId, isDemo]);
  const [showOnboarding, setShowOnboarding] = useState(isDemo ? true : false);
  const [userRole, setUserRole] = useState(isDemo ? "admin" : (localStorage.getItem("bauabnahme_user_role") || "admin"));
  const [teamAdminId, setTeamAdminId] = useState(null);
  const [firmSettings, setFirmSettings] = useState(isDemo ? {company_name:"Musterbau AG",first_name:"Thomas",last_name:"Müller",address:"Industriestrasse 12",zip:"6000",city:"Luzern",phone:"+41 41 123 45 67",email:"demo@bauabnahme.ch",iban:"CH56 0483 5012 3456 7800 9",bank:"Raiffeisenbank Luzern",mwst_nr:"CHE-123.456.789 MWST",company_logo:"/icon-192.svg"} : null);
  const [currentPlan, setCurrentPlan] = useState(localStorage.getItem("bauabnahme_plan") || "starter");
  const [offerten, setOfferten] = useState([]);
  const [archivedOfferten, setArchivedOfferten] = useState([]);
  const [trashOfferten, setTrashOfferten] = useState([]);
  const [openedOfferte, setOpenedOfferte] = useState(null);
  const [nextOfferteNr, setNextOfferteNr] = useState(() => parseInt(localStorage.getItem("bauabnahme_next_offerte_nr") || "1001"));
  const isAdmin = userRole === "admin";
  const roleLoaded = isDemo || userRole !== null;
  const effectiveUserId = isAdmin ? userId : (teamAdminId || userId);
  useEffect(() => { if(!userId||isDemo) return; supabase.from("user_roles").select("role,team_id").eq("user_id",userId).single().then(({data,error})=>{ if(data){ setUserRole(data.role); localStorage.setItem("bauabnahme_user_role", data.role); if(data.team_id) setTeamAdminId(data.team_id); } else { setUserRole("admin"); localStorage.setItem("bauabnahme_user_role","admin"); } }); }, [userId, isDemo]);
  const userEmail = session?.user?.email || "";
  const [view, setView]                         = useState("home");
  const [openedReport, setOpenedReport]         = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editingReport, setEditingReport]       = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const goTo = (v) => { setOpenedReport(null); setSelectedCustomer(null); setEditingReport(null); setView(v); setMobileSidebarOpen(false); };
  
  const [reports, setReports]                 = useState([]);
  const [trashReports, setTrashReports]       = useState([]);
  const [archivedReports, setArchivedReports] = useState([]);
  const [customers, setCustomers]             = useState([]);
  const [trashCustomers, setTrashCustomers]   = useState([]);
  const [projects, setProjects]               = useState([]);
  const [notice, setNotice]                   = useState("");
  const showNotice = useCallback((msg) => { setNotice(msg); setTimeout(() => setNotice(""), 4000); }, []);
  const [uiLanguage, setUiLanguage] = useState(() =>
    normalizeUiLanguage(localStorage.getItem("bauabnahme_language_pref"))
  );
  const pickUiLanguage = useCallback((code) => {
    const next = normalizeUiLanguage(code);
    setUiLanguage(next);
    localStorage.setItem("bauabnahme_language_pref", next);
    window.dispatchEvent(new CustomEvent("bauabnahme-language-change", { detail: next }));
  }, []);

  const [invoices, setInvoices] = useState([]);
   const saveInvoiceToStorage = useCallback(async (inv) => {
if (!isDemo && userId) {
      const row = { id: inv.id, user_id: userId, invoice_nr: inv.invoiceNr, customer: inv.customer, customer_id: String(inv.customerId||""), date: inv.date, total_amount: Number(inv.totalAmount||0), status: inv.status||"entwurf", report_data: inv.reportData||{}, line_items: inv.lineItems||[], subtotal: Number(inv.subtotal||0), vat: Number(inv.vat||0), total: Number(inv.totalAmount||0), discount: Number(inv.discount||0), discount_amt: Number(inv.discountAmt||0), skonto_pct: Number(inv.skontoPct||0), skonto_amt: Number(inv.skontoAmt||0), payment_days: Number(inv.paymentDays||30), skonto_days: Number(inv.skontoDays||10), iban: inv.iban||"", notes: inv.notes||"", projektbezeichnung: inv.projektbezeichnung||"", rapport_ref: String(inv.rapportRef||""), attached_report_ids: inv.attachedReportIds||[], ...(inv.status==="bezahlt" ? {archived_at: inv.archived_at || new Date().toISOString()} : {}) };
      const {error: upsertError} = await supabase.from("invoices").upsert(row, {onConflict: "id"}); if(upsertError) { console.error("INVOICE UPSERT ERROR:", JSON.stringify(upsertError)); showNotice("DB Fehler: " + upsertError.message); }
    }
     setInvoices((prev) => {
      const u = [inv, ...prev.filter((i) => i.id !== inv.id)];
      
      return u;
    });
   }, [userId, isDemo]);
  /** Soft-delete: status `geloescht`, keep in localStorage (Papierkorb). */
  const stornoInvoice = useCallback(async (inv) => { if(!isAdmin){showNotice("⛔ "+(uiLanguage==="FR"?"Réservé à l admin":uiLanguage==="IT"?"Solo amministratore":uiLanguage==="EN"?"Admin only":"Nur Admin")); return;} if(!window.confirm(uiLanguage==="FR"?"Annuler cette facture?":uiLanguage==="IT"?"Stornare questa fattura?":uiLanguage==="EN"?"Cancel this invoice?":"Rechnung stornieren?")) return; if(!isDemo && userId) await supabase.from("invoices").update({status:"storno", archived_at: new Date().toISOString()}).eq("id",String(inv.id)); setInvoices(prev => prev.map(i => invoiceIdEq(i.id, inv.id) ? {...i, status:"storno"} : i)); showNotice(uiLanguage==="FR"?"✅ Facture annulée.": uiLanguage==="IT"?"✅ Fattura stornata.": uiLanguage==="EN"?"✅ Invoice cancelled.":"✅ Rechnung storniert."); }, [userId, isDemo, isAdmin, uiLanguage]);
  const moveInvoiceToTrash = useCallback(async (id) => {
    if(!isDemo && userId) await supabase.from("invoices").update({status:"geloescht", deleted_at: new Date().toISOString()}).eq("id",String(id));
    setInvoices((prev) => prev.map((i) => invoiceIdEq(i.id, id) ? { ...i, status: "geloescht", _preTrashStatus: i.status === "versendet" ? "versendet" : "entwurf" } : i));
  }, [userId, isDemo]);
  const restoreInvoice = useCallback(async (inv) => {
    const back = (inv._preTrashStatus === "versendet") ? "versendet" : "entwurf";
    if (!isDemo && userId) {
      await supabase.from("invoices").update({ status: back }).eq("id", inv.id);
    }
    setInvoices((prev) => prev.map((i) => {
      if (!invoiceIdEq(i.id, inv.id)) return i;
      const { _preTrashStatus, ...rest } = i;
      return { ...rest, status: back };
    }));
    }, [userId, isDemo]);
  const hardDeleteInvoice = useCallback(async (id) => {
    if(!isDemo && userId) await supabase.from("invoices").delete().eq("id",String(id));
    setInvoices((prev) => prev.filter((i) => !invoiceIdEq(i.id, id)));
  }, [userId, isDemo]);
  const allInvoices = useMemo(
    () => invoices.filter((i) => String(i.status || "").trim().toLowerCase() !== "geloescht"),
    [invoices]
  );
  const visibleInvoices = useMemo(
    () => invoices.filter((i) => String(i.status || "").trim().toLowerCase() === "entwurf"),
    [invoices]
  );
  const trashInvoices = useMemo(
    () => invoices.filter((i) => String(i.status || "").trim().toLowerCase() === "geloescht"),
    [invoices]
  );
  const [nextRapportNr, setNextRapportNrState] = useState(() => parseInt(localStorage.getItem("bauabnahme_next_rapport_nr") || "1001"));
  const [nextInvoiceNr, setNextInvoiceNrState] = useState(() => parseInt(localStorage.getItem("bauabnahme_next_invoice_nr") || "1001"));
  const bumpRapportNr = () => { const n = nextRapportNr; setNextRapportNrState(n+1); localStorage.setItem("bauabnahme_next_rapport_nr", String(n+1)); if(!isDemo && userId) supabase.from("user_settings").upsert({user_id:userId, next_rapport_nr:n+1, updated_at:new Date().toISOString()},{onConflict:"user_id"}); return n; };
  const bumpInvoiceNr = () => { const n = nextInvoiceNr; setNextInvoiceNrState(n+1); localStorage.setItem("bauabnahme_next_invoice_nr", String(n+1)); if(!isDemo && userId) supabase.from("user_settings").upsert({user_id:userId, next_invoice_nr:n+1, updated_at:new Date().toISOString()},{onConflict:"user_id"}); return n; };
  const [catalog, setCatalog] = useState({employees:[],materials:[]});
  const emptyForm = { selectedCustomerId:"", selectedProjectId:"", customer:"", address:"", zip:"", city:"", orderNo:"", customerEmail:"", date: new Date().toISOString().slice(0,10), status:"offen", expenses:"", notes:"", beforePhoto:"", afterPhoto:"", signerName:"", signatureImage:"", customerSignerName:"", customerSignatureImage:""};
  const [customerForm, setCustomerForm] = useState({ company:"", firstName:"", lastName:"", address:"", zip:"", city:"", phone:"", email:"", mwst:"" });
  const [reportForm, setReportForm]     = useState(emptyForm);
  const [workRows, setWorkRows]         = useState([{ employee:"", from:"", to:"", rate:"" }]);
  const [materialRows, setMaterialRows] = useState([{ name:"", qty:"", unit:"", price:"" }]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const customerProjects = useMemo(() => projects.filter(p => String(p.customer_id) === String(reportForm.selectedCustomerId)), [projects, reportForm.selectedCustomerId]);
  const workSubtotal     = useMemo(() => workRows.reduce((s,r) => s + calcHours(r.from,r.to)*toNum(r.rate), 0), [workRows]);
  const materialSubtotal = useMemo(() => materialRows.reduce((s,r) => s + toNum(r.qty)*toNum(r.price), 0), [materialRows]);
  const expenses = toNum(reportForm.expenses);
  const subtotal = workSubtotal + materialSubtotal + expenses;
  const vat      = subtotal * 0.081;
  const total    = subtotal + vat;
  const [invoiceModal, setInvoiceModal]           = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [invoiceDiscount, setInvoiceDiscount]     = useState("0");
  const [invoiceSkonto, setInvoiceSkonto]         = useState("0");
  const [invoicePayDays, setInvoicePayDays]       = useState("30");
  const [invoiceSkontoDays, setInvoiceSkontoDays] = useState("10");
  const openInvoice = async (r) => { const ok = await checkLimit("invoice"); if (!ok) return; setInvoiceDiscount("0"); setInvoiceSkonto("0"); setInvoicePayDays("30"); setInvoiceSkontoDays("10"); setInvoiceModal(r); };
  const fetchCustomers = async () => { if(!userId){ return []; } let data, error; try { const res = await supabase.from("customers").select("*").eq("user_id",effectiveUserId).order("name",{ascending:true}); data = res.data; error = res.error; } catch(e) { console.log("CUSTOMERS EXCEPTION:", e.message); return []; } if(error){showNotice("Ladefehler: "+error.message);return[];} console.log("CUSTOMERS DATA:", data?.length, error?.message); setCustomers((data||[]).filter(c=>c.phone!=="__geloescht__")); setTrashCustomers((data||[]).filter(c=>c.phone==="__geloescht__")); return (data||[]).filter(c=>c.phone!=="__geloescht__"); };
  const fetchCatalog = async () => { if(!userId) return; const {data:staff} = await supabase.from("staff").select("*").eq("user_id",effectiveUserId); const {data:mats} = await supabase.from("materials").select("*").eq("user_id",effectiveUserId); setCatalog({employees:(staff||[]).map(e=>({id:e.id,name:e.name,role:e.description,rate:e.rate})),materials:(mats||[]).map(m=>({id:m.id,name:m.name,description:m.description,unit:m.unit,price:m.price}))}); };
  const saveCatalog = async (u) => { setCatalog(u); if(!userId) return; const emps = u.employees||[]; const mats = u.materials||[]; const empIds = emps.map(e=>String(e.id)).filter(Boolean); const matIds = mats.map(m=>String(m.id)).filter(Boolean); if(empIds.length>0){ await supabase.from("staff").delete().eq("user_id",effectiveUserId).not("id","in",`(${empIds.join(",")})`); } else { await supabase.from("staff").delete().eq("user_id",effectiveUserId); } if(matIds.length>0){ await supabase.from("materials").delete().eq("user_id",effectiveUserId).not("id","in",`(${matIds.join(",")})`); } else { await supabase.from("materials").delete().eq("user_id",effectiveUserId); } for(const e of emps){ await supabase.from("staff").upsert({id:e.id,user_id:userId,name:e.name||"",description:e.role||"",rate:Number(e.rate||0)}); } for(const m of mats){ await supabase.from("materials").upsert({id:m.id,user_id:userId,name:m.name||"",description:m.description||"",unit:m.unit||"St",price:Number(m.price||0)}); } };
  const fetchProjects = async (list) => { if(!list?.length){setProjects([]);return;} try { const{data,error}=await supabase.from("projects").select("*").in("customer_id",list.map(c=>c.id)); if(!error) setProjects(data||[]); } catch(e){} };
  const fetchPlan = async () => { const {data} = await supabase.from("usage_limits").select("plan").eq("user_id",effectiveUserId).single(); if(data?.plan) { setCurrentPlan(data.plan); localStorage.setItem("bauabnahme_plan", data.plan); } };
  const fetchOfferten = async () => { if(!effectiveUserId) return; const {data} = await supabase.from("offerten").select("*").eq("user_id",effectiveUserId).order("created_at",{ascending:false}); setOfferten((data||[]).filter(o=>o.status!=="geloescht"&&o.status!=="gesendet"&&o.status!=="archiviert"&&o.status!=="angenommen"&&o.status!=="abgelehnt")); setArchivedOfferten((data||[]).filter(o=>o.status==="gesendet"||o.status==="archiviert"||o.status==="angenommen"||o.status==="abgelehnt")); setTrashOfferten((data||[]).filter(o=>o.status==="geloescht")); };
  const fetchUserSettings = async () => { const {data} = await supabase.from("user_settings").select("*").eq("user_id",effectiveUserId).single(); if(data){ setNextRapportNrState(data.next_rapport_nr); setNextInvoiceNrState(data.next_invoice_nr); if(data.next_offerte_nr) setNextOfferteNr(data.next_offerte_nr); localStorage.setItem("bauabnahme_next_rapport_nr", String(data.next_rapport_nr)); localStorage.setItem("bauabnahme_next_invoice_nr", String(data.next_invoice_nr)); localStorage.setItem("bauabnahme_next_customer_nr", String(data.next_customer_nr)); if(data.next_offerte_nr) localStorage.setItem("bauabnahme_next_offerte_nr", String(data.next_offerte_nr)); if(!data.onboarding_done) setShowOnboarding(true); } else { setShowOnboarding(true); } };
  useEffect(() => {
  if(isDemo || !effectiveUserId) return;
  const channel = supabase.channel('db-changes-' + effectiveUserId)
    .on('postgres_changes', {event:'*', schema:'public', table:'reports', filter:'user_id=eq.'+effectiveUserId}, () => fetchReports())
    .on('postgres_changes', {event:'*', schema:'public', table:'customers', filter:'user_id=eq.'+effectiveUserId}, () => fetchCustomers())
    .on('postgres_changes', {event:'*', schema:'public', table:'invoices', filter:'user_id=eq.'+effectiveUserId}, () => fetchInvoices())
    .on('postgres_changes', {event:'*', schema:'public', table:'offerten', filter:'user_id=eq.'+effectiveUserId}, () => fetchOfferten())
    .subscribe();
  return () => supabase.removeChannel(channel);
}, [effectiveUserId, isDemo]);

  const fetchFirmSettings = async () => { const {data} = await supabase.from("firm_settings").select("*").eq("user_id",effectiveUserId).single(); if(data) setFirmSettings(data); };
  const fetchReports = async () => {
    if (!userId) return;
    const { data, error } = await supabase.from("reports").select("*").eq("user_id", effectiveUserId).order("id", { ascending: false });
    if (error) {
      showNotice("Ladefehler: " + error.message);
      return;
    }
    const all = data || [];
    setTrashReports(all.filter((r) => r.status === "geloescht"));
    const active = all.filter((r) => r.status !== "geloescht");
    setReports(active.filter((r) => r.status !== "archiviert" && r.status !== "gesendet" && r.status !== "jahresarchiv"));
    setArchivedReports(active.filter((r) => r.status === "archiviert" || r.status === "gesendet" || r.status === "jahresarchiv"));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap: fetch* recreated each render
  useEffect(() => { if(isDemo){
    if(!localStorage.getItem("demo_initialized_v2")){
      localStorage.setItem("demo_reports", JSON.stringify(DEMO_DATA.reports));
      localStorage.setItem("demo_customers", JSON.stringify(DEMO_DATA.customers));
      localStorage.setItem("demo_invoices", JSON.stringify(DEMO_DATA.invoices));
      localStorage.setItem("demo_catalog", JSON.stringify(DEMO_DATA.catalog));
      localStorage.setItem("demo_team", JSON.stringify(DEMO_DATA.team));
      localStorage.setItem("demo_offerten", JSON.stringify(DEMO_DATA.offerten));
      localStorage.setItem("demo_initialized_v2", "1");
    }
    const all=JSON.parse(localStorage.getItem("demo_reports")||"[]");
    const demoCust=JSON.parse(localStorage.getItem("demo_customers")||"[]"); setCustomers(demoCust);
    const demoInv=JSON.parse(localStorage.getItem("demo_invoices")||"[]"); setInvoices(demoInv);
    const demoCat=JSON.parse(localStorage.getItem("demo_catalog")||JSON.stringify({employees:[],materials:[]})); setCatalog(demoCat); const demoOff=JSON.parse(localStorage.getItem("demo_offerten")||"[]"); setOfferten(demoOff.filter(o=>o.status!=="geloescht")); setReports(all.filter(r=>r.status!=="geloescht"&&r.status!=="archiviert"&&r.status!=="gesendet")); setArchivedReports(all.filter(r=>r.status==="archiviert"||r.status==="gesendet")); setTrashReports(all.filter(r=>r.status==="geloescht")); return;} console.log("USEEFFECT:", userId, isDemo, "effectiveUserId:", effectiveUserId, "isAdmin:", isAdmin); if(!userId) return; fetchCustomers(); fetchReports(); fetchInvoices(); fetchCatalog(); fetchFirmSettings(); fetchPlan(); fetchUserSettings(); fetchOfferten(); }, [userId,isDemo,teamAdminId,isAdmin,roleLoaded,effectiveUserId]);
  const fetchInvoices = async () => { 
    if(!userId) return;
    const {data} = await supabase.from("invoices").select("*").eq("user_id",effectiveUserId).order("id",{ascending:false});
    if(data) setInvoices(data.map(r=>({id:r.id,invoiceNr:r.invoice_nr,customer:r.customer,customerId:r.customer_id,date:r.date,totalAmount:Number(r.total_amount),status:r.status,reportData:r.report_data,lineItems:r.line_items,subtotal:Number(r.subtotal),vat:Number(r.vat),total:Number(r.total),discount:Number(r.discount),discountAmt:Number(r.discount_amt),skontoPct:Number(r.skonto_pct),skontoAmt:Number(r.skonto_amt),paymentDays:Number(r.payment_days),skontoDays:Number(r.skonto_days),iban:r.iban,notes:r.notes,projektbezeichnung:r.projektbezeichnung,rapportRef:r.rapport_ref,attachedReportIds:r.attached_report_ids||[],mahnung_count:r.mahnung_count||0,mahnung_at:r.mahnung_at,mahnung_fee:r.mahnung_fee,mahnung_notes:r.mahnung_notes}))); };  const handleCustomerSelect = (id) => {
    const c = customers.find((x) => String(x.id) === String(id));
    if (!c) return;
    const m = parseCustomerMeta(c);
    setShowCustomerSuggestions(false);
    setReportForm((p) => ({
      ...p,
      selectedCustomerId: String(c.id),
      selectedProjectId: "",
      customer: c.name || "",
      customerEmail: c.email || "",
      address: m.address || "",
      zip: m.zip || "",
      city: m.city || ""
    }));
  };
    const checkLimit = async (type) => {
    const plan = localStorage.getItem("bauabnahme_plan") || "starter";
    if (plan !== "starter") return true;
    const month = new Date().toISOString().slice(0, 7);
    const { data } = await supabase.from("usage_limits").select("*").eq("user_id", effectiveUserId).single();
    if (!data || data.month_year !== month) {
      await supabase.from("usage_limits").upsert({ user_id: userId, reports_this_month: 0, invoices_this_month: 0, month_year: month });
      return true;
    }
    if (type === "report" && data.reports_this_month >= 15) {
      showNotice("⚠️ Limit erreicht! Max 15 Rapporte/Monat im Starter Plan. Bitte auf Pro upgraden.");
      goTo("settings");
      return false;
    }
    if (type === "invoice" && data.invoices_this_month >= 15) {
      showNotice("⚠️ Limit erreicht! Max 15 Rechnungen/Monat im Starter Plan. Bitte auf Pro upgraden.");
      goTo("settings");
      return false;
    }
    return true;
  };

  const bumpUsage = async (type) => {
    const plan = localStorage.getItem("bauabnahme_plan") || "starter";
    if (plan !== "starter") return;
    const month = new Date().toISOString().slice(0, 7);
    const { data } = await supabase.from("usage_limits").select("*").eq("user_id", effectiveUserId).single();
    if (data && data.month_year === month) {
      const update = type === "report" ? { reports_this_month: (data.reports_this_month||0) + 1 } : { invoices_this_month: (data.invoices_this_month||0) + 1 };
      await supabase.from("usage_limits").update(update).eq("user_id", effectiveUserId);
    }
  };

  const handleSave = async () => {
    setShowCustomerSuggestions(false);const ok = await checkLimit("report"); if (!ok) return;

    if (!reportForm.customer.trim()) {
      showNotice("Bitte Firmenname eingeben.");
      return;
    }
    if (!isDemo && !userId) {
      showNotice("Nicht angemeldet.");
      return;
    }
    const sp = customerProjects.find((p) => String(p.id) === String(reportForm.selectedProjectId));
    const wasEditing = !!editingReport;
    const rapportNr = editingReport ? (parseReport(editingReport).rapportNr || editingReport.id) : bumpRapportNr();
    const payload = buildReportDescriptionPayload({
      rapportNr,
      reportForm,
      sp,
      workRows,
      materialRows,
      expenses,
      subtotal,
      vat,
      total
    });
    const pgDate = toPgDate(reportForm.date);
    const statusStr = String(reportForm.status || "offen");
    const customerStr = reportForm.customer.trim();
    const insertRow = {
      user_id: userId,
      customer: customerStr,
      date: pgDate,
      status: statusStr,
      description: payload
    };
    const updateRow = {
      customer: customerStr,
      date: pgDate,
      status: statusStr,
      description: payload
    };
    if (isDemo) {
      const row = { ...insertRow };
      const all = JSON.parse(localStorage.getItem("demo_reports") || "[]");
      if (editingReport) {
        const i = all.findIndex((r) => r.id === editingReport.id);
        if (i >= 0) all[i] = { ...row, id: editingReport.id };
      } else {
        all.unshift({ ...row, id: Date.now(), created_at: new Date().toISOString() });
      }
      localStorage.setItem("demo_reports", JSON.stringify(all));
      setReports(all.filter((r) => r.status !== "geloescht" && r.status !== "archiviert" && r.status !== "gesendet"));
    } else {
      let err;
      if (editingReport) {
        ({ error: err } = await supabase.from("reports").update(updateRow).eq("id", editingReport.id).eq("user_id", effectiveUserId));
      } else {
        ({ error: err } = await supabase.from("reports").insert(insertRow));
      }
      if (err) {
        showNotice("❌ Fehler: " + (err.message || JSON.stringify(err)));
        return;
      }
      await fetchReports();
    }
    setEditingReport(null);
    setReportForm(emptyForm);
    setWorkRows([{ employee: "", from: "", to: "", rate: "" }]);
    setMaterialRows([{ name: "", qty: "", unit: "", price: "" }]);
    if (!wasEditing) await bumpUsage("report");
    showNotice(wasEditing ? "Rapport aktualisiert." : "Rapport gespeichert.");
    goTo("reports");
  };
  const startEdit = (r) => { const p=parseReport(r); setReportForm({selectedCustomerId:String(p.customerId||""),selectedProjectId:String(p.projectId||""),customer:r.customer||"",address:p.address||"",zip:p.zip||"",city:p.city||"",orderNo:p.orderNo||"",projectSearch:p.projectName||"",customerEmail:p.customerEmail||"",date:toPgDate(r.date||emptyForm.date),status:r.status||"offen",expenses:p.costs?.expenses?String(p.costs.expenses):"",notes:p.costs?.notes||"",beforePhoto:p.photos?.before||"",afterPhoto:p.photos?.after||"",signerName:p.signature?.name||"",signatureImage:p.signature?.image||""}); setWorkRows(p.workRows?.length?p.workRows.map(r=>({employee:r.employee||"",from:r.from||"",to:r.to||"",rate:r.rate?String(r.rate):""})):[{employee:"",from:"",to:"",rate:""}]); setMaterialRows(p.materialRows?.length?p.materialRows.map(r=>({name:r.name||"",qty:r.qty?String(r.qty):"",unit:r.unit||"",price:r.price?String(r.price):""})):[{name:"",qty:"",unit:"",price:""}]); setEditingReport(r); setOpenedReport(null); setSelectedCustomer(null); setView("new-report"); };
  const openOffertePDF = (offerte) => {
    const desc = offerte.description || {};
    const {firmName,firmLogo,firmAddress,firmContact,firmPhone,firmEmail,firmMwst,firmZip,firmCity} = getFirmMeta();
    const isPro = currentPlan==="pro"||currentPlan==="team";
    const firmDetails = [firmContact&&firmName?firmContact:"",firmAddress,firmPhone,firmEmail].filter(Boolean).join("<br/>");
    const custRec = customers.find(c => String(c.id) === String(offerte.customer_id) || c.name === offerte.customer); const custM = custRec ? parseCustomerMeta(custRec) : {};
    const addrParts = [desc.address||custM.address||"",[desc.zip||custM.zip||"",desc.city||custM.city||""].filter(Boolean).join(" ")].filter(Boolean);
    const custAddr = addrParts.join("\n");
    const sub = Number(desc.subtotal||offerte.total||0);
    const discAmt = sub*(Number(desc.discountPct||0)/100);
    const afterDisc = sub - discAmt - Number(desc.lumpsum||0);
    const vat = afterDisc*0.081;
    const tot = afterDisc+vat;
    const skontoAmt = tot*(Number(desc.skontoPct||0)/100);
    const win = window.open("","_blank","width=980,height=760");
    if(!win) return;
    win.document.write(buildOfferteHtml({
      language: uiLanguage, offerteNr: offerte.offerte_nr,
      firmName, firmLogo, firmContact, firmAddress, firmPhone, firmEmail, firmMwst,
      name: offerte.customer, custAddr,
      validUntil: offerte.valid_until,
      payDays: desc.payDays||30, skontoPct: desc.skontoPct||0,
      skontoAmt, skontoDays: desc.skontoDays||10,
      workRows: desc.workRows||[], materialRows: desc.materialRows||[],
      subtotal: sub, discountPct: desc.discountPct||0, discountAmt: discAmt,
      lumpsum: desc.lumpsum||0, vat, total: tot,
      notes: desc.notes||"", projectName: desc.projectName||"",
      reportDate: offerte.date||"", custEmail: desc.customerEmail||"",
      isPro, isDemoMode: isDemo,
      signatureImage: desc.signatureImage||"",
      customerSignatureImage: desc.customerSignatureImage||"",
      signerName: desc.signerName||"",
      customerSignerName: desc.customerSignerName||"",
      photo: desc.photo||"",
    }));
    win.document.close();
  };
  const saveOfferte = async (payload) => { const nr = nextOfferteNr; const newNr = nr + 1; setNextOfferteNr(newNr); localStorage.setItem("bauabnahme_next_offerte_nr", String(newNr)); const row = { user_id: userId, customer: payload.customer, customer_id: payload.customerId ? parseInt(payload.customerId) || null : null, date: payload.date, valid_until: payload.validUntil||null, status: payload.status||"offen", description: payload, total: payload.total||0 }; const {data,error} = await supabase.from("offerten").insert(row).select("*").single(); if(error){showNotice("Fehler: "+error.message);return;} setOfferten(p=>[data,...p]); showNotice("✅ Offerte gespeichert."); goTo("offerten"); };
  const onMahnung = async (inv, fee, notes, days) => {
    const win = window.open("","_blank","width=980,height=760");
    if(!win) return;
    const newCount = (inv.mahnung_count || 0) + 1;
    const update = { mahnung_count: newCount, mahnung_at: new Date().toISOString(), mahnung_fee: fee, mahnung_notes: notes };
    if (!isDemo && userId) await supabase.from("invoices").update(update).eq("id", String(inv.id));
    saveInvoiceToStorage({ ...inv, ...update });
    const {firmName,firmLogo,firmContact,firmAddress,firmPhone,firmEmail,firmMwst,firmIban,firmZip,firmCity} = getFirmMeta();
    const firmDetails = [firmContact&&firmName?firmContact:"",firmAddress,firmPhone,firmEmail].filter(Boolean).join("<br/>");
    const newDueDate = new Date(Date.now() + days*24*60*60*1000).toLocaleDateString('de-CH');
    const custRecord = customers.find(c => String(c.id) === String(inv.customerId) || c.name === inv.customer);
    const custMeta = custRecord ? parseCustomerMeta(custRecord) : {};
    const custAddr = [custMeta.address||"", [custMeta.zip||"",custMeta.city||""].filter(Boolean).join(" ")].filter(Boolean).join("\n");
    const isPro = localStorage.getItem("bauabnahme_plan")==="pro"||localStorage.getItem("bauabnahme_plan")==="team";
    win.document.write(buildMahnungHtml({
      language: uiLanguage, invoiceNr: inv.invoiceNr, mahnungNr: newCount,
      firmName, firmLogo, firmContact, firmAddress, firmPhone, firmEmail, firmMwst,
      name: inv.customer, custAddr, custEmail: custRecord?.email||"",
      originalAmount: inv.totalAmount, mahnungFee: fee, mahnungNotes: notes,
      newDueDate, reportDate: new Date().toLocaleDateString('de-CH'),
      projectName: inv.reportData?.projectName||"", isPro, isDemoMode: !userId,
      qrUrl: firmIban ? buildSwissQR(firmIban, Number(inv.totalAmount||0)+Number(fee||0), firmName||firmContact, firmAddress, firmZip||"", firmCity||"", inv.customer||"", custAddr,"","","","Mahnung "+inv.invoiceNr) : "",
      iban: inv.iban||firmIban||""
    }));
    const invP = inv.reportData||{};
    const invFirm = getFirmMeta();
    const invFirmDetails = [invFirm.firmContact&&invFirm.firmName?invFirm.firmContact:'',invFirm.firmAddress,invFirm.firmPhone,invFirm.firmEmail].filter(Boolean).join('<br/>');
    const totalDue = Number(inv.totalAmount||0) + Number(fee||0);
    win.document.write('<div style="page-break-before:always"></div>');
    win.document.write(buildRechnungHtml({ invoiceNr: inv.invoiceNr, firmName: invFirm.firmName, firmLogo: invFirm.firmLogo, firmContact: invFirm.firmContact, firmAddress: invFirm.firmAddress, firmPhone: invFirm.firmPhone||"", firmEmail: invFirm.firmEmail||"", firmMwst: invFirm.firmMwst, name: inv.customer||'-', custAddr, custStreet: invP.address||'', custZip: invP.zip||'', custCity: invP.city||'', validWork: (invP.workRows||[]).filter(r=>r.employee||toNum(r.hours)>0), validMat: (invP.materialRows||[]).filter(r=>r.name||toNum(r.qty)>0), costs: invP.costs||{}, subtotal: Number(inv.subtotal||0), discountPct: Number(inv.discount||0), discountAmt: Number(inv.discountAmt||0), subtotalAfterDiscount: Number(inv.subtotal||0)-Number(inv.discountAmt||0), vat: Number(inv.vat||0), totalAmount: Number(inv.totalAmount||0), skontoPct: Number(inv.skontoPct||0), skontoAmt: Number(inv.skontoAmt||0), payDays: Number(inv.paymentDays||30), skontoDays: Number(inv.skontoDays||10), dueDate: '-', skontoDueDate: '-', qrUrl: firmIban ? buildSwissQR(firmIban, Number(inv.totalAmount||0), invFirm.firmName||invFirm.firmContact, invFirm.firmAddress, invFirm.firmZip||'', invFirm.firmCity||'', inv.customer||'', custAddr,'','','',inv.invoiceNr) : '', isPro, isDemoMode: !userId, reportDate: inv.date||new Date().toISOString().slice(0,10), projectName: invP.projectName||'', rapportNr: invP.rapportNr||'', custEmail: custRecord?.email||'', language: uiLanguage }));
    win.document.close();
    showNotice("Mahnung erstellt!");
  };

  const updateOfferteStatus = async (id, status) => {
    const offerteUpdate = {status}; if(status==="gesendet"||status==="archiviert") offerteUpdate.archived_at = new Date().toISOString(); const {error} = await supabase.from("offerten").update(offerteUpdate).eq("id", id);
    if(error){showNotice("Fehler: "+error.message);return;}
    await new Promise(r => setTimeout(r, 300)); await fetchOfferten(); setOpenedOfferte(null); if(selectedCustomer) setView("customers"); if(status==="gesendet"||status==="archiviert") showNotice(uiLanguage==="FR"?"✅ Offre déplacée vers l'archive client.":uiLanguage==="IT"?"✅ Offerta spostata nell'archivio cliente.":uiLanguage==="EN"?"✅ Quote moved to customer archive.":"✅ Offerte zum Kunden verschoben.");
    if(setOpenedOfferte && openedOfferte?.id===id) setOpenedOfferte(o => ({...o, status}));

  };
  const deleteOfferte = async (offerte) => {
    if(!window.confirm("Offerte löschen?")) return;
    await supabase.from("offerten").update({status:"geloescht", deleted_at: new Date().toISOString()}).eq("id", offerte.id);
    setOfferten(p => p.filter(o => o.id!==offerte.id));
    setTrashOfferten(p => [{ ...offerte, status:"geloescht" }, ...p]);
    showNotice("Offerte in Papierkorb.");
    goTo("offerten");
  };
  const restoreOfferte = async (offerte) => {
    await supabase.from("offerten").update({status:"offen"}).eq("id", offerte.id);
    setTrashOfferten(p => p.filter(o => o.id!==offerte.id));
    setOfferten(p => [{ ...offerte, status:"offen" }, ...p]);
    showNotice("Offerte wiederhergestellt.");
  };
  const hardDeleteOfferte = async (offerte) => {
    if(!window.confirm("Endgültig löschen?")) return;
    await supabase.from("offerten").delete().eq("id", offerte.id);
    setTrashOfferten(p => p.filter(o => o.id!==offerte.id));
    showNotice("Offerte gelöscht.");
  };
  const createRapportFromOfferte = (offerte) => {
    const desc = offerte.description || {};
    setReportForm(f => ({...f, customer:offerte.customer, selectedCustomerId:String(offerte.customer_id||""), address:desc.address||"", zip:desc.zip||"", city:desc.city||"", customerEmail:desc.customerEmail||"", orderNo:desc.orderNo||"", projectSearch:desc.projectName||"", date:new Date().toISOString().slice(0,10), status:"offen"}));
    if(Array.isArray(desc.workRows) && desc.workRows.length) setWorkRows(desc.workRows.map(r=>({...r})));
    if(Array.isArray(desc.materialRows) && desc.materialRows.length) setMaterialRows(desc.materialRows.map(r=>({...r})));
    goTo("new-report");
    showNotice("Rapport aus Offerte erstellt.");
  };
  const createInvoiceFromOfferte = async (offerte) => {
    const ok = await checkLimit("invoice");
    if (!ok) return;
    const desc = offerte.description || {};
    setInvoiceDiscount("0");
    setInvoiceSkonto("0");
    setInvoicePayDays("30");
    setInvoiceSkontoDays("10");
    const fakeReport = {
      id: "OF-" + offerte.offerte_nr,
      customer: offerte.customer,
      customerId: offerte.customer_id,
      date: offerte.date,
      description: {
        ...desc,
        rapportNr: "OF-" + offerte.offerte_nr,
        projectName: desc.projectName || "",
        address: desc.address || "",
        zip: desc.zip || "",
        city: desc.city || "",
        customerEmail: desc.customerEmail || "",
        workRows: desc.workRows || [],
        materialRows: desc.materialRows || [],
        totals: { subtotal: offerte.total / 1.081, vat: offerte.total - offerte.total / 1.081, total: offerte.total }
      }
    };
    setInvoiceModal(fakeReport);
  };

  const moveToTrash = async (r) => { if(!window.confirm(uiLanguage==="FR"?"Supprimer?":uiLanguage==="IT"?"Eliminare?":uiLanguage==="EN"?"Delete?":"Löschen?")) return; const deleted={...r,status:"geloescht"}; if(isDemo){const all=JSON.parse(localStorage.getItem("demo_reports")||"[]"); localStorage.setItem("demo_reports",JSON.stringify(all.map(x=>x.id===r.id?deleted:x)));}else{const{error}=await supabase.from("reports").update({status:"geloescht"}).eq("id",r.id).eq("user_id",effectiveUserId); if(error){showNotice("Fehler: "+error.message);return;}} setReports(p=>p.filter(x=>x.id!==r.id)); setArchivedReports(p=>p.filter(x=>x.id!==r.id)); setTrashReports(p=>[...p,deleted]); if(openedReport?.id===r.id) setOpenedReport(null); };
  const restore = async (r) => { if(isDemo){const all=JSON.parse(localStorage.getItem("demo_reports")||"[]"); localStorage.setItem("demo_reports",JSON.stringify(all.map(x=>x.id===r.id?{...x,status:"offen"}:x)));}else{const{error}=await supabase.from("reports").update({status:"offen"}).eq("id",r.id).eq("user_id",effectiveUserId); if(error){showNotice("Fehler: "+error.message);return;}} setTrashReports(p=>p.filter(x=>x.id!==r.id)); setReports(p=>[{...r,status:"offen"},...p]); };
  const hardDelete = async (r) => { if(!window.confirm(uiLanguage==="FR"?"Supprimer definitivement?":uiLanguage==="IT"?"Eliminare definitivamente?":uiLanguage==="EN"?"Delete permanently?":"Endgültig löschen?")) return; if(isDemo){const all=JSON.parse(localStorage.getItem("demo_reports")||"[]").filter(x=>x.id!==r.id); localStorage.setItem("demo_reports",JSON.stringify(all)); setTrashReports(all.filter(x=>x.status==="geloescht"));}else{const{error}=await supabase.from("reports").delete().eq("id",r.id).eq("user_id",effectiveUserId); if(error){showNotice("Fehler: "+error.message);return;}} setTrashReports(p=>p.filter(x=>x.id!==r.id)); showNotice("Gelöscht."); };
  const updateStatus = async (id, status) => { if(isDemo){const all=JSON.parse(localStorage.getItem("demo_reports")||"[]").map(x=>x.id===id?{...x,status}:x); localStorage.setItem("demo_reports",JSON.stringify(all)); setReports(all.filter(r=>r.status!=="geloescht"&&r.status!=="archiviert"&&r.status!=="gesendet")); setArchivedReports(all.filter(r=>r.status==="archiviert"||r.status==="gesendet")); setOpenedReport(null); return;} const updateData = {status}; if(status==="archiviert"||status==="gesendet") updateData.archived_at = new Date().toISOString(); const{error}=await supabase.from("reports").update(updateData).eq("id",id).eq("user_id",effectiveUserId); if(error){showNotice("Fehler: "+error.message);return;} await fetchReports(); setOpenedReport(null); if(selectedCustomer) setView("customers"); if(status==="archiviert"||status==="gesendet") showNotice("✅ Rapport zum Kunden verschoben."); };
  const saveCustomer = async () => { if(!isDemo && !userId){showNotice("Firmenname fehlt.");return;} if(!customerForm.company.trim()){showNotice("Firmenname fehlt.");return;} if(isDemo){ const nextKNr=parseInt(localStorage.getItem("bauabnahme_next_customer_nr")||"4"); localStorage.setItem("bauabnahme_next_customer_nr",String(nextKNr+1)); const meta={kundennummer:"K-"+String(nextKNr).padStart(3,"0"),firstName:customerForm.firstName,lastName:customerForm.lastName,address:customerForm.address,zip:customerForm.zip,city:customerForm.city}; const newC={id:Date.now(),name:customerForm.company.trim(),address:JSON.stringify(meta),phone:customerForm.phone,email:customerForm.email}; setCustomers(p=>[newC,...p]); showNotice("Kunde gespeichert."); setCustomerForm({company:"",firstName:"",lastName:"",address:"",zip:"",city:"",phone:"",email:"",mwst:""}); return; } if(editingCustomer){ const meta={...parseCustomerMeta(editingCustomer),firstName:customerForm.firstName,lastName:customerForm.lastName,address:customerForm.address,zip:customerForm.zip,city:customerForm.city,mwst:customerForm.mwst||""}; await supabase.from("customers").update({name:customerForm.company.trim(),address:JSON.stringify(meta),phone:customerForm.phone,email:customerForm.email}).eq("id",editingCustomer.id); setCustomers(p=>p.map(x=>x.id===editingCustomer.id?{...x,name:customerForm.company.trim(),address:JSON.stringify(meta),phone:customerForm.phone,email:customerForm.email}:x)); setEditingCustomer(null); setCustomerForm({company:"",firstName:"",lastName:"",address:"",zip:"",city:"",phone:"",email:"",mwst:""}); showNotice("Kunde aktualisiert."); return; } const nextKNr=parseInt(localStorage.getItem("bauabnahme_next_customer_nr")||"1"); localStorage.setItem("bauabnahme_next_customer_nr",String(nextKNr+1)); const meta={kundennummer:`K-${String(nextKNr).padStart(3,"0")}`,firstName:customerForm.firstName,lastName:customerForm.lastName,address:customerForm.address,zip:customerForm.zip,city:customerForm.city,mwst:customerForm.mwst||""}; const{data,error}=await supabase.from("customers").insert({user_id:userId,name:customerForm.company.trim(),address:JSON.stringify(meta),phone:customerForm.phone,email:customerForm.email}).select("*").single(); if(error){showNotice("Fehler beim Speichern.");return;} setCustomers(p=>[data,...p]); showNotice("Kunde gespeichert."); setCustomerForm({company:"",firstName:"",lastName:"",address:"",zip:"",city:"",phone:"",email:"",mwst:""}); };
  const deleteCustomer = async (c) => { if(!window.confirm(uiLanguage==="FR"?"Supprimer le client?":uiLanguage==="IT"?"Eliminare il cliente?":uiLanguage==="EN"?"Delete customer?":"Kunden loeschen?")) return; await supabase.from("customers").update({phone:"__geloescht__", deleted_at: new Date().toISOString()}).eq("id",c.id); setCustomers(p=>p.filter(x=>x.id!==c.id)); setTrashCustomers(p=>[{...c,phone:"__geloescht__"},...p]); showNotice("Kunde in Papierkorb."); };
  const editCustomer = (c) => { const m = parseCustomerMeta(c); setCustomerForm({ company: c.name||"", firstName: m.firstName||"", lastName: m.lastName||"", address: m.address||"", zip: m.zip||"", city: m.city||"", phone: c.phone||"", email: c.email||"" }); setEditingCustomer(c); };
  const restoreCustomer = async (c) => { await supabase.from("customers").update({phone:""}).eq("id",c.id); setTrashCustomers(p=>p.filter(x=>x.id!==c.id)); setCustomers(p=>[{...c,phone:""},...p].sort((a,b)=>(a.name||"").localeCompare(b.name||""))); showNotice("Kunde wiederhergestellt."); };
  const hardDeleteCustomer = async (c) => { if(!window.confirm(uiLanguage==="FR"?"Supprimer definitivement?":uiLanguage==="IT"?"Eliminare definitivamente?":uiLanguage==="EN"?"Delete permanently?":"Endgueltig loeschen?")) return; await supabase.from("reports").delete().eq("user_id",effectiveUserId).or("customer_id.eq."+c.id+",customer.eq."+c.name); await supabase.from("invoices").delete().eq("user_id",effectiveUserId).or("customer_id.eq."+c.id+",customer.eq."+c.name); await supabase.from("offerten").delete().eq("user_id",effectiveUserId).or("customer_id.eq."+c.id+",customer.eq."+c.name); await supabase.from("customers").delete().eq("id",c.id); setTrashCustomers(p=>p.filter(x=>x.id!==c.id)); await fetchReports(); showNotice("Kunde und alle Daten geloescht."); };
  const getFirmMeta = () => { const fs_=firmSettings||{}; const meta=Object.keys(fs_).length>0 ? {company_name:fs_.company_name,company_logo:fs_.company_logo,first_name:fs_.first_name,last_name:fs_.last_name,address:fs_.address,zip:fs_.zip,city:fs_.city,phone:fs_.phone,email:fs_.email,iban:fs_.iban,mwst_nr:fs_.mwst_nr} : (session?.user?.user_metadata||{}); return {firmName:meta.company_name||"",firmLogo:meta.company_logo||"",firmAddress:meta.address?`${meta.address}, ${meta.zip||""} ${meta.city||""}`:"",firmContact:[meta.first_name,meta.last_name].filter(Boolean).join(" "),firmPhone:meta.phone?`Tel: ${meta.phone}`:"",firmEmail:meta.email||userEmail,firmIban:meta.iban||"",firmZip:meta.zip||"",firmCity:meta.city||"",firmMwst:meta.mwst_nr||""}; };
  const openPDF = (report) => { const p=parseReport(report); const{firmName,firmLogo,firmAddress,firmContact,firmPhone,firmEmail}=getFirmMeta(); const isPro=localStorage.getItem("bauabnahme_plan")==="pro"||localStorage.getItem("bauabnahme_plan")==="team"; const isDemoMode=!userId; const email=p.customerEmail||""; const subj=`Rapport Nr. ${p.rapportNr||report.id} – ${report.customer||"-"} – ${formatDateCH(report.date)}`; const body=`Guten Tag\n\nIm Anhang finden Sie den Rapport.\n\nKunde: ${report.customer||"-"}\nDatum: ${formatDateCH(report.date)}\nTOTAL CHF: ${Number(p.totals?.total||0).toFixed(2)}\n\nFreundliche Grüsse\n${firmContact||firmName}`; const mailto=`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`; const win=window.open("","_blank","width=980,height=760"); if(!win) return; win.document.write(buildRapportHtml(report,p,firmName,firmLogo,firmAddress,firmContact,firmPhone,firmEmail,isPro,isDemoMode,mailto,customers,parseCustomerMeta,uiLanguage)); win.document.close(); win.__sharePDF = () => shareRapportAsPDF(report,p,firmName,firmLogo,firmAddress,firmContact,firmPhone,firmEmail,uiLanguage); };
  const previewReportPDF = () => { const sp = customerProjects.find((p) => String(p.id) === String(reportForm.selectedProjectId)); const rapportNr = editingReport ? (parseReport(editingReport).rapportNr || editingReport.id) : nextRapportNr; const payload = buildReportDescriptionPayload({ rapportNr, reportForm, sp, workRows, materialRows, expenses, subtotal, vat, total }); const previewReport = { id: editingReport?.id || "preview", customer: reportForm.customer, date: reportForm.date, status: reportForm.status, description: payload }; openPDF(previewReport); };
  const previewOffertePDF = (formData) => { openOffertePDF({ ...formData, id: formData.id || "preview", offerte_nr: formData.offerteNr, valid_until: formData.validUntil, customer_id: formData.customerId, description: formData }); };
  const downloadAndEmail = async (report) => { openPDF(report); await updateStatus(report.id,"archiviert"); showNotice("✅ Rapport gesendet und ins Kundenarchiv verschoben."); };
  const generateInvoice = async (report, discountPct, skontoPct, payDays, skontoDays) => { setInvoiceModal(null); if(!report) return;
  const p=parseReport(report); const{firmName,firmLogo,firmAddress,firmContact,firmPhone,firmEmail,firmIban,firmZip,firmCity}=getFirmMeta(); const isPro=localStorage.getItem("bauabnahme_plan")==="pro"||localStorage.getItem("bauabnahme_plan")==="team"; const isDemoMode=!userId; const custRecord=customers.find(c=>String(c.id)===String(p.customerId)||c.name===report.customer); const custMeta=custRecord?parseCustomerMeta(custRecord):{}; const custStreet=p.address||custMeta.address||""; const custZip=p.zip||custMeta.zip||""; const custCity=p.city||custMeta.city||""; const custAddr=[custStreet,[custZip,custCity].filter(Boolean).join(" ")].filter(Boolean).join("\n"); const tot=p.totals||{},costs=p.costs||{}; const invoiceNr=`RE-${bumpInvoiceNr()}`; const validWork=(p.workRows||[]).filter(r=>r.employee||toNum(r.hours)>0); const validMat=(p.materialRows||[]).filter(r=>r.name||toNum(r.qty)>0); const sub=Number(tot.subtotal||0); const discountAmt=sub*(discountPct/100); const subAD=sub-discountAmt; const vatAmt=subAD*0.081; const totalAmount=subAD+vatAmt+toNum(costs.expenses); const skontoAmt=totalAmount*(skontoPct/100); const payDaysNum=parseInt(payDays)||30; const skontoDaysNum=parseInt(skontoDays)||10; const safeDate = report.date || new Date().toISOString().slice(0,10); const dueDate=formatDateCH(new Date(new Date(safeDate).getTime()+payDaysNum*86400000).toISOString().slice(0,10)); const skontoDueDate=formatDateCH(new Date(new Date(safeDate).getTime()+skontoDaysNum*86400000).toISOString().slice(0,10)); const qrUrl=firmIban?buildSwissQR(firmIban,totalAmount,firmName||firmContact,firmAddress,firmZip,firmCity,report.customer||"",custAddr,"","","",`Rechnung ${invoiceNr}`):""; const firmDetails=[firmContact&&firmName?firmContact:"",firmAddress,firmPhone,firmEmail].filter(Boolean).join("<br/>");
  const{firmMwst}=getFirmMeta(); const win=window.open("","_blank","width=980,height=860"); if(!win) return; win.document.write(buildRechnungHtml({invoiceNr,firmName,firmLogo,firmContact,firmAddress,firmPhone,firmEmail,firmMwst,name:report.customer||"-",custAddr,custStreet,custZip,custCity,validWork,validMat,costs,subtotal:sub,discountPct,discountAmt,subtotalAfterDiscount:subAD,vat:vatAmt,totalAmount,skontoPct,skontoAmt,payDays:payDaysNum,skontoDays:skontoDaysNum,dueDate,skontoDueDate,qrUrl,isPro,isDemoMode,reportDate:new Date().toISOString().slice(0,10),projectName:p.projectName,rapportNr:p.rapportNr||String(report.id),custEmail:(p.customerEmail||custRecord?.email||"").trim(),language:uiLanguage})); win.document.close();const cleanP={...p,photos:{before:"",after:""},signature:{name:p.signature?.name||"",image:""},customerSignature:{name:p.customerSignature?.name||"",image:""}}; saveInvoiceToStorage({id:Date.now(),invoiceNr,customer:report.customer,customerId:p.customerId,date:new Date().toISOString().slice(0,10),totalAmount,status:"entwurf",reportData:cleanP,rapportRef:String(report.id),subtotal:sub,vat:vatAmt,discount:discountPct,discountAmt,skontoPct,skontoAmt,paymentDays:payDaysNum,skontoDays:skontoDaysNum}); await bumpUsage("invoice"); };
  const editInvoice = (inv) => { setEditingInvoice(inv); const c=customers.find(x=>String(x.id)===String(inv.customerId)); if(c) setSelectedCustomer(c); goTo("edit-invoice"); };
  const onSaveInvoice = async (inv) => { saveInvoiceToStorage(inv); await bumpUsage("invoice");
const c=customers.find(x=>String(x.id)===String(inv.customerId)); if(c){ setSelectedCustomer(c); setOpenedReport(null); setEditingReport(null); setView("customers"); setMobileSidebarOpen(false); } else { setEditingInvoice(null); goTo("invoices"); } showNotice("Rechnung gespeichert."); };
  const reopenInvoice = async (inv, existingWin) => { const win=existingWin||window.open("","_blank","width=980,height=860"); if(!win) return; win.document.write("<html><body><p>Lade...</p></body></html>"); const {data:fsData} = await supabase.from("firm_settings").select("*").eq("user_id",effectiveUserId).single(); const fsMeta = fsData || firmSettings || {}; const firmName=fsMeta.company_name||""; const firmLogo=fsMeta.company_logo||""; const firmContact=[fsMeta.first_name,fsMeta.last_name].filter(Boolean).join(" "); const firmAddress=fsMeta.address?fsMeta.address+", "+(fsMeta.zip||"")+" "+(fsMeta.city||""):""; const firmPhone=fsMeta.phone?"Tel: "+fsMeta.phone:""; const firmEmail=fsMeta.email||""; const firmMwst=fsMeta.mwst_nr||""; const firmIban=fsMeta.iban||""; const firmZip=fsMeta.zip||""; const firmCity=fsMeta.city||""; const p=inv.reportData||{}; const custRec3=customers.find(c=>String(c.id)===String(inv.customerId)||c.name===inv.customer); const custM3=custRec3?parseCustomerMeta(custRec3):{}; const reopenCustAddr=[p.address||custM3.address||"",[p.zip||custM3.zip||"",p.city||custM3.city||""].filter(Boolean).join(" ")].filter(Boolean).join("\n"); win.document.write(buildRechnungHtml({invoiceNr:inv.invoiceNr,firmName,firmLogo,firmContact,firmAddress,firmPhone,firmEmail,firmMwst,name:inv.customer||"-",custAddr:reopenCustAddr,custStreet:p.address||"",custZip:p.zip||"",custCity:p.city||"",qrUrl:firmIban?buildSwissQR(firmIban,Number(inv.totalAmount||0),firmName||firmContact,firmAddress,firmZip||"",firmCity||"",inv.customer||"",reopenCustAddr,"","","",inv.invoiceNr):"",firmIban,validWork:(p.workRows||[]).filter(r=>r.employee||toNum(r.hours)>0),validMat:(p.materialRows||[]).filter(r=>r.name||toNum(r.qty)>0),costs:p.costs||{},subtotal:Number(inv.subtotal||p.totals?.subtotal||0),discountPct:Number(inv.discount||0),discountAmt:Number(inv.discountAmt||0),subtotalAfterDiscount:Number(inv.subtotal||p.totals?.subtotal||0)-Number(inv.discountAmt||0),vat:Number(inv.vat||p.totals?.vat||0),totalAmount:Number(inv.totalAmount||0),skontoPct:Number(inv.skontoPct||0),skontoAmt:Number(inv.skontoAmt||0),payDays:Number(inv.paymentDays||30),skontoDays:Number(inv.skontoDays||10),dueDate:"-",skontoDueDate:"-",isPro:localStorage.getItem("bauabnahme_plan")==="pro"||localStorage.getItem("bauabnahme_plan")==="team",isDemoMode:!userId,reportDate:inv.date||new Date().toISOString().slice(0,10),projectName:p.projectName,rapportNr:p.rapportNr||"",custEmail:(p.customerEmail||customers.find(c=>String(c.id)===String(inv.customerId))?.email||"").trim(),language:uiLanguage}));
  const ids = inv.attachedReportIds||[];
  ids.forEach(rid => {
    const attachedReport = [...reports,...archivedReports].find(r=>String(r.id)===String(rid));
    if(attachedReport) {
      const rp=parseReport(attachedReport); const{firmName:fN,firmLogo:fL,firmAddress:fA,firmContact:fC,firmPhone:fP,firmEmail:fE}=getFirmMeta();
      win.document.write('<div style="page-break-before:always"></div>');
      win.document.write(buildRapportHtml(attachedReport,rp,fN,fL,fA,fC,fP,fE,localStorage.getItem("bauabnahme_plan")==="pro"||localStorage.getItem("bauabnahme_plan")==="team",!userId,'',customers,parseCustomerMeta,uiLanguage));
    }
  });
  win.document.close(); };
  const tr = useTranslation(uiLanguage); const navItems = [{key:"home",label:tr.nav.home},{key:"customers",label:tr.nav.customers},{key:"catalog",label:tr.nav.catalog},{key:"trash",label:tr.nav.trash},{key:"settings",label:tr.nav.settings}];
  const activeView = editingReport?"new-report":openedReport?"reports":selectedCustomer?"customers":view;
  return (
    <div style={{minHeight:"100vh",background:BG,color:TEXT,fontFamily:"Inter,system-ui,sans-serif"}}>
      <style>{`*{box-sizing:border-box}html,body{overflow-x:hidden;max-width:100vw}input,select,textarea{max-width:100%}@media(max-width:768px){.dash-sidebar{display:none!important;width:0!important;min-width:0!important;padding:0!important;overflow:hidden!important}.dash-grid{grid-template-columns:1fr!important}.dash-main{padding-bottom:70px!important}.dash-bottom-nav{display:flex!important}.dash-mh{display:none!important}}@media(min-width:769px){.dash-bottom-nav{display:none!important}.dash-mh{display:none!important}}.date-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}@media(max-width:600px){.date-grid{grid-template-columns:1fr!important}}`}</style>
      <RechnungModal invoiceModal={invoiceModal} onClose={()=>setInvoiceModal(null)} invoiceDiscount={invoiceDiscount} setInvoiceDiscount={setInvoiceDiscount} invoiceSkonto={invoiceSkonto} setInvoiceSkonto={setInvoiceSkonto} invoicePayDays={invoicePayDays} setInvoicePayDays={setInvoicePayDays} invoiceSkontoDays={invoiceSkontoDays} setInvoiceSkontoDays={setInvoiceSkontoDays} onGenerate={generateInvoice} parseReport={parseReport} language={uiLanguage}/>
      <div className="dash-mh" style={{display:"none",position:"sticky",top:0,zIndex:150,background:PANEL,borderBottom:`1px solid ${BORDER}`,padding:"10px 16px",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{fontWeight:700,fontSize:18}}>Bau<span style={{color:GOLD}}>Abnahme</span></div>
        <button type="button" onClick={()=>setMobileSidebarOpen(p=>!p)} style={{...gBtn,minHeight:34,padding:"0 10px"}}>{mobileSidebarOpen?"✕":"☰"}</button>
      </div>
      <nav className="dash-bottom-nav" style={{display:"none",position:"fixed",bottom:0,left:0,right:0,zIndex:200,background:PANEL,borderTop:`1px solid ${BORDER}`,height:60,alignItems:"stretch",justifyContent:"space-around"}}>
        <button key="home" type="button" onClick={()=>goTo("home")} style={{flex:1,background:activeView==="home"?"rgba(212,168,83,0.15)":"transparent",border:"none",borderTop:activeView==="home"?`2px solid ${GOLD}`:"2px solid transparent",color:activeView==="home"?GOLD:MUTED,fontSize:20,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2}}><span>🏠</span><span style={{fontSize:9,fontWeight:activeView==="home"?700:400}}>{tr.nav.home}</span></button>
        <button key="customers" type="button" onClick={()=>goTo("customers")} style={{flex:1,background:activeView==="customers"?"rgba(212,168,83,0.15)":"transparent",border:"none",borderTop:activeView==="customers"?`2px solid ${GOLD}`:"2px solid transparent",color:activeView==="customers"?GOLD:MUTED,fontSize:20,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2}}><span>👥</span><span style={{fontSize:9,fontWeight:activeView==="customers"?700:400}}>{tr.nav.customers}</span></button>
        <button key="catalog" type="button" onClick={()=>goTo("catalog")} style={{flex:1,background:activeView==="catalog"?"rgba(212,168,83,0.15)":"transparent",border:"none",borderTop:activeView==="catalog"?`2px solid ${GOLD}`:"2px solid transparent",color:activeView==="catalog"?GOLD:MUTED,fontSize:20,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2}}><span>📦</span><span style={{fontSize:9,fontWeight:activeView==="catalog"?700:400}}>{tr.nav.catalog}</span></button>
        <button key="trash" type="button" onClick={()=>goTo("trash")} style={{flex:1,background:activeView==="trash"?"rgba(212,168,83,0.15)":"transparent",border:"none",borderTop:activeView==="trash"?`2px solid ${GOLD}`:"2px solid transparent",color:activeView==="trash"?GOLD:MUTED,fontSize:20,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2}}><span>🗑</span><span style={{fontSize:9,fontWeight:activeView==="trash"?700:400}}>{tr.nav.trash}</span></button>
        <button key="settings" type="button" onClick={()=>goTo("settings")} style={{flex:1,background:activeView==="settings"?"rgba(212,168,83,0.15)":"transparent",border:"none",borderTop:activeView==="settings"?`2px solid ${GOLD}`:"2px solid transparent",color:activeView==="settings"?GOLD:MUTED,fontSize:20,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2}}><span>⚙️</span><span style={{fontSize:9,fontWeight:activeView==="settings"?700:400}}>{tr.nav.settings}</span></button>
      </nav>
      <div className="dash-grid" style={{display:"grid",gridTemplateColumns:"240px 1fr",minHeight:"100vh",width:"100%",overflowX:"hidden"}}>
        <aside className={`dash-sidebar${mobileSidebarOpen?" open":""}`} style={{borderRight:`1px solid ${BORDER}`,background:PANEL,padding:16}}>
          <div style={{fontWeight:700,fontSize:20,marginBottom:16}}>Bau<span style={{color:GOLD}}>Abnahme</span></div>
          <nav style={{display:"grid",gap:6}}>
            {navItems.map(item=>(
              <button key={item.key} type="button" onClick={()=>goTo(item.key)} style={{...iStyle,minHeight:42,cursor:"pointer",textAlign:"left",background:activeView===item.key?"rgba(212,168,83,0.15)":"#111",borderColor:activeView===item.key?GOLD:BORDER,color:activeView===item.key?GOLD:TEXT,fontWeight:activeView===item.key?700:400}}>
                {item.label}
              </button>
            ))}
          </nav>
        </aside>
        <main className="dash-main" style={{padding:"8px", minWidth:0, maxWidth:"100%", overflowX:"hidden", boxSizing:"border-box", width:"100%"}}>
          {isDemo&&<DemoBanner onNavigate={onNavigate} pBtn={pBtn} gBtn={gBtn} language={uiLanguage}/>}
          {showOnboarding&&<OnboardingModal language={uiLanguage} isDemo={isDemo} onFinish={async ()=>{ setShowOnboarding(false); if(!isDemo && userId) await supabase.from("user_settings").upsert({user_id:userId, onboarding_done:true, updated_at:new Date().toISOString()},{onConflict:"user_id"}); }} onNavigate={onNavigate}/>}
          <button type="button" onClick={()=>setShowOnboarding(true)} style={{ position:"fixed", bottom:140, right:24, zIndex:900, width:48, height:48, borderRadius:"50%", background:"rgba(212,168,83,0.5)", color:"#111", border:"1px solid #d4a853", fontSize:22, fontWeight:800, cursor:"pointer", boxShadow:"0 2px 8px rgba(212,168,83,0.2)", opacity:0.7, display:"flex", alignItems:"center", justifyContent:"center" }}>?</button>
          {!isAdmin && <div style={{background:"#d4a853",color:"#111",padding:"6px 16px",fontSize:13,fontWeight:700,textAlign:"center",letterSpacing:0.5}}>{tr.common?.memberMode || "Mitarbeiter-Modus"}: {userEmail}</div>}<NoticeBanner message={notice}/>{userId && !isDemo && <div style={{textAlign:"center",padding:"8px",background:"rgba(212,168,83,0.1)",margin:"8px 0",borderRadius:8}}><button type="button" onClick={()=>{fetchCustomers().then(c=>fetchProjects(c));fetchReports();fetchInvoices();fetchCatalog();fetchFirmSettings();fetchPlan();fetchUserSettings();}} style={{background:"#d4a853",color:"#111",border:"none",borderRadius:6,padding:"6px 16px",fontWeight:700,cursor:"pointer",fontSize:13}}>{tr.common?.datenLaden || "Daten laden"}</button></div>}
          <Suspense fallback={<div style={{color:"#f0ece4",padding:20}}>Lade...</div>}><RenderView view={view} openedReport={openedReport} selectedCustomer={selectedCustomer} editingReport={editingReport} isDemo={isDemo} reports={reports} archivedReports={archivedReports} trashReports={trashReports} trashCustomers={trashCustomers} onRestoreCustomer={restoreCustomer} onHardDeleteCustomer={hardDeleteCustomer}
customers={customers} invoices={visibleInvoices} allInvoices={allInvoices} trashInvoices={trashInvoices} catalog={catalog} reportForm={reportForm} setReportForm={setReportForm} workRows={workRows} setWorkRows={setWorkRows} materialRows={materialRows} setMaterialRows={setMaterialRows} customerForm={customerForm} setCustomerForm={setCustomerForm} workSubtotal={workSubtotal} materialSubtotal={materialSubtotal} vat={vat} total={total} showCustomerSuggestions={showCustomerSuggestions} setShowCustomerSuggestions={setShowCustomerSuggestions} session={session} userEmail={userEmail} nextRapportNr={nextRapportNr} setNextRapportNrState={setNextRapportNrState} nextInvoiceNr={nextInvoiceNr} setNextInvoiceNrState={setNextInvoiceNrState} language={uiLanguage} onPickLanguage={pickUiLanguage} setOpenedReport={setOpenedReport} setSelectedCustomer={setSelectedCustomer} setEditingReport={setEditingReport} startEdit={startEdit} openPDF={openPDF} previewReportPDF={previewReportPDF} moveToTrash={moveToTrash} restore={restore} hardDelete={hardDelete} updateStatus={updateStatus} handleCustomerSelect={handleCustomerSelect} handleSave={handleSave} saveCustomer={saveCustomer} deleteCustomer={deleteCustomer} editCustomer={editCustomer} restoreCustomer={restoreCustomer} hardDeleteCustomer={hardDeleteCustomer} editCustomer={editCustomer}
saveCatalog={saveCatalog} saveInvoiceToStorage={saveInvoiceToStorage} deleteInvoice={moveInvoiceToTrash} stornoInvoice={stornoInvoice} restoreInvoice={restoreInvoice} hardDeleteInvoice={hardDeleteInvoice} reopenInvoice={reopenInvoice} editingInvoice={editingInvoice} setEditingInvoice={setEditingInvoice} onSaveInvoice={onSaveInvoice} openInvoice={openInvoice} downloadAndEmail={downloadAndEmail} showNotice={showNotice} onLogout={onLogout} onNavigate={onNavigate} goTo={goTo} emptyForm={emptyForm} userId={userId} isAdmin={isAdmin} firmSettings={firmSettings} currentPlan={currentPlan} offerten={offerten} archivedOfferten={archivedOfferten} saveOfferte={saveOfferte} nextOfferteNr={nextOfferteNr} openOffertePDF={openOffertePDF} previewOffertePDF={previewOffertePDF} updateOfferteStatus={updateOfferteStatus} deleteOfferte={deleteOfferte} createRapportFromOfferte={createRapportFromOfferte} createInvoiceFromOfferte={createInvoiceFromOfferte} openedOfferte={openedOfferte} setOpenedOfferte={setOpenedOfferte} trashOfferten={trashOfferten} restoreOfferte={restoreOfferte} hardDeleteOfferte={hardDeleteOfferte} onMahnung={onMahnung} onRefreshFirm={fetchFirmSettings}/></Suspense>
        </main>
      </div>
    </div>
  );
}
