import { useState, useEffect } from "react";
import { useTranslation } from "../../lib/translations.js";
import { TeamManager } from "./TeamManager.jsx";
import { GOLD, BORDER, MUTED, TEXT, iStyle, pBtn, gBtn } from "../../lib/constants.js";
import { SectionCard } from "../../components/UI.jsx";
import { supabase } from "../../supabase.js";
function LanguageSwitcher({ onPickLanguage, language }) {
  const langs = [["DE","Deutsch"],["FR","Français"],["IT","Italiano"],["EN","English"]];
  return (
    <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:12 }}>
      {langs.map(([code, label]) => (
        <button key={code} type="button" onClick={() => onPickLanguage(code)}
          style={{ ...gBtn, fontSize:12, minHeight:30, borderColor: language===code ? GOLD : BORDER, color: language===code ? GOLD : MUTED, fontWeight: language===code ? 700 : 400 }}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function EinstellungenView({ session, userEmail, showNotice, onLogout, nextRapportNr, setNextRapportNrState, nextInvoiceNr, setNextInvoiceNrState, nextOfferteNr, setNextOfferteNrState, onPickLanguage, language = "DE", isAdmin = true, firmSettings = null, currentPlan = "starter", isDemo = false, onRefreshFirm }){
  const meta = firmSettings || session?.user?.user_metadata || {};
  const [formData, setFormData] = useState({
    company_name: meta.company_name||"", first_name: meta.first_name||"", last_name: meta.last_name||"",
    address: meta.address||"", zip: meta.zip||"", city: meta.city||"",
    phone: meta.phone||"", email: meta.email||"", iban: meta.iban||"", bank: meta.bank||"", mwst_nr: meta.mwst_nr||""
  });
  useEffect(() => {
    const m = firmSettings || session?.user?.user_metadata || {};
    setFormData({ company_name: m.company_name||"", first_name: m.first_name||"", last_name: m.last_name||"", address: m.address||"", zip: m.zip||"", city: m.city||"", phone: m.phone||"", email: m.email||"", iban: m.iban||"", bank: m.bank||"", mwst_nr: m.mwst_nr||"" });
  }, [firmSettings]);
  const tr = useTranslation(language);
  const [tab, setTab] = useState("profil");
  const [showEdit, setShowEdit] = useState(false);
  const [showLegal, setShowLegal] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const adminGuard = () => { if(!isAdmin){ showNotice("⛔ " + (tr?.common?.adminOnly || "Nur Admin")); return false; } return true; };

  const saveMeta = async (patch) => { try {
    await supabase.auth.updateUser({ data: { ...meta, ...patch } });
    const merged = { ...meta, ...patch };
    await supabase.from("firm_settings").upsert({ user_id: session?.user?.id, company_name: merged.company_name, company_logo: merged.company_logo, first_name: merged.first_name, last_name: merged.last_name, address: merged.address, zip: merged.zip, city: merged.city, phone: merged.phone, email: merged.email, iban: merged.iban, mwst_nr: merged.mwst_nr, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if(onRefreshFirm) await onRefreshFirm(); } catch(e) { console.error("saveMeta:",e); showNotice("Fehler: "+e.message); }
  };

  const handleDeactivate = async () => {
    const msg = {"DE":"Konto deaktivieren? Daten bleiben 30 Tage erhalten.","FR":"Désactiver le compte? Les données restent 30 jours.","IT":"Disattivare account? I dati rimangono 30 giorni.","EN":"Deactivate account? Data remains for 30 days."};
    const lang = (localStorage.getItem("bauabnahme_language_pref") || "DE").toUpperCase();
    if (!window.confirm(msg[lang] || msg.DE)) return;
    await supabase.auth.updateUser({ data: { ...meta, account_status: "deactivated", deactivated_at: new Date().toISOString() } });
    showNotice(language==="FR"?"Compte désactivé.":language==="IT"?"Account disattivato.":language==="EN"?"Account deactivated.":"Konto deaktiviert.");
    setTimeout(() => { if (onLogout) onLogout(); }, 2000);
  };

  const handleDelete = async () => {
    const codes = {"DE":"LOESCHEN","FR":"SUPPRIMER","IT":"ELIMINARE","EN":"DELETE"};
    const lang = (localStorage.getItem("bauabnahme_language_pref") || "DE").toUpperCase();
    if (deleteConfirmText !== (codes[lang] || "LOESCHEN")) return;
    try {
      const uid = session?.user?.id;
      if (uid) { await supabase.from("reports").delete().eq("user_id", uid); await supabase.from("customers").delete().eq("user_id", uid); }
      await supabase.from("profiles").upsert({ id: uid, scheduled_for_deletion: true, deletion_requested_at: new Date().toISOString() });
      showNotice(language==="FR"?"Compte supprimé.":language==="IT"?"Account eliminato.":language==="EN"?"Account deleted.":"Konto gelöscht.");
      setTimeout(() => { if (onLogout) onLogout(); }, 2000);
    } catch (e) { showNotice("Fehler. Kontakt: support@bauabnahme.app"); }
    setShowDeleteModal(false);
  };

  const tabBtn = (key, label) => (
    <button key={key} type="button" onClick={() => setTab(key)} style={{ flex:"1 1 100px", minHeight:38, borderRadius:8, cursor:"pointer", fontWeight: tab===key ? 700 : 500, fontSize:12, border:`1px solid ${tab===key ? GOLD : BORDER}`, background: tab===key ? "rgba(212,168,83,0.12)" : "transparent", color: tab===key ? GOLD : MUTED }}>
      {label}
    </button>
  );

  const teamLabel = language==="FR"?"Équipe":language==="IT"?"Team":language==="EN"?"Team":"Team";
  const profilLabel = language==="FR"?"Profil":language==="IT"?"Profilo":language==="EN"?"Profile":"Firmenprofil";
  const numLabel = language==="FR"?"Numéros":language==="IT"?"Numeri":language==="EN"?"Numbers":"Nummern";
  const planLabel = language==="FR"?"Plan & Compte":language==="IT"?"Piano & Account":language==="EN"?"Plan & Account":"Plan & Konto";
  const editLabel = language==="FR"?"Modifier":language==="IT"?"Modifica":language==="EN"?"Edit":tr.common.edit;
  const cancelLabel = language==="FR"?"Annuler":language==="IT"?"Annulla":language==="EN"?"Cancel":tr.common.cancel;
  const bankLabel = language==="FR"?"Banque":language==="IT"?"Banca":language==="EN"?"Bank":"Bank";

  return (
    <SectionCard>
      {/* Tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
        {tabBtn("profil", profilLabel)}
        {tabBtn("team", teamLabel)}
        {tabBtn("nummern", numLabel)}
        {tabBtn("plan", planLabel)}
      </div>

      {/* TAB: Firmenprofil */}
      {tab === "profil" && <>
        {!isAdmin && <div style={{ color:"#e05c5c", fontSize:12, marginBottom:8 }}>⛔ {tr?.common?.adminOnly || "Nur Admin"}</div>}
        {/* Anzeige */}
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:14, padding:12, border:`1px solid ${BORDER}`, borderRadius:10, background:"rgba(255,255,255,0.02)" }}>
          {meta.company_logo ? <img src={meta.company_logo} alt="Logo" style={{ height:60, maxWidth:120, objectFit:"contain", borderRadius:8, border:"1px solid "+BORDER, padding:4, background:"#fff" }} /> : <div style={{ width:70, height:60, border:"1px dashed "+BORDER, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", color:MUTED, fontSize:11 }}>{tr.common?.settings?.noLogo || "Kein Logo"}</div>}
          <div style={{ display:"grid", gap:3 }}>
            <div style={{ fontWeight:700, color:TEXT, fontSize:15 }}>{meta.company_name || "—"}</div>
            <div style={{ color:MUTED, fontSize:13 }}>{[meta.first_name, meta.last_name].filter(Boolean).join(" ")}</div>
            {meta.address && <div style={{ color:MUTED, fontSize:13 }}>{meta.address}, {meta.zip} {meta.city}</div>}
            {meta.phone && <div style={{ color:MUTED, fontSize:13 }}>Tel: {meta.phone}</div>}
            {meta.mwst_nr && <div style={{ color:MUTED, fontSize:13 }}>MWST: {meta.mwst_nr}</div>}
            {meta.iban && <div style={{ color:MUTED, fontSize:13 }}>IBAN: {meta.iban}{meta.bank ? " · " + meta.bank : ""}</div>}
            <div style={{ color:MUTED, fontSize:12 }}>{userEmail}</div>
          </div>
        </div>

        {/* Edit Toggle */}
        <button type="button" onClick={() => { if(!adminGuard()) return; setShowEdit(p=>!p); }} style={{ ...gBtn, fontSize:13, minHeight:34, marginBottom:12, color:showEdit?MUTED:GOLD, borderColor:showEdit?BORDER:GOLD }}>
          {showEdit ? cancelLabel : editLabel}
        </button>

        {showEdit && <div style={{ display:"grid", gap:8, padding:14, border:`1px solid rgba(212,168,83,0.2)`, borderRadius:10, background:"rgba(212,168,83,0.03)" }}>
          <input placeholder={tr.common?.settings?.companyName || "Firmenname"} value={formData.company_name} onChange={e => setFormData(p=>({...p, company_name:e.target.value}))} id="company-name" style={iStyle} />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <input placeholder={tr.customer?.firstName || "Vorname"} value={formData.first_name} onChange={e => setFormData(p=>({...p, first_name:e.target.value}))} id="company-fname" style={iStyle} />
            <input placeholder={tr.customer?.lastName || "Nachname"} value={formData.last_name} onChange={e => setFormData(p=>({...p, last_name:e.target.value}))} id="company-lname" style={iStyle} />
          </div>
          <input placeholder={tr.report?.address || "Adresse"} value={formData.address} onChange={e => setFormData(p=>({...p, address:e.target.value}))} id="company-address" style={iStyle} />
          <div style={{ display:"grid", gridTemplateColumns:"80px 1fr", gap:8 }}>
            <input placeholder={tr.report?.zip || "PLZ"} value={formData.zip} onChange={e => setFormData(p=>({...p, zip:e.target.value}))} id="company-zip" style={iStyle} />
            <input placeholder={tr.report?.city || "Ort"} value={formData.city} onChange={e => setFormData(p=>({...p, city:e.target.value}))} id="company-city" style={iStyle} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <input placeholder="E-Mail" defaultValue={meta.email || userEmail || ""} id="company-email" style={iStyle} />
            <input placeholder={tr.common?.settings?.phone || "Telefon"} value={formData.phone} onChange={e => setFormData(p=>({...p, phone:e.target.value}))} id="company-phone" style={iStyle} />
          </div>
          <input placeholder="IBAN (CH56 0483 5012 3456 7800 9)" value={formData.iban} onChange={e => setFormData(p=>({...p, iban:e.target.value}))} id="iban-input" style={{ ...iStyle, fontFamily:"monospace", fontSize:13 }} />
          <input placeholder={bankLabel} value={formData.bank} onChange={e => setFormData(p=>({...p, bank:e.target.value}))} id="bank-input" style={iStyle} />
          <input placeholder="MWST-Nr (CHE-123.456.789)" value={formData.mwst_nr} onChange={e => setFormData(p=>({...p, mwst_nr:e.target.value}))} id="mwst-input" style={{ ...iStyle, fontFamily:"monospace", fontSize:13 }} />
          <button type="button" style={pBtn} onClick={async () => {
            await saveMeta(formData);
            showNotice(tr.common?.settings?.profileSaved || "Firmenprofil gespeichert!");
            setShowEdit(false);
          }}>{tr.common?.save || "Speichern"}</button>
          <label style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"6px 12px", border:"1px solid "+BORDER, borderRadius:8, cursor:"pointer", color:MUTED, fontSize:13 }}>
            {tr.common?.settings?.uploadLogo || "Logo hochladen"}
            <input type="file" accept="image/*" style={{ display:"none" }} onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = async (ev) => { await saveMeta({ company_logo: ev.target.result }); showNotice(tr.common?.settings?.logoSaved || "Logo gespeichert!"); }; r.readAsDataURL(f); }} />
          </label>
        </div>}
        <div style={{ marginTop:16, padding:12, border:"1px solid rgba(212,168,83,0.2)", borderRadius:10 }}><div style={{ color:GOLD, fontWeight:700, marginBottom:8 }}>{language==="FR"?"Langue":language==="IT"?"Lingua":language==="EN"?"Language":"Sprache"}</div><LanguageSwitcher onPickLanguage={onPickLanguage} language={language} /></div>
        <button type="button" onClick={() => { if(onLogout) onLogout(); }} style={{ ...gBtn, fontSize:13, minHeight:36, marginTop:12, width:"100%" }}>{tr.common?.settings?.logout || "Logout"}</button>
      </>}

      {/* TAB: Nummern */}
      {tab === "nummern" && <>
        {!isAdmin && <div style={{ color:"#e05c5c", fontSize:12, marginBottom:8 }}>⛔ {tr?.common?.adminOnly || "Nur Admin"}</div>}
        <div style={{ display:"grid", gap:10 }}>
          {[
            { label: tr.common?.settings?.nextCustomer || "Kunden-Nr", id:"next-customer-nr", val: localStorage.getItem("bauabnahme_next_customer_nr") || 1, onSave: async () => { const v=parseInt(document.getElementById("next-customer-nr").value)||1; localStorage.setItem("bauabnahme_next_customer_nr",String(v)); await supabase.from("user_settings").upsert({user_id:session?.user?.id, next_customer_nr:v, updated_at:new Date().toISOString()},{onConflict:"user_id"}); showNotice(language==="FR"?"N° client sauvegardé!":language==="IT"?"N. cliente salvato!":language==="EN"?"Customer No. saved!":"Kunden-Nr gespeichert!"); } },
            { label: tr.common?.settings?.nextReport || "Rapport-Nr", id:"next-rapport-nr", val: nextRapportNr, onSave: async () => { const v=parseInt(document.getElementById("next-rapport-nr").value)||1001; setNextRapportNrState(v); localStorage.setItem("bauabnahme_next_rapport_nr",String(v)); await supabase.from("user_settings").upsert({user_id:session?.user?.id,next_rapport_nr:v,updated_at:new Date().toISOString()},{onConflict:"user_id"}); showNotice(language==="FR"?"N° rapport sauvegardé!":language==="IT"?"N. rapporto salvato!":language==="EN"?"Report No. saved!":"Rapport-Nr gespeichert!"); } },
            { label: tr.common?.settings?.nextInvoice || "Rechnungs-Nr", id:"next-invoice-nr", val: nextInvoiceNr, onSave: async () => { const v=parseInt(document.getElementById("next-invoice-nr").value)||1001; setNextInvoiceNrState(v); localStorage.setItem("bauabnahme_next_invoice_nr",String(v)); await supabase.from("user_settings").upsert({user_id:session?.user?.id,next_invoice_nr:v,updated_at:new Date().toISOString()},{onConflict:"user_id"}); showNotice(language==="FR"?"N° facture sauvegardé!":language==="IT"?"N. fattura salvato!":language==="EN"?"Invoice No. saved!":"Rechnungs-Nr gespeichert!"); } },
            { label: tr.offerte?.nextOfferteNr || "Offerten-Nr", id:"next-offerte-nr", val: nextOfferteNr, onSave: async () => { const v=parseInt(document.getElementById("next-offerte-nr").value)||1001; setNextOfferteNrState && setNextOfferteNrState(v); localStorage.setItem("bauabnahme_next_offerte_nr",String(v)); await supabase.from("user_settings").upsert({user_id:session?.user?.id,next_offerte_nr:v,updated_at:new Date().toISOString()},{onConflict:"user_id"}); showNotice(language==="FR"?"N° offre sauvegardé!":language==="IT"?"N. offerta salvata!":language==="EN"?"Quote No. saved!":"Offerten-Nr gespeichert!"); } },
          ].map(({label, id, val, onSave}) => (
            <div key={id} style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 12px", border:`1px solid ${BORDER}`, borderRadius:8 }}>
              <span style={{ color:MUTED, fontSize:13, flex:1 }}>{label}</span>
              <input type="number" defaultValue={val} id={id} style={{ ...iStyle, width:80, fontFamily:"monospace", fontSize:13 }} disabled={!isAdmin} />
              <button type="button" style={{ ...pBtn, padding:"0 12px", fontSize:12, minHeight:32 }} onClick={() => { if(!adminGuard()) return; onSave(); }}>OK</button>
            </div>
          ))}
        </div>
      </>}

      {/* TAB: Plan & Konto */}
      {tab === "plan" && <>
        {/* Aktueller Plan */}
        <div style={{ marginBottom:16 }}>
          <div style={{ color:GOLD, fontWeight:700, marginBottom:10 }}>{tr.common?.settings?.currentPlan || "Aktueller Plan"}</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:8, marginBottom:10 }}>
            {[
              { n:"Starter", p:"CHF 0", link:null, features:["1 "+(tr.common?.settings?.user||"Benutzer"), "15 "+(tr.nav?.reports||"Rapporte"), "15 "+(tr.nav?.invoices||"Rechnungen"), "15 "+(tr.nav?.offerten||"Offerten")] },
              { n:"Pro", p:"CHF 49/Mt", link:"https://buy.stripe.com/bJefZhbNg0jEb0xc2F9AA08", features:["1 Admin + 5 "+(tr.report?.employee||"Mitarbeiter"), (tr.common?.settings?.unlimited||"Unlimitiert")+" "+(tr.nav?.reports||"Rapporte"), (tr.common?.settings?.unlimited||"Unlimitiert")+" "+(tr.nav?.invoices||"Rechnungen"), (tr.common?.settings?.unlimited||"Unlimitiert")+" "+(tr.nav?.offerten||"Offerten")] },
              { n:"Team", p:"CHF 99/Mt", link:"https://buy.stripe.com/6oU28r18C8Qad8FfeR9AA09", features:[(tr.common?.settings?.unlimited||"Unlimitiert")+" "+(tr.report?.employee||"Mitarbeiter"), (tr.common?.settings?.unlimited||"Unlimitiert")+" "+(tr.nav?.reports||"Rapporte")+" & "+(tr.nav?.invoices||"Rechnungen")+" & "+(tr.nav?.offerten||"Offerten"), "Support"] },
            ].map(pl => (
              <div key={pl.n} style={{ border:"2px solid "+(pl.n.toLowerCase()===currentPlan?GOLD:BORDER), borderRadius:8, padding:10, background:pl.n.toLowerCase()===currentPlan?"rgba(212,168,83,0.1)":"transparent" }}>
                <div style={{ fontWeight:700, color:pl.n.toLowerCase()===currentPlan?GOLD:TEXT }}>{pl.n}</div>
                <div style={{ color:MUTED, fontSize:12 }}>{pl.p}</div>
                {pl.features.map((f,i) => <div key={i} style={{ color:MUTED, fontSize:11, marginTop:2 }}>• {f}</div>)}
                {pl.link && <button type="button" onClick={() => { if(isDemo){ window.location.href="https://www.bauabnahme.app"; } else { window.location.href=pl.link; } }} style={{ marginTop:6, color:GOLD, fontSize:12, background:"transparent", border:"none", cursor:"pointer", padding:0 }}>{isDemo ? (language==="FR"?"S'inscrire":language==="IT"?"Registrati":language==="EN"?"Register":"Registrieren") : (tr.common?.settings?.subscribe || "Abonnieren")}</button>}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => { localStorage.setItem("bauabnahme_plan","pro"); showNotice("Pro Plan aktiviert!"); }} style={{ ...gBtn, fontSize:12, color:GOLD, borderColor:GOLD, minHeight:30 }}>{tr.common?.settings?.activatePro || "Pro Plan aktivieren (nach Zahlung)"}</button>
        </div>


        {/* Rechtliches */}
        <div style={{ marginBottom:16, padding:12, border:`1px solid ${BORDER}`, borderRadius:10 }}>
          <div style={{ color:GOLD, fontWeight:700, marginBottom:8 }}>{tr.common?.settings?.legal || "Rechtliches"}</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <button type="button" onClick={() => setShowLegal("impressum")} style={{ ...gBtn, fontSize:12, minHeight:32 }}>{tr.common?.settings?.imprint || "Impressum"}</button>
            <button type="button" onClick={() => setShowLegal("datenschutz")} style={{ ...gBtn, fontSize:12, minHeight:32 }}>{tr.common?.settings?.privacy || "Datenschutz"}</button>
            <button type="button" onClick={() => setShowLegal("agb")} style={{ ...gBtn, fontSize:12, minHeight:32 }}>{tr.common?.settings?.terms || "AGB"}</button>
            <a href="mailto:support@bauabnahme.app" style={{ ...gBtn, textDecoration:"none", display:"inline-flex", color:GOLD, borderColor:GOLD, fontSize:12, minHeight:32 }}>support@bauabnahme.app</a>
          </div>
        </div>

        {/* Konto */}
        <div style={{ padding:12, border:"1px solid #7f1d1d", borderRadius:10, background:"rgba(127,29,29,0.05)" }}>
          <div style={{ color:"#e05c5c", fontWeight:700, marginBottom:10 }}>{tr.common?.settings?.account || "Konto-Verwaltung"}</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <button type="button" onClick={(e) => { if(!adminGuard()) return; handleDeactivate(); }} style={{ ...gBtn, fontSize:12, minHeight:32, color:"#f59e0b", borderColor:"#f59e0b" }}>{tr.common?.settings?.deactivate || "Konto deaktivieren"}</button>
            <button type="button" onClick={() => { if(!adminGuard()) return; setShowDeleteModal(true); }} style={{ ...gBtn, fontSize:12, minHeight:32, color:"#e05c5c", borderColor:"#e05c5c" }}>{tr.common?.settings?.deleteAccount || "Konto löschen"}</button>
          </div>
        </div>
      </>}

      {/* TAB: Team */}
      {tab === "team" && <>
        {!isAdmin && <div style={{ color:"#e05c5c", fontSize:12, marginBottom:8 }}>⛔ {tr?.common?.adminOnly || "Nur Admin"}</div>}
        {isAdmin && <TeamManager session={session} showNotice={showNotice} currentPlan={currentPlan} language={language} isDemo={isDemo} />}
      </>}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div style={{ position:"fixed", inset:0, zIndex:500, background:"rgba(0,0,0,0.85)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:"#1a1a1a", border:"1px solid #e05c5c", borderRadius:14, padding:24, maxWidth:480, width:"100%" }}>
            <h3 style={{ color:"#e05c5c", marginTop:0 }}>{tr.common?.settings?.deleteAccountTitle || "Konto endgültig löschen"}</h3>
            <p style={{ color:MUTED }}>{language==="FR"?"Irréversible! Tous les clients, rapports et factures seront supprimés.":language==="IT"?"Irreversibile! Tutti i clienti, rapporti e fatture verranno eliminati.":language==="EN"?"Irreversible! All customer reports and invoices will be deleted.":"Unwiderruflich! Alle Kunden, Rapporte und Rechnungen werden gelöscht."}</p>
            <p style={{ color:MUTED }}>{language==="FR"?"Tapez":language==="IT"?"Digita":language==="EN"?"Type":"Tippe"} <strong style={{ color:"#e05c5c" }}>{language==="FR"?"SUPPRIMER":language==="IT"?"ELIMINARE":language==="EN"?"DELETE":"LOESCHEN"}</strong>:</p>
            <input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder={language==="FR"?"SUPPRIMER":language==="IT"?"ELIMINARE":language==="EN"?"DELETE":"LOESCHEN"} style={{ ...iStyle, width:"100%", marginBottom:16, borderColor:"#e05c5c" }} />
            <div style={{ display:"flex", gap:8 }}>
              <button type="button" onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(""); }} style={{ ...gBtn, flex:1 }}>{tr.common.cancel}</button>
              <button type="button" onClick={handleDelete} style={{ ...gBtn, flex:1, color:"#e05c5c", borderColor:"#e05c5c" }}>{language==="FR"?"Supprimer définitivement":language==="IT"?"Elimina definitivamente":language==="EN"?"Delete permanently":"Endgültig löschen"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Legal Modal */}
      {showLegal && (
        <div style={{ position:"fixed", inset:0, zIndex:500, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={() => setShowLegal(null)}>
          <div style={{ background:"#1a1a1a", border:"1px solid "+BORDER, borderRadius:14, padding:24, maxWidth:640, width:"100%", maxHeight:"85vh", overflowY:"auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <h2 style={{ margin:0, color:GOLD }}>{showLegal==="impressum"?"Impressum":showLegal==="agb"?"AGB":"Datenschutz"}</h2>
              <button onClick={() => setShowLegal(null)} style={gBtn}>✕</button>
            </div>
            <div style={{ color:MUTED, lineHeight:1.8, fontSize:13 }}>
              {showLegal==="impressum" && <><p><strong style={{ color:TEXT }}>Anbieterin</strong><br />BauAbnahme<br />Seilerhof 9, 6344 Meierskappel, Schweiz</p><p><strong style={{ color:TEXT }}>Kontakt</strong><br />support@bauabnahme.app | www.bauabnahme.app</p><p><strong style={{ color:TEXT }}>Urheberrecht</strong><br />Alle Rechte vorbehalten.</p><p style={{ fontSize:12 }}>Stand: März 2026</p></>}
              {showLegal==="datenschutz" && <><p><strong style={{ color:TEXT }}>Verantwortlich</strong><br />BauAbnahme, Seilerhof 9, 6344 Meierskappel | support@bauabnahme.app</p><p><strong style={{ color:TEXT }}>Daten</strong><br />E-Mail, Firmendaten, Kundendaten, Rapporte, Rechnungen.</p><p><strong style={{ color:TEXT }}>Speicherung</strong><br />Supabase (EU), Vercel, Stripe, Sentry. Keine Weitergabe.</p><p><strong style={{ color:TEXT }}>Rechte (Art. 25 DSG)</strong><br />Auskunft, Berichtigung, Löschung: support@bauabnahme.app</p><p style={{ fontSize:12 }}>Stand: März 2026</p></>}
              {showLegal==="agb" && <><p><strong style={{ color:TEXT }}>1. Geltungsbereich</strong><br />BauAbnahme, Seilerhof 9, 6344 Meierskappel.</p><p><strong style={{ color:TEXT }}>2. Abonnements</strong><br />Starter: CHF 0 | Pro: CHF 49/Mt | Team: CHF 99/Mt. Kündigung jederzeit zum Monatsende.</p><p><strong style={{ color:TEXT }}>3. Haftung</strong><br />Haftung für leichte Fahrlässigkeit ausgeschlossen. Schweizer Recht. Gerichtsstand Luzern.</p><p style={{ fontSize:12 }}>Stand: März 2026</p></>}
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
