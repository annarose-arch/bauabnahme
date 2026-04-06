import { useTranslation } from "../../lib/translations.js";
import { useState } from "react";
import { GOLD, isMobile, BORDER, MUTED, TEXT, iStyle, pBtn, gBtn, dBtn } from "../../lib/constants.js";
const mobile = typeof window !== "undefined" && window.innerWidth < 600;
import { formatCHF } from "../../lib/utils.js";
import { SectionCard } from "../../components/UI.jsx";
export function RechnungForm({ language = "DE", invoice, catalog = { employees: [], materials: [] }, onSave, onCancel, onPreview }) {
  const tr = useTranslation(language);
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
    projektbezeichnung: invoice?.projektbezeichnung || invoice?.reportData?.projectName || rd.projectName || "",
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

 const buildInvoice = () => {
  const workRows = rows.filter(r => (catalog.employees||[]).find(e => e.name === r.description) || (!( catalog.materials||[]).find(m => m.name === r.description) && r.unit === "h"));
  const materialRows = rows.filter(r => (catalog.materials||[]).find(m => m.name === r.description));
  const workRowsMapped = workRows.map(r => { const emp = (catalog.employees||[]).find(e => e.name === r.description); return { employee: r.description, from: "", to: "", hours: Number(r.qty), rate: Number(r.price), total: Number(r.qty)*Number(r.price) }; });
  const matRowsMapped = materialRows.map(r => ({ name: r.description, qty: Number(r.qty), unit: r.unit||"St", price: Number(r.price), total: Number(r.qty)*Number(r.price) }));
  const otherRows = rows.filter(r => !workRows.includes(r) && !materialRows.includes(r)).map(r => ({ employee: r.description, from: "", to: "", hours: Number(r.qty), rate: Number(r.price), total: Number(r.qty)*Number(r.price) }));
  const reportData = { ...(invoice?.reportData||{}), workRows: [...workRowsMapped, ...otherRows], materialRows: matRowsMapped };
  return { ...invoice, ...form, lineItems: rows, reportData, subtotal, vat, total, totalAmount: total, discountAmt, skontoAmt };
};
  return (
    <SectionCard>
      <h2 style={{ marginTop: 0, color: GOLD }}>Rechnung bearbeiten</h2>

      <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
        <input placeholder="Kundenname *" value={form.customerName} onChange={e => set("customerName", e.target.value)} style={iStyle} />
        <input placeholder="Adresse" value={form.customerAddress} onChange={e => set("customerAddress", e.target.value)} style={iStyle} />
        <input placeholder="Projektname" value={form.projektbezeichnung} onChange={e => set("projektbezeichnung", e.target.value)} style={iStyle} />
        <input placeholder="Bezug Rapport Nr." value={form.rapportRef} onChange={e => set("rapportRef", e.target.value)} style={iStyle} />
      </div>

      <h3 style={{ color: GOLD, marginBottom: 8 }}>{tr.invoice.positions}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: window.innerWidth < 600 ? "1fr" : "3fr 1fr 1fr 1fr auto", gap: 6 }}>
          <div style={{ color: MUTED, fontSize: 12, textAlign: "center" }}>Beschreibung</div>
          <div style={{ color: MUTED, fontSize: 12, textAlign: "center" }}>Menge</div>
          <div style={{ color: MUTED, fontSize: 12, textAlign: "center" }}>Einheit</div>
          <div style={{ color: MUTED, fontSize: 12, textAlign: "center" }}>Preis CHF</div>
          <span></span>
        </div>
        {rows.map((row, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: window.innerWidth < 600 ? "1fr" : "3fr 1fr 1fr 1fr auto", gap: 6 }}>
            <div style={{ position: "relative" }}>
  <input placeholder={tr.invoice.description} value={row.description} onChange={e => {
  const val = e.target.value;
  updateRow(i, "description", val);
  const emp = (catalog.employees||[]).find(x => x.name === val);
  const mat = (catalog.materials||[]).find(x => x.name === val);
  if (emp) { updateRow(i, "price", emp.rate || ""); updateRow(i, "unit", "h"); }
  if (mat) { updateRow(i, "price", mat.price || ""); updateRow(i, "unit", mat.unit || "St"); }
}}
 list={`catalog-list-${i}`} style={{ ...iStyle, width: "100%" }} />
  <datalist id={`catalog-list-${i}`}>
    {(catalog.employees||[]).map((e,j) => <option key={j} value={e.name}>{e.name} - CHF {e.rate}/h</option>)}
    {(catalog.materials||[]).map((m,j) => <option key={j} value={m.name}>{m.name} - CHF {m.price}</option>)}
  </datalist>
</div>
            <input placeholder="1" type="number" value={row.qty} onChange={e => updateRow(i, "qty", e.target.value)} style={iStyle} />
            <input placeholder="St" value={row.unit} onChange={e => updateRow(i, "unit", e.target.value)} style={iStyle} />
            <input placeholder="0.00" type="number" value={row.price} onChange={e => updateRow(i, "price", e.target.value)} style={iStyle} />
            <button type="button" onClick={() => removeRow(i)} style={{ ...dBtn, padding: "0 10px" }}>X</button>
          </div>
        ))}
        <button type="button" onClick={addRow} style={gBtn}>+ Position hinzufügen</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: window.innerWidth < 600 ? "1fr" : "repeat(2,1fr)", gap: 8, marginBottom: 14 }}>
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
        <button type="button" onClick={() => onSave(buildInvoice())} style={pBtn}>{tr.common.save}</button>
        <button type="button" onClick={() => onPreview && onPreview(buildInvoice())} style={{ ...gBtn, color: GOLD, borderColor: GOLD }}>{tr.invoice.pdf} Vorschau</button>
        <button type="button" onClick={onCancel} style={gBtn}>Abbrechen</button>
      </div>
    </SectionCard>
  );
}
