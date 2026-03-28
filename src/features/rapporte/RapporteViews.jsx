import { GOLD, BORDER, MUTED, TEXT, pBtn, gBtn, dBtn } from "../../lib/constants.js";
import { parseReport, formatReportCardSummary, formatDateCH, toNum } from "../../lib/utils.js";
import { SectionCard } from "../../components/UI.jsx";

// ─── Offene Rapporte Liste ─────────────────────────────────────────────────
export function RapporteListe({ reports, archivedReports, invoices = [], onOpen, onEdit, onPDF, onDelete }) {
  return (
    <SectionCard>
      <h2 style={{ marginTop: 0 }}>Offene Rapporte</h2>
      {archivedReports.length > 0 && (
        <div style={{ marginBottom: 10, padding: "8px 12px", background: "rgba(212,168,83,0.08)", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: MUTED }}>
          📁 {archivedReports.length} archivierte/gesendete Rapporte sind beim jeweiligen Kunden sichtbar.
        </div>
      )}
      {reports.length === 0 && <p style={{ color: MUTED }}>Noch keine Rapporte.</p>}
      <div style={{ display: "grid", gap: 8 }}>
        {reports.map((r) => {
          const pr = parseReport(r);
          const hasInvoice = invoices.some((inv) => inv.reportData?.rapportNr === pr.rapportNr);
          const nr = pr.rapportNr != null && String(pr.rapportNr).trim() !== "" ? String(pr.rapportNr).trim() : "—";
          const project = pr.projectName && String(pr.projectName).trim() ? String(pr.projectName).trim() : "—";
          const customer = r.customer && String(r.customer).trim() ? String(r.customer).trim() : "—";
          const date = formatDateCH(r.date);
          const total = toNum(pr.totals?.total).toFixed(2);
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
              <span style={{ color: GOLD, fontWeight: 700, fontSize: 13 }}>{r.status}</span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={() => onOpen(r)} style={{ ...pBtn, minHeight: 34 }}>
                Öffnen
              </button>
              <button type="button" onClick={() => onEdit(r)} style={{ ...gBtn, minHeight: 34 }}>
                ✏️
              </button>
              <button type="button" onClick={() => onPDF(r)} style={{ ...gBtn, minHeight: 34 }}>
                PDF
              </button>
              <button type="button" onClick={() => onDelete(r)} style={dBtn}>
                Löschen
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
export function RapportDetail({ report, onBack, onEdit, onPDF, onEmail, onInvoice, onStatusChange }) {
  const p = parseReport(report);
  const { totals: tot = {}, photos = {}, signature: sig = {} } = p;

  return (
    <SectionCard>
      <h2 style={{ marginTop: 0 }}>Rapport Details</h2>
      <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.5, marginTop: 0, marginBottom: 12 }}>{formatReportCardSummary(report)}</p>
      <div style={{ display: "grid", gap: 5, marginBottom: 12 }}>
        <div>
          <b>Auftrag-Nr:</b> {p.orderNo || "-"}
        </div>
        <div>
          <b>Status:</b> <span style={{ color: GOLD }}>{report.status}</span>
        </div>
      </div>

      {/* Status ändern */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ color: MUTED, fontSize: 12, marginBottom: 8 }}>Status ändern:</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["offen", "bearbeitet", "gesendet", "archiviert"].map((s) => (
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
              {s === "gesendet" ? "📤 gesendet" : s === "archiviert" ? "📁 archiviert" : s}
            </button>
          ))}
        </div>
        {(report.status === "gesendet" || report.status === "archiviert") && (
          <div style={{ fontSize: 12, color: GOLD, marginTop: 6 }}>✅ Wird zum Kunden verschoben</div>
        )}
      </div>

      {/* Fotos */}
      {(photos.before || photos.after) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          {["before", "after"].map((k) => (
            <div key={k}>
              <div style={{ color: MUTED, fontSize: 12 }}>{k === "before" ? "Vorher" : "Nachher"}</div>
              {photos[k] ? (
                <img src={photos[k]} alt={k === "before" ? "Vorher" : "Nachher"} style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 8 }} />
              ) : (
                <span style={{ color: MUTED }}>Kein Foto</span>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <div>
          <b>MwSt 8.1%:</b> CHF {Number(tot.vat || 0).toFixed(2)}
        </div>
        <div style={{ color: GOLD, fontWeight: 800, fontSize: 22 }}>Total CHF {Number(tot.total || 0).toFixed(2)}</div>
      </div>
      {sig.image && <img src={sig.image} alt="Unterschrift" style={{ width: 280, border: `1px solid ${BORDER}`, borderRadius: 8, marginBottom: 12 }} />}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={onBack} style={gBtn}>
          Zurück
        </button>
        <button type="button" onClick={() => onEdit(report)} style={pBtn}>
          ✏️ Bearbeiten
        </button>
        <button type="button" onClick={() => onPDF(report)} style={pBtn}>
          🖨 PDF / Drucken
        </button>
        <button type="button" onClick={() => onEmail(report)} style={{ ...pBtn, background: "transparent", border: `1px solid ${GOLD}`, color: GOLD }}>
          📧 Per E-Mail senden
        </button>
        <button type="button" onClick={() => onInvoice(report)} style={{ ...pBtn, background: "#1a472a", border: `1px solid #2d7a45`, color: "#7ddb9a" }}>
          🧾 Rechnung erstellen
        </button>
      </div>
    </SectionCard>
  );
}

function invoiceTrashSummary(inv) {
  const projectName = (inv.reportData?.projectName && String(inv.reportData.projectName).trim()) || "—";
  return `${inv.invoiceNr} · ${projectName} · ${inv.customer || "—"} · ${formatDateCH(inv.date)} · CHF ${Number(inv.totalAmount).toFixed(2)}`;
}

// ─── Papierkorb ────────────────────────────────────────────────────────────
export function Papierkorb({ trashReports = [], trashInvoices = [], onRestore, onHardDelete, onRestoreInvoice, onHardDeleteInvoice }) {
  const empty = trashReports.length === 0 && trashInvoices.length === 0;
  return (
    <SectionCard>
      <h2 style={{ marginTop: 0 }}>Papierkorb</h2>
      {empty && <p style={{ color: MUTED }}>Papierkorb ist leer.</p>}
      {trashReports.length > 0 && (
        <>
          <h3 style={{ color: MUTED, fontSize: 14, marginBottom: 10 }}>Rapporte</h3>
          {trashReports.map((r) => (
            <div key={r.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
              <div style={{ color: TEXT, fontSize: 13, lineHeight: 1.45, marginBottom: 8 }}>{formatReportCardSummary(r)}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={() => onRestore(r)} style={pBtn}>
                  Wiederherstellen
                </button>
                <button type="button" onClick={() => onHardDelete(r)} style={dBtn}>
                  Endgültig löschen
                </button>
              </div>
            </div>
          ))}
        </>
      )}
      {trashInvoices.length > 0 && (
        <>
          <h3 style={{ color: MUTED, fontSize: 14, marginBottom: 10, marginTop: trashReports.length ? 16 : 0 }}>Rechnungen</h3>
          {trashInvoices.map((inv) => (
            <div key={inv.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
              <div style={{ color: TEXT, fontSize: 13, lineHeight: 1.45, marginBottom: 8 }}>{invoiceTrashSummary(inv)}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={() => onRestoreInvoice(inv)} style={pBtn}>
                  Wiederherstellen
                </button>
                <button type="button" onClick={() => onHardDeleteInvoice(inv.id)} style={dBtn}>
                  Endgültig löschen
                </button>
              </div>
            </div>
          ))}
        </>
      )}
    </SectionCard>
  );
}
