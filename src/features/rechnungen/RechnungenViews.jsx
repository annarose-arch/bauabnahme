import { useState, useMemo } from "react";
import { useTranslation } from "../../lib/translations.js";
import { GOLD, BORDER, MUTED, TEXT, iStyle, pBtn, gBtn, dBtn } from "../../lib/constants.js";
import { formatDateCH, formatCHF } from "../../lib/utils.js";
import { SectionCard } from "../../components/UI.jsx";

function isMahnungFaellig(inv) {
  if (inv.status !== "versendet") return false;
  const date = new Date(inv.date);
  const days = Number(inv.paymentDays || 30) + 5;
  const faellig = new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  return Date.now() > faellig.getTime();
}

const PAGE_SIZE = 20;

function Pagination({ total, page, setPage, language = "DE" }) {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) return null;
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 16 }}>
      <button onClick={() => setPage(p => Math.max(0, p-1))} disabled={page === 0} style={{ ...gBtn, minWidth: 80 }}>{language==="FR"?"Précédent":language==="IT"?"Precedente":language==="EN"?"Previous":"← Zurück"}</button>
      <span style={{ color: MUTED, fontSize: 13 }}>{language==="FR"?"Page":language==="IT"?"Pagina":language==="EN"?"Page":"Seite"} {page+1} / {pages}</span>
      <button onClick={() => setPage(p => Math.min(pages-1, p+1))} disabled={page >= pages-1} style={{ ...gBtn, minWidth: 80 }}>{language==="FR"?"Suivant":language==="IT"?"Avanti":language==="EN"?"Next":"Weiter →"}</button>
    </div>
  );
}

