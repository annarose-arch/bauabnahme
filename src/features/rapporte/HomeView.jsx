import { useState } from "react";
import { GOLD, BORDER, MUTED, TEXT, iStyle, gBtn } from "../../lib/constants.js";
import { SectionCard } from "../../components/UI.jsx";
import { parseReport, toNum, formatDateCH } from "../../lib/utils.js";

export function HomeView({ customers = [], reports = [], invoices = [], onSelectCustomer, goTo }) {
  const [search, setSearch] = useState("");
  const open = reports.filter(r => r.status === "offen");
  const pending = invoices.filter(i => i.status === "entwurf" || i.status === "versendet");
  const total = pending.reduce((s, i) => s + toNum(i.totalAmount), 0);
  return (
    <div style={{ padding: "0 0 40px" }}>
      <h2 style={{ color: GOLD, marginTop: 0 }}>BauAbnahme</h2>
      <SectionCard>
        <input placeholder="Suchen..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...iStyle, width: "100%" }} />
      </SectionCard>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "12px 0" }}>
        <SectionCard>
          <div style={{ color: MUTED, fontSize: 12 }}>Offene Rapporte</div>
          <div style={{ color: GOLD, fontWeight: 800, fontSize: 32, margin: "8px 0" }}>{open.length}</div>
          <button type="button" onClick={() => goTo("reports")} style={gBtn}>Anzeigen</button>
        </SectionCard>
        <SectionCard>
          <div style={{ color: MUTED, fontSize: 12 }}>Ausstehende Rechnungen</div>
          <div style={{ color: GOLD, fontWeight: 800, fontSize: 20, margin: "4px 0" }}>CHF {total.toFixed(2)}</div>
          <button type="button" onClick={() => goTo("invoices")} style={gBtn}>Anzeigen</button>
        </SectionCard>
      </div>
    </div>
  );
}
