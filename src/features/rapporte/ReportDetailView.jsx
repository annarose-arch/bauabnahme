import { COLORS, STATUS_OPTIONS, inputStyle, primaryBtn } from "../../lib/constants.js";
import { parseReport } from "../../lib/utils.js";
import { openPdfEmailWindow } from "../../lib/pdfBuilder.js";
import { Panel } from "../../components/UI.jsx";

export default function ReportDetailView({
  openedReport,
  setOpenedReport,
  handleUpdateReportStatus,
  userEmail,
  renderStatus
}) {
  const p = parseReport(openedReport);
  const work = p.workRows || [];
  const material = p.materialRows || [];
  const totals = p.totals || {};
  const costs = p.costs || {};
  const photos = p.photos || {};
  const sig = p.signature || {};

  return (
    <Panel>
      <h2 style={{ marginTop: 0 }}>Rapport Details</h2>
      <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
        <div><strong>Kunde:</strong> {openedReport.customer || p.customer || "-"}</div>
        <div><strong>Adresse:</strong> {p.address || "-"}</div>
        <div><strong>Datum:</strong> {openedReport.date || p.date || "-"}</div>
        <div><strong>Auftrag-Nr:</strong> {p.orderNo || "-"}</div>
        <div><strong>Projektnummer:</strong> {p.projektnummer || "-"}</div>
        <div><strong>Status:</strong> {renderStatus(openedReport.status)}</div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 8, color: COLORS.muted }}>Status ändern</label>
        <select
          value={openedReport.status || "offen"}
          onChange={(e) => handleUpdateReportStatus(openedReport.id, e.target.value)}
          style={{ ...inputStyle, width: 220 }}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {(photos.before || photos.after) ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>{photos.before ? <img src={photos.before} alt="Vorher" style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 8, border: `1px solid ${COLORS.border}` }} /> : "Kein Vorher Foto"}</div>
          <div>{photos.after ? <img src={photos.after} alt="Nachher" style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 8, border: `1px solid ${COLORS.border}` }} /> : "Kein Nachher Foto"}</div>
        </div>
      ) : null}

      <h3>Arbeitsstunden</h3>
      <div style={{ overflowX: "auto", marginBottom: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ border: `1px solid ${COLORS.border}`, padding: 6 }}>Mitarbeiter</th>
              <th style={{ border: `1px solid ${COLORS.border}`, padding: 6 }}>Von</th>
              <th style={{ border: `1px solid ${COLORS.border}`, padding: 6 }}>Bis</th>
              <th style={{ border: `1px solid ${COLORS.border}`, padding: 6 }}>Stunden</th>
              <th style={{ border: `1px solid ${COLORS.border}`, padding: 6 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {work.length === 0 ? (
              <tr><td colSpan={5} style={{ border: `1px solid ${COLORS.border}`, padding: 6, color: COLORS.muted }}>Keine Daten</td></tr>
            ) : work.map((row, i) => (
              <tr key={`rw-${i}`}>
                <td style={{ border: `1px solid ${COLORS.border}`, padding: 6 }}>{row.employee || "-"}</td>
                <td style={{ border: `1px solid ${COLORS.border}`, padding: 6 }}>{row.from || "-"}</td>
                <td style={{ border: `1px solid ${COLORS.border}`, padding: 6 }}>{row.to || "-"}</td>
                <td style={{ border: `1px solid ${COLORS.border}`, padding: 6 }}>{Number(row.hours || 0).toFixed(2)}</td>
                <td style={{ border: `1px solid ${COLORS.border}`, padding: 6 }}>{Number(row.total || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Material</h3>
      <div style={{ overflowX: "auto", marginBottom: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ border: `1px solid ${COLORS.border}`, padding: 6 }}>Bezeichnung</th>
              <th style={{ border: `1px solid ${COLORS.border}`, padding: 6 }}>Menge</th>
              <th style={{ border: `1px solid ${COLORS.border}`, padding: 6 }}>Einheit</th>
              <th style={{ border: `1px solid ${COLORS.border}`, padding: 6 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {material.length === 0 ? (
              <tr><td colSpan={4} style={{ border: `1px solid ${COLORS.border}`, padding: 6, color: COLORS.muted }}>Keine Daten</td></tr>
            ) : material.map((row, i) => (
              <tr key={`rm-${i}`}>
                <td style={{ border: `1px solid ${COLORS.border}`, padding: 6 }}>{row.name || "-"}</td>
                <td style={{ border: `1px solid ${COLORS.border}`, padding: 6 }}>{row.qty || "-"}</td>
                <td style={{ border: `1px solid ${COLORS.border}`, padding: 6 }}>{row.unit || "-"}</td>
                <td style={{ border: `1px solid ${COLORS.border}`, padding: 6 }}>{Number(row.total || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div><strong>Spesen:</strong> CHF {Number(costs.expenses || 0).toFixed(2)}</div>
        <div><strong>Notizen:</strong> {costs.notes || "-"}</div>
        <div><strong>MwSt 8.1%:</strong> CHF {Number(totals.vat || 0).toFixed(2)}</div>
        <div style={{ color: COLORS.gold, fontWeight: 800, fontSize: 24 }}>Total CHF {Number(totals.total || 0).toFixed(2)}</div>
      </div>

      {sig.image ? <img src={sig.image} alt="Signatur" style={{ width: 280, maxWidth: "100%", border: `1px solid ${COLORS.border}`, borderRadius: 8, marginBottom: 10 }} /> : null}

      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={() => setOpenedReport(null)} style={{ ...primaryBtn, background: "#2a2a2a", color: COLORS.text }}>Zurück</button>
        <button type="button" onClick={() => openPdfEmailWindow(openedReport, userEmail)} style={primaryBtn}>PDF E-Mail</button>
      </div>
    </Panel>
  );
}
