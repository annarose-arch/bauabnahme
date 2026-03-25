import { COLORS, primaryBtn } from "../../lib/constants.js";
import { Panel } from "../../components/UI.jsx";

export default function TrashView({ loading, trashReports, handleRestore, handleHardDelete }) {
  return (
    <Panel>
      <h2 style={{ marginTop: 0 }}>Papierkorb</h2>
      {loading ? <p style={{ color: COLORS.muted }}>Lade Papierkorb...</p> : (
        <div style={{ display: "grid", gap: 8 }}>
          {trashReports.map((r) => (
            <div key={r.id} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,168,83,0.2)", borderRadius: 10, padding: "12px 14px", display: "grid", gap: 8 }}>
              <strong>{r.customer || "-"}</strong>
              <div style={{ color: COLORS.muted }}>{r.date || "-"}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => handleRestore(r)} style={{ ...primaryBtn, minHeight: 34 }}>Wiederherstellen</button>
                <button type="button" onClick={() => handleHardDelete(r)} style={{ minHeight: 34, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.text, padding: "0 12px", cursor: "pointer" }}>Endgültig löschen</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
