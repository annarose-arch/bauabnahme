import { useState } from "react";
import { useTranslation } from "../../lib/translations.js";
import { GOLD, BORDER, MUTED, TEXT, pBtn, gBtn, dBtn, iStyle } from "../../lib/constants.js";
import { parseReport, formatCHF, formatReportCardSummary, formatDateCH, toNum } from "../../lib/utils.js";
import { SectionCard } from "../../components/UI.jsx";

// ─── Offene Rapporte Liste ─────────────────────────────────────────────────
const PAGE_SIZE = 20;
function Pagination({ total, page, setPage, language = "DE" }) {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) return null;
  return (<div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 16 }}><button onClick={() => setPage(p => Math.max(0, p-1))} disabled={page === 0} style={{ ...gBtn, minWidth: 80 }}>{ language==="FR" ? "Précédent" : language==="IT" ? "Precedente" : language==="EN" ? "Previous" : "← Zurück" }</button><span style={{ color: MUTED, fontSize: 13 }}>{ language==="FR" ? "Page" : language==="IT" ? "Pagina" : language==="EN" ? "Page" : "Seite" } {page+1} / {pages}</span><button onClick={() => setPage(p => Math.min(pages-1, p+1))} disabled={page >= pages-1} style={{ ...gBtn, minWidth: 80 }}>{ language==="FR" ? "Suivant" : language==="IT" ? "Avanti" : language==="EN" ? "Next" : "Weiter →" }</button></div>);
}
export function RapporteListe({ reports, archivedReports, invoices = [], onOpen, onEdit, onPDF, onDelete, language = "DE", goTo, customers = [] }) {
  const tr = useTranslation(language);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const filtered = search.trim() ? reports.filter(r => { const rp = parseReport(r); return r.customer?.toLowerCase().includes(search.toLowerCase()) || String(rp.rapportNr||"").includes(search) || (rp.projectName||"").toLowerCase().includes(search.toLowerCase()); }) : reports;
  const pagedReports = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  return (
    <SectionCard>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}><button type="button" onClick={() => goTo("home")} style={{ background:"transparent", color:GOLD, border:"1px solid "+GOLD, borderRadius:8, padding:"8px 14px", fontWeight:600, fontSize:14, cursor:"pointer" }}>{tr.common.back}</button><div style={{ color:GOLD, fontWeight:700, fontSize:18 }}>{tr.nav.reports}</div><button type="button" onClick={() => goTo("new-report")} style={{ background:"#d4a853", color:"#111", border:"none", borderRadius:8, padding:"8px 14px", fontWeight:700, fontSize:14, cursor:"pointer" }}>{tr.nav.newReport}</button></div>

      <input list="rapport-search-list" placeholder={language==="FR"?"Rechercher...":language==="IT"?"Cerca...":language==="EN"?"Search...":"Suchen..."} value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} style={{ ...iStyle, width:"100%", marginBottom:8 }} />
      <datalist id="rapport-search-list">
        {customers.map((c,i) => <option key={i} value={c.name} />)}
      </datalist>
      {filtered.length === 0 && <p style={{ color: MUTED }}>{language==="FR"?"Aucun résultat":language==="IT"?"Nessun risultato":language==="EN"?"No results":"Keine Treffer"}.</p>}
      <div style={{ display: "grid", gap: 8 }}>
        {pagedReports.map((r) => {
          const pr = parseReport(r);
          const hasInvoice = invoices.some((inv) => inv.reportData?.rapportNr === pr.rapportNr);
          const nr = pr.rapportNr != null && String(pr.rapportNr).trim() !== "" ? String(pr.rapportNr).trim() : "—";
          const project = pr.projectName && String(pr.projectName).trim() ? String(pr.projectName).trim() : "—";
          const customer = r.customer && String(r.customer).trim() ? String(r.customer).trim() : "—";
          const date = formatDateCH(r.date);
          const total = formatCHF(toNum(pr.totals?.total));
          return (
          <div key={r.id} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid rgba(212,168,83,0.2)`, borderRadius: 10, padding: "12px 14px", display: "grid", gap: 8 }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ color: TEXT, fontSize: 13, lineHeight: 1.45, flex: "1 1 200px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
                <span style={{ fontWeight: 600 }}>Nr.{nr}</span>
                {hasInvoice && (
                  <span
                    title="Rechnung erstellt"
                    style={{
                      fontSize: 12,
                      lineHeight: 1,
                      padding: "2px 5px",
                      borderRadius: 4,
                      border: `1px solid ${GOLD}`,
                      color: GOLD,
                      background: "rgba(212,168,83,0.12)",
                    }}
                  >
                    🧾
                  </span>
                )}
                <span>{` · ${project} · ${customer} · ${date} · CHF ${total}`}</span>
              </div>
              <button type="button" onClick={() => onOpen(r)} style={{ color: GOLD, fontWeight: 700, fontSize: 13, background: "transparent", border: `1px solid ${GOLD}`, borderRadius: 6, padding: "2px 10px", cursor: "pointer" }}>{r.status === "offen" ? tr.report.status : r.status === "gesendet" ? tr.report.statusSent : r.status === "archiviert" ? tr.report.statusArchived : r.status}</button>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={() => onEdit(r)} style={{ ...gBtn, minHeight: 34 }}>
                ✏️
              </button>
              <button type="button" onClick={() => onPDF(r)} style={{ ...gBtn, minHeight: 34 }}>
                PDF
              </button>
              <button type="button" onClick={() => onDelete(r)} style={dBtn}>
                {tr.common.delete}
              </button>
            </div>
          </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ─── Rapport Detail ────────────────────────────────────────────────────────
export function RapportDetail({ report, onBack, onEdit, onPDF, onEmail, onInvoice, onStatusChange, language = "DE" }) {
  const p = parseReport(report);
  const tr = useTranslation(language);
  const { totals: tot = {}, photos = {}, signature: sig = {} } = p;

  return (
    <SectionCard>
      <h2 style={{ marginTop: 0 }}>{tr.nav.reports} Details</h2>
      <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.5, marginTop: 0, marginBottom: 12 }}>{formatReportCardSummary(report)}</p>
      <div style={{ display: "grid", gap: 5, marginBottom: 12 }}>
        <div>
          <b>{tr.report.orderNo}:</b> {p.orderNo || "-"}
        </div>
        <div>
          <b>Status:</b> <span style={{ color: GOLD }}>{report.status === "offen" ? tr.report.status : report.status === "gesendet" ? tr.report.statusSent : report.status === "archiviert" ? tr.report.statusArchived : report.status === "bearbeitet" ? tr.report.statusEdited : report.status}</span>
        </div>
      </div>

      {/* Status ändern */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ color: MUTED, fontSize: 12, marginBottom: 8 }}>{tr.report.status} ändern:</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["bearbeitet", "gesendet", "archiviert"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onStatusChange(report.id, s)}
              style={{
                minHeight: 34,
                borderRadius: 8,
                padding: "0 14px",
                fontSize: 13,
                cursor: "pointer",
                fontWeight: report.status === s ? 700 : 400,
                background: report.status === s ? GOLD : "transparent",
                color: report.status === s ? "#111" : s === "gesendet" || s === "archiviert" ? GOLD : TEXT,
                border: report.status === s ? "none" : `1px solid ${s === "gesendet" || s === "archiviert" ? GOLD : BORDER}`,
              }}
            >
              {s === "gesendet" ? "📤 " + tr.report.statusSent : s === "archiviert" ? "📁 " + tr.report.statusArchived : s === "offen" ? tr.report.status : s === "bearbeitet" ? tr.report.statusEdited : s}
            </button>
          ))}
        </div>
        {(report.status === "gesendet" || report.status === "archiviert") && (
          <div style={{ fontSize: 12, color: GOLD, marginTop: 6 }}>{"✅ " + tr.report.saved}</div>
        )}
      </div>

      {/* Fotos */}
      {(photos.before || photos.after) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          {["before", "after"].map((k) => (
            <div key={k}>
              <div style={{ color: MUTED, fontSize: 12 }}>{k === "before" ? tr.pdf.before : tr.pdf.after}</div>
              {photos[k] ? (
                <img src={photos[k]} alt={k === "before" ? tr.pdf.before : tr.pdf.after} style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 8 }} />
              ) : (
                <span style={{ color: MUTED }}>Kein Foto</span>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <div>
          <b>{tr.pdf.vat}:</b> CHF {formatCHF(tot.vat || 0)}
        </div>
        <div style={{ color: GOLD, fontWeight: 800, fontSize: 22 }}>Total CHF {formatCHF(tot.total || 0)}</div>
      </div>
      {sig.image && <img src={sig.image} alt="Unterschrift" style={{ width: 280, border: `1px solid ${BORDER}`, borderRadius: 8, marginBottom: 12 }} />}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={onBack} style={gBtn}>{tr.common.back}</button>
        <button type="button" onClick={() => onPDF(report)} style={pBtn}>🖨 {tr.invoice.pdf}</button>
      </div>
    </SectionCard>
  );
}

function invoiceTrashSummary(inv) {
  const projectName = (inv.reportData?.projectName && String(inv.reportData.projectName).trim()) || "—";
  return `${inv.invoiceNr} · ${projectName} · ${inv.customer || "—"} · ${formatDateCH(inv.date)} · CHF ${formatCHF(inv.totalAmount)}`;
}

// ─── Papierkorb ────────────────────────────────────────────────────────────
export function Papierkorb({ language = "DE", trashReports = [], trashInvoices = [], trashCustomers = [], trashOfferten = [], onRestore, onHardDelete, onRestoreInvoice, onHardDeleteInvoice, onRestoreCustomer, onHardDeleteCustomer, onRestoreOfferte, onHardDeleteOfferte, isAdmin = true }) {
  const tr = useTranslation(language);
  const confirmDelete = language==="FR"?"Vraiment supprimer?":language==="IT"?"Eliminare definitivamente?":language==="EN"?"Really delete permanently?":"Wirklich endgültig löschen?";
  const empty = trashReports.length === 0 && trashInvoices.length === 0 && trashCustomers.length === 0 && trashOfferten.length === 0;
  const emptyMsg = language==="FR"?"La corbeille est vide.":language==="IT"?"Il cestino è vuoto.":language==="EN"?"Trash is empty.":"Papierkorb ist leer.";
  return (
    <SectionCard>
      <h2 style={{ marginTop: 0 }}>{tr.nav.trash || "Papierkorb"}</h2>
      <div style={{ fontSize: 12, color: MUTED, marginBottom: 12 }}>⏱ {tr.nav?.trashAutoDelete || "Elemente werden nach 30 Tagen automatisch gelöscht."}</div>
      {empty && <p style={{ color: MUTED }}>{emptyMsg}</p>}

      {trashOfferten.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ color: GOLD, marginBottom: 10 }}>{tr.nav?.offerten || "Offerten"}</h3>
          {trashOfferten.map(o => (
            <div key={o.id} style={{ border: "1px solid " + BORDER, borderRadius: 10, padding: "12px 14px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div style={{ color: TEXT, fontSize: 13, lineHeight: 1.45 }}>OF-{o.offerte_nr} — {o.customer} — {o.date}</div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button type="button" onClick={() => onRestoreOfferte && onRestoreOfferte(o)} style={pBtn}>{tr.common.restore}</button>
                <button type="button" onClick={() => { if(!isAdmin){ alert("⛔ "+(language==="FR"?"Réservé à l admin":language==="IT"?"Solo amministratore":language==="EN"?"Admin only":"Nur Admin")); return; } if(window.confirm(confirmDelete)) onHardDeleteOfferte && onHardDeleteOfferte(o); }} style={dBtn}>{tr.common.delete}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {trashReports.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ color: GOLD, marginBottom: 10 }}>{tr.nav.reports}</h3>
          {trashReports.map((r) => (
            <div key={r.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div style={{ color: TEXT, fontSize: 13, lineHeight: 1.45 }}>{formatReportCardSummary(r)}</div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button type="button" onClick={() => onRestore(r)} style={pBtn}>{tr.common.restore}</button>
                <button type="button" onClick={() => { if(!isAdmin){ alert("⛔ "+(language==="FR"?"Réservé à l admin":language==="IT"?"Solo amministratore":language==="EN"?"Admin only":"Nur Admin")); return; } if(window.confirm(confirmDelete)) onHardDelete(r); }} style={dBtn}>{tr.common.delete}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {trashInvoices.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ color: GOLD, marginBottom: 10 }}>{tr.nav.invoices}</h3>
          {trashInvoices.map((inv) => (
            <div key={inv.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div style={{ color: TEXT, fontSize: 13, lineHeight: 1.45 }}>{invoiceTrashSummary(inv)}</div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button type="button" onClick={() => onRestoreInvoice(inv)} style={pBtn}>{tr.common.restore}</button>
                <button type="button" onClick={() => { if(window.confirm(confirmDelete)) onHardDeleteInvoice(inv.id); }} style={dBtn}>{tr.common.delete}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {trashCustomers.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ color: GOLD, marginBottom: 10 }}>{tr.nav.customers}</h3>
          {trashCustomers.map(cu => (
            <div key={cu.id} style={{ border: "1px solid " + BORDER, borderRadius: 8, padding: "10px 14px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: TEXT }}>{cu.name}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => onRestoreCustomer && onRestoreCustomer(cu)} style={pBtn}>{tr.common.restore}</button>
                <button type="button" onClick={() => { if(window.confirm(confirmDelete)) onHardDeleteCustomer && onHardDeleteCustomer(cu); }} style={dBtn}>{tr.common.delete}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
