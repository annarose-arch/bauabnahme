import { useTranslation } from "../../lib/translations.js";
import { GOLD, BORDER, MUTED, TEXT, iStyle, pBtn, gBtn, dBtn } from "../../lib/constants.js";
import { calcHours, toNum, formatCHF } from "../../lib/utils.js";
import { SignaturePad, PhotoUpload, SectionCard } from "../../components/UI.jsx";

export function RapportForm({ language = "DE",
  editingReport, reportForm, setReportForm,
  workRows, setWorkRows, materialRows, setMaterialRows,
  customers, catalog,
  workSubtotal, materialSubtotal, vat, total,
  showCustomerSuggestions, setShowCustomerSuggestions,
  onCustomerSelect, onSave, onCancel,
}) {
  const tr = useTranslation(language);
  return (
    <SectionCard>
      <h2 style={{ marginTop: 0 }}>{editingReport ? "Rapport bearbeiten" : "Neuer Rapport"}</h2>
      <div style={{ display: "grid", gap: 10 }}>

        {/* Kunde Autocomplete */}
        <div style={{ position: "relative" }}>
          <input
            placeholder="Firmenname eingeben..."
            value={reportForm.customer}
            onChange={e => { setReportForm(p => ({ ...p, customer: e.target.value, selectedCustomerId: "" })); setShowCustomerSuggestions(true); }}
            onFocus={() => setShowCustomerSuggestions(true)}
            onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 150)}
            style={{ ...iStyle, width: "100%", boxSizing: "border-box" }}
            autoComplete="off"
          />
          {showCustomerSuggestions && reportForm.customer.length > 0 &&
            customers.filter(c => c.name.toLowerCase().includes(reportForm.customer.toLowerCase())).length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: "#1a1a1a", border: `1px solid ${BORDER}`, borderRadius: 8, marginTop: 2, maxHeight: 200, overflowY: "auto" }}>
                {customers.filter(c => c.name.toLowerCase().includes(reportForm.customer.toLowerCase())).map(c => (
                  <button key={c.id} type="button" onMouseDown={() => onCustomerSelect(String(c.id))}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 12px", background: "transparent", border: "none", color: TEXT, cursor: "pointer", borderBottom: `1px solid ${BORDER}` }}>
                    <strong>{c.name}</strong>
                  </button>
                ))}
              </div>
            )}
        </div>

        <input placeholder={tr.report.address} value={reportForm.address} onChange={e => setReportForm(p => ({ ...p, address: e.target.value }))} style={iStyle} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
          <input placeholder={tr.report.zip} value={reportForm.zip || ""} onChange={e => setReportForm(p => ({ ...p, zip: e.target.value }))} style={iStyle} />
          <input placeholder="Ort" value={reportForm.city || ""} onChange={e => setReportForm(p => ({ ...p, city: e.target.value }))} style={iStyle} />
        </div>
        <input placeholder={tr.customer.email} value={reportForm.customerEmail} onChange={e => setReportForm(p => ({ ...p, customerEmail: e.target.value }))} style={iStyle} />
        <input placeholder={tr.report.orderNo} value={reportForm.orderNo} onChange={e => setReportForm(p => ({ ...p, orderNo: e.target.value }))} style={iStyle} />
        <input placeholder="Projektname" value={reportForm.projectSearch || ""} onChange={e => setReportForm(p => ({ ...p, projectSearch: e.target.value }))} style={iStyle} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input type="date" value={reportForm.date} onChange={e => setReportForm(p => ({ ...p, date: e.target.value }))} style={iStyle} />
          <select value={reportForm.status} onChange={e => setReportForm(p => ({ ...p, status: e.target.value }))} style={iStyle}>
            {["offen", "gesendet", "archiviert"].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        {/* Fotos */}
        <h3 style={{ marginBottom: 4 }}>📷 Fotos</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <PhotoUpload label="Vorher" value={reportForm.beforePhoto} onChange={v => setReportForm(p => ({ ...p, beforePhoto: v }))} />
          <PhotoUpload label="Nachher" value={reportForm.afterPhoto} onChange={v => setReportForm(p => ({ ...p, afterPhoto: v }))} />
        </div>

        {/* Arbeitsstunden */}
        <h3 style={{ marginBottom: 4 }}>{tr.report.workHours}</h3>
        <button type="button" onClick={() => setWorkRows(p => [...p, { employee: "", from: "", to: "", rate: "" }])} style={{ ...pBtn, width: 180 }}>
          + Zeile hinzufügen
        </button>
        {workRows.map((row, i) => {
          const h = calcHours(row.from, row.to), t = h * toNum(row.rate);
          const isCustomEmp = row._customEmployee;
          return (
            <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", marginBottom: 6 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginBottom: 8 }}>
                {catalog.employees.length > 0 && !isCustomEmp ? (
                  <select value={row.employee || ""} onChange={e => {
                    if (e.target.value === "__custom__") { setWorkRows(p => p.map((r, j) => j === i ? { ...r, employee: "", _customEmployee: true } : r)); return; }
                    const emp = catalog.employees.find(x => x.name === e.target.value);
                    setWorkRows(p => p.map((r, j) => j === i ? { ...r, employee: e.target.value, rate: emp?.rate || r.rate, _customEmployee: false } : r));
                  }} style={{ ...iStyle, width: "100%" }}>
                    <option value="">Mitarbeiter wählen...</option>
                    {catalog.employees.map(emp => <option key={emp.id} value={emp.name}>{emp.name}{emp.rate ? ` — CHF ${emp.rate}/h` : ""}</option>)}
                    <option value="__custom__">✏️ Manuell eingeben</option>
                  </select>
                ) : (
                  <div style={{ display: "flex", gap: 6 }}>
                    <input placeholder={tr.report.employee} value={row.employee} onChange={e => setWorkRows(p => p.map((r, j) => j === i ? { ...r, employee: e.target.value } : r))} style={{ ...iStyle, flex: 1 }} />
                    {catalog.employees.length > 0 && <button type="button" onClick={() => setWorkRows(p => p.map((r, j) => j === i ? { ...r, _customEmployee: false, employee: "" } : r))} style={{ ...gBtn, fontSize: 11, minHeight: 34, padding: "0 8px" }}>↩ Dropdown</button>}
                  </div>
                )}
                <button type="button" onClick={() => setWorkRows(p => p.filter((_, j) => j !== i))} style={{ ...dBtn, minWidth: 34 }} disabled={workRows.length === 1}>✕</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8 }}>
                <div><div style={{ color: MUTED, fontSize: 11, marginBottom: 3 }}>von (HH:MM)</div><input placeholder="07:00" value={row.from} onChange={e => setWorkRows(p => p.map((r, j) => j === i ? { ...r, from: e.target.value } : r))} style={iStyle} /></div>
                <div><div style={{ color: MUTED, fontSize: 11, marginBottom: 3 }}>bis (HH:MM)</div><input placeholder="17:00" value={row.to} onChange={e => setWorkRows(p => p.map((r, j) => j === i ? { ...r, to: e.target.value } : r))} style={iStyle} /></div>
                <div><div style={{ color: MUTED, fontSize: 11, marginBottom: 3 }}>Stunden</div><input readOnly value={h.toFixed(2)} style={{ ...iStyle, color: GOLD }} /></div>
                <div><div style={{ color: MUTED, fontSize: 11, marginBottom: 3 }}>CHF/h</div><input placeholder="110" value={row.rate} onChange={e => setWorkRows(p => p.map((r, j) => j === i ? { ...r, rate: e.target.value } : r))} style={iStyle} /></div>
              </div>
              <div style={{ textAlign: "right", color: GOLD, fontWeight: 700, fontSize: 14, marginTop: 6 }}>Total: CHF {t.toFixed(2)}</div>
            </div>
          );
        })}
        <div style={{ color: MUTED, fontSize: 13 }}>{tr.report.workHours} Total: CHF {workSubtotal.toFixed(2)}</div>

        {/* Material */}
        <h3 style={{ marginBottom: 4 }}>{tr.report.material}</h3>
        <button type="button" onClick={() => setMaterialRows(p => [...p, { name: "", qty: "", unit: "", price: "" }])} style={{ ...pBtn, width: 180 }}>
          + Zeile hinzufügen
        </button>
        {materialRows.map((row, i) => {
          const t = toNum(row.qty) * toNum(row.price);
          const isCustomMat = row._customMaterial;
          return (
            <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", marginBottom: 6 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginBottom: 6 }}>
                {catalog.materials.length > 0 && !isCustomMat ? (
                  <select value={row.name || ""} onChange={e => {
                    if (e.target.value === "__custom__") { setMaterialRows(p => p.map((r, j) => j === i ? { ...r, name: "", _customMaterial: true } : r)); return; }
                    const mat = catalog.materials.find(x => x.name === e.target.value);
                    setMaterialRows(p => p.map((r, j) => j === i ? { ...r, name: e.target.value, unit: mat?.unit || r.unit, price: mat?.price || r.price, _customMaterial: false } : r));
                  }} style={{ ...iStyle, width: "100%" }}>
                    <option value="">Material wählen...</option>
                    {catalog.materials.map(mat => <option key={mat.id} value={mat.name}>{mat.name}{mat.unit ? ` (${mat.unit})` : ""}{mat.price ? ` — CHF ${mat.price}` : ""}</option>)}
                    <option value="__custom__">✏️ Manuell eingeben</option>
                  </select>
                ) : (
                  <div style={{ display: "flex", gap: 6 }}>
                    <input placeholder={tr.report.name} value={row.name} onChange={e => setMaterialRows(p => p.map((r, j) => j === i ? { ...r, name: e.target.value } : r))} style={{ ...iStyle, flex: 1 }} />
                    {catalog.materials.length > 0 && <button type="button" onClick={() => setMaterialRows(p => p.map((r, j) => j === i ? { ...r, _customMaterial: false, name: "" } : r))} style={{ ...gBtn, fontSize: 11, minHeight: 34, padding: "0 8px" }}>↩ Dropdown</button>}
                  </div>
                )}
                <button type="button" onClick={() => setMaterialRows(p => p.filter((_, j) => j !== i))} style={{ ...dBtn, minWidth: 34 }} disabled={materialRows.length === 1}>✕</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8 }}>
                <input placeholder={tr.report.qty} value={row.qty} onChange={e => setMaterialRows(p => p.map((r, j) => j === i ? { ...r, qty: e.target.value } : r))} style={iStyle} />
                <input placeholder={tr.report.unit} value={row.unit} onChange={e => setMaterialRows(p => p.map((r, j) => j === i ? { ...r, unit: e.target.value } : r))} style={iStyle} />
                <input placeholder={tr.report.price} value={row.price} onChange={e => setMaterialRows(p => p.map((r, j) => j === i ? { ...r, price: e.target.value } : r))} style={iStyle} />
              </div>
              <div style={{ textAlign: "right", color: GOLD, fontWeight: 700, fontSize: 14, marginTop: 6 }}>Total: CHF {t.toFixed(2)}</div>
            </div>
          );
        })}
        <div style={{ color: MUTED, fontSize: 13 }}>{tr.report.material} Total: CHF {materialSubtotal.toFixed(2)}</div>

        <input placeholder={tr.report.expenses} value={reportForm.expenses} onChange={e => setReportForm(p => ({ ...p, expenses: e.target.value }))} style={iStyle} />
        <textarea placeholder={tr.report.notes} value={reportForm.notes} onChange={e => setReportForm(p => ({ ...p, notes: e.target.value }))} rows={3} style={{ ...iStyle, minHeight: 80, padding: 10 }} />

        {/* Unterschrift */}
        <h3 style={{ marginBottom: 4 }}>✍️ Unterschrift</h3>
        <input placeholder="Name des Unterzeichners" value={reportForm.signerName} onChange={e => setReportForm(p => ({ ...p, signerName: e.target.value }))} style={iStyle} />
        <SignaturePad value={reportForm.signatureImage} onChange={v => setReportForm(p => ({ ...p, signatureImage: v }))} />

        <div style={{ color: MUTED }}>MwSt 8.1%: CHF {formatCHF(vat)}</div>
        <div style={{ color: GOLD, fontSize: 26, fontWeight: 800 }}>Total CHF {formatCHF(total)}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={onSave} style={pBtn}>{editingReport ? tr.common.save : tr.report.save}</button>
          {editingReport && <button type="button" onClick={onCancel} style={gBtn}>Abbrechen</button>}
        </div>
      </div>
    </SectionCard>
  );
}
