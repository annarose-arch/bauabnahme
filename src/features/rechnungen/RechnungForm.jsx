import { useState } from "react";
import { GOLD, BORDER, MUTED, TEXT, iStyle, pBtn, gBtn, dBtn } from "../../lib/constants.js";
import { SectionCard } from "../../components/UI.jsx";

export function RechnungForm({ invoice, onSave, onCancel }) {
  const [form, setForm] = useState({
    customerName: invoice?.customerName || invoice?.customer || "",
    customerAddress: invoice?.customerAddress || "",
    projektbezeichnung: invoice?.projektbezeichnung || invoice?.reportData?.projectName || "",
    rapportRef: invoice?.reportData?.rapportNr || "",
    paymentDays: invoice?.paymentDays || 30,
    iban: invoice?.iban || "",
    notes: invoice?.notes || "",
    discount: invoice?.discount || 0,
  });
  const [rows, setRows] = useState(
    invoice?.lineItems?.length ? invoice.lineItems : [{ description: "", qty: 1, unit: "St", price: 0 }]
  );

  const updateRow = (i, field, val) => setRows(r => r.map((x, j) => j === i ? { ...x, [field]: val } : x));
  const addRow = () => setRows(r => [...r, { description: "", qty: 1, unit: "St", price: 0 }]);
  const removeRow = (i) => setRows(r => r.filter((_, j) => j !== i));

  const subtotal = rows.reduce((s, r) => s + (Number(r.qty) * Number(r.price)), 0);
  const discountAmt = subtotal * (Number(form.discount) / 100);
  const afterDiscount = subtotal - discountAmt;
  const vat = afterDiscount * 0.081;
  const total = afterDiscount + vat;

  const handleSave = () => {
    onSave({ ...invoice, ...form, lineItems: rows, subtotal, vat, total, totalAmount: total });
  };

  return (
    <SectionCard>
      <h2 style={{ marginTop: 0, color: GOLD }}>Rechnung bearbeiten</h2>

      <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
        <input placeholder="Kundenname" value={form.customerName} onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))} style={iStyle} />
        <input placeholder="Adresse" value={form.customerAddress} onChange={e => setForm(p => ({ ...p, customerAddress: e.target.value }))} style={iStyle} />
        <input placeholder="Projektbezeichnung" value={form.projektbezeichnung} onChange={e => setForm(p => ({ ...p, projektbezeichnung: e.target.value }))} style={iStyle} />
        <input placeholder="Bezug Rapport Nr." value={form.rapportRef} onChange={e => setForm(p => ({ ...p, rapportRef: e.target.value }))} style={iStyle} />
      </div>

      <h3 style={{ color: GOLD }}>Positionen</h3>
      <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
        {rows.map((row, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr 1fr auto", gap: 6 }}>
            <input placeholder="Beschreibung" value={row.description} onChange={e => updateRow(i, "description", e.target.value)} style={iStyle} />
            <input placeholder="Menge" type="number" value={row.qty} onChange={e => updateRow(i, "qty", e.target.value)} style={iStyle} />
            <input placeholder="Einheit" value={row.unit} onChange={e => updateRow(i, "unit", e.target.value)} style={iStyle} />
            <input placeholder="Preis" type="number" value={row.price} onChange={e => updateRow(i, "price", e.target.value)} style={iStyle} />
            <button type="button" onClick={() => removeRow(i)} style={dBtn}>X</button>
          </div>
        ))}
        <button type="button" onClick={addRow} style={gBtn}>+ Position hinzufügen</button>
     </div>

      <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
        <input placeholder="Rabatt %" type="number" value={form.discount} onChange={e => setForm(p => ({ ...p, discount: e.target.value }))} style={iStyle} />
        <input placeholder="Zahlungsfrist (Tage)" type="number" value={form.paymentDays} onChange={e => setForm(p => ({ ...p, paymentDays: e.target.value }))} style={iStyle} />
        <input placeholder="IBAN" value={form.iban} onChange={e => setForm(p => ({ ...p, iban: e.target.value }))} style={iStyle} />
        <textarea placeholder="Notizen" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} style={{ ...iStyle, minHeight: 60 }} />
      </div>

      <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, marginBottom: 14 }}>
        <div style={{ color: MUTED }}>Subtotal: CHF {subtotal.toFixed(2)}</div>
        {form.discount > 0 && <div style={{ color: MUTED }}>Rabatt {form.discount}%: -CHF {discountAmt.toFixed(2)}</div>}
        <div style={{ color: MUTED }}>MwSt 8.1%: CHF {vat.toFixed(2)}</div>
        <div style={{ color: GOLD, fontWeight: 800, fontSize: 20 }}>Total CHF {total.toFixed(2)}</div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={handleSave} style={pBtn}>Speichern</button>
        <button type="button" onClick={onCancel} style={gBtn}>Abbrechen</button>
      </div>
    </SectionCard>
  );
}
