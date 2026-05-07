import { useTranslation } from "../../lib/translations.js";
import { useState, useMemo } from "react";
import { GOLD, BORDER, MUTED, TEXT, iStyle, pBtn, gBtn, dBtn } from "../../lib/constants.js";
import { parseReport, parseCustomerMeta, toNum, formatDateCH, formatReportCardSummary } from "../../lib/utils.js";
import { SectionCard } from "../../components/UI.jsx";

function isLinkedReport(r, customer) {
  const rp = parseReport(r);
  return String(rp.customerId) === String(customer.id) || r.customer === customer.name;
}

/** Prefer row.status; fall back to description payload (some rows can be out of sync). */
function normalizeReportStatus(r) {
  const top = String(r?.status ?? "").trim().toLowerCase();
  if (top) return top;
  const p = parseReport(r);
  return String(p?.status ?? "").trim().toLowerCase();
}

const ACTIVE_TAB_STATUSES = new Set(["offen", "bearbeitet"]);
function isMahnungFaellig(inv) {
  if (inv.status !== "versendet") return false;
  const date = new Date(inv.date);
  const days = Number(inv.paymentDays || 30) + 5;
  const faellig = new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  return Date.now() > faellig.getTime();
}

const ARCHIVE_TAB_STATUSES = new Set(["archiviert", "gesendet", "jahresarchiv"]);

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;
function isOlderThan60Days(item) {
  const archivedAt = item.archived_at || item.updated_at || item.date;
  if (!archivedAt) return false;
  return Date.now() - new Date(archivedAt).getTime() > SIXTY_DAYS_MS;
}
function normalizeInvoiceStatus(inv) {
  return String(inv?.status ?? "").trim().toLowerCase();
}

// ─── Kundenliste + Formular ────────────────────────────────────────────────
function formatCHF(amount) {
  const n = Number(amount) || 0;
  const parts = n.toFixed(2).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return parts.join(".");
}

export function KundenView({ language = "DE",
  customerForm,
  setCustomerForm,
  customers,
  onSave,
  onSelect,
  onDelete,
  onEdit,                          
}) {
  const tr = useTranslation(language);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [activeLetter, setActiveLetter] = useState("");
  const KUNDEN_PAGE_SIZE = 20;
  const [kundePage, setKundePage] = useState(0);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const availableLetters = new Set(customers.map(c => (c.name||"").charAt(0).toUpperCase()));
  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!activeLetter && !q) return [];
    let list = customers;
    if (activeLetter) list = list.filter(c => (c.name||"").charAt(0).toUpperCase() === activeLetter);
    if (q) list = list.filter((c) => (c.name || "").toLowerCase().includes(q));
    return list;
  }, [customers, search, activeLetter]);
  const pagedCustomers = filteredCustomers.slice(kundePage * KUNDEN_PAGE_SIZE, (kundePage + 1) * KUNDEN_PAGE_SIZE);
  const kundePages = Math.ceil(filteredCustomers.length / KUNDEN_PAGE_SIZE);
  const newCustomerLabel = language==="FR"?"Nouveau client":language==="IT"?"Nuovo cliente":language==="EN"?"New Customer":"Neuer Kunde";
  const cancelLabel = language==="FR"?"Annuler":language==="IT"?"Annulla":language==="EN"?"Cancel":tr.common.cancel;

  return (
    <SectionCard>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <h2 style={{ marginTop:0, marginBottom:0 }}>{tr.customer.title}</h2>
        <button type="button" onClick={() => setShowForm(p => !p)} style={{ background: showForm?"transparent":"#d4a853", color: showForm?GOLD:"#111", border:"1px solid #d4a853", borderRadius:8, padding:"8px 16px", fontWeight:700, fontSize:14, cursor:"pointer" }}>{showForm ? cancelLabel : newCustomerLabel}</button>
      </div>
      {showForm && <div style={{ display: "grid", gap: 8, marginBottom: 14, background:"rgba(212,168,83,0.05)", border:"1px solid rgba(212,168,83,0.2)", borderRadius:10, padding:14 }}>
        <input placeholder={tr.customer.company + " *"} value={customerForm.company} onChange={(e) => setCustomerForm((p) => ({ ...p, company: e.target.value }))} style={iStyle} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <input placeholder={tr.customer.firstName} value={customerForm.firstName} onChange={(e) => setCustomerForm((p) => ({ ...p, firstName: e.target.value }))} style={iStyle} />
          <input placeholder={tr.customer.lastName} value={customerForm.lastName} onChange={(e) => setCustomerForm((p) => ({ ...p, lastName: e.target.value }))} style={iStyle} />
        </div>
        <input placeholder={tr.report.address} value={customerForm.address} onChange={(e) => setCustomerForm((p) => ({ ...p, address: e.target.value }))} style={iStyle} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
          <input placeholder={tr.report.zip} value={customerForm.zip} onChange={(e) => setCustomerForm((p) => ({ ...p, zip: e.target.value }))} style={iStyle} />
          <input placeholder={tr.report.city} value={customerForm.city} onChange={(e) => setCustomerForm((p) => ({ ...p, city: e.target.value }))} style={iStyle} />
        </div>
        <input placeholder={tr.customer.phone} value={customerForm.phone} onChange={(e) => setCustomerForm((p) => ({ ...p, phone: e.target.value }))} style={iStyle} />
        <input placeholder={tr.customer.email} value={customerForm.email} onChange={(e) => setCustomerForm((p) => ({ ...p, email: e.target.value }))} style={iStyle} />
        <input placeholder={tr.mwst||"MWST-Nr (optional)"} value={customerForm.mwst || ""} onChange={(e) => setCustomerForm((p) => ({ ...p, mwst: e.target.value }))} style={iStyle} />
        <button type="button" onClick={() => { onSave(); setShowForm(false); }} style={pBtn}>{tr.customer.save}</button>
      </div>}
      <div style={{ marginBottom: 10 }}>
        <input type="search" placeholder={tr.customer.search} value={search} onChange={(e) => { setSearch(e.target.value); setKundePage(0); setActiveLetter(""); }} style={{ ...iStyle, width: "100%" }} />
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:12 }}>
        {alphabet.map(l => (
          <button key={l} type="button" onClick={() => { setActiveLetter(activeLetter===l?"":l); setKundePage(0); }} style={{ minWidth:28, minHeight:28, borderRadius:6, border:"1px solid "+(activeLetter===l?GOLD:BORDER), background:activeLetter===l?"rgba(212,168,83,0.15)":"transparent", color:availableLetters.has(l)?TEXT:MUTED, fontWeight:activeLetter===l?700:400, fontSize:12, cursor:availableLetters.has(l)?"pointer":"default", opacity:availableLetters.has(l)?1:0.35 }}>{l}</button>
        ))}
        {activeLetter && <button type="button" onClick={() => { setActiveLetter(""); setKundePage(0); }} style={{ minWidth:28, minHeight:28, borderRadius:6, border:"1px solid "+GOLD, background:"transparent", color:GOLD, fontSize:12, cursor:"pointer" }}>✕</button>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
        {pagedCustomers.map((c) => {
          const m = parseCustomerMeta(c);
          return (
            <div
              key={c.id}
              onClick={() => onSelect(c)}
              style={{ border: "1px solid rgba(212,168,83,0.2)", borderRadius: 10, padding: "12px 14px", background: "rgba(255,255,255,0.03)", display: "grid", gap: 6, cursor: "pointer" }}
            >
              <div style={{ color: GOLD, fontWeight: 700, fontSize: 11 }}>{m.kundennummer || "—"}</div>
              <div style={{ color: TEXT, fontWeight: 700, fontSize: 14 }}>{c.name || [m.firstName, m.lastName].filter(Boolean).join(" ") || "—"}</div>
              {(m.firstName || m.lastName) && c.name && <div style={{ color: MUTED, fontSize: 12 }}>{[m.firstName, m.lastName].filter(Boolean).join(" ")}</div>}
              {m.address && <div style={{ color: MUTED, fontSize: 12 }}>{[m.address, [m.zip, m.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</div>}
              <div style={{ display:"flex", gap:6, marginTop:4 }}>
                <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(c); setShowForm(true); window.scrollTo(0,0); }} style={{ ...gBtn, minHeight:30, fontSize:12, flex:1 }}>{tr.common.edit}</button>
                <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(c); }} style={{ ...dBtn, minHeight:30, fontSize:12, flex:1 }}>{tr.common.delete}</button>
              </div>
            </div>
          );
        })}
      </div>
      {filteredCustomers.length === 0 && (search.trim() || activeLetter) && customers.length > 0 && <p style={{ color: MUTED, marginTop: 12 }}>{language==="FR"?"Aucun résultat":language==="IT"?"Nessun risultato":language==="EN"?"No results":"Keine Treffer"}.</p>}
      {customers.length === 0 && <p style={{ color: MUTED, marginTop: 12 }}>Noch keine Kunden.</p>}
      {kundePages > 1 && <div style={{ display:"flex", gap:8, marginTop:16, alignItems:"center", justifyContent:"center" }}>
        <button type="button" onClick={()=>setKundePage(p=>Math.max(0,p-1))} disabled={kundePage===0} style={{ ...gBtn, minHeight:32, opacity:kundePage===0?0.4:1 }}>{ tr.common?.prev || "←" }</button>
        <span style={{ color:MUTED, fontSize:13 }}>{kundePage+1} / {kundePages}</span>
        <button type="button" onClick={()=>setKundePage(p=>Math.min(kundePages-1,p+1))} disabled={kundePage>=kundePages-1} style={{ ...gBtn, minHeight:32, opacity:kundePage>=kundePages-1?0.4:1 }}>{ tr.common?.next || "→" }</button>
      </div>}
    </SectionCard>
  );
}

