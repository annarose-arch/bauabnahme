import { useState } from "react";
import { GOLD, BORDER, MUTED, TEXT, iStyle, pBtn, gBtn, dBtn } from "../../lib/constants.js";
import { formatCHF } from "../../lib/utils.js";
import { SectionCard } from "../../components/UI.jsx";

export function RechnungForm({ invoice, onSave, onCancel, onPreview }) {
  const rd = invoice?.reportData || {};
  const initRows = () => {
    if (invoice?.lineItems?.length) return invoice.lineItems;
    const rows = [];
    (rd.workRows || []).filter(r => r.employee || r.hours > 0).forEach(r => {
      rows.push({ description: r.employee || "Arbeit", qty: r.hours || 1, unit: "h", price: r.rate || 0 });
    });
    (rd.materialRows || []).filter(r => r.name).forEach(r => {
      rows.push({ description: r.name, qty: r.qty || 1, unit: r.unit || "St", price: r.price || 0 });
    });
    return rows.length ? rows : [{ description: "", qty: 1, unit: "St", price: 0 }];
  };

  const [form, setForm] = useState({
    customerName: invoice?.customerName || invoice?.customer || "",
    customerAddress: rd.address ? `${rd.address}, ${rd.zip || ""} ${rd.city || ""}`.trim() : "",
    projektbezeichnung: invoice?.projektbezeichnung || rd.projectName || invoice?.reportData?.projectName || "",
    rapportRef: invoice?.reportData?.rapportNr || "",
    paymentDays: invoice?.paymentDays || 30,
    skontoPct: invoice?.skontoPct || 0,
    skontoDays: invoice?.skontoDays || 10,
    iban: invoice?.iban || "",
    notes: invoice?.notes || "",
    discount: invoice?.discount || 0,
  });
  const [rows, setRows] = useState(initRows);

  const set = (field, val) => setForm(p => ({ ...p, [field]: val }));
  const updateRow = (i, field, val) => setRows(r => r.map((x, j) => j === i ? { ...x, [field]: val } : x));
  const addRow = () => setRows(r => [...r, { description: "", qty: 1, unit: "St", price: 0 }]);
  const removeRow = (i) => setRows(r => r.filter((_, j) => j !== i));

  const subtotal = rows.reduce((s, r) => s + (Number(r.qty) * Number(r.price)), 0);
  const discountAmt = subtotal * (Number(form.discount) / 100);
  const afterDiscount = subtotal - discountAmt;
  const vat = afterDiscount * 0.081;
  const total = afterDiscount + vat;
  const skontoAmt = total * (Number(form.skontoPct) / 100);

  const buildInvoice = () => ({ ...invoice, ...form, lineItems: rows, subtotal, vat, total, totalAmount: total, discountAmt, skontoAmt });

  return (
    <SectionCard>
      <h2 style={{ marginTop: 0, color: GOLD }}>Rechnung bearbeiten</h2>

      <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
        <input placeholder="Kundenname *" value={form.customerName} onChange={e => set("customerName", e.target.value)} style={iStyle} />
        <input placeholder="Adresse" value={form.customerAddress} onChange={e => set("customerAddress", e.target.value)} style={iStyle} />
        <input placeholder="Projektname" value={form.projektbezeichnung} onChange={e => set("projektbezeichnung", e.target.value)} style={iStyle} />
        <input placeholder="Bezug Rapport Nr." value={form.rapportRef} onChange={e => set("rapportRef", e.target.value)} style={iStyle} />
      </div>

      <h3 style={{ color: GOLD, marginBottom: 8 }}>Positionen</h3>
      <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr 1fr auto", gap: 6 }}>
          <span style={{ color: MUTED, fontSize: 12 }}>Beschreibung</span>
          <span style={{ color: MUTED, fontSize: 12 }}>Menge</span>
          <span style={{ color: MUTED, fontSize: 12 }}>Einheit</span>
          <span style={{ color: MUTED, fontSize: 12 }}>Preis CHF</span>
          <span></span>
        </div>
        {rows.map((row, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr 1fr auto", gap: 6 }}>
            <input placeholder="Beschreibung" value={row.description} onChange={e => updateRow(i, "description", e.target.value)} style={iStyle} />
            <input placeholder="1" type="number" value={row.qty} onChange={e => updateRow(i, "qty", e.target.value)} style={iStyle} />
            <input placeholder="St" value={row.unit} onChange={e => updateRow(i, "unit", e.target.value)} style={iStyle} />
            <input placeholder="0.00" type="number" value={row.price} onChange={e => updateRow(i, "price", e.target.value)} style={iStyle} />
            <button type="button" onClick={() => removeRow(i)} style={{ ...dBtn, padding: "0 10px" }}>X</button>
          </div>
        ))}
        <button type="button" onClick={addRow} style={gBtn}>+ Position hinzufügen</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        <div><div style={{ fontSize: 12, color: "#b9b0a3", marginBottom: 2 }}>Rabatt %</div><input placeholder="0" type="number" value={form.discount} onChange={e => set("discount", e.target.value)} style={iStyle} /></div>
        <div><div style={{ fontSize: 12, color: "#b9b0a3", marginBottom: 2 }}>Zahlungsziel (Tage)</div><input placeholder="30" type="number" value={form.paymentDays} onChange={e => set("paymentDays", e.target.value)} style={iStyle} /></div>
        <div><div style={{ fontSize: 12, color: "#b9b0a3", marginBottom: 2 }}>Skonto %</div><input placeholder="0" type="number" value={form.skontoPct} onChange={e => set("skontoPct", e.target.value)} style={iStyle} /></div>
        <div><div style={{ fontSize: 12, color: "#b9b0a3", marginBottom: 2 }}>Skonto Tage</div><input placeholder="10" type="number" value={form.skontoDays} onChange={e => set("skontoDays", e.target.value)} style={iStyle} /></div>
        <input placeholder="IBAN" value={form.iban} onChange={e => set("iban", e.target.value)} style={{ ...iStyle, gridColumn: "1 / -1" }} />
        <textarea placeholder="Notizen" value={form.notes} onChange={e => set("notes", e.target.value)} style={{ ...iStyle, minHeight: 60, gridColumn: "1 / -1" }} />
      </div>

      <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, marginBottom: 14 }}>
        <div style={{ color: MUTED }}>Subtotal: CHF {formatCHF(subtotal)}</div>
        {Number(form.discount) > 0 && <div style={{ color: MUTED }}>Rabatt {form.discount}%: -CHF {formatCHF(discountAmt)}</div>}
        <div style={{ color: MUTED }}>MwSt 8.1%: CHF {formatCHF(vat)}</div>
        {Number(form.skontoPct) > 0 && <div style={{ color: MUTED }}>Skonto {form.skontoPct}% ({form.skontoDays} Tage): -CHF {formatCHF(skontoAmt)}</div>}
        <div style={{ color: GOLD, fontWeight: 800, fontSize: 20, marginTop: 8 }}>Total CHF {formatCHF(total)}</div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={() => onSave(buildInvoice())} style={pBtn}>Speichern</button>
        <button type="button" onClick={() => onPreview && onPreview(buildInvoice())} style={{ ...gBtn, color: GOLD, borderColor: GOLD }}>PDF Vorschau</button>
        <button type="button" onClick={onCancel} style={gBtn}>Abbrechen</button>
      </div>
    </SectionCard>
  );
}
