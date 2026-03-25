import { COLORS, LANGUAGE_OPTIONS, inputStyle, primaryBtn } from "../../lib/constants.js";
import { Panel } from "../../components/UI.jsx";

export default function EinstellungenView({
  userEmail,
  language,
  setLanguage,
  showUpgrade,
  setShowUpgrade,
  setNotice,
  onLogout,
  onNavigate
}) {
  return (
    <Panel>
      <h2 style={{ marginTop: 0 }}>Einstellungen</h2>
      <p style={{ color: COLORS.muted }}>Benutzer: {userEmail || "-"}</p>
      <div style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 8, color: COLORS.muted }}>Sprache wählen</label>
        <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ ...inputStyle, width: 180 }}>
          {LANGUAGE_OPTIONS.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <button type="button" onClick={() => setShowUpgrade((p) => !p)} style={primaryBtn}>Konto Upgrade</button>
        <button
          type="button"
          onClick={() => {
            const ok = window.confirm("Konto pausieren?");
            if (ok) setNotice("Konto pausiert.");
          }}
          style={{ ...primaryBtn, background: "#2a2a2a", color: COLORS.text }}
        >
          Konto pausieren
        </button>
        <button
          type="button"
          onClick={() => {
            const first = window.confirm("Konto wirklich löschen?");
            if (!first) return;
            const second = window.confirm("Letzte Bestätigung: Konto endgültig löschen?");
            if (second) setNotice("Konto-Löschung angefragt.");
          }}
          style={{ minHeight: 38, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.text, padding: "0 12px", cursor: "pointer" }}
        >
          Konto löschen
        </button>
      </div>
      {showUpgrade ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
          <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 10 }}><strong>Starter</strong><div style={{ color: COLORS.muted }}>CHF 0</div></div>
          <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 10 }}><strong>Pro</strong><div style={{ color: COLORS.muted }}>CHF 29</div></div>
          <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 10 }}><strong>Team</strong><div style={{ color: COLORS.muted }}>CHF 79</div></div>
        </div>
      ) : null}
      <div style={{ marginTop: 12 }}>
        <button
          type="button"
          onClick={() => {
            if (onLogout) return onLogout();
            if (onNavigate) onNavigate("/");
          }}
          style={primaryBtn}
        >
          Logout
        </button>
      </div>
    </Panel>
  );
}