function ReportRowCard({ r, isArchived, onOpenReport, onEditReport, onPDF, onInvoice, onDeleteReport, showInvoiceButton = true, invoices = [], language = "DE", isAdmin = true }) {
  const tr = useTranslation(language);
  return (
    <div
      style={{
        border: `1px solid rgba(212,168,83,0.2)`,
        borderRadius: 10,
        padding: "12px 14px",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <button
        type="button"
        onClick={() => onOpenReport(r)}
        style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", marginBottom: 10, padding: 0 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
          <div style={{ color: TEXT, fontSize: 13, lineHeight: 1.45, flex: "1 1 200px" }}>{formatReportCardSummary(r)}</div>
          {(() => { const rColor = r.status==="archiviert" ? GOLD : r.status==="gesendet" ? "#d4a853" : MUTED; const rLabel = r.status==="gesendet" ? tr.report.statusSent : r.status==="archiviert" ? tr.report.statusArchived : tr.report.status; return <span style={{ fontSize: 12, color: rColor, border: "1px solid "+rColor, borderRadius: 4, padding: "2px 8px", fontWeight: 700 }}>{rLabel}</span>; })()} 
          {(() => { const rp = parseReport(r); const cnt = invoices.filter(inv => inv.reportData && String(inv.reportData.rapportNr) === String(rp.rapportNr)).length; return cnt > 0 ? <span style={{ marginLeft: 6, background: GOLD, color: "#111", borderRadius: "50%", width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>{cnt}</span> : null; })()}
        </div>
      </button>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>
        <button type="button" onClick={() => { if(isArchived && !isAdmin){ alert("⛔ "+(language==="FR"?"Réservé à l admin":language==="IT"?"Solo amministratore":language==="EN"?"Admin only":"Nur Admin")); return; } onEditReport(r); }} style={{ ...gBtn, minHeight: 32, fontSize: 13 }}>
{tr.common.edit}
        </button>
        <button type="button" onClick={() => onPDF(r)} style={{ ...gBtn, minHeight: 32, fontSize: 13 }}>
          🖨 PDF
        </button>
        {showInvoiceButton && <button type="button" onClick={() => { if(!isAdmin){ alert("⛔ "+(language==="FR"?"Réservé à l admin":language==="IT"?"Solo amministratore":language==="EN"?"Admin only":"Nur Admin")); return; } onInvoice(r); }} style={{ ...gBtn, minHeight: 32, fontSize: 13, color: "#7ddb9a", borderColor: "#2d7a45" }}>🧾 {tr.nav.invoices}</button>}
        <button type="button" onClick={() => { if(isArchived && !isAdmin){ alert("⛔ " + (tr?.common?.adminOnly || "Nur Admin")); return; } onDeleteReport(r); }} style={{ ...dBtn, minHeight: 32, fontSize: 13 }}>
          🗑 {tr.common.delete}
        </button>
      </div>
    </div>
  );
}

/** Same invoice row layout as RechnungenViews.jsx (summary line + badge + actions). */
function InvoiceRowCard({ inv, onReopenInvoice, onPreviewInvoice, onMarkInvoiceSent, onMarkInvoicePaid, onDeleteInvoice, onStorno, onMahnung, showEditButton = true, language = "DE", isAdmin = true }) {
  const tr = useTranslation(language);
  const projectName = (inv.reportData?.projectName && String(inv.reportData.projectName).trim()) || "—";
  const customer = inv.customer && String(inv.customer).trim() ? String(inv.customer).trim() : "—";
  const date = formatDateCH(inv.date);
  const total = formatCHF(inv.totalAmount);
  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px", background: "rgba(255,255,255,0.02)" }}>
      <button type="button" onClick={() => onPreviewInvoice && onPreviewInvoice(inv)}
        style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", marginBottom: 10, padding: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
          <div style={{ color: TEXT, fontSize: 13, lineHeight: 1.45, flex: "1 1 200px" }}>
            <span style={{ fontWeight: 600 }}>{inv.invoiceNr}</span>
            <span>{" · " + projectName + " · " + customer + " · " + date + " · CHF " + total}</span>
          </div>
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            {isMahnungFaellig(inv) && <span style={{ background:"#e05c5c", color:"#fff", fontWeight:700, fontSize:11, borderRadius:6, padding:"2px 8px" }}>⚠️ {tr.invoice?.mahnungDue30||"Mahnung fällig"}{inv.mahnung_count > 0 ? " ("+inv.mahnung_count+")" : ""}</span>}
            {(() => { const iColor = inv.status==="bezahlt" ? "#2d7a45" : inv.status==="versendet" ? "#d4a853" : inv.status==="storno" ? "#e05c5c" : MUTED; const iLabel = inv.status==="entwurf" ? (tr.invoice?.draft||"Entwurf") : inv.status==="versendet" ? (tr.invoice?.sentLabel||"Versendet") : inv.status==="bezahlt" ? (tr.invoice?.paid||"Bezahlt") : inv.status==="storno" ? (language==="FR"?"Annulé":language==="IT"?"Stornato":language==="EN"?"Cancelled":"Storno") : inv.status; return <span style={{ fontSize: 12, color: iColor, border: "1px solid "+iColor, borderRadius: 4, padding: "2px 8px", fontWeight: 700 }}>{iLabel}</span>; })()}
          </div>
        </div>
      </button>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>
        {showEditButton && <button type="button" onClick={() => { if(!isAdmin){ alert("⛔ " + (tr?.common?.adminOnly || "Nur Admin")); return; } onReopenInvoice(inv); }} style={{ ...gBtn, minHeight: 32, fontSize: 13 }}>{tr.common.edit}</button>}
        <button type="button" onClick={() => onPreviewInvoice && onPreviewInvoice(inv)} style={{ ...gBtn, minHeight: 32, fontSize: 13 }}>🖨 PDF</button>
        {inv.status === "entwurf" && (
          <button type="button" onClick={() => onMarkInvoiceSent(inv)} style={{ ...gBtn, minHeight: 32, fontSize: 13, color: GOLD, borderColor: GOLD }}>
            {tr.invoice.sent}
          </button>
        )}
        {inv.status === "versendet" && onMahnung && <button type="button" onClick={() => { if(!isAdmin){ alert("⛔ "+(language==="FR"?"Réservé à l admin":language==="IT"?"Solo amministratore":language==="EN"?"Admin only":"Nur Admin")); return; } onMahnung(inv); }} style={{ ...gBtn, minHeight: 32, fontSize: 13, color: "#e05c5c", borderColor: "#e05c5c" }}>{tr.invoice?.mahnung||"Mahnung"}</button>}
        {inv.status === "versendet" && (
          <button type="button" onClick={() => { if(!isAdmin){ alert("⛔ " + (tr?.common?.adminOnly || "Nur Admin")); return; } onMarkInvoicePaid(inv); }} style={{ ...pBtn, minHeight: 32, fontSize: 13, background: "#1a472a", border: "1px solid #2d7a45", color: "#7ddb9a" }}>
            {tr.invoice.paid}
          </button>
        )}
        {inv.status !== "storno" && (inv.status === "versendet" || inv.status === "bezahlt" || inv.status === "jahresarchiv") ? <button type="button" onClick={() => { if(!isAdmin){ alert("⛔ "+(language==="FR"?"Réservé à l admin":language==="IT"?"Solo amministratore":language==="EN"?"Admin only":"Nur Admin")); return; } onStorno && onStorno(inv); }} style={{ ...dBtn, minHeight: 32, fontSize: 13, background:"transparent", color:"#e05c5c", borderColor:"#e05c5c" }}>{language==="FR"?"Annuler":language==="IT"?"Storna":language==="EN"?"Cancel":"Storno"}</button> : inv.status === "entwurf" ? <button type="button" onClick={() => { if(!isAdmin){ alert("⛔ " + (tr?.common?.adminOnly || "Nur Admin")); return; } onDeleteInvoice(inv.id); }} style={{ ...dBtn, minHeight: 32, fontSize: 13 }}>🗑 {tr.common.delete}</button> : null}


      </div>
    </div>
  );
}
function CustPagination({ total, page, setPage, language = "DE" }) {
  const pages = Math.ceil(total / CUST_PAGE_SIZE);
  if (pages <= 1) return null;
  return (<div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 12 }}><button onClick={() => setPage(p => Math.max(0, p-1))} disabled={page === 0} style={{ ...gBtn, minWidth: 80 }}>{ language==="FR" ? "Précédent" : language==="IT" ? "Precedente" : language==="EN" ? "Previous" : "← Zurück" }</button><span style={{ color: MUTED, fontSize: 13 }}>{ language==="FR" ? "Page" : language==="IT" ? "Pagina" : language==="EN" ? "Page" : "Seite" } {page+1} / {pages}</span><button onClick={() => setPage(p => Math.min(pages-1, p+1))} disabled={page >= pages-1} style={{ ...gBtn, minWidth: 80 }}>{ language==="FR" ? "Suivant" : language==="IT" ? "Avanti" : language==="EN" ? "Next" : "Weiter →" }</button></div>);
}


// ─── Jahres-Archiv Komponente ──────────────────────────────────────────────
function JahresArchiv({ items = [], language = "DE", dateKey = "date", renderItem, title, onDeleteYear, isAdmin = true }) {
  const [search, setSearch] = useState("");
  const [openYears, setOpenYears] = useState({});
  const searchLabel = language==="FR"?"Rechercher...":language==="IT"?"Cerca...":language==="EN"?"Search...":"Suchen...";
  const noResults = language==="FR"?"Aucun résultat":language==="IT"?"Nessun risultato":language==="EN"?"No results":"Keine Treffer";
  const archivLabel = language==="FR"?"Archive":language==="IT"?"Archivio":language==="EN"?"Archive":"Archiv";
  const deleteYearLabel = language==="FR"?"Supprimer l'année":language==="IT"?"Elimina anno":language==="EN"?"Delete year":"Jahr löschen";
  const deleteConfirmMsg = (year) => language==="FR"?`Voulez-vous vraiment supprimer toutes les données de ${year}? Cette action est irréversible.`:language==="IT"?`Vuoi davvero eliminare tutti i dati del ${year}? Questa azione è irreversibile.`:language==="EN"?`Do you really want to delete all data from ${year}? This action cannot be undone.`:`Möchten Sie wirklich alle Daten von ${year} löschen? Ihre Daten gehen endgültig verloren.`;

  const filtered = search.trim()
    ? items.filter(i => JSON.stringify(i).toLowerCase().includes(search.toLowerCase()))
    : items;

  const byYear = {};
  for (const item of filtered) {
    const year = (item[dateKey] || "").slice(0, 4) || "—";
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(item);
  }
  const years = Object.keys(byYear).sort((a, b) => b - a);

  const toggleYear = (y) => setOpenYears(p => ({ ...p, [y]: !p[y] }));

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ color: GOLD, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>📁 {title || archivLabel}</div>
      <input placeholder={searchLabel} value={search} onChange={e => setSearch(e.target.value)} style={{ ...iStyle, width: "100%", marginBottom: 10, fontSize: 13 }} />
      {filtered.length === 0 && <p style={{ color: MUTED, fontSize: 13 }}>{noResults}.</p>}
      {years.map(year => (
        <div key={year} style={{ marginBottom: 8 }}>
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            <button type="button" onClick={() => toggleYear(year)} style={{ flex:1, display:"flex", justifyContent:"space-between", alignItems:"center", background:"rgba(212,168,83,0.08)", border:"1px solid rgba(212,168,83,0.2)", borderRadius:8, padding:"8px 12px", cursor:"pointer", color:TEXT }}>
              <span style={{ fontWeight:700, fontSize:13 }}>📅 {year} <span style={{ color:MUTED, fontWeight:400 }}>({byYear[year].length})</span></span>
              <span style={{ color:GOLD }}>{openYears[year] ? "▲" : "▼"}</span>
            </button>
            {isAdmin && onDeleteYear && (
              <button type="button" onClick={() => { if(window.confirm(deleteConfirmMsg(year))) onDeleteYear(year, byYear[year]); }} style={{ background:"transparent", border:"1px solid #e05c5c", borderRadius:8, padding:"8px 10px", cursor:"pointer", color:"#e05c5c", fontSize:12, fontWeight:600, whiteSpace:"nowrap" }}>🗑 {deleteYearLabel}</button>
            )}
          </div>
          {openYears[year] && (
            <div style={{ display:"grid", gap:8, marginTop:6 }}>
              {byYear[year].map((item, i) => renderItem(item, i))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Kunden Detail ─────────────────────────────────────────────────────────

function OfferteRowCard({ o, onOpenOfferte, onEditOfferte, onPDFOfferte, onDeleteOfferte, onCreateInvoice, invoices = [], language = "DE", isAdmin = true }) {
  const tr = useTranslation(language);
  const sColor = o.status==="angenommen" ? "#2d7a45" : o.status==="abgelehnt" ? "#e05c5c" : o.status==="gesendet" ? "#d4a853" : MUTED;
  const sLabel = o.status==="offen" ? (tr.offerte?.open||"Offen") : o.status==="gesendet" ? (tr.offerte?.sent||"Gesendet") : o.status==="angenommen" ? (tr.offerte?.accepted||"Angenommen") : o.status==="abgelehnt" ? (tr.offerte?.rejected||"Abgelehnt") : o.status;
  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px", background: "rgba(255,255,255,0.02)" }}>
      <button type="button" onClick={() => onOpenOfferte && onOpenOfferte(o)}
        style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", marginBottom: 10, padding: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
          <div style={{ color: TEXT, fontSize: 13, lineHeight: 1.45, flex: "1 1 200px" }}>
            <span style={{ fontWeight: 600 }}>OF-{o.offerte_nr}</span>
            <span>{" · " + (o.description?.projectName||"-") + " · " + o.customer + " · " + o.date + " · CHF " + Number(o.total||0).toFixed(2)}</span>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: sColor, border: "1px solid " + sColor, borderRadius: 4, padding: "2px 8px", fontWeight: 700 }}>{sLabel}</span>
            {(() => { const ofNr = "OF-"+String(o.offerte_nr); const cnt = invoices.filter(inv => String(inv.rapportRef||inv.reportData?.rapportNr||inv.reportData?.offerteNr) === ofNr).length; return cnt > 0 ? <span style={{ marginLeft: 4, background: GOLD, color: "#111", borderRadius: "50%", width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>{cnt}</span> : null; })()}
          </div>
        </div>
      </button>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>
        <button type="button" onClick={() => { if(!isAdmin){ alert("⛔ "+(language==="FR"?"Réservé à l admin":language==="IT"?"Solo amministratore":language==="EN"?"Admin only":"Nur Admin")); return; } onEditOfferte && onEditOfferte(o); }} style={{ ...gBtn, minHeight: 32, fontSize: 13 }}>{tr.common.edit}</button>
        <button type="button" onClick={() => onPDFOfferte && onPDFOfferte(o)} style={{ ...gBtn, minHeight: 32, fontSize: 13 }}>🖨 PDF</button>
        {(o.status==="angenommen"||o.status==="gesendet"||o.status==="archiviert") && <button type="button" onClick={() => { if(!isAdmin){ alert("⛔ "+(language==="FR"?"Réservé à l admin":language==="IT"?"Solo amministratore":language==="EN"?"Admin only":"Nur Admin")); return; } onCreateInvoice && onCreateInvoice(o); }} style={{ ...gBtn, minHeight: 32, fontSize: 13, color: "#7ddb9a", borderColor: "#2d7a45" }}>{tr.invoice?.title||"Rechnung"}</button>}
        <button type="button" onClick={() => { if(!isAdmin){ alert("⛔ "+(language==="FR"?"Réservé à l admin":language==="IT"?"Solo amministratore":language==="EN"?"Admin only":"Nur Admin")); return; } onDeleteOfferte && onDeleteOfferte(o); }} style={{ ...dBtn, minHeight: 32, fontSize: 13 }}>🗑 {tr.common.delete}</button>
      </div>
    </div>
  );
}

export function KundenDetail({ language = "DE",
  customer,
  reports,
  archivedReports,
  invoices,
  onBack,
  onOpenReport,
  onEditReport,
  onPDF,
  onInvoice,
  onDeleteReport,
  onReopenInvoice, onPreviewInvoice,
  onMarkInvoiceSent, onMarkInvoicePaid, onStorno, onMahnung: onMahnungExternal,
  onDeleteInvoice,
  offerten = [],
  onOpenOfferte,
  onEditOfferte,
  onPDFOfferte,
  onDeleteOfferte,
  onCreateInvoice,
  isAdmin = true,
}) {
  const [detailTab, setDetailTab] = useState("rapporte-aktiv");
  const [mahnungInv, setMahnungInv] = useState(null);
  const [mahnungFee, setMahnungFee] = useState("30");
  const [mahnungNotes, setMahnungNotes] = useState("");
  const [mahnungDays, setMahnungDays] = useState("10");
  const tr = useTranslation(language);
  const m = parseCustomerMeta(customer); const [pageReport, setPageReport] = useState(0);
  const [pageInvoice, setPageInvoice] = useState(0);
  const [pageOfferte, setPageOfferte] = useState(0);
  const linkedMap = new Map();
  for (const r of [...reports, ...archivedReports]) {
    if (!isLinkedReport(r, customer)) continue;
    linkedMap.set(r.id, r);
  }
  const linked = [...linkedMap.values()];
  const linkedActive = linked.filter((r) => ACTIVE_TAB_STATUSES.has(normalizeReportStatus(r)));
  const linkedArchiveAll = linked.filter((r) => ARCHIVE_TAB_STATUSES.has(normalizeReportStatus(r)));
  const linkedArchive = linkedArchiveAll.filter(r => !isOlderThan60Days(r));
  const linkedArchive60 = linkedArchiveAll.filter(r => isOlderThan60Days(r));
  const revenue = linked.reduce((s, r) => s + toNum(parseReport(r)?.totals?.total), 0);
  const custInvoices = invoices.filter((inv) => String(inv.customerId) === String(customer.id) || inv.customer === customer.name);
  const invoicesActive = custInvoices.filter((inv) => normalizeInvoiceStatus(inv) === "entwurf");
  const invoicesGesendet = custInvoices.filter((inv) => normalizeInvoiceStatus(inv) === "versendet");
  const invoicesArchiveAll = custInvoices.filter((inv) => normalizeInvoiceStatus(inv) === "bezahlt" || normalizeInvoiceStatus(inv) === "storno" || normalizeInvoiceStatus(inv) === "jahresarchiv");
  const invoicesArchive = invoicesArchiveAll.filter(inv => !isOlderThan60Days(inv));
  const invoicesArchive60 = invoicesArchiveAll.filter(inv => isOlderThan60Days(inv));
  const custOfferten = offerten.filter(o => String(o.customer_id) === String(customer.id) || o.customer === customer.name);
  const offertenAktiv = custOfferten.filter(o => o.status === "offen" || o.status === "bearbeitet");
  const offertenArchivAll = custOfferten.filter(o => o.status === "angenommen" || o.status === "abgelehnt" || o.status === "gesendet" || o.status === "archiviert" || o.status === "jahresarchiv");
  const offertenArchiv = offertenArchivAll.filter(o => !isOlderThan60Days(o));
  const offertenArchiv60 = offertenArchivAll.filter(o => isOlderThan60Days(o));

  const tabBtn = (id, label, count, color = GOLD) => (
    <button
      type="button"
      key={id}
      onClick={() => setDetailTab(id)}
      style={{
        flex: "1 1 160px",
        minHeight: 40,
        borderRadius: 8,
        cursor: "pointer",
        fontWeight: detailTab === id ? 700 : 500,
        fontSize: 12,
        border: `1px solid ${color}`,
        background: detailTab === id ? `${color}22` : "transparent",
        color: detailTab === id ? color : MUTED,
      }}
    >
      {label} ({count})
    </button>
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");

  const mnDE = {"01":"Jan","02":"Feb","03":"Mar","04":"Apr","05":"Mai","06":"Jun","07":"Jul","08":"Aug","09":"Sep","10":"Okt","11":"Nov","12":"Dez"};
  const mnFR = {"01":"Jan","02":"Fev","03":"Mar","04":"Avr","05":"Mai","06":"Juin","07":"Juil","08":"Aou","09":"Sep","10":"Oct","11":"Nov","12":"Dec"};
  const mnIT = {"01":"Gen","02":"Feb","03":"Mar","04":"Apr","05":"Mag","06":"Giu","07":"Lug","08":"Ago","09":"Set","10":"Ott","11":"Nov","12":"Dic"};
  const mnEN = {"01":"Jan","02":"Feb","03":"Mar","04":"Apr","05":"May","06":"Jun","07":"Jul","08":"Aug","09":"Sep","10":"Oct","11":"Nov","12":"Dec"};
  const mn = language === "FR" ? mnFR : language === "IT" ? mnIT : language === "EN" ? mnEN : mnDE;

  const filterItems = (items, dateKey = "date") => {
    return items.filter(item => {
      const d = item[dateKey] || "";
      const q = searchQuery.trim().toLowerCase();
      if (selectedYear !== "all" && !d.startsWith(selectedYear)) return false;
      if (selectedMonth !== "all" && d.slice(5,7) !== selectedMonth) return false;
      if (q) { const hay = JSON.stringify(item).toLowerCase(); if (!hay.includes(q)) return false; }
      return true;
    });
  };
  const getYears = (items, dateKey = "date") => [...new Set(items.map(i => (i[dateKey]||"").slice(0,4)).filter(Boolean))].sort((a,b) => b-a);
  const getMonths = (items, dateKey = "date") => [...new Set(items.map(i => (i[dateKey]||"").slice(5,7)).filter(Boolean))].sort();

  const reportListForTab =
    detailTab === "rapporte-aktiv" ? filterItems(linkedActive) : detailTab === "rapporte-archiv" ? filterItems(linkedArchive) : null;
  const invoiceListForTab =
    detailTab === "rechnungen-offen" ? filterItems(invoicesActive) : detailTab === "rechnungen-gesendet" ? filterItems(invoicesGesendet) : detailTab === "rechnungen-archiv" ? filterItems(invoicesArchive) : null;

  const offerteListForTab = detailTab === "offerte-aktiv" ? filterItems(offertenAktiv) : detailTab === "offerte-archiv" ? filterItems(offertenArchiv) : null;
  const emptyTabHint =
    detailTab === "rapporte-aktiv"
      ? tr.common.no + " " + tr.nav.reports + "."
      : detailTab === "rapporte-archiv"
        ? "Keine archivierten Rapporte."
        : detailTab === "rechnungen-offen"
          ? "Keine offenen Rechnungen."
          : "Keine versendeten Rechnungen.";

  const currentTabItems = reportListForTab != null ? reportListForTab : invoiceListForTab != null ? invoiceListForTab : offerteListForTab;

  return (
    <SectionCard>
      <div style={{ marginBottom: 14 }}>
        <div style={{ color: MUTED, fontSize: 11, fontWeight: 700, marginBottom: 2 }}>{m.kundennummer || ""}</div>
        <div style={{ color: TEXT, fontWeight: 700, fontSize: 20, marginBottom: 4 }}>{customer.name}</div>
        {(m.firstName || m.lastName) && <div style={{ color: MUTED, fontSize: 13 }}>{[m.firstName, m.lastName].filter(Boolean).join(" ")}</div>}
        {m.address && <div style={{ color: MUTED, fontSize: 13 }}>{m.address}, {m.zip} {m.city}</div>}
        {customer.phone && <div style={{ color: MUTED, fontSize: 13 }}>{customer.phone}</div>}
        {customer.email && <div style={{ color: MUTED, fontSize: 13 }}>{customer.email}</div>}
      </div>

      <div style={{ marginBottom: 12 }}>
        <input placeholder={tr.common.search + "..."} value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setPageReport(0); setPageInvoice(0); }} style={{ ...iStyle, width: "100%", marginBottom: 8 }} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <select value={selectedYear} onChange={e => { setSelectedYear(e.target.value); setSelectedMonth("all"); setPageReport(0); setPageInvoice(0); }} style={{ ...iStyle, minWidth: 160 }}>
            <option value="all">{ tr.common.allYears }</option>
            {getYears([...linkedActive,...linkedArchive,...custInvoices]).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {selectedYear !== "all" && <select value={selectedMonth} onChange={e => { setSelectedMonth(e.target.value); setPageReport(0); setPageInvoice(0); }} style={{ ...iStyle, minWidth: 160 }}>
            <option value="all">{ tr.common.allMonths }</option>
            {getMonths([...linkedActive,...linkedArchive,...custInvoices]).map(m => <option key={m} value={m}>{mn[m] || m}</option>)}
          </select>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {tabBtn("offerte-aktiv", tr.offerte?.offerteAktiv || "Offerte Aktiv", offertenAktiv.length, "#d4a853")}
{tabBtn("offerte-archiv", tr.offerte?.offerteArchiv || "Offerte Archiv", offertenArchiv.length, "#d4a853")}
{tabBtn("rapporte-aktiv", tr.nav.reports + " Aktiv", filterItems(linkedActive).length, "#f4efe6")}
{tabBtn("rapporte-archiv", tr.nav.reports + " Archiv", filterItems(linkedArchive).length, "#f4efe6")}
{tabBtn("rechnungen-offen", tr.nav.invoices + " " + tr.invoice.draft, filterItems(invoicesActive).length, "#4ade80")}
{tabBtn("rechnungen-gesendet", tr.nav.invoices + " " + tr.invoice.sentLabel, filterItems(invoicesGesendet).length, "#4ade80")}
{tabBtn("rechnungen-archiv", tr.nav.invoices + " Archiv", filterItems(invoicesArchive).length, "#4ade80")}
      </div>

      {currentTabItems.length === 0 && (
        <p style={{ color: MUTED, fontSize: 13, marginBottom: 14 }}>{emptyTabHint}</p>
      )}
      {reportListForTab && reportListForTab.length > 0 && (
        <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
         {reportListForTab.slice(pageReport * CUST_PAGE_SIZE, (pageReport+1) * CUST_PAGE_SIZE).map((r) => (

            <ReportRowCard
              language={language}
              key={r.id}
              r={r}
              isArchived={ARCHIVE_TAB_STATUSES.has(normalizeReportStatus(r))}
              onOpenReport={onOpenReport}
              onEditReport={onEditReport}
              onPDF={onPDF}
              onInvoice={onInvoice}
              onDeleteReport={onDeleteReport}
              showInvoiceButton={detailTab === "rapporte-archiv"}
              invoices={invoices}
              isAdmin={isAdmin}
            />
          ))}
        </div>
        )}
       <CustPagination language={language} total={reportListForTab ? reportListForTab.length : 0} page={pageReport} setPage={setPageReport}/>
      {detailTab === "rapporte-archiv" && <div style={{ color: MUTED, fontSize: 11, marginBottom: 8, fontStyle: "italic" }}>{language==="FR" ? "Les entrées de plus de 60 jours sont automatiquement déplacées vers l'archive annuelle." : language==="IT" ? "Le voci più vecchie di 60 giorni vengono spostate automaticamente nell'archivio annuale." : language==="EN" ? "Entries older than 60 days are automatically moved to the annual archive." : "Einträge älter als 60 Tage werden automatisch ins Jahresarchiv verschoben."}</div>}
      {detailTab === "rapporte-archiv" && <JahresArchiv items={linkedArchive60} language={language} dateKey="date" isAdmin={isAdmin} title={language==="FR"?"Archive Rapports":language==="IT"?"Archivio Rapporti":language==="EN"?"Reports Archive":"Rapporte Jahresarchiv"} onDeleteYear={(year, yearItems) => { yearItems.forEach(r => onDeleteReport(r)); }} renderItem={(r,i) => <ReportRowCard key={r.id} r={r} language={language} isArchived={true} onOpenReport={onOpenReport} onEditReport={onEditReport} onPDF={onPDF} onInvoice={onInvoice} onDeleteReport={onDeleteReport} showInvoiceButton={true} invoices={invoices} isAdmin={isAdmin}/>}/>}
      {offerteListForTab !== null && (<>
        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
          {offerteListForTab.length === 0 && <p style={{ color: MUTED }}>{tr.offerte?.noOfferten || "Keine Offerten."}</p>}
          {offerteListForTab.slice(pageOfferte * CUST_PAGE_SIZE, (pageOfferte+1) * CUST_PAGE_SIZE).map(o => (
            <OfferteRowCard key={o.id} o={o} language={language} isAdmin={isAdmin}
              onOpenOfferte={onOpenOfferte} onEditOfferte={onEditOfferte}
              onPDFOfferte={onPDFOfferte} onDeleteOfferte={onDeleteOfferte}
              onCreateInvoice={onCreateInvoice} invoices={invoices} />
          ))}
        </div>
        <CustPagination language={language} total={offerteListForTab ? offerteListForTab.length : 0} page={pageOfferte} setPage={setPageOfferte}/>
      {detailTab === "offerte-archiv" && <div style={{ color: MUTED, fontSize: 11, marginBottom: 8, fontStyle: "italic" }}>{language==="FR" ? "Les entrées de plus de 60 jours sont automatiquement déplacées vers l'archive annuelle." : language==="IT" ? "Le voci più vecchie di 60 giorni vengono spostate automaticamente nell'archivio annuale." : language==="EN" ? "Entries older than 60 days are automatically moved to the annual archive." : "Einträge älter als 60 Tage werden automatisch ins Jahresarchiv verschoben."}</div>}
      {detailTab === "offerte-archiv" && <JahresArchiv items={offertenArchiv60} language={language} dateKey="date" isAdmin={isAdmin} title={language==="FR"?"Archive Offres":language==="IT"?"Archivio Offerte":language==="EN"?"Quotes Archive":"Offerten Jahresarchiv"} onDeleteYear={(year, yearItems) => { yearItems.forEach(o => onDeleteOfferte(o)); }} renderItem={(o,i) => <OfferteRowCard key={o.id} o={o} language={language} isAdmin={isAdmin} onOpenOfferte={onOpenOfferte} onEditOfferte={onEditOfferte} onPDFOfferte={onPDFOfferte} onDeleteOfferte={onDeleteOfferte} onCreateInvoice={onCreateInvoice} invoices={invoices}/>}/>}
      </>)}
      {invoiceListForTab && invoiceListForTab.length > 0 && (
        <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
          {invoiceListForTab.slice(pageInvoice * CUST_PAGE_SIZE, (pageInvoice+1) * CUST_PAGE_SIZE).map((inv) => (

            <InvoiceRowCard
              language={language}
              key={inv.id}
              inv={inv}
              onReopenInvoice={onReopenInvoice}
              showEditButton={detailTab !== "rechnungen-archiv"}
              onPreviewInvoice={onPreviewInvoice}
              onMarkInvoiceSent={onMarkInvoiceSent}
              onMarkInvoicePaid={onMarkInvoicePaid}
              onMahnung={(inv) => { if(!isAdmin){ alert("⛔ "+(language==="FR"?"Réservé à l admin":language==="IT"?"Solo amministratore":language==="EN"?"Admin only":"Nur Admin")); return; } setMahnungInv(inv); }}
              onDeleteInvoice={onDeleteInvoice}
              onStorno={onStorno}
              isAdmin={isAdmin}
            />
          ))}
        </div>
              )}
<CustPagination language={language} total={invoiceListForTab ? invoiceListForTab.length : 0} page={pageInvoice} setPage={setPageInvoice}/>
      {detailTab === "rechnungen-archiv" && <div style={{ color: MUTED, fontSize: 11, marginBottom: 8, fontStyle: "italic" }}>{language==="FR" ? "Les entrées de plus de 60 jours sont automatiquement déplacées vers l'archive annuelle." : language==="IT" ? "Le voci più vecchie di 60 giorni vengono spostate automaticamente nell'archivio annuale." : language==="EN" ? "Entries older than 60 days are automatically moved to the annual archive." : "Einträge älter als 60 Tage werden automatisch ins Jahresarchiv verschoben."}</div>}
      {detailTab === "rechnungen-archiv" && <JahresArchiv items={invoicesArchive60} language={language} dateKey="date" isAdmin={isAdmin} title={language==="FR"?"Archive Factures":language==="IT"?"Archivio Fatture":language==="EN"?"Invoices Archive":"Rechnungen Jahresarchiv"} onDeleteYear={(year, yearItems) => { yearItems.forEach(inv => onDeleteInvoice(inv.id)); }} renderItem={(inv,i) => <InvoiceRowCard key={inv.id} inv={inv} language={language} onReopenInvoice={onReopenInvoice} showEditButton={false} onPreviewInvoice={onPreviewInvoice} onMarkInvoiceSent={onMarkInvoiceSent} onMarkInvoicePaid={onMarkInvoicePaid} onDeleteInvoice={onDeleteInvoice} onStorno={onStorno} isAdmin={isAdmin}/>}/>}
      <div style={{ marginTop: 8, marginBottom: 14, display: "grid", gap: 4 }}>
        <div style={{ color: MUTED, fontSize: 13 }}>{tr.invoice?.title || "Fakturiert"}: <strong style={{ color: TEXT }}>CHF {formatCHF(custInvoices.reduce((s, i) => s + toNum(i.totalAmount), 0))}</strong></div>
        <div style={{ color: MUTED, fontSize: 13 }}>{tr.invoice?.paid || "Bezahlt"}: <strong style={{ color: TEXT }}>CHF {formatCHF(custInvoices.filter(i => i.status === "bezahlt").reduce((s, i) => s + toNum(i.totalAmount), 0))}</strong></div>
      </div>
      <button type="button" onClick={onBack} style={gBtn}>
{tr.common.back}
      </button>
  {mahnungInv && (
    <div style={{ position:"fixed", inset:0, zIndex:500, background:"rgba(0,0,0,0.85)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#1a1a1a", border:"1px solid #e05c5c", borderRadius:14, padding:24, maxWidth:440, width:"100%" }}>
        <div style={{ color:"#e05c5c", fontWeight:700, fontSize:18, marginBottom:4 }}>⚠️ {language==="FR"?"Créer rappel":language==="IT"?"Crea sollecito":language==="EN"?"Create reminder":"Mahnung erstellen"}</div>
        <div style={{ color:MUTED, fontSize:13, marginBottom:16 }}>{mahnungInv.invoiceNr} — {mahnungInv.customer} — {(mahnungInv.mahnung_count||0)+1}. {language==="FR"?"Rappel":language==="IT"?"Sollecito":language==="EN"?"Reminder":"Mahnung"}</div>
        <div style={{ display:"grid", gap:10 }}>
          <div><div style={{ fontSize:12, color:MUTED, marginBottom:2 }}>{language==="FR"?"Frais de rappel CHF":language==="IT"?"Spese sollecito CHF":language==="EN"?"Reminder fee CHF":"Mahngebühr CHF"}</div><input type="number" value={mahnungFee} onChange={e => setMahnungFee(e.target.value)} style={{ ...iStyle, width:"100%" }} placeholder="30" /></div>
          <div><div style={{ fontSize:12, color:MUTED, marginBottom:2 }}>{language==="FR"?"Délai (jours)":language==="IT"?"Termine (giorni)":language==="EN"?"Deadline (days)":"Zahlungsfrist (Tage)"}</div><input type="number" value={mahnungDays} onChange={e => setMahnungDays(e.target.value)} style={{ ...iStyle, width:"100%" }} placeholder="10" /></div>
          <div><div style={{ fontSize:12, color:MUTED, marginBottom:2 }}>{language==="FR"?"Note":language==="IT"?"Nota":language==="EN"?"Note":"Notiz"}</div><textarea value={mahnungNotes} onChange={e => setMahnungNotes(e.target.value)} rows={3} style={{ ...iStyle, width:"100%", minHeight:70, padding:10 }} /></div>
          <div style={{ display:"flex", gap:8 }}>
            <button type="button" onClick={() => { setMahnungInv(null); setMahnungFee("30"); setMahnungNotes(""); setMahnungDays("10"); }} style={{ ...gBtn, flex:1 }}>{language==="FR"?"Annuler":language==="IT"?"Annulla":language==="EN"?"Cancel":"Abbrechen"}</button>
            <button type="button" onClick={() => { if(onMahnungExternal) onMahnungExternal(mahnungInv, Number(mahnungFee)||0, mahnungNotes, Number(mahnungDays)||10); setMahnungInv(null); setMahnungFee("30"); setMahnungNotes(""); setMahnungDays("10"); }} style={{ ...gBtn, flex:2, color:"#e05c5c", borderColor:"#e05c5c", fontWeight:700 }}>{language==="FR"?"Créer rappel":language==="IT"?"Crea sollecito":language==="EN"?"Create reminder":"Mahnung erstellen"}</button>
          </div>
        </div>
      </div>
    </div>
  )}
    </SectionCard>
  );
}
const CUST_PAGE_SIZE = 20;