export function RechnungenView({ invoices, onReopen, onEdit, onMarkSent, onStorno , onDelete, language = "DE", goTo, onMahnung, isAdmin = true }) {
  const tr = useTranslation(language);
  const [pageEntwurf, setPageEntwurf] = useState(0);
  const [pageSent, setPageSent] = useState(0);
  const [pageArchived, setPageArchived] = useState(0);
  const [search, setSearch] = useState("");
  const [mahnungInv, setMahnungInv] = useState(null);
  const [mahnungFee, setMahnungFee] = useState("30");
  const [mahnungNotes, setMahnungNotes] = useState("");
  const [mahnungDays, setMahnungDays] = useState("10");

  const q = search.trim().toLowerCase();
  const entwurf = invoices.filter(i => i.status === "entwurf" && (!q || i.customer?.toLowerCase().includes(q) || i.invoiceNr?.toLowerCase().includes(q)));
  const sent = invoices.filter(i => i.status === "versendet" && (!q || i.customer?.toLowerCase().includes(q) || i.invoiceNr?.toLowerCase().includes(q)));
  const archived = invoices.filter(i => (i.status === "archiviert" || i.status === "bezahlt") && (!q || i.customer?.toLowerCase().includes(q) || i.invoiceNr?.toLowerCase().includes(q)));

  const InvCard = ({inv, onMahnungClick}) => {
    const projectName = (inv.reportData?.projectName && String(inv.reportData.projectName).trim()) || "—";
    const customer = inv.customer && String(inv.customer).trim() ? String(inv.customer).trim() : "—";
    const date = formatDateCH(inv.date);
    const total = formatCHF(inv.totalAmount);
    return (
      <div key={inv.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,168,83,0.2)", borderRadius: 10, padding: "12px 14px", display: "grid", gap: 8 }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ color: TEXT, fontSize: 13, lineHeight: 1.45, flex: "1 1 200px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
            <span style={{ fontWeight: 600 }}>{inv.invoiceNr}</span>
            <span>{" · " + projectName + " · " + customer + " · " + date + " · CHF " + total}</span>
          </div>
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            {isMahnungFaellig(inv) && <span style={{ background:"#e05c5c", color:"#fff", fontWeight:700, fontSize:11, borderRadius:6, padding:"2px 8px" }}>⚠️ {tr.invoice?.mahnungDue30||"Mahnung fällig"}{inv.mahnung_count > 0 ? " ("+inv.mahnung_count+")" : ""}</span>}
            <span style={{ fontSize: 12, fontWeight: 700, border: "1px solid "+GOLD, borderRadius: 4, padding: "2px 8px", color: GOLD }}>{inv.status === "entwurf" ? (language==="FR"?"Brouillon":language==="IT"?"Bozza":language==="EN"?"Draft":"Entwurf") : inv.status === "versendet" ? (language==="FR"?"Envoyé":language==="IT"?"Inviato":language==="EN"?"Sent":"Versendet") : inv.status === "bezahlt" ? (language==="FR"?"Payé":language==="IT"?"Pagato":language==="EN"?"Paid":"Bezahlt") : inv.status === "storno" ? "STORNO" : inv.status}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => onEdit && onEdit(inv)} style={{ ...gBtn, minHeight: 34 }}>✏️</button>
          <button type="button" onClick={() => onReopen(inv)} style={{ ...gBtn, minHeight: 34 }}>PDF</button>
          {inv.status === "entwurf" && <button type="button" onClick={() => onMarkSent(inv)} style={{ ...gBtn, minHeight: 34, color: GOLD, borderColor: GOLD }}>{tr.invoice?.sent||"Als versendet markieren"}</button>}
          {inv.status === "versendet" && <button type="button" onClick={() => onMahnungClick && onMahnungClick(inv)} style={{ ...gBtn, minHeight: 34, color: "#e05c5c", borderColor: "#e05c5c" }}>{tr.invoice?.mahnung||"Mahnung"}</button>}
          <button type="button" onClick={() => { if(!isAdmin){alert("⛔ "+(language==="FR"?"Réservé à l admin":language==="IT"?"Solo amministratore":language==="EN"?"Admin only":"Nur Admin")); return;} if(window.confirm(language==="FR"?"Supprimer?":language==="IT"?"Eliminare?":language==="EN"?"Delete?":"Rechnung löschen?")) onDelete(inv.id); }} style={{ ...dBtn, minHeight: 34 }}>🗑</button>
        </div>
      </div>
    );
  };

  return (
    <SectionCard>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <button type="button" onClick={() => goTo("home")} style={{ background:"transparent", color:GOLD, border:"1px solid "+GOLD, borderRadius:8, padding:"8px 14px", fontWeight:600, fontSize:14, cursor:"pointer" }}>{tr.common?.back||"Zurück"}</button>
        <div style={{ color: GOLD, fontWeight: 700, fontSize: 18 }}>{tr.nav?.invoices||"Rechnungen"}</div>
        <div style={{ minWidth: 80 }}></div>
      </div>
      <input placeholder={language==="FR"?"Rechercher...":language==="IT"?"Cerca...":language==="EN"?"Search...":"Suchen..."} value={search} onChange={e => setSearch(e.target.value)} style={{ ...iStyle, width:"100%", marginBottom:8 }} />


      {entwurf.length > 0 && <>
        <h3 style={{ color: MUTED, fontSize: 13, marginBottom: 8 }}>{tr.invoice?.draft||"Entwurf"} ({entwurf.length})</h3>
        <div style={{ display: "grid", gap: 10, marginBottom: 8 }}>
          {entwurf.slice(pageEntwurf * PAGE_SIZE, (pageEntwurf+1) * PAGE_SIZE).map(inv => InvCard({inv, onMahnungClick: setMahnungInv}))}
        </div>
        <Pagination language={language} total={entwurf.length} page={pageEntwurf} setPage={setPageEntwurf}/>
      </>}

      {sent.length > 0 && <>
        <h3 style={{ color: MUTED, fontSize: 13, marginBottom: 8, marginTop: 16 }}>{tr.invoice?.sentLabel||"Versendet"} ({sent.length})</h3>
        <div style={{ display: "grid", gap: 10, marginBottom: 8 }}>
          {sent.slice(pageSent * PAGE_SIZE, (pageSent+1) * PAGE_SIZE).map(inv => InvCard({inv, onMahnungClick: setMahnungInv}))}
        </div>
        <Pagination language={language} total={sent.length} page={pageSent} setPage={setPageSent}/>
      </>}

      {archived.length > 0 && <>
        <h3 style={{ color: MUTED, fontSize: 13, marginBottom: 8, marginTop: 16 }}>{tr.invoice?.paid||"Archiviert"} ({archived.length})</h3>
        <div style={{ display: "grid", gap: 10, marginBottom: 8 }}>
          {archived.slice(pageArchived * PAGE_SIZE, (pageArchived+1) * PAGE_SIZE).map(inv => InvCard({inv, onMahnungClick: setMahnungInv}))}
        </div>
        <Pagination language={language} total={archived.length} page={pageArchived} setPage={setPageArchived}/>
      </>}

      {mahnungInv && (
        <div style={{ position:"fixed", inset:0, zIndex:500, background:"rgba(0,0,0,0.85)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:"#1a1a1a", border:"1px solid #e05c5c", borderRadius:14, padding:24, maxWidth:440, width:"100%" }}>
            <div style={{ color:"#e05c5c", fontWeight:700, fontSize:18, marginBottom:4 }}>⚠️ {tr.invoice?.mahnungCreate||"Mahnung erstellen"}</div>
            <div style={{ color:MUTED, fontSize:13, marginBottom:16 }}>{mahnungInv.invoiceNr} — {mahnungInv.customer} — {(mahnungInv.mahnung_count||0)+1}. {language==="FR"?"Rappel":language==="IT"?"Sollecito":language==="EN"?"Reminder":"Mahnung"}</div>
            <div style={{ display:"grid", gap:10 }}>
              <div><div style={{ fontSize:12, color:MUTED, marginBottom:2 }}>{tr.invoice?.mahnungFee||"Mahngebühr CHF"}</div><input type="number" value={mahnungFee} onChange={e => setMahnungFee(e.target.value)} style={{ ...iStyle, width:"100%" }} placeholder="30" /></div>
              <div><div style={{ fontSize:12, color:MUTED, marginBottom:2 }}>{tr.invoice?.mahnungDue||"Zahlungsfrist (Tage)"}</div><input type="number" value={mahnungDays} onChange={e => setMahnungDays(e.target.value)} style={{ ...iStyle, width:"100%" }} placeholder="10" /></div>
              <div><div style={{ fontSize:12, color:MUTED, marginBottom:2 }}>{tr.invoice?.mahnungNotes||"Mahnnotiz"}</div><textarea value={mahnungNotes} onChange={e => setMahnungNotes(e.target.value)} rows={3} style={{ ...iStyle, width:"100%", minHeight:70, padding:10 }} /></div>
              <div style={{ display:"flex", gap:8 }}>
                <button type="button" onClick={() => { setMahnungInv(null); setMahnungFee("30"); setMahnungNotes(""); setMahnungDays("10"); }} style={{ ...gBtn, flex:1 }}>{tr.common?.cancel||"Abbrechen"}</button>
                <button type="button" onClick={() => { if(onMahnung) onMahnung(mahnungInv, Number(mahnungFee)||0, mahnungNotes, Number(mahnungDays)||10); setMahnungInv(null); setMahnungFee("30"); setMahnungNotes(""); setMahnungDays("10"); }} style={{ ...gBtn, flex:2, color:"#e05c5c", borderColor:"#e05c5c", fontWeight:700 }}>{tr.invoice?.mahnungCreate||"Mahnung erstellen"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

export function RechnungModal({
  invoiceModal, onClose,
  invoiceDiscount, setInvoiceDiscount,
  invoiceSkonto, setInvoiceSkonto,
  invoicePayDays, setInvoicePayDays,
  invoiceSkontoDays, setInvoiceSkontoDays,
  onGenerate, parseReport, language = "DE",
}) {
  if (!invoiceModal) return null;
  const p = parseReport(invoiceModal);
  const tr = useTranslation(language);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 600, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}>
      <div style={{ background: "#1a1a1a", border: `1px solid ${BORDER}`, borderRadius: 16, padding: 28, maxWidth: 460, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", overflowY: "auto", maxHeight: "90vh" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, color: GOLD, fontSize: 18 }}>{"🧾 " + (tr.invoice?.generate||"Rechnung erstellen")}</h2>
          <button onClick={onClose} style={{ ...gBtn, minHeight: 32, padding: "0 10px", fontSize: 16 }}>✕</button>
        </div>
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 14, border: `1px solid ${BORDER}` }}>
            <div style={{ color: MUTED, fontSize: 11, marginBottom: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>{tr.invoice?.payDays||"Zahlungsfrist"}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {["10", "20", "30", "45", "60"].map(d => (
                <button key={d} type="button" onClick={() => setInvoicePayDays(d)}
                  style={{ minHeight: 34, borderRadius: 8, padding: "0 14px", cursor: "pointer", fontWeight: invoicePayDays === d ? 700 : 400, background: invoicePayDays === d ? GOLD : "transparent", color: invoicePayDays === d ? "#111" : MUTED, border: `1px solid ${invoicePayDays === d ? GOLD : BORDER}`, fontSize: 13 }}>
                  {d} {tr.common?.days||"Tage"}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="number" min="1" max="365" value={invoicePayDays} onChange={e => setInvoicePayDays(e.target.value)} style={{ ...iStyle, width: 80, textAlign: "center", fontWeight: 700 }} />
              <span style={{ color: MUTED, fontSize: 13 }}>Tage → <b style={{ color: "#f0ece4" }}>{invoiceModal.date ? formatDateCH(new Date(new Date(invoiceModal.date).getTime() + (parseInt(invoicePayDays)||30)*86400000).toISOString().slice(0,10)) : "-"}</b></span>
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 14, border: `1px solid ${BORDER}` }}>
            <div style={{ color: MUTED, fontSize: 11, marginBottom: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>{tr.invoice?.discount||"Rabatt %"}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {["0", "5", "10", "15", "20"].map(d => (
                <button key={d} type="button" onClick={() => setInvoiceDiscount(d)}
                  style={{ minHeight: 34, borderRadius: 8, padding: "0 14px", cursor: "pointer", fontWeight: invoiceDiscount === d ? 700 : 400, background: invoiceDiscount === d ? GOLD : "transparent", color: invoiceDiscount === d ? "#111" : MUTED, border: `1px solid ${invoiceDiscount === d ? GOLD : BORDER}`, fontSize: 13 }}>
                  {d}%
                </button>
              ))}
            </div>
            <input type="number" min="0" max="100" step="0.5" value={invoiceDiscount} onChange={e => setInvoiceDiscount(e.target.value)} style={{ ...iStyle, width: 90, fontSize: 18, fontWeight: 700, textAlign: "center" }} />
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 14, border: `1px solid ${BORDER}` }}>
            <div style={{ color: MUTED, fontSize: 11, marginBottom: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>{tr.invoice?.skonto||"Skonto %"}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {["0", "1", "2", "3"].map(d => (
                <button key={d} type="button" onClick={() => setInvoiceSkonto(d)}
                  style={{ minHeight: 34, borderRadius: 8, padding: "0 14px", cursor: "pointer", fontWeight: invoiceSkonto === d ? 700 : 400, background: invoiceSkonto === d ? GOLD : "transparent", color: invoiceSkonto === d ? "#111" : MUTED, border: `1px solid ${invoiceSkonto === d ? GOLD : BORDER}`, fontSize: 13 }}>
                  {d}%
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="number" min="0" max="100" step="0.5" value={invoiceSkonto} onChange={e => setInvoiceSkonto(e.target.value)} style={{ ...iStyle, width: 90, fontSize: 18, fontWeight: 700, textAlign: "center" }} />
              <span style={{ color: MUTED, fontSize: 13 }}>{tr.invoice?.skontoDays||"Skonto-Frist"}</span>
              <input type="number" min="1" max="60" value={invoiceSkontoDays} onChange={e => setInvoiceSkontoDays(e.target.value)} style={{ ...iStyle, width: 80, textAlign: "center", fontWeight: 700 }} />
              <span style={{ color: MUTED, fontSize: 13 }}>{tr.common?.days||"Tage"}</span>
            </div>
          </div>
          <button type="button"
            style={{ ...pBtn, width: "100%", fontSize: 16, minHeight: 48 }}
            onClick={() => onGenerate(invoiceModal, parseFloat(invoiceDiscount)||0, parseFloat(invoiceSkonto)||0, invoicePayDays, invoiceSkontoDays)}>
            {tr.invoice?.open||"Rechnung erstellen"} →
          </button>
        </div>
      </div>
    </div>
  );
}
// Do 30 Apr 2026 20:03:31 CEST
