import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { supabase } from "../supabase.js";
import { BG, PANEL, TEXT, GOLD, BORDER, iStyle, pBtn, gBtn } from "../lib/constants.js";
import { toNum, calcHours, parseReport, parseCustomerMeta, formatDateCH } from "../lib/utils.js";
import { buildRapportHtml, buildRechnungHtml, buildSwissQR } from "../lib/pdfBuilder.js";
import { NoticeBanner, DemoBanner } from "../components/UI.jsx";
import { RechnungModal } from "../features/rechnungen/RechnungenViews.jsx";
import { RenderView } from "./RenderView.jsx";

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
  const [customers, setCustomersState] = useState([]);
  const setCustomers = useCallback(
    (valueOrFn) => {
      setCustomersState((prev) => {
        const next = typeof valueOrFn === "function" ? valueOrFn(prev) : valueOrFn;
        const itemCount = Array.isArray(next) ? next.length : 0;
        console.log("[Dashboard] setCustomers", { itemCount, userId: userId ?? null, isDemo });
        return next;
      });
    },
    [userId, isDemo]
  );
  const [projects, setProjects]               = useState([]);
  const [notice, setNotice]                   = useState("");
  const showNotice = useCallback((msg) => { setNotice(msg); setTimeout(() => setNotice(""), 4000); }, []);
  const [invoices, setInvoices] = useState(() => { try { return JSON.parse(localStorage.getItem("bauabnahme_invoices") || "[]"); } catch { return []; } });
  const saveInvoiceToStorage = (inv) => { const u = [inv, ...invoices.filter(i => i.id !== inv.id)]; setInvoices(u); localStorage.setItem("bauabnahme_invoices", JSON.stringify(u)); };
  const deleteInvoice = (id) => { const u = invoices.filter(i => i.id !== id); setInvoices(u); localStorage.setItem("bauabnahme_invoices", JSON.stringify(u)); };
  const [nextRapportNr, setNextRapportNrState] = useState(() => parseInt(localStorage.getItem("bauabnahme_next_rapport_nr") || "1001"));
  const [nextInvoiceNr, setNextInvoiceNrState] = useState(() => parseInt(localStorage.getItem("bauabnahme_next_invoice_nr") || "1001"));
  const bumpRapportNr = () => { const n = nextRapportNr; setNextRapportNrState(n+1); localStorage.setItem("bauabnahme_next_rapport_nr", String(n+1)); return n; };
  const bumpInvoiceNr = () => { const n = nextInvoiceNr; setNextInvoiceNrState(n+1); localStorage.setItem("bauabnahme_next_invoice_nr", String(n+1)); return n; };
  const [catalog, setCatalog] = useState(() => { try { return JSON.parse(localStorage.getItem("bauabnahme_catalog") || '{"employees":[],"materials":[]}'); } catch { return {employees:[],materials:[]}; } });
  const saveCatalog = (u) => { setCatalog(u); localStorage.setItem("bauabnahme_catalog", JSON.stringify(u)); };
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
  const [invoiceDiscount, setInvoiceDiscount]     = useState("0");
  const [invoiceSkonto, setInvoiceSkonto]         = useState("0");
  const [invoicePayDays, setInvoicePayDays]       = useState("30");
  const [invoiceSkontoDays, setInvoiceSkontoDays] = useState("10");
  const openInvoice = (r) => { setInvoiceDiscount("0"); setInvoiceSkonto("0"); setInvoicePayDays("30"); setInvoiceSkontoDays("10"); setInvoiceModal(r); };
  const fetchCustomers = async () => {
    console.log('fetchCustomers called, userId:', userId);
    if (!userId) {
      console.log("fetchCustomers: no userId");
      return [];
    }
    const { data } = await supabase.from("customers").select("*").eq("user_id", userId).order("id", { ascending: false });
    console.log('fetchCustomers result:', data?.length);
    setCustomers(data || []);
    return data || [];
  };
  const fetchProjects = async (list) => { if(!list?.length){setProjects([]);return;} const{data}=await supabase.from("projects").select("*").in("customer_id",list.map(c=>c.id)); setProjects(data||[]); };
  const fetchReports = async () => {
    if (!userId) return;
    const { data, error } = await supabase.from("reports").select("*").eq("user_id", userId).order("id", { ascending: false });
    if (error) {
      showNotice("Ladefehler: " + error.message);
      return;
    }
    const all = data || [];
    setReports(all.filter((r) => r.status !== "geloescht" && r.status !== "archiviert" && r.status !== "gesendet"));
    setArchivedReports(all.filter((r) => r.status === "archiviert" || r.status === "gesendet"));
    setTrashReports(all.filter((r) => r.status === "geloescht"));
  };
  const prevUserIdRef = useRef(undefined);
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- bootstrap lists from demo storage or Supabase */
  useEffect(() => {
    if (isDemo) {
      const all = JSON.parse(localStorage.getItem("demo_reports") || "[]");
      setReports(all.filter(r => r.status !== "geloescht" && r.status !== "archiviert" && r.status !== "gesendet"));
      setArchivedReports(all.filter(r => r.status === "archiviert" || r.status === "gesendet"));
      setTrashReports(all.filter(r => r.status === "geloescht"));
      return;
    }
    if (!userId) return;
    fetchCustomers();
    fetchReports();
  }, [userId, isDemo]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  const handleCustomerSelect = (id) => { const c=customers.find(x=>String(x.id)===String(id)); if(!c) return; const m=parseCustomerMeta(c); setReportForm(p=>({...p,selectedCustomerId:String(c.id),selectedProjectId:"",customer:c.name||"",customerEmail:c.email||"",address:m.address||"",zip:m.zip||"",city:m.city||""})); };
  const handleSave = async () => {
    if(!reportForm.customer.trim()){showNotice("Bitte Firmenname eingeben.");return;}
    const sp=customerProjects.find(p=>String(p.id)===String(reportForm.selectedProjectId));
    const rapportNr=editingReport?(parseReport(editingReport).rapportNr||editingReport.id):bumpRapportNr();
    const payload={rapportNr,customer:reportForm.customer.trim(),customerEmail:reportForm.customerEmail.trim(),address:reportForm.address.trim(),zip:reportForm.zip||"",city:reportForm.city||"",orderNo:reportForm.orderNo.trim(),date:reportForm.date,status:reportForm.status,customerId:reportForm.selectedCustomerId||null,projectId:reportForm.selectedProjectId||null,projectName:sp?.name||reportForm.projectSearch||"",photos:{before:reportForm.beforePhoto,after:reportForm.afterPhoto},workRows:workRows.map(r=>({...r,hours:calcHours(r.from,r.to),total:calcHours(r.from,r.to)*toNum(r.rate)})),materialRows:materialRows.map(r=>({...r,total:toNum(r.qty)*toNum(r.price)})),costs:{expenses,notes:reportForm.notes},totals:{subtotal,vat,total},signature:{name:reportForm.signerName,image:reportForm.signatureImage}};
    const row={user_id:userId,customer:reportForm.customer.trim(),date:reportForm.date,status:reportForm.status,description:payload};
    if(isDemo){const all=JSON.parse(localStorage.getItem("demo_reports")||"[]"); if(editingReport){const i=all.findIndex(r=>r.id===editingReport.id);if(i>=0)all[i]={...row,id:editingReport.id};}else all.unshift({...row,id:Date.now(),created_at:new Date().toISOString()}); localStorage.setItem("demo_reports",JSON.stringify(all)); setReports(all.filter(r=>r.status!=="geloescht"&&r.status!=="archiviert"&&r.status!=="gesendet"));}
    else{let err; if(editingReport){({error:err}=await supabase.from("reports").update(row).eq("id",editingReport.id).eq("user_id",userId));}else{({error:err}=await supabase.from("reports").insert([row]));} if(err){showNotice("❌ Fehler: "+(err.message||JSON.stringify(err)));return;} await fetchReports(); goTo("reports");}
    setEditingReport(null); setReportForm(emptyForm); setWorkRows([{employee:"",from:"",to:"",rate:""}]); setMaterialRows([{name:"",qty:"",unit:"",price:""}]); showNotice(editingReport?"Rapport aktualisiert.":"Rapport gespeichert."); goTo("reports");
  };
  const startEdit = (r) => { const p=parseReport(r); setReportForm({selectedCustomerId:String(p.customerId||""),selectedProjectId:String(p.projectId||""),customer:r.customer||"",address:p.address||"",zip:p.zip||"",city:p.city||"",orderNo:p.orderNo||"",customerEmail:p.customerEmail||"",date:r.date||emptyForm.date,status:r.status||"offen",expenses:p.costs?.expenses?String(p.costs.expenses):"",notes:p.costs?.notes||"",beforePhoto:p.photos?.before||"",afterPhoto:p.photos?.after||"",signerName:p.signature?.name||"",signatureImage:p.signature?.image||""}); setWorkRows(p.workRows?.length?p.workRows.map(r=>({employee:r.employee||"",from:r.from||"",to:r.to||"",rate:r.rate?String(r.rate):""})):[{employee:"",from:"",to:"",rate:""}]); setMaterialRows(p.materialRows?.length?p.materialRows.map(r=>({name:r.name||"",qty:r.qty?String(r.qty):"",unit:r.unit||"",price:r.price?String(r.price):""})):[{name:"",qty:"",unit:"",price:""}]); setEditingReport(r); setOpenedReport(null); setView("new-report"); };
  const moveToTrash = async (r) => {
    if (!window.confirm("Löschen?")) return;
    const deleted = { ...r, status: "geloescht" };
    if (isDemo) {
      const all = JSON.parse(localStorage.getItem("demo_reports") || "[]");
      localStorage.setItem("demo_reports", JSON.stringify(all.map((x) => (x.id === r.id ? deleted : x))));
    } else {
      const { data: updated, error } = await supabase
        .from("reports")
        .update({ status: "geloescht" })
        .eq("id", r.id)
        .eq("user_id", userId)
        .select("id")
        .maybeSingle();
      if (error) {
        showNotice("Fehler: " + error.message);
        return;
      }
      if (!updated) {
        showNotice("Rapport konnte nicht in den Papierkorb verschoben werden (keine Zeile aktualisiert).");
        return;
      }
    }
    setReports((p) => p.filter((x) => x.id !== r.id));
    setArchivedReports((p) => p.filter((x) => x.id !== r.id));
    setTrashReports((p) => [...p, deleted]);
    if (openedReport?.id === r.id) setOpenedReport(null);
  };
  const restore = async (r) => { if(isDemo){const all=JSON.parse(localStorage.getItem("demo_reports")||"[]"); localStorage.setItem("demo_reports",JSON.stringify(all.map(x=>x.id===r.id?{...x,status:"offen"}:x)));}else{const{error}=await supabase.from("reports").update({status:"offen"}).eq("id",r.id).eq("user_id",userId); if(error){showNotice("Fehler: "+error.message);return;}} setTrashReports(p=>p.filter(x=>x.id!==r.id)); setReports(p=>[{...r,status:"offen"},...p]); };
  const hardDelete = async (r) => { if(!window.confirm("Endgültig löschen?")) return; if(isDemo){const all=JSON.parse(localStorage.getItem("demo_reports")||"[]").filter(x=>x.id!==r.id); localStorage.setItem("demo_reports",JSON.stringify(all)); setTrashReports(all.filter(x=>x.status==="geloescht"));}else{const{error}=await supabase.from("reports").delete().eq("id",r.id).eq("user_id",userId); if(error){showNotice("Fehler: "+error.message);return;}} setTrashReports(p=>p.filter(x=>x.id!==r.id)); showNotice("Gelöscht."); };
  const updateStatus = async (id, status) => { if(isDemo){const all=JSON.parse(localStorage.getItem("demo_reports")||"[]").map(x=>x.id===id?{...x,status}:x); localStorage.setItem("demo_reports",JSON.stringify(all)); setReports(all.filter(r=>r.status!=="geloescht"&&r.status!=="archiviert"&&r.status!=="gesendet")); setArchivedReports(all.filter(r=>r.status==="archiviert"||r.status==="gesendet")); setOpenedReport(null); return;} const{error}=await supabase.from("reports").update({status}).eq("id",id).eq("user_id",userId); if(error){showNotice("Fehler: "+error.message);return;} await fetchReports(); setOpenedReport(null); if(status==="archiviert"||status==="gesendet") showNotice("✅ Rapport zum Kunden verschoben."); };
  const saveCustomer = async () => { if(!userId||!customerForm.company.trim()){showNotice("Firmenname fehlt.");return;} const meta={kundennummer:`K-${String(customers.length+1).padStart(3,"0")}`,firstName:customerForm.firstName,lastName:customerForm.lastName,address:customerForm.address,zip:customerForm.zip,city:customerForm.city}; const{data,error}=await supabase.from("customers").insert({user_id:userId,name:customerForm.company.trim(),address:JSON.stringify(meta),phone:customerForm.phone,email:customerForm.email}).select("*").single(); if(error){showNotice("Fehler beim Speichern.");return;} setCustomers(p=>[data,...p]); showNotice("Kunde gespeichert."); setCustomerForm({company:"",firstName:"",lastName:"",address:"",zip:"",city:"",phone:"",email:""}); };
  const deleteCustomer = async (c) => { if(!window.confirm("Löschen?")) return; await supabase.from("customers").delete().eq("id",c.id); setCustomers(p=>p.filter(x=>x.id!==c.id)); };
  const getFirmMeta = () => { const meta=session?.user?.user_metadata||{}; return {firmName:meta.company_name||"",firmLogo:meta.company_logo||"",firmAddress:meta.address?`${meta.address}, ${meta.zip||""} ${meta.city||""}`:"",firmContact:[meta.first_name,meta.last_name].filter(Boolean).join(" "),firmPhone:meta.phone?`Tel: ${meta.phone}`:"",firmEmail:meta.email||userEmail,firmIban:meta.iban||"",firmZip:meta.zip||"",firmCity:meta.city||""}; };
  const openPDF = (report) => { const p=parseReport(report); const{firmName,firmLogo,firmAddress,firmContact,firmPhone,firmEmail}=getFirmMeta(); const isPro=localStorage.getItem("bauabnahme_plan")==="pro"||localStorage.getItem("bauabnahme_plan")==="team"; const isDemoMode=!userId; const email=p.customerEmail||""; const subj=`Rapport Nr. ${p.rapportNr||report.id} – ${report.customer||"-"} – ${formatDateCH(report.date)}`; const body=`Guten Tag\n\nIm Anhang finden Sie den Rapport.\n\nKunde: ${report.customer||"-"}\nDatum: ${formatDateCH(report.date)}\nTOTAL CHF: ${Number(p.totals?.total||0).toFixed(2)}\n\nFreundliche Grüsse\n${firmContact||firmName}`; const mailto=`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`; const win=window.open("","_blank","width=980,height=760"); if(!win) return; win.document.write(buildRapportHtml(report,p,firmName,firmLogo,firmAddress,firmContact,firmPhone,firmEmail,isPro,isDemoMode,mailto,customers,parseCustomerMeta)); win.document.close(); };
  const downloadAndEmail = async (report) => { openPDF(report); await updateStatus(report.id,"archiviert"); showNotice("✅ Rapport gesendet und ins Kundenarchiv verschoben."); };
  const generateInvoice = async (report, discountPct, skontoPct, payDays, skontoDays) => { setInvoiceModal(null); const p=parseReport(report); const{firmName,firmLogo,firmAddress,firmContact,firmPhone,firmEmail,firmIban,firmZip,firmCity}=getFirmMeta(); const isPro=localStorage.getItem("bauabnahme_plan")==="pro"||localStorage.getItem("bauabnahme_plan")==="team"; const isDemoMode=!userId; const custRecord=customers.find(c=>String(c.id)===String(p.customerId)||c.name===report.customer); const custMeta=custRecord?parseCustomerMeta(custRecord):{}; const custStreet=p.address||custMeta.address||""; const custZip=p.zip||custMeta.zip||""; const custCity=p.city||custMeta.city||""; const custAddr=[custStreet,[custZip,custCity].filter(Boolean).join(" ")].filter(Boolean).join("\n"); const tot=p.totals||{},costs=p.costs||{}; const invoiceNr=`RE-${bumpInvoiceNr()}`; const validWork=(p.workRows||[]).filter(r=>r.employee||toNum(r.hours)>0); const validMat=(p.materialRows||[]).filter(r=>r.name||toNum(r.qty)>0); const sub=Number(tot.subtotal||0); const discountAmt=sub*(discountPct/100); const subAD=sub-discountAmt; const vatAmt=subAD*0.081; const totalAmount=subAD+vatAmt+toNum(costs.expenses); const skontoAmt=totalAmount*(skontoPct/100); const payDaysNum=parseInt(payDays)||30; const skontoDaysNum=parseInt(skontoDays)||10; const dueDate=formatDateCH(new Date(new Date(report.date).getTime()+payDaysNum*86400000).toISOString().slice(0,10)); const skontoDueDate=formatDateCH(new Date(new Date(report.date).getTime()+skontoDaysNum*86400000).toISOString().slice(0,10)); const qrUrl=firmIban?buildSwissQR(firmIban,totalAmount,firmName||firmContact,firmAddress,firmZip,firmCity,report.customer||"",custAddr,"","","",`Rechnung ${invoiceNr}`):""; const firmDetails=[firmContact&&firmName?firmContact:"",firmAddress,firmPhone,firmEmail].filter(Boolean).join("<br/>"); const win=window.open("","_blank","width=980,height=860"); if(!win) return; win.document.write(buildRechnungHtml({invoiceNr,firmName,firmLogo,firmContact,firmAddress,firmDetails,name:report.customer||"-",custAddr,custStreet,custZip,custCity,validWork,validMat,costs,subtotal:sub,discountPct,discountAmt,subtotalAfterDiscount:subAD,vat:vatAmt,totalAmount,skontoPct,skontoAmt,payDays:payDaysNum,skontoDays:skontoDaysNum,dueDate,skontoDueDate,qrUrl,isPro,isDemoMode,reportDate:report.date,projectName:p.projectName})); win.document.close(); saveInvoiceToStorage({id:Date.now(),invoiceNr,customer:report.customer,customerId:p.customerId,date:report.date,totalAmount,status:"entwurf",reportData:p}); };
  const reopenInvoice = (inv) => { const win=window.open("","_blank","width=980,height=860"); if(!win) return; const{firmName,firmLogo,firmContact,firmAddress,firmPhone,firmEmail}=getFirmMeta(); const firmDetails=[firmContact&&firmName?firmContact:"",firmAddress,firmPhone,firmEmail].filter(Boolean).join("<br/>"); const p=inv.reportData||{}; win.document.write(buildRechnungHtml({invoiceNr:inv.invoiceNr,firmName,firmLogo,firmContact,firmAddress,firmDetails,name:inv.customer||"-",custAddr:"",custStreet:p.address||"",custZip:p.zip||"",custCity:p.city||"",validWork:(p.workRows||[]).filter(r=>r.employee||toNum(r.hours)>0),validMat:(p.materialRows||[]).filter(r=>r.name||toNum(r.qty)>0),costs:p.costs||{},subtotal:Number(p.totals?.subtotal||0),discountPct:0,discountAmt:0,subtotalAfterDiscount:Number(p.totals?.subtotal||0),vat:Number(p.totals?.vat||0),totalAmount:inv.totalAmount,skontoPct:0,skontoAmt:0,payDays:30,skontoDays:10,dueDate:"-",skontoDueDate:"-",qrUrl:"",isPro:localStorage.getItem("bauabnahme_plan")==="pro",isDemoMode:!userId,reportDate:inv.date,projectName:p.projectName})); win.document.close(); };
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
          <RenderView view={view} openedReport={openedReport} selectedCustomer={selectedCustomer} editingReport={editingReport} isDemo={isDemo} reports={reports} archivedReports={archivedReports} trashReports={trashReports} customers={customers} invoices={invoices} catalog={catalog} reportForm={reportForm} setReportForm={setReportForm} workRows={workRows} setWorkRows={setWorkRows} materialRows={materialRows} setMaterialRows={setMaterialRows} customerForm={customerForm} setCustomerForm={setCustomerForm} workSubtotal={workSubtotal} materialSubtotal={materialSubtotal} vat={vat} total={total} showCustomerSuggestions={showCustomerSuggestions} setShowCustomerSuggestions={setShowCustomerSuggestions} session={session} userEmail={userEmail} nextRapportNr={nextRapportNr} setNextRapportNrState={setNextRapportNrState} nextInvoiceNr={nextInvoiceNr} setNextInvoiceNrState={setNextInvoiceNrState} setOpenedReport={setOpenedReport} setSelectedCustomer={setSelectedCustomer} setEditingReport={setEditingReport} startEdit={startEdit} openPDF={openPDF} moveToTrash={moveToTrash} restore={restore} hardDelete={hardDelete} updateStatus={updateStatus} handleCustomerSelect={handleCustomerSelect} handleSave={handleSave} saveCustomer={saveCustomer} deleteCustomer={deleteCustomer} saveCatalog={saveCatalog} saveInvoiceToStorage={saveInvoiceToStorage} deleteInvoice={deleteInvoice} reopenInvoice={reopenInvoice} openInvoice={openInvoice} downloadAndEmail={downloadAndEmail} showNotice={showNotice} onLogout={onLogout} onNavigate={onNavigate} goTo={goTo} emptyForm={emptyForm} userId={userId}/>
        </main>
      </div>
    </div>
  );
}
