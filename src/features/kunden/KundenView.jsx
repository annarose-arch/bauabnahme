import { COLORS, inputStyle, primaryBtn } from "../../lib/constants.js";
import { Panel } from "../../components/UI.jsx";

export default function KundenView({
  customerForm,
  setCustomerForm,
  handleAddCustomer,
  customers,
  setSelectedCustomerDetail,
  handleDeleteCustomer
}) {
  return (
    <Panel>
      <h2 style={{ marginTop: 0 }}>Kunden</h2>
      <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
        <input placeholder="Firmenname" value={customerForm.company} onChange={(e) => setCustomerForm((p) => ({ ...p, company: e.target.value }))} style={inputStyle} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input placeholder="Vorname" value={customerForm.firstName} onChange={(e) => setCustomerForm((p) => ({ ...p, firstName: e.target.value }))} style={inputStyle} />
          <input placeholder="Nachname" value={customerForm.lastName} onChange={(e) => setCustomerForm((p) => ({ ...p, lastName: e.target.value }))} style={inputStyle} />
        </div>
        <input placeholder="Adresse" value={customerForm.address} onChange={(e) => setCustomerForm((p) => ({ ...p, address: e.target.value }))} style={inputStyle} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input placeholder="PLZ" value={customerForm.zip} onChange={(e) => setCustomerForm((p) => ({ ...p, zip: e.target.value }))} style={inputStyle} />
          <input placeholder="Ort" value={customerForm.city} onChange={(e) => setCustomerForm((p) => ({ ...p, city: e.target.value }))} style={inputStyle} />
        </div>
        <input placeholder="Telefon" value={customerForm.phone} onChange={(e) => setCustomerForm((p) => ({ ...p, phone: e.target.value }))} style={inputStyle} />
        <input placeholder="E-Mail" value={customerForm.email} onChange={(e) => setCustomerForm((p) => ({ ...p, email: e.target.value }))} style={inputStyle} />
        <input placeholder="Kostenstelle" value={customerForm.costCenter} onChange={(e) => setCustomerForm((p) => ({ ...p, costCenter: e.target.value }))} style={inputStyle} />
        <h4 style={{ marginBottom: 0 }}>Projekt beim Anlegen (optional)</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input placeholder="Projektname" value={customerForm.projectName} onChange={(e) => setCustomerForm((p) => ({ ...p, projectName: e.target.value }))} style={inputStyle} />
          <input placeholder="Projektnummer" value={customerForm.projectNumber} onChange={(e) => setCustomerForm((p) => ({ ...p, projectNumber: e.target.value }))} style={inputStyle} />
        </div>
        <button type="button" onClick={handleAddCustomer} style={primaryBtn}>Speichern</button>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {customers.map((c) => (
          <div key={c.id} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 12px", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <button type="button" onClick={() => setSelectedCustomerDetail(c)} style={{ border: "none", background: "transparent", color: COLORS.text, fontWeight: 700, cursor: "pointer", textAlign: "left", padding: 0 }}>
              {c.name || "-"}
            </button>
            <button type="button" onClick={() => handleDeleteCustomer(c)} style={{ minHeight: 34, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.text, padding: "0 12px", cursor: "pointer" }}>Löschen</button>
          </div>
        ))}
      </div>
    </Panel>
  );
}
