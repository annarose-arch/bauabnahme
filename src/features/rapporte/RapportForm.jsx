import { useState } from "react";
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
  onCustomerSelect, onSave, onCancel, onBackToCustomer, onPDF, onPreview,
}) {
  const tr = useTranslation(language);
  const [showFoto, setShowFoto] = useState(false);
  const [empSearch, setEmpSearch] = useState({});
  const [empFocus, setEmpFocus] = useState({});
  const [matFocus, setMatFocus] = useState({});
  const [matSearch, setMatSearch] = useState({});

  const backLabel = language==="FR"?"Retour":language==="IT"?"Indietro":language==="EN"?"Back":tr.common?.back||"Zurück";
  const saveLabel = language==="FR"?"Enregistrer":language==="IT"?"Salva":language==="EN"?"Save":tr.common?.save||"Speichern";
  const addRowLabel = language==="FR"?"Ajouter ligne":language==="IT"?"Aggiungi riga":language==="EN"?"Add row":tr.report?.addRow||"Zeile hinzufügen";
  const fotoLabel = language==="FR"?"Joindre photo":language==="IT"?"Allega foto":language==="EN"?"Attach photo":"Foto anhängen";

  const handleBack = () => { if(onBackToCustomer) onBackToCustomer(); else if(onCancel) onCancel(); };

  return (
    <SectionCard>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <button type="button" onClick={handleBack} style={{ background:"transparent", color:GOLD, border:"1px solid "+GOLD, borderRadius:8, padding:"8px 14px", fontWeight:600, fontSize:14, cursor:"pointer" }}>{backLabel}</button>
        <div style={{ color:GOLD, fontWeight:700, fontSize:18 }}>{editingReport ? tr.report?.edit||"Rapport bearbeiten" : tr.nav?.newReport||"Neuer Rapport"}</div>
        <div style={{ minWidth:80 }}></div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {/* Kunde */}
        <div style={{ position: "relative" }}>
          <input placeholder={tr.customer.company} value={reportForm.customer}
            onChange={e => { setReportForm(p => ({ ...p, customer: e.target.value, selectedCustomerId: "" })); setShowCustomerSuggestions(true); }}
            onFocus={() => setShowCustomerSuggestions(true)}
            onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 150)}
            style={{ ...iStyle, width: "100%", boxSizing: "border-box" }} autoComplete="off" />
          {showCustomerSuggestions && reportForm.customer.length > 0 &&
            customers.filter(c => c.name.toLowerCase().includes(reportForm.customer.toLowerCase())).length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: "#1a1a1a", border: "1px solid "+BORDER, borderRadius: 8, marginTop: 2, maxHeight: 200, overflowY: "auto" }}>
                {customers.filter(c => c.name.toLowerCase().includes(reportForm.customer.toLowerCase())).map(c => (
                  <button key={c.id} type="button" onMouseDown={() => onCustomerSelect(String(c.id))}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 12px", background: "transparent", border: "none", color: TEXT, cursor: "pointer", borderBottom: "1px solid "+BORDER }}>
                    <strong>{c.name}</strong>
                  </button>
                ))}
              </div>
            )}
        </div>

        <input placeholder={tr.report.address} value={reportForm.address} onChange={e => setReportForm(p => ({ ...p, address: e.target.value }))} style={iStyle} />
        <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 8 }}>
          <input placeholder={tr.report.zip} value={reportForm.zip || ""} onChange={e => setReportForm(p => ({ ...p, zip: e.target.value }))} style={iStyle} />
          <input placeholder={tr.report.city} value={reportForm.city || ""} onChange={e => setReportForm(p => ({ ...p, city: e.target.value }))} style={iStyle} />
        </div>
        <input placeholder={tr.customer.email} value={reportForm.customerEmail} onChange={e => setReportForm(p => ({ ...p, customerEmail: e.target.value }))} style={iStyle} />
        <input placeholder={tr.report.projectName} value={reportForm.projectSearch || ""} onChange={e => setReportForm(p => ({ ...p, projectSearch: e.target.value }))} style={iStyle} />
        <div style={{width:"100%", overflow:"hidden"}}><input type="date" value={reportForm.date} onChange={e => setReportForm(p => ({ ...p, date: e.target.value }))} style={{...iStyle, minWidth:0}} /></div>

        {/* Arbeitsstunden */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
          <h3 style={{ margin:0 }}>{tr.report.workHours}</h3>
          <button type="button" onClick={() => setWorkRows(p => [...p, { employee: "", from: "", to: "", rate: "" }])} style={{ ...pBtn, minHeight:32, padding:"0 12px", fontSize:13 }}>+ {addRowLabel}</button>
        </div>
        {workRows.map((row, i) => {
          const h = calcHours(row.from, row.to) + calcHours(row.from2||"" , row.to2||""), t = h * toNum(row.rate);
          const empQ = empSearch[i] ?? row.employee ?? "";
          const filteredEmps = catalog.employees.filter(e => e.name.toLowerCase().includes(empQ.toLowerCase()));
          return (
            <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid "+BORDER, borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginBottom: 8, position:"relative" }}>
                <div style={{ position:"relative" }}>
                  <input placeholder={tr.report.employee} value={empQ}
                    onChange={e => { setEmpSearch(p => ({...p, [i]: e.target.value})); setWorkRows(p => p.map((r,j) => j===i ? {...r, employee:e.target.value} : r)); }}
                    onFocus={() => setEmpFocus(p => ({...p, [i]: true}))}
                    onBlur={() => setTimeout(() => setEmpFocus(p => ({...p, [i]: false})), 150)}
                    style={{ ...iStyle, width:"100%" }} autoComplete="off" />

                  {empFocus[i] && empQ.length > 0 && filteredEmps.length > 0 && (
                    <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:50, background:"#1a1a1a", border:"1px solid "+BORDER, borderRadius:8, marginTop:2, maxHeight:160, overflowY:"auto" }}>
                      {filteredEmps.map(emp => (
                        <button key={emp.id} type="button" onMouseDown={() => { setWorkRows(p => p.map((r,j) => j===i ? {...r, employee:emp.name, rate:emp.rate||r.rate} : r)); setEmpSearch(p => ({...p, [i]: emp.name})); }}
                          style={{ display:"block", width:"100%", textAlign:"left", padding:"8px 12px", background:"transparent", border:"none", color:TEXT, cursor:"pointer", borderBottom:"1px solid "+BORDER, fontSize:13 }}>
                          {emp.name}{emp.rate ? " — CHF "+emp.rate+"/h" : ""}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => { if(workRows.length===1){ setWorkRows([{employee:"",from:"",to:"",rate:""}]); setEmpSearch({}); setEmpFocus({}); } else { setWorkRows(p => p.filter((_,j) => j!==i)); setEmpSearch(p => { const n={...p}; delete n[i]; return n; }); setEmpFocus(p => { const n={...p}; delete n[i]; return n; }); } }} style={{ ...dBtn, minWidth:34 }}>✕</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom:6 }}>
                <div><div style={{ color: MUTED, fontSize: 11, marginBottom: 2 }}>{tr.report.from} 1</div><input placeholder="07:00" value={row.from} onChange={e => setWorkRows(p => p.map((r,j) => j===i ? {...r, from:e.target.value} : r))} style={iStyle} /></div>
                <div><div style={{ color: MUTED, fontSize: 11, marginBottom: 2 }}>{tr.report.to} 1</div><input placeholder="12:00" value={row.to} onChange={e => setWorkRows(p => p.map((r,j) => j===i ? {...r, to:e.target.value} : r))} style={iStyle} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom:6 }}>
                <div><div style={{ color: MUTED, fontSize: 11, marginBottom: 2 }}>{tr.report.from} 2</div><input placeholder="13:00" value={row.from2||""} onChange={e => setWorkRows(p => p.map((r,j) => j===i ? {...r, from2:e.target.value} : r))} style={iStyle} /></div>
                <div><div style={{ color: MUTED, fontSize: 11, marginBottom: 2 }}>{tr.report.to} 2</div><input placeholder="17:00" value={row.to2||""} onChange={e => setWorkRows(p => p.map((r,j) => j===i ? {...r, to2:e.target.value} : r))} style={iStyle} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div><div style={{ color: MUTED, fontSize: 11, marginBottom: 2 }}>{language==="FR"?"Hrs":language==="IT"?"Ore":language==="EN"?"Hrs":"Std"}</div><input readOnly value={h.toFixed(2)} style={{ ...iStyle, color: GOLD }} /></div>
                <div><div style={{ color: MUTED, fontSize: 11, marginBottom: 2 }}>CHF/h</div><input placeholder="110" value={row.rate} onChange={e => setWorkRows(p => p.map((r,j) => j===i ? {...r, rate:e.target.value} : r))} style={iStyle} /></div>
              </div>
              <div style={{ textAlign: "right", color: GOLD, fontWeight: 700, fontSize: 13, marginTop: 6 }}>CHF {t.toFixed(2)}</div>
            </div>
          );
        })}

        {/* Material */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
          <h3 style={{ margin:0 }}>{tr.report.material}</h3>
          <button type="button" onClick={() => setMaterialRows(p => [...p, { name: "", qty: "", unit: "", price: "" }])} style={{ ...pBtn, minHeight:32, padding:"0 12px", fontSize:13 }}>+ {addRowLabel}</button>
        </div>
        {materialRows.map((row, i) => {
          const t = toNum(row.qty) * toNum(row.price);
          const matQ = matSearch[i] ?? row.name ?? "";
          const filteredMats = catalog.materials.filter(m => m.name.toLowerCase().includes(matQ.toLowerCase()));
          return (
            <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid "+BORDER, borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginBottom: 6, position:"relative" }}>
                <div style={{ position:"relative" }}>
                  <input placeholder={tr.report.material} value={matQ}
                    onChange={e => { setMatSearch(p => ({...p, [i]: e.target.value})); setMaterialRows(p => p.map((r,j) => j===i ? {...r, name:e.target.value} : r)); }}
                    onFocus={() => setMatFocus(p => ({...p, [i]: true}))}
                    onBlur={() => setTimeout(() => setMatFocus(p => ({...p, [i]: false})), 150)}
                    style={{ ...iStyle, width:"100%" }} autoComplete="off" />

                  {matFocus[i] && matQ.length > 0 && filteredMats.length > 0 && (
                    <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:50, background:"#1a1a1a", border:"1px solid "+BORDER, borderRadius:8, marginTop:2, maxHeight:160, overflowY:"auto" }}>
                      {filteredMats.map(mat => (
                        <button key={mat.id} type="button" onMouseDown={() => { setMaterialRows(p => p.map((r,j) => j===i ? {...r, name:mat.name, unit:mat.unit||r.unit, price:mat.price||r.price} : r)); setMatSearch(p => ({...p, [i]: mat.name})); }}
                          style={{ display:"block", width:"100%", textAlign:"left", padding:"8px 12px", background:"transparent", border:"none", color:TEXT, cursor:"pointer", borderBottom:"1px solid "+BORDER, fontSize:13 }}>
                          {mat.name}{mat.unit ? " ("+mat.unit+")" : ""}{mat.price ? " — CHF "+mat.price : ""}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => { if(materialRows.length===1){ setMaterialRows([{name:"",qty:"",unit:"",price:""}]); setMatSearch({}); setMatFocus({}); } else { setMaterialRows(p => p.filter((_,j) => j!==i)); setMatSearch(p => { const n={...p}; delete n[i]; return n; }); setMatFocus(p => { const n={...p}; delete n[i]; return n; }); } }} style={{ ...dBtn, minWidth:34 }}>✕</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px", gap: 8 }}>
                <input placeholder={tr.report.qty||"Menge"} value={row.qty} onChange={e => setMaterialRows(p => p.map((r,j) => j===i ? {...r, qty:e.target.value} : r))} style={iStyle} />
                <input placeholder={tr.report.unit||"Einheit"} value={row.unit} onChange={e => setMaterialRows(p => p.map((r,j) => j===i ? {...r, unit:e.target.value} : r))} style={iStyle} />
                <input placeholder={tr.report.price||"CHF"} value={row.price} onChange={e => setMaterialRows(p => p.map((r,j) => j===i ? {...r, price:e.target.value} : r))} style={iStyle} />
              </div>
              <div style={{ textAlign: "right", color: GOLD, fontWeight: 700, fontSize: 13, marginTop: 6 }}>CHF {t.toFixed(2)}</div>
            </div>
          );
        })}

        <input placeholder={tr.report.expenses} value={reportForm.expenses} onChange={e => setReportForm(p => ({ ...p, expenses: e.target.value }))} style={iStyle} />
        <textarea placeholder={tr.report.notes} value={reportForm.notes} onChange={e => setReportForm(p => ({ ...p, notes: e.target.value }))} rows={3} style={{ ...iStyle, minHeight: 80, padding: 10 }} />

        {/* Foto */}
        <button type="button" onClick={() => setShowFoto(p=>!p)} style={{ background:showFoto?"rgba(212,168,83,0.2)":"rgba(212,168,83,0.07)", color:GOLD, border:"2px solid "+GOLD, borderRadius:10, padding:"14px 16px", fontWeight:700, fontSize:15, cursor:"pointer", width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>{"📷 " + fotoLabel + (showFoto ? " ▲" : " ▼")}</button>
        {showFoto && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <PhotoUpload label={language==="FR"?"Avant":language==="IT"?"Prima":language==="EN"?"Before":"Vorher"} addPhotoLabel={tr.report.addPhoto} value={reportForm.beforePhoto} onChange={v => setReportForm(p => ({ ...p, beforePhoto: v }))} />
          <PhotoUpload label={language==="FR"?"Après":language==="IT"?"Dopo":language==="EN"?"After":"Nachher"} addPhotoLabel={tr.report.addPhoto} value={reportForm.afterPhoto} onChange={v => setReportForm(p => ({ ...p, afterPhoto: v }))} />
        </div>}

        {/* Totals */}
        <div style={{ borderTop: "1px solid "+BORDER, paddingTop: 12 }}>
          <div style={{ color: MUTED, fontSize: 13 }}>{tr.report.vat}: CHF {formatCHF(vat)}</div>
          <div style={{ color: GOLD, fontSize: 24, fontWeight: 800, marginTop: 4 }}>Total CHF {formatCHF(total)}</div>
        </div>

        {/* Unterschriften */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <h3 style={{ marginBottom: 4 }}>✍️ {tr.report.employee}</h3>
            <input placeholder={tr.report.employee} value={reportForm.signerName} onChange={e => setReportForm(p => ({ ...p, signerName: e.target.value }))} style={{ ...iStyle, marginBottom: 6 }} />
            <SignaturePad clearLabel={tr.common.delete} value={reportForm.signatureImage} onChange={v => setReportForm(p => ({ ...p, signatureImage: v }))} />
          </div>
          <div>
            <h3 style={{ marginBottom: 4 }}>✍️ {tr.customer.title}</h3>
            <input placeholder={tr.customer.company} value={reportForm.customerSignerName || ""} onChange={e => setReportForm(p => ({ ...p, customerSignerName: e.target.value }))} style={{ ...iStyle, marginBottom: 6 }} />
            <SignaturePad clearLabel={tr.common.delete} value={reportForm.customerSignatureImage || ""} onChange={v => setReportForm(p => ({ ...p, customerSignatureImage: v }))} />
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8, marginTop: 8 }}>
          <button type="button" onClick={handleBack} style={{ background:"transparent", color:GOLD, border:"1px solid "+GOLD, borderRadius:10, padding:"14px", fontWeight:700, fontSize:15, cursor:"pointer" }}>{backLabel}</button>
          <button type="button" onClick={onSave} style={pBtn}>{editingReport ? saveLabel : tr.report.save}</button>
        </div>
        {(onPreview || onPDF) && <button type="button" onClick={() => onPreview ? onPreview() : onPDF(editingReport)} style={{ ...gBtn, color:GOLD, borderColor:GOLD, marginTop:8, width:"100%" }}>PDF Vorschau</button>}
      </div>
    </SectionCard>
  );
}
