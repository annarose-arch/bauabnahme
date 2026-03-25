import { useState } from "react";
import { COLORS, inputStyle, primaryBtn } from "../../lib/constants.js";
import { parseCustomerMeta, parseReport, toNumber } from "../../lib/utils.js";
import { Panel } from "../../components/UI.jsx";

export default function CustomerDetailView({
  selectedCustomerDetail,
  setSelectedCustomerDetail,
  projects,
  reports,
  handleAddProject
}) {
  const meta = parseCustomerMeta(selectedCustomerDetail);
  const linked = reports.filter((r) => (r.customer || "") === (selectedCustomerDetail?.name || ""));
  const revenue = linked.reduce((sum, r) => sum + toNumber(parseReport(r)?.totals?.total), 0);
  const [projName, setProjName] = useState("");
  const [projNo, setProjNo] = useState("");

  const customerProjects = projects.filter((p) => String(p.customer_id) === String(selectedCustomerDetail.id));

  return (
    <Panel>
      <h2 style={{ marginTop: 0 }}>{selectedCustomerDetail.name}</h2>
      <div style={{ display: "grid", gap: 5, marginBottom: 12 }}>
        <div><strong>Kundennummer:</strong> {meta.kundennummer || "-"}</div>
        <div><strong>Kostenstelle:</strong> {meta.costCenter || "-"}</div>
        <div><strong>Ansprechperson:</strong> {[meta.firstName, meta.lastName].filter(Boolean).join(" ") || "-"}</div>
        <div><strong>Adresse:</strong> {meta.address || "-"}, {meta.zip || "-"} {meta.city || "-"}</div>
        <div><strong>Telefon:</strong> {selectedCustomerDetail.phone || "-"}</div>
        <div><strong>E-Mail:</strong> {selectedCustomerDetail.email || "-"}</div>
      </div>

      <h3 style={{ marginBottom: 8 }}>Projekte</h3>
      <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
        <input placeholder="Projektname" value={projName} onChange={(e) => setProjName(e.target.value)} style={inputStyle} />
        <input placeholder="Projektnummer" value={projNo} onChange={(e) => setProjNo(e.target.value)} style={inputStyle} />
        <button
          type="button"
          onClick={() => {
            handleAddProject(selectedCustomerDetail.id, projName, projNo);
            setProjName("");
            setProjNo("");
          }}
          style={primaryBtn}
        >
          Projekt hinzufügen
        </button>
      </div>

      <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
        {customerProjects.map((p) => (
          <div key={p.id} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 10px" }}>
            <strong>{p.name}</strong> · <span style={{ color: COLORS.muted }}>{p.projektnummer || "-"}</span>
          </div>
        ))}
      </div>

      <h3>Verknüpfte Rapporte</h3>
      <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
        {linked.length === 0 ? <div style={{ color: COLORS.muted }}>Keine Rapporte.</div> : linked.map((r) => (
          <div key={r.id} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 10px", display: "flex", justifyContent: "space-between" }}>
            <span>R-{r.id} · {r.date || "-"}</span>
            <span>CHF {toNumber(parseReport(r)?.totals?.total).toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div style={{ color: COLORS.gold, fontWeight: 800, fontSize: 22 }}>Gesamtumsatz CHF {revenue.toFixed(2)}</div>
      <div style={{ marginTop: 10 }}>
        <button type="button" onClick={() => setSelectedCustomerDetail(null)} style={{ ...primaryBtn, background: "#2a2a2a", color: COLORS.text }}>Zurück</button>
      </div>
    </Panel>
  );
}
