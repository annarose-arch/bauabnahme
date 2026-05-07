import { useState } from "react";
import { useTranslation } from "../../lib/translations.js";
import { GOLD, BORDER, MUTED, TEXT, iStyle, pBtn, gBtn } from "../../lib/constants.js";
import { toNum, formatCHF, formatDateCH } from "../../lib/utils.js";

const statusColor = s => s==="angenommen" ? "#2d7a45" : s==="abgelehnt" ? "#e05c5c" : s==="gesendet" ? GOLD : s==="offen" ? GOLD : MUTED;

export function OffertenListe({ offerten = [], language = "DE", onNew, onOpen, onEdit, onPDF, onDelete, goTo }) {
  const tr = useTranslation(language);
  const [search, setSearch] = useState("");

  const filtered = offerten.filter(o => {
    const isAktiv = o.status !== "angenommen" && o.status !== "abgelehnt" && o.status !== "geloescht";
    if (!isAktiv) return false;
    return o.customer?.toLowerCase().includes(search.toLowerCase()) ||
      String(o.offerte_nr || "").includes(search);
  });
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(0);
  const pages = Math.ceil(filtered.length / PAGE_SIZE);
  const pagedFiltered = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div style={{ padding: "0 0 80px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><button type="button" onClick={() => goTo("home")} style={{ background:"transparent", color:GOLD, border:"1px solid "+GOLD, borderRadius:8, padding:"8px 14px", fontWeight:600, fontSize:14, cursor:"pointer" }}>{tr.common.back}</button><div style={{ color:GOLD, fontWeight:700, fontSize:18, textAlign:"center", flex:1 }}>{tr.nav?.offerten || "Offerten"}</div><button type="button" onClick={onNew} style={pBtn}>{tr.offerte?.new || "Neue Offerte"}</button></div>
      <input placeholder={tr.common?.search || "Suchen..."} value={search}
        onChange={e => setSearch(e.target.value)} style={{ ...iStyle, width: "100%", marginBottom: 12 }}
        list="offerte-search-list" autoComplete="off" />
      <datalist id="offerte-search-list">
        {[...new Set(offerten.map(o => o.customer).filter(Boolean))].map((name, i) => (
          <option key={i} value={name} />
        ))}
      </datalist>
      {filtered.length === 0 && (
        <div style={{ color: MUTED, textAlign: "center", padding: 40, fontSize: 14 }}>—</div>
      )}
      {pagedFiltered.map(o => {
        const project = o.description?.projectName && String(o.description.projectName).trim() ? String(o.description.projectName).trim() : "-";
        const customer = o.customer && String(o.customer).trim() ? String(o.customer).trim() : "-";
        const date = formatDateCH(o.date);
        const total = formatCHF(toNum(o.total));
        const statusLabel = o.status==="offen" ? (tr.offerte?.open||"Offen") : o.status==="gesendet" ? (tr.offerte?.sent||"Gesendet") : o.status==="angenommen" ? (tr.offerte?.accepted||"Angenommen") : o.status==="abgelehnt" ? (tr.offerte?.rejected||"Abgelehnt") : o.status;
        return (
          <div key={o.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,168,83,0.2)", borderRadius: 10, padding: "12px 14px", display: "grid", gap: 8, marginBottom: 8 }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ color: TEXT, fontSize: 13, lineHeight: 1.45, flex: "1 1 200px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
                <span style={{ fontWeight: 600 }}>OF-{o.offerte_nr}</span>
                <span>{" · " + project + " · " + customer + " · " + date + " · CHF " + total}</span>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button type="button" onClick={() => onOpen(o)} style={{ color: o.status==="offen" ? GOLD : statusColor(o.status), fontWeight: 700, fontSize: 13, background: "transparent", border: "1px solid " + (o.status==="offen" ? GOLD : statusColor(o.status)), borderRadius: 6, padding: "2px 10px", cursor: "pointer" }}>{statusLabel}</button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={(e) => { e.stopPropagation(); onEdit && onEdit(o); }} style={{ background: "transparent", border: "1px solid #555", borderRadius: 6, color: TEXT, padding: "2px 10px", cursor: "pointer", minHeight: 34, fontSize: 13 }}>✏️</button>
              <button type="button" onClick={(e) => { e.stopPropagation(); onPDF && onPDF(o); }} style={{ background: "transparent", border: "1px solid #555", borderRadius: 6, color: TEXT, padding: "2px 10px", cursor: "pointer", minHeight: 34, fontSize: 13 }}>PDF</button>
              <button type="button" onClick={(e) => { e.stopPropagation(); onDelete && onDelete(o); }} style={{ background: "transparent", border: "1px solid #c0392b", borderRadius: 6, color: "#c0392b", padding: "2px 10px", cursor: "pointer", minHeight: 34, fontSize: 13 }}>{tr.common?.delete||"Löschen"}</button>
            </div>
          </div>
        );
      })}
      {pages > 1 && <div style={{ display:"flex", gap:8, marginTop:16, alignItems:"center", justifyContent:"center" }}><button type="button" onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0} style={{ ...gBtn, minHeight:32, opacity:page===0?0.4:1 }}>{ language==="FR"?"Précédent":language==="IT"?"Precedente":language==="EN"?"Previous":"← Zurück" }</button><span style={{ color:MUTED, fontSize:13 }}>{ language==="FR"?"Page":language==="IT"?"Pagina":language==="EN"?"Page":"Seite" } {page+1} / {pages}</span><button type="button" onClick={()=>setPage(p=>Math.min(pages-1,p+1))} disabled={page>=pages-1} style={{ ...gBtn, minHeight:32, opacity:page>=pages-1?0.4:1 }}>{ language==="FR"?"Suivant":language==="IT"?"Avanti":language==="EN"?"Next":"Weiter →" }</button></div>}
    </div>
  );
}
