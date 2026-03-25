import { COLORS, STATUS_OPTIONS, inputStyle, primaryBtn } from "../../lib/constants.js";
import { calcHours, toNumber } from "../../lib/utils.js";
import { Panel } from "../../components/UI.jsx";

export default function NewReportView({
  customers,
  customerProjects,
  reportForm,
  setReportForm,
  workRows,
  setWorkRows,
  materialRows,
  setMaterialRows,
  handleCustomerSelectInReport,
  handleProjectSelectInReport,
  handleSaveReport,
  vat,
  total
}) {
  return (
    <Panel>
      <h2 style={{ marginTop: 0 }}>Neuer Rapport</h2>
      <div style={{ display: "grid", gap: 10 }}>
        <select value={reportForm.selectedCustomerId} onChange={(e) => handleCustomerSelectInReport(e.target.value)} style={inputStyle}>
          <option value="">Kunde auswählen</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select value={reportForm.selectedProjectId} onChange={(e) => handleProjectSelectInReport(e.target.value)} style={inputStyle}>
          <option value="">Projekt auswählen</option>
          {customerProjects.map((p) => (
            <option key={p.id} value={p.id}>{p.name} ({p.projektnummer || "-"})</option>
          ))}
        </select>
        <input placeholder="Kundenname" value={reportForm.customer} onChange={(e) => setReportForm((p) => ({ ...p, customer: e.target.value }))} style={inputStyle} />
        <input placeholder="Adresse" value={reportForm.address} onChange={(e) => setReportForm((p) => ({ ...p, address: e.target.value }))} style={inputStyle} />
        <input placeholder="Kunde E-Mail" value={reportForm.customerEmail} onChange={(e) => setReportForm((p) => ({ ...p, customerEmail: e.target.value }))} style={inputStyle} />
        <input placeholder="Auftrag-Nr" value={reportForm.orderNo} onChange={(e) => setReportForm((p) => ({ ...p, orderNo: e.target.value }))} style={inputStyle} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input type="date" value={reportForm.date} onChange={(e) => setReportForm((p) => ({ ...p, date: e.target.value }))} style={inputStyle} />
          <select value={reportForm.status} onChange={(e) => setReportForm((p) => ({ ...p, status: e.target.value }))} style={inputStyle}>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <h3 style={{ marginBottom: 0 }}>Arbeitsstunden</h3>
        <button type="button" onClick={() => setWorkRows((prev) => [...prev, { employee: "", from: "", to: "", rate: "" }])} style={{ ...primaryBtn, width: 160 }}>Zeile hinzufügen</button>
        {workRows.map((row, i) => {
          const h = calcHours(row.from, row.to);
          const t = h * toNumber(row.rate);
          return (
            <div key={`w-${i}`} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", gap: 8 }}>
              <input placeholder="Mitarbeiter" value={row.employee} onChange={(e) => setWorkRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, employee: e.target.value } : r)))} style={inputStyle} />
              <input type="time" value={row.from} onChange={(e) => setWorkRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, from: e.target.value } : r)))} style={inputStyle} />
              <input type="time" value={row.to} onChange={(e) => setWorkRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, to: e.target.value } : r)))} style={inputStyle} />
              <input readOnly value={h.toFixed(2)} style={{ ...inputStyle, color: COLORS.gold }} />
              <input placeholder="Ansatz CHF" value={row.rate} onChange={(e) => setWorkRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, rate: e.target.value } : r)))} style={inputStyle} />
              <input readOnly value={t.toFixed(2)} style={{ ...inputStyle, color: COLORS.gold }} />
            </div>
          );
        })}

        <h3 style={{ marginBottom: 0 }}>Material</h3>
        <button type="button" onClick={() => setMaterialRows((prev) => [...prev, { name: "", qty: "", unit: "", price: "" }])} style={{ ...primaryBtn, width: 160 }}>Zeile hinzufügen</button>
        {materialRows.map((row, i) => {
          const lineTotal = toNumber(row.qty) * toNumber(row.price);
          return (
            <div key={`m-${i}`} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 8 }}>
              <input placeholder="Bezeichnung" value={row.name} onChange={(e) => setMaterialRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, name: e.target.value } : r)))} style={inputStyle} />
              <input placeholder="Menge" value={row.qty} onChange={(e) => setMaterialRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, qty: e.target.value } : r)))} style={inputStyle} />
              <input placeholder="Einheit" value={row.unit} onChange={(e) => setMaterialRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, unit: e.target.value } : r)))} style={inputStyle} />
              <input placeholder="Preis" value={row.price} onChange={(e) => setMaterialRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, price: e.target.value } : r)))} style={inputStyle} />
              <input readOnly value={lineTotal.toFixed(2)} style={{ ...inputStyle, color: COLORS.gold }} />
            </div>
          );
        })}

        <input placeholder="Spesen CHF" value={reportForm.expenses} onChange={(e) => setReportForm((p) => ({ ...p, expenses: e.target.value }))} style={inputStyle} />
        <textarea placeholder="Notizen" value={reportForm.notes} onChange={(e) => setReportForm((p) => ({ ...p, notes: e.target.value }))} rows={4} style={{ ...inputStyle, minHeight: 90, padding: 10 }} />
        <div style={{ color: COLORS.muted }}>MwSt 8.1%: CHF {vat.toFixed(2)}</div>
        <div style={{ color: COLORS.gold, fontSize: 28, fontWeight: 800 }}>Total CHF {total.toFixed(2)}</div>
        <button type="button" onClick={handleSaveReport} style={primaryBtn}>Rapport speichern</button>
      </div>
    </Panel>
  );
}
