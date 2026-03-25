import { COLORS } from "../../lib/constants.js";
import { Panel } from "../../components/UI.jsx";

export default function HomeView({ userEmail, reports, openReports, customers }) {
  return (
    <Panel>
      <h2 style={{ marginTop: 0 }}>Start</h2>
      <p style={{ color: COLORS.muted }}>Willkommen {userEmail || "-"}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
        <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 12 }}>
          <div style={{ color: COLORS.muted, fontSize: 13 }}>Rapporte gesamt</div>
          <strong style={{ fontSize: 24 }}>{reports.length}</strong>
        </div>
        <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 12 }}>
          <div style={{ color: COLORS.muted, fontSize: 13 }}>Offene Rapporte</div>
          <strong style={{ fontSize: 24 }}>{openReports}</strong>
        </div>
        <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 12 }}>
          <div style={{ color: COLORS.muted, fontSize: 13 }}>Kunden</div>
          <strong style={{ fontSize: 24 }}>{customers.length}</strong>
        </div>
      </div>
    </Panel>
  );
}
