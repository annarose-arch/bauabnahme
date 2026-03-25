import { COLORS, primaryBtn } from "../../lib/constants.js";
import { parseReport, toNumber } from "../../lib/utils.js";
import { openPdfEmailWindow } from "../../lib/pdfBuilder.js";
import { Panel } from "../../components/UI.jsx";

export default function RechnungenView({ reports, userEmail, setOpenedReport, setView }) {
  const lines = reports.map((r) => {
    const p = parseReport(r);
    const total = toNumber(p?.totals?.total);
    return { report: r, total, p };
  }).filter((x) => x.total > 0);

  return (
    <Panel>
      <h2 style={{ marginTop: 0 }}>Rechnungen</h2>
      <p style={{ color: COLORS.muted, marginTop: 0 }}>
        Übersicht aus Rapport-Totalbeträgen. Öffnen Sie einen Rapport für Details oder PDF.
      </p>
      <div style={{ display: "grid", gap: 8 }}>
        {lines.length === 0 ? (
          <div style={{ color: COLORS.muted }}>Keine Beträge aus Rapporten vorhanden.</div>
        ) : (
          lines.map(({ report: r, total, p }) => (
            <div
              key={r.id}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(212,168,83,0.2)",
                borderRadius: 10,
                padding: "12px 14px",
                display: "grid",
                gap: 8
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <strong>{r.customer || "-"}</strong>
                <span style={{ color: COLORS.gold, fontWeight: 800 }}>CHF {total.toFixed(2)}</span>
              </div>
              <div style={{ color: COLORS.muted }}>Datum: {r.date || "-"} · Auftrag: {p.orderNo || "-"} · Projekt: {p.projektnummer || "-"}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  style={{ ...primaryBtn, minHeight: 34 }}
                  onClick={() => {
                    setOpenedReport(r);
                    setView("reports");
                  }}
                >
                  Rapport öffnen
                </button>
                <button
                  type="button"
                  onClick={() => openPdfEmailWindow(r, userEmail)}
                  style={{ minHeight: 34, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.text, padding: "0 12px", cursor: "pointer" }}
                >
                  PDF E-Mail
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}
