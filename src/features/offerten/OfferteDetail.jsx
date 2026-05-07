import { useTranslation } from "../../lib/translations.js";
import { GOLD, BORDER, MUTED, TEXT, pBtn, gBtn, dBtn } from "../../lib/constants.js";
import { SectionCard } from "../../components/UI.jsx";
import { formatDateCH } from "../../lib/utils.js";

export function OfferteDetail({ offerte, onBack, onEdit, onPDF, onCreateRapport, onCreateInvoice, onStatusChange, onDelete, language = "DE", isAdmin = true }) {
  const tr = useTranslation(language);
  const desc = offerte?.description || {};

  const statusColor = s => s==="angenommen" ? "#2d7a45" : s==="abgelehnt" ? "#e05c5c" : s==="gesendet" ? "#d4a853" : MUTED;
  const statuses = [
    { key: "bearbeitet", label: (tr.report?.statusEdited || "Bearbeitet") },
    { key: "gesendet", label: "📤 " + (tr.offerte?.sent || "Gesendet") },
    { key: "archiviert", label: "📁 " + (tr.offerte?.archived || "Archiviert") },
  ];

  return (
    <SectionCard>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <button type="button" onClick={onBack} style={{ ...gBtn, padding: "4px 12px" }}>← {tr.common?.back || "Zurück"}</button>
        <div style={{ color: GOLD, fontWeight: 700, fontSize: 16 }}>OF-{offerte.offerte_nr} — {offerte.customer}</div>
      </div>

      {/* Info */}
      <div style={{ display: "grid", gap: 6, marginBottom: 16, fontSize: 14 }}>
        <div><b>{tr.report?.date || "Datum"}:</b> {offerte.date}</div>
        {offerte.valid_until && <div><b>{tr.offerte?.validUntil || "Gültig bis"}:</b> {offerte.valid_until}</div>}
        {desc.projectName && <div><b>{tr.report?.projectName || "Projekt"}:</b> {desc.projectName}</div>}
        {desc.orderNo && <div><b>{tr.report?.orderNo || "Auftrag-Nr"}:</b> {desc.orderNo}</div>}
        <div><b>Status:</b> <span style={{ color: statusColor(offerte.status), fontWeight: 700 }}>{offerte.status==="offen" ? tr.offerte?.open : offerte.status==="gesendet" ? tr.offerte?.sent : offerte.status==="angenommen" ? tr.offerte?.accepted : offerte.status==="abgelehnt" ? tr.offerte?.rejected : offerte.status}</span></div>
        <div><b>Total:</b> <span style={{ color: GOLD, fontWeight: 700 }}>CHF {Number(offerte.total||0).toFixed(2)}</span></div>
      </div>

      {/* Status ändern */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: MUTED, fontSize: 12, marginBottom: 8 }}>{tr.offerte?.changeStatus || "Status ändern"}:</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {statuses.map(s => (
            <button key={s.key} type="button" onClick={() => onStatusChange(offerte.id, s.key)}
              style={{ minHeight: 34, borderRadius: 8, padding: "0 14px", fontSize: 13, cursor: "pointer",
                fontWeight: offerte.status === s.key ? 700 : 400,
                background: offerte.status === s.key ? GOLD : "transparent",
                color: offerte.status === s.key ? "#111" : TEXT,
                border: offerte.status === s.key ? "none" : "1px solid " + BORDER }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Aktionen */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <button type="button" onClick={onBack} style={gBtn}>{tr.common?.back || "Zurück"}</button>
        <button type="button" onClick={() => onPDF(offerte)} style={pBtn}>PDF</button>
      </div>
    </SectionCard>
  );
}
