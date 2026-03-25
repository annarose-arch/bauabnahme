import { COLORS, STATUS_OPTIONS, inputStyle, primaryBtn } from "../../lib/constants.js";
import { parseReport } from "../../lib/utils.js";
import { openPdfEmailWindow } from "../../lib/pdfBuilder.js";
import { Panel } from "../../components/UI.jsx";

export default function ReportsListView({
  loading,
  reports,
  setOpenedReport,
  handleMoveToTrash,
  handleUpdateReportStatus,
  userEmail,
  renderStatus
}) {
  return (
    <Panel>
      <h2 style={{ marginTop: 0 }}>Alle Rapporte</h2>
      {loading ? <p style={{ color: COLORS.muted }}>Lade Rapporte...</p> : (
        <div style={{ display: "grid", gap: 8 }}>
          {reports.map((r) => {
            const p = parseReport(r);
            return (
              <div key={r.id} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,168,83,0.2)", borderRadius: 10, padding: "12px 14px", display: "grid", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <strong>{r.customer || "-"}</strong>
                  {renderStatus((r.status || "").toLowerCase())}
                </div>
                <div style={{ color: COLORS.muted }}>Datum: {r.date || "-"}</div>
                <div style={{ color: COLORS.muted }}>Auftrag-Nr: {p.orderNo || "-"}</div>
                <div style={{ color: COLORS.muted }}>Projektnummer: {p.projektnummer || "-"}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" onClick={() => setOpenedReport(r)} style={{ ...primaryBtn, minHeight: 34 }}>Öffnen</button>
                  <button type="button" onClick={() => handleMoveToTrash(r)} style={{ minHeight: 34, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.text, padding: "0 12px", cursor: "pointer" }}>Löschen</button>
                  <button type="button" onClick={() => openPdfEmailWindow(r, userEmail)} style={{ minHeight: 34, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.text, padding: "0 12px", cursor: "pointer" }}>PDF E-Mail</button>
                  <select value={r.status || "offen"} onChange={(e) => handleUpdateReportStatus(r.id, e.target.value)} style={{ ...inputStyle, minHeight: 34 }}>
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
