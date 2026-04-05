import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../supabase.js";
import { BG, PANEL, TEXT, GOLD, BORDER, iStyle, pBtn, gBtn } from "../lib/constants.js";
import { toNum, calcHours, parseReport, parseCustomerMeta, formatDateCH } from "../lib/utils.js";
import { buildRapportHtml, buildRechnungHtml, buildSwissQR } from "../lib/pdfBuilder.js";
import { NoticeBanner, DemoBanner } from "../components/UI.jsx";
import { RechnungModal } from "../features/rechnungen/RechnungenViews.jsx";
import { RenderView } from "./RenderView.jsx";

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
    signature: {
      name: reportForm.signerName || "",
      image: reportForm.signatureImage || ""
    }
  };
}

export default function Dashboard({ session, onLogout, onNavigate, isDemo = false }) {
  const userId    = session?.user?.id;
  const userEmail = session?.user?.email || "";
  const [view, setView]                         = useState("home");
  const [openedReport, setOpenedReport]         = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
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
  useEffect(() => {
    if (view !== "settings") return;
    const stored = normalizeUiLanguage(localStorage.getItem("bauabnahme_language_pref"));
    setUiLanguage((prev) => (prev === stored ? prev : stored));
  }, [view]);
  const [invoices, setInvoices] = useState([]);
   const saveInvoiceToStorage = useCallback(async (inv) => {
if (!isDemo && userId) {
      const row = { id: inv.id, user_id: userId, invoice_nr: inv.invoiceNr, customer: inv.customer, customer_id: String(inv.customerId||""), date: inv.date, total_amount: Number(inv.totalAmount||0), status: inv.status||"entwurf", report_data: inv.reportData||{}, line_items: inv.lineItems||[], subtotal: Number(inv.subtotal||0), vat: Number(inv.vat||0), total: Number(inv.totalAmount||0), discount: Number(inv.discount||0), discount_amt: Number(inv.discountAmt||0), skonto_pct: Number(inv.skontoPct||0), skonto_amt: Number(inv.skontoAmt||0), payment_days: Number(inv.paymentDays||30), skonto_days: Number(inv.skontoDays||10), iban: inv.iban||"", notes: inv.notes||"", projektbezeichnung: inv.projektbezeichnung||"", rapport_ref: String(inv.rapportRef||"") };
      await supabase.from("invoices").upsert(row);
    }
     setInvoices((prev) => {
      const u = [inv, ...prev.filter((i) => i.id !== inv.id)];
      
      return u;
    });
   }, [userId, isDemo]);
  /** Soft-delete: status `geloescht`, keep in localStorage (Papierkorb). */
  const moveInvoiceToTrash = useCallback((id) => {
    setInvoices((prev) => {
      const u = prev.map((i) =>
        invoiceIdEq(i.id, id)
          ? { ...i, status: "geloescht", _preTrashStatus: i.status === "versendet" ? "versendet" : "entwurf" }
          : i
      );
      
      return u;
    });
  }, []);
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
  const hardDeleteInvoice = useCallback((id) => {
    setInvoices((prev) => {
      const u = prev.filter((i) => !invoiceIdEq(i.id, id));
      
      return u;
    });
  }, []);
  const visibleInvoices = useMemo(
    () => invoices.filter((i) => String(i.status || "").trim().toLowerCase() !== "geloescht"),
    [invoices]
  );
  const trashInvoices = useMemo(
    () => invoices.filter((i) => String(i.status || "").trim().toLowerCase() === "geloescht"),
    [invoices]
  );
  const [nextRapportNr, setNextRapportNrState] = useState(() => parseInt(localStorage.getItem("bauabnahme_next_rapport_nr") || "1001"));
  const [nextInvoiceNr, setNextInvoiceNrState] = useState(() => parseInt(localStorage.getItem("bauabnahme_next_invoice_nr") || "1001"));
  const bumpRapportNr = () => { const n = nextRapportNr; setNextRapportNrState(n+1); localStorage.setItem("bauabnahme_next_rapport_nr", String(n+1)); return n; };
  const bumpInvoiceNr = () => { const n = nextInvoiceNr; setNextInvoiceNrState(n+1); localStorage.setItem("bauabnahme_next_invoice_nr", String(n+1)); return n; };
  const [catalog, setCatalog] = useState({employees:[],materials:[]});
  const emptyForm = { selectedCustomerId:"", selectedProjectId:"", customer:"", address:"", zip:"", city:"", orderNo:"", customerEmail:"", date: new Date().toISOString().slice(0,10), status:"offen", expenses:"", notes:"", beforePhoto:"", afterPhoto:"", signerName:"", signatureImage:"" };
  const [customerForm, setCustomerForm] = useState({ company:"", firstName:"", lastName:"", address:"", zip:"", city:"", phone:"", email:"" });
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
  const openInvoice = (r) => { setInvoiceDiscount("0"); setInvoiceSkonto("0"); setInvoicePayDays("30"); setInvoiceSkontoDays("10"); setInvoiceModal(r); };
  const fetchCustomers = async () => { if(!userId) return []; const {data} = await supabase.from("customers").select("*").eq("user_id",userId).order("name",{ascending:true}); setCustomers((data||[]).filter(c=>c.phone!=="__geloescht__")); setTrashCustomers((data||[]).filter(c=>c.phone==="__geloescht__")); return (data||[]).filter(c=>c.phone!=="__geloescht__"); };
  const fetchCatalog = async () => { if(!userId) return; const {data:staff} = await supabase.from("staff").select("*").eq("user_id",userId); const {data:mats} = await supabase.from("materials").select("*").eq("user_id",userId); setCatalog({employees:(staff||[]).map(e=>({id:e.id,name:e.name,role:e.description,rate:e.rate})),materials:(mats||[]).map(m=>({id:m.id,name:m.name,description:m.description,unit:m.unit,price:m.price}))}); };
  const saveCatalog = async (u) => { setCatalog(u); if(!userId) return; const emps = u.employees||[]; const mats = u.materials||[]; for(const e of emps){ await supabase.from("staff").upsert({id:e.id,user_id:userId,name:e.name||"",description:e.role||"",rate:Number(e.rate||0)}); } for(const m of mats){ await supabase.from("materials").upsert({id:m.id,user_id:userId,name:m.name||"",description:m.description||"",unit:m.unit||"St",price:Number(m.price||0)}); } };
  const fetchProjects = async (list) => { if(!list?.length){setProjects([]);return;} const{data}=await supabase.from("projects").select("*").in("customer_id",list.map(c=>c.id)); setProjects(data||[]); };
  const fetchReports = async () => {
    if (!userId) return;
    const { data, error } = await supabase.from("reports").select("*").eq("user_id", userId).order("id", { ascending: false });
    if (error) {
      showNotice("Ladefehler: " + error.message);
      return;
    }
    const all = data || [];
    setTrashReports(all.filter((r) => r.status === "geloescht"));
    const active = all.filter((r) => r.status !== "geloescht");
    setReports(active.filter((r) => r.status !== "archiviert" && r.status !== "gesendet"));
    setArchivedReports(active.filter((r) => r.status === "archiviert" || r.status === "gesendet"));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap: fetch* recreated each render
  useEffect(() => { if(isDemo){const all=JSON.parse(localStorage.getItem("demo_reports")||"[]"); setReports(all.filter(r=>r.status!=="geloescht"&&r.status!=="archiviert"&&r.status!=="gesendet")); setArchivedReports(all.filter(r=>r.status==="archiviert"||r.status==="gesendet")); setTrashReports(all.filter(r=>r.status==="geloescht")); return;} if(!userId) return; fetchCustomers().then(c=>fetchProjects(c)); fetchReports(); fetchInvoices(); fetchCatalog(); }, [userId,isDemo]);
  const fetchInvoices = async () => { 
    if(!userId) return;
    const {data} = await supabase.from("invoices").select("*").eq("user_id",userId).order("id",{ascending:false});
    if(data) setInvoices(data.map(r=>({id:r.id,invoiceNr:r.invoice_nr,customer:r.customer,customerId:r.customer_id,date:r.date,totalAmount:Number(r.total_amount),status:r.status,reportData:r.report_data,lineItems:r.line_items,subtotal:Number(r.subtotal),vat:Number(r.vat),total:Number(r.total),discount:Number(r.discount),discountAmt:Number(r.discount_amt),skontoPct:Number(r.skonto_pct),skontoAmt:Number(r.skonto_amt),paymentDays:Number(r.payment_days),skontoDays:Number(r.skonto_days),iban:r.iban,notes:r.notes,projektbezeichnung:r.projektbezeichnung,rapportRef:r.rapport_ref}))); };  const handleCustomerSelect = (id) => {
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
  const handleSave = async () => {
    setShowCustomerSuggestions(false);
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
        ({ error: err } = await supabase.from("reports").update(updateRow).eq("id", editingReport.id).eq("user_id", userId));
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
    showNotice(wasEditing ? "Rapport aktualisiert." : "Rapport gespeichert.");
    goTo("reports");
  };
  const startEdit = (r) => { const p=parseReport(r); setReportForm({selectedCustomerId:String(p.customerId||""),selectedProjectId:String(p.projectId||""),customer:r.customer||"",address:p.address||"",zip:p.zip||"",city:p.city||"",orderNo:p.orderNo||"",projectSearch:p.projectName||"",customerEmail:p.customerEmail||"",date:toPgDate(r.date||emptyForm.date),status:r.status||"offen",expenses:p.costs?.expenses?String(p.costs.expenses):"",notes:p.costs?.notes||"",beforePhoto:p.photos?.before||"",afterPhoto:p.photos?.after||"",signerName:p.signature?.name||"",signatureImage:p.signature?.image||""}); setWorkRows(p.workRows?.length?p.workRows.map(r=>({employee:r.employee||"",from:r.from||"",to:r.to||"",rate:r.rate?String(r.rate):""})):[{employee:"",from:"",to:"",rate:""}]); setMaterialRows(p.materialRows?.length?p.materialRows.map(r=>({name:r.name||"",qty:r.qty?String(r.qty):"",unit:r.unit||"",price:r.price?String(r.price):""})):[{name:"",qty:"",unit:"",price:""}]); setEditingReport(r); setOpenedReport(null); setView("new-report"); };
  const moveToTrash = async (r) => { if(!window.confirm("Löschen?")) return; const deleted={...r,status:"geloescht"}; if(isDemo){const all=JSON.parse(localStorage.getItem("demo_reports")||"[]"); localStorage.setItem("demo_reports",JSON.stringify(all.map(x=>x.id===r.id?deleted:x)));}else{const{error}=await supabase.from("reports").update({status:"geloescht"}).eq("id",r.id).eq("user_id",userId); if(error){showNotice("Fehler: "+error.message);return;}} setReports(p=>p.filter(x=>x.id!==r.id)); setArchivedReports(p=>p.filter(x=>x.id!==r.id)); setTrashReports(p=>[...p,deleted]); if(openedReport?.id===r.id) setOpenedReport(null); };
  const restore = async (r) => { if(isDemo){const all=JSON.parse(localStorage.getItem("demo_reports")||"[]"); localStorage.setItem("demo_reports",JSON.stringify(all.map(x=>x.id===r.id?{...x,status:"offen"}:x)));}else{const{error}=await supabase.from("reports").update({status:"offen"}).eq("id",r.id).eq("user_id",userId); if(error){showNotice("Fehler: "+error.message);return;}} setTrashReports(p=>p.filter(x=>x.id!==r.id)); setReports(p=>[{...r,status:"offen"},...p]); };
  const hardDelete = async (r) => { if(!window.confirm("Endgültig löschen?")) return; if(isDemo){const all=JSON.parse(localStorage.getItem("demo_reports")||"[]").filter(x=>x.id!==r.id); localStorage.setItem("demo_reports",JSON.stringify(all)); setTrashReports(all.filter(x=>x.status==="geloescht"));}else{const{error}=await supabase.from("reports").delete().eq("id",r.id).eq("user_id",userId); if(error){showNotice("Fehler: "+error.message);return;}} setTrashReports(p=>p.filter(x=>x.id!==r.id)); showNotice("Gelöscht."); };
  const updateStatus = async (id, status) => { if(isDemo){const all=JSON.parse(localStorage.getItem("demo_reports")||"[]").map(x=>x.id===id?{...x,status}:x); localStorage.setItem("demo_reports",JSON.stringify(all)); setReports(all.filter(r=>r.status!=="geloescht"&&r.status!=="archiviert"&&r.status!=="gesendet")); setArchivedReports(all.filter(r=>r.status==="archiviert"||r.status==="gesendet")); setOpenedReport(null); return;} const{error}=await supabase.from("reports").update({status}).eq("id",id).eq("user_id",userId); if(error){showNotice("Fehler: "+error.message);return;} await fetchReports(); setOpenedReport(null); if(status==="archiviert"||status==="gesendet") showNotice("✅ Rapport zum Kunden verschoben."); };
  const saveCustomer = async () => { if(!userId||!customerForm.company.trim()){showNotice("Firmenname fehlt.");return;} const nextKNr=parseInt(localStorage.getItem("bauabnahme_next_customer_nr")||"1"); localStorage.setItem("bauabnahme_next_customer_nr",String(nextKNr+1)); const meta={kundennummer:`K-${String(nextKNr).padStart(3,"0")}`,firstName:customerForm.firstName,lastName:customerForm.lastName,address:customerForm.address,zip:customerForm.zip,city:customerForm.city}; const{data,error}=await supabase.from("customers").insert({user_id:userId,name:customerForm.company.trim(),address:JSON.stringify(meta),phone:customerForm.phone,email:customerForm.email}).select("*").single(); if(error){showNotice("Fehler beim Speichern.");return;} setCustomers(p=>[data,...p]); showNotice("Kunde gespeichert."); setCustomerForm({company:"",firstName:"",lastName:"",address:"",zip:"",city:"",phone:"",email:""}); };
  const deleteCustomer = async (c) => { if(!window.confirm("Loeschen?")) return; await supabase.from("customers").update({phone:"__geloescht__"}).eq("id",c.id); setCustomers(p=>p.filter(x=>x.id!==c.id)); setTrashCustomers(p=>[{...c,phone:"__geloescht__"},...p]); showNotice("Kunde in Papierkorb."); };
  const restoreCustomer = async (c) => { await supabase.from("customers").update({phone:""}).eq("id",c.id); setTrashCustomers(p=>p.filter(x=>x.id!==c.id)); setCustomers(p=>[{...c,phone:""},...p].sort((a,b)=>(a.name||"").localeCompare(b.name||""))); showNotice("Kunde wiederhergestellt."); };
  const hardDeleteCustomer = async (c) => { if(!window.confirm("Endgueltig loeschen?")) return; await supabase.from("customers").delete().eq("id",c.id); setTrashCustomers(p=>p.filter(x=>x.id!==c.id)); showNotice("Kunde geloescht."); };
  const getFirmMeta = () => { const meta=session?.user?.user_metadata||{}; return {firmName:meta.company_name||"",firmLogo:meta.company_logo||"",firmAddress:meta.address?`${meta.address}, ${meta.zip||""} ${meta.city||""}`:"",firmContact:[meta.first_name,meta.last_name].filter(Boolean).join(" "),firmPhone:meta.phone?`Tel: ${meta.phone}`:"",firmEmail:meta.email||userEmail,firmIban:meta.iban||"",firmZip:meta.zip||"",firmCity:meta.city||""}; };
  const openPDF = (report) => { const p=parseReport(report); const{firmName,firmLogo,firmAddress,firmContact,firmPhone,firmEmail}=getFirmMeta(); const isPro=localStorage.getItem("bauabnahme_plan")==="pro"||localStorage.getItem("bauabnahme_plan")==="team"; const isDemoMode=!userId; const email=p.customerEmail||""; const subj=`Rapport Nr. ${p.rapportNr||report.id} – ${report.customer||"-"} – ${formatDateCH(report.date)}`; const body=`Guten Tag\n\nIm Anhang finden Sie den Rapport.\n\nKunde: ${report.customer||"-"}\nDatum: ${formatDateCH(report.date)}\nTOTAL CHF: ${Number(p.totals?.total||0).toFixed(2)}\n\nFreundliche Grüsse\n${firmContact||firmName}`; const mailto=`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`; const win=window.open("","_blank","width=980,height=760"); if(!win) return; win.document.write(buildRapportHtml(report,p,firmName,firmLogo,firmAddress,firmContact,firmPhone,firmEmail,isPro,isDemoMode,mailto,customers,parseCustomerMeta)); win.document.close(); };
  const downloadAndEmail = async (report) => { openPDF(report); await updateStatus(report.id,"archiviert"); showNotice("✅ Rapport gesendet und ins Kundenarchiv verschoben."); };
  const generateInvoice = async (report, discountPct, skontoPct, payDays, skontoDays) => { setInvoiceModal(null); const p=parseReport(report); const{firmName,firmLogo,firmAddress,firmContact,firmPhone,firmEmail,firmIban,firmZip,firmCity}=getFirmMeta(); const isPro=localStorage.getItem("bauabnahme_plan")==="pro"||localStorage.getItem("bauabnahme_plan")==="team"; const isDemoMode=!userId; const custRecord=customers.find(c=>String(c.id)===String(p.customerId)||c.name===report.customer); const custMeta=custRecord?parseCustomerMeta(custRecord):{}; const custStreet=p.address||custMeta.address||""; const custZip=p.zip||custMeta.zip||""; const custCity=p.city||custMeta.city||""; const custAddr=[custStreet,[custZip,custCity].filter(Boolean).join(" ")].filter(Boolean).join("\n"); const tot=p.totals||{},costs=p.costs||{}; const invoiceNr=`RE-${bumpInvoiceNr()}`; const validWork=(p.workRows||[]).filter(r=>r.employee||toNum(r.hours)>0); const validMat=(p.materialRows||[]).filter(r=>r.name||toNum(r.qty)>0); const sub=Number(tot.subtotal||0); const discountAmt=sub*(discountPct/100); const subAD=sub-discountAmt; const vatAmt=subAD*0.081; const totalAmount=subAD+vatAmt+toNum(costs.expenses); const skontoAmt=totalAmount*(skontoPct/100); const payDaysNum=parseInt(payDays)||30; const skontoDaysNum=parseInt(skontoDays)||10; const dueDate=formatDateCH(new Date(new Date(report.date).getTime()+payDaysNum*86400000).toISOString().slice(0,10)); const skontoDueDate=formatDateCH(new Date(new Date(report.date).getTime()+skontoDaysNum*86400000).toISOString().slice(0,10)); const qrUrl=firmIban?buildSwissQR(firmIban,totalAmount,firmName||firmContact,firmAddress,firmZip,firmCity,report.customer||"",custAddr,"","","",`Rechnung ${invoiceNr}`):""; const firmDetails=[firmContact&&firmName?firmContact:"",firmAddress,firmPhone,firmEmail].filter(Boolean).join("<br/>"); const win=window.open("","_blank","width=980,height=860"); if(!win) return; win.document.write(buildRechnungHtml({invoiceNr,firmName,firmLogo,firmContact,firmAddress,firmDetails,name:report.customer||"-",custAddr,custStreet,custZip,custCity,validWork,validMat,costs,subtotal:sub,discountPct,discountAmt,subtotalAfterDiscount:subAD,vat:vatAmt,totalAmount,skontoPct,skontoAmt,payDays:payDaysNum,skontoDays:skontoDaysNum,dueDate,skontoDueDate,qrUrl,isPro,isDemoMode,reportDate:report.date,projectName:p.projectName,rapportNr:p.rapportNr||String(report.id),custEmail:(p.customerEmail||custRecord?.email||"").trim()})); win.document.close(); saveInvoiceToStorage({id:Date.now(),invoiceNr,customer:report.customer,customerId:p.customerId,date:report.date,totalAmount,status:"entwurf",reportData:p}); };
  const editInvoice = (inv) => { setEditingInvoice(inv); const c=customers.find(x=>String(x.id)===String(inv.customerId)); if(c) setSelectedCustomer(c); goTo("edit-invoice"); };
  const onSaveInvoice = (inv) => { saveInvoiceToStorage(inv); const c=customers.find(x=>String(x.id)===String(inv.customerId)); if(c){ setSelectedCustomer(c); setOpenedReport(null); setEditingReport(null); setView("customers"); setMobileSidebarOpen(false); } else { setEditingInvoice(null); goTo("invoices"); } showNotice("Rechnung gespeichert."); };
  const reopenInvoice = (inv, existingWin) => { console.log("reopenInvoice called", existingWin ? "with win" : "no win"); const win=existingWin||window.open("","_blank","width=980,height=860"); if(!win) { console.log("no window"); return; } const{firmName,firmLogo,firmContact,firmAddress,firmPhone,firmEmail}=getFirmMeta(); const firmDetails=[firmContact&&firmName?firmContact:"",firmAddress,firmPhone,firmEmail].filter(Boolean).join("<br/>"); const p=inv.reportData||{}; win.document.write(buildRechnungHtml({invoiceNr:inv.invoiceNr,firmName,firmLogo,firmContact,firmAddress,firmDetails,name:inv.customer||"-",custAddr:"",custStreet:p.address||"",custZip:p.zip||"",custCity:p.city||"",validWork:inv.lineItems&&inv.lineItems.length?inv.lineItems.map(r=>({employee:r.description,hours:Number(r.qty),rate:Number(r.price),total:Number(r.qty)*Number(r.price)})):(p.workRows||[]).filter(r=>r.employee||toNum(r.hours)>0),validMat:inv.lineItems&&inv.lineItems.length?[]:(p.materialRows||[]).filter(r=>r.name||toNum(r.qty)>0),costs:p.costs||{},subtotal:Number(inv.subtotal||p.totals?.subtotal||0),discountPct:Number(inv.discount||0),discountAmt:Number(inv.discountAmt||0),subtotalAfterDiscount:Number(inv.subtotal||p.totals?.subtotal||0)-Number(inv.discountAmt||0),vat:Number(inv.vat||p.totals?.vat||0),totalAmount:Number(inv.totalAmount||0),skontoPct:Number(inv.skontoPct||0),skontoAmt:Number(inv.skontoAmt||0),payDays:Number(inv.paymentDays||30),skontoDays:Number(inv.skontoDays||10),dueDate:"-",skontoDueDate:"-",qrUrl:"",isPro:localStorage.getItem("bauabnahme_plan")==="pro",isDemoMode:!userId,reportDate:inv.date,projectName:p.projectName,rapportNr:p.rapportNr||"",custEmail:(p.customerEmail||customers.find(c=>String(c.id)===String(inv.customerId))?.email||"").trim()})); win.document.close(); };
  const navItems = [{key:"home",label:"Start"},{key:"customers",label:"Kunden"},{key:"catalog",label:"Katalog"},{key:"new-report",label:"Neuer Rapport"},{key:"reports",label:"Offene Rapporte"},{key:"invoices",label:"Rechnungen"},{key:"trash",label:"Papierkorb"},{key:"settings",label:"Einstellungen"}];
  const activeView = editingReport?"new-report":openedReport?"reports":selectedCustomer?"customers":view;
  return (
    <div style={{minHeight:"100vh",background:BG,color:TEXT,fontFamily:"Inter,system-ui,sans-serif"}}>
      <style>{`*{box-sizing:border-box}input,select,textarea{max-width:100%}@media(max-width:768px){.dash-sidebar{display:none!important}.dash-sidebar.open{display:block!important;position:fixed;top:0;left:0;width:240px;height:100vh;z-index:200;overflow-y:auto}.dash-mh{display:flex!important}.dash-grid{grid-template-columns:1fr!important}}@media(min-width:769px){.dash-mh{display:none!important}}`}</style>
      <RechnungModal invoiceModal={invoiceModal} onClose={()=>setInvoiceModal(null)} invoiceDiscount={invoiceDiscount} setInvoiceDiscount={setInvoiceDiscount} invoiceSkonto={invoiceSkonto} setInvoiceSkonto={setInvoiceSkonto} invoicePayDays={invoicePayDays} setInvoicePayDays={setInvoicePayDays} invoiceSkontoDays={invoiceSkontoDays} setInvoiceSkontoDays={setInvoiceSkontoDays} onGenerate={generateInvoice} parseReport={parseReport}/>
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
              <button key={item.key} type="button" onClick={()=>goTo(item.key)} style={{...iStyle,minHeight:42,cursor:"pointer",textAlign:"left",background:activeView===item.key?"rgba(212,168,83,0.15)":"#111",borderColor:activeView===item.key?GOLD:BORDER,color:activeView===item.key?GOLD:TEXT,fontWeight:activeView===item.key?700:400}}>
                {item.label}
              </button>
            ))}
          </nav>
        </aside>
        <main style={{padding:20,minWidth:0}}>
          {isDemo&&<DemoBanner onNavigate={onNavigate} pBtn={pBtn} gBtn={gBtn}/>}
          <NoticeBanner message={notice}/>
          <RenderView view={view} openedReport={openedReport} selectedCustomer={selectedCustomer} editingReport={editingReport} isDemo={isDemo} reports={reports} archivedReports={archivedReports} trashReports={trashReports} trashCustomers={trashCustomers} onRestoreCustomer={restoreCustomer} onHardDeleteCustomer={hardDeleteCustomer}
customers={customers} invoices={visibleInvoices} trashInvoices={trashInvoices} catalog={catalog} reportForm={reportForm} setReportForm={setReportForm} workRows={workRows} setWorkRows={setWorkRows} materialRows={materialRows} setMaterialRows={setMaterialRows} customerForm={customerForm} setCustomerForm={setCustomerForm} workSubtotal={workSubtotal} materialSubtotal={materialSubtotal} vat={vat} total={total} showCustomerSuggestions={showCustomerSuggestions} setShowCustomerSuggestions={setShowCustomerSuggestions} session={session} userEmail={userEmail} nextRapportNr={nextRapportNr} setNextRapportNrState={setNextRapportNrState} nextInvoiceNr={nextInvoiceNr} setNextInvoiceNrState={setNextInvoiceNrState} language={uiLanguage} onPickLanguage={pickUiLanguage} setOpenedReport={setOpenedReport} setSelectedCustomer={setSelectedCustomer} setEditingReport={setEditingReport} startEdit={startEdit} openPDF={openPDF} moveToTrash={moveToTrash} restore={restore} hardDelete={hardDelete} updateStatus={updateStatus} handleCustomerSelect={handleCustomerSelect} handleSave={handleSave} saveCustomer={saveCustomer} deleteCustomer={deleteCustomer} restoreCustomer={restoreCustomer} hardDeleteCustomer={hardDeleteCustomer}
saveCatalog={saveCatalog} saveInvoiceToStorage={saveInvoiceToStorage} deleteInvoice={moveInvoiceToTrash} restoreInvoice={restoreInvoice} hardDeleteInvoice={hardDeleteInvoice} reopenInvoice={reopenInvoice} editingInvoice={editingInvoice} setEditingInvoice={setEditingInvoice} onSaveInvoice={onSaveInvoice} openInvoice={openInvoice} downloadAndEmail={downloadAndEmail} showNotice={showNotice} onLogout={onLogout} onNavigate={onNavigate} goTo={goTo} emptyForm={emptyForm} userId={userId}/>
        </main>
      </div>
    </div>
  );
}
// 1775074260
