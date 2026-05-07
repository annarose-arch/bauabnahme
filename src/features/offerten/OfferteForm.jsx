import { useState, useMemo } from "react";
import { useTranslation } from "../../lib/translations.js";
import { GOLD, BORDER, MUTED, TEXT, iStyle, pBtn, gBtn, dBtn } from "../../lib/constants.js";
import { calcHours, toNum, formatCHF, parseCustomerMeta } from "../../lib/utils.js";
import { SignaturePad, PhotoUpload, SectionCard } from "../../components/UI.jsx";

const today = () => new Date().toISOString().slice(0,10);

export function OfferteForm({ language = "DE",
  catalog = { employees: [], materials: [] },
  customers = [],
  reports = [],
  nextNr = 1001,
  onSave,
  onBack,
  onPDF,
  onPreview,
  onBackToCustomer = null,
  editingOfferte = null,
}) {
  const tr = useTranslation(language);
  const desc = editingOfferte?.description || {};
  const [showAbzuege, setShowAbzuege] = useState(false);
  const [showFoto, setShowFoto] = useState(false);
  const [empSearch, setEmpSearch] = useState({});
  const [empFocus, setEmpFocus] = useState({});
  const [matFocus, setMatFocus] = useState({});
  const [matSearch, setMatSearch] = useState({});

  const saveLabel = language==="FR"?"Enregistrer":language==="IT"?"Salva":language==="EN"?"Save":tr.common?.save||"Speichern";
  const backLabel = language==="FR"?"Retour":language==="IT"?"Indietro":language==="EN"?"Back":tr.common?.back||"Zurück";
  const abzuegeLabel = language==="FR"?"Déductions & Conditions":language==="IT"?"Deduzioni & Condizioni":language==="EN"?"Deductions & Conditions":tr.offerte?.deductionsTitle||"Abzüge & Konditionen";
  const addRowLabel = language==="FR"?"Ajouter ligne":language==="IT"?"Aggiungi riga":language==="EN"?"Add row":tr.report?.addRow||"Zeile hinzufügen";

  const [form, setForm] = useState({
    customer: editingOfferte?.customer || "",
    customerId: editingOfferte?.customer_id || null,
    customerEmail: desc.customerEmail || "",
    address: desc.address || "",
    zip: desc.zip || "",
    city: desc.city || "",
    orderNo: desc.orderNo || "",
    projectName: desc.projectName || "",
    date: editingOfferte?.date || today(),
    validUntil: editingOfferte?.valid_until || "",
    status: editingOfferte?.status || "offen",
    expenses: desc.expenses || "",
    discountPct: desc.discountPct || 0,
    skontoPct: desc.skontoPct || 0,
    skontoDays: desc.skontoDays || 10,
    payDays: desc.payDays || 30,
    lumpsum: desc.lumpsum || 0,
    notes: desc.notes || "",
    photo: desc.photo || desc.photos?.before || "",
    signerName: desc.signerName || "",
    signatureImage: desc.signatureImage || "",
    customerSignerName: desc.customerSignerName || "",
    customerSignatureImage: desc.customerSignatureImage || "",
  });

  const [workRows, setWorkRows] = useState(Array.isArray(desc.workRows) && desc.workRows.length > 0 ? desc.workRows : [{ employee: "", from: "", to: "", rate: "" }]);
  const [materialRows, setMaterialRows] = useState(Array.isArray(desc.materialRows) && desc.materialRows.length > 0 ? desc.materialRows : [{ name: "", qty: "", unit: "", price: "" }]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const workSubtotal = useMemo(() => workRows.reduce((s, r) => s + calcHours(r.from, r.to) * toNum(r.rate), 0), [workRows]);
  const materialSubtotal = useMemo(() => materialRows.reduce((s, r) => s + toNum(r.qty) * toNum(r.price), 0), [materialRows]);
  const subtotal = workSubtotal + materialSubtotal + toNum(form.expenses);
  const discountAmt = subtotal * (toNum(form.discountPct) / 100);
  const lumpsumAmt = toNum(form.lumpsum);
  const afterDiscount = subtotal - discountAmt - lumpsumAmt;
  const vat = afterDiscount * 0.081;
  const total = afterDiscount + vat;
  const skontoAmt = total * (toNum(form.skontoPct) / 100);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSave = () => onSave({ ...form, workRows, materialRows, total, offerteNr: editingOfferte?.offerte_nr || nextNr });
  const handleBack = () => { if(onBackToCustomer) onBackToCustomer(); else if(onBack) onBack(); };

  return (
    <SectionCard>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <button type="button" onClick={handleBack} style={{ background:"transparent", color:GOLD, border:"1px solid "+GOLD, borderRadius:8, padding:"8px 14px", fontWeight:600, fontSize:14, cursor:"pointer" }}>{backLabel}</button>
        <div style={{ color:GOLD, fontWeight:700, fontSize:18 }}>{editingOfferte ? "OF-"+editingOfferte.offerte_nr : (tr.offerte?.new||"Neue Offerte")}</div>
        <div style={{ minWidth:80 }}></div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {/* Kunde */}
        <div style={{ position: "relative" }}>
          <input placeholder={tr.customer?.company || "Firmenname *"} value={form.customer}
            onChange={e => { set("customer", e.target.value); set("customerId", null); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            style={{ ...iStyle, width: "100%", boxSizing: "border-box" }} autoComplete="off" />
          {showSuggestions && form.customer.length > 0 &&
            customers.filter(c => c.name.toLowerCase().includes(form.customer.toLowerCase())).length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: "#1a1a1a", border: "1px solid " + BORDER, borderRadius: 8, marginTop: 2, maxHeight: 200, overflowY: "auto" }}>
                {customers.filter(c => c.name.toLowerCase().includes(form.customer.toLowerCase())).map(c => (
                  <button key={c.id} type="button" onMouseDown={() => { const meta = parseCustomerMeta(c); set("customer", c.name); set("customerId", c.id); set("address", meta.address||""); set("zip", meta.zip||""); set("city", meta.city||""); set("customerEmail", c.email||meta.email||""); setShowSuggestions(false); }}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 12px", background: "transparent", border: "none", color: TEXT, cursor: "pointer", borderBottom: "1px solid " + BORDER }}>
                    <strong>{c.name}</strong>
                  </button>
                ))}
              </div>
            )}
        </div>

        <input placeholder={tr.report?.address || "Adresse"} value={form.address} onChange={e => set("address", e.target.value)} style={iStyle} />
        <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 8 }}>
          <input placeholder={tr.report?.zip || "PLZ"} value={form.zip} onChange={e => set("zip", e.target.value)} style={iStyle} />
          <input placeholder={tr.report?.city || "Ort"} value={form.city} onChange={e => set("city", e.target.value)} style={iStyle} />
        </div>
        <input placeholder={tr.customer?.email || "E-Mail Kunde"} value={form.customerEmail} onChange={e => set("customerEmail", e.target.value)} style={iStyle} />
        <input placeholder={tr.report?.projectName || "Projektname"} value={form.projectName} onChange={e => set("projectName", e.target.value)} style={iStyle} />

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))",gap:10,maxWidth:"100%",boxSizing:"border-box"}}>
          <div>
            <div style={{ fontSize: 12, color: MUTED, marginBottom: 2 }}>{tr.report?.date || "Datum"}</div>
            <div style={{overflow:"hidden"}}><input type="date" value={form.date} onChange={e => set("date", e.target.value)} style={{...iStyle, minWidth:0}} /></div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: MUTED, marginBottom: 2 }}>{tr.offerte?.validUntil || "Gültig bis"}</div>
            <div style={{overflow:"hidden"}}><input type="date" value={form.validUntil} onChange={e => set("validUntil", e.target.value)} style={{...iStyle, minWidth:0}} /></div>
          </div>
        </div>

        {/* Arbeitsstunden */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
          <h3 style={{ margin:0 }}>{tr.report?.workHours || "Arbeitsstunden"}</h3>
          <button type="button" onClick={() => setWorkRows(p => [...p, { employee: "", from: "", to: "", rate: "" }])} style={{ ...pBtn, minHeight:32, padding:"0 12px", fontSize:13 }}>+ {addRowLabel}</button>
        </div>
        {workRows.map((row, i) => {
          const h = calcHours(row.from, row.to) + calcHours(row.from2||"", row.to2||""), t = h * toNum(row.rate);
          return (
            <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid " + BORDER, borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginBottom: 8 }}>
                <div style={{ position:"relative" }}><input placeholder={tr.report?.employee || "Mitarbeiter"} value={empSearch[i] ?? row.employee ?? ""} onChange={e => { setEmpSearch(p => ({...p, [i]: e.target.value})); setWorkRows(p => p.map((r,j) => j===i ? {...r, employee:e.target.value} : r)); }} onFocus={() => setEmpFocus(p => ({...p, [i]: true}))} onBlur={() => setTimeout(() => setEmpFocus(p => ({...p, [i]: false})), 150)} style={{ ...iStyle, width:"100%" }} autoComplete="off"/>{empFocus[i] && (empSearch[i]??row.employee??"").length > 0 && catalog.employees.filter(e => e.name.toLowerCase().includes((empSearch[i]??row.employee??"").toLowerCase())).length > 0 && (<div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:50, background:"#1a1a1a", border:"1px solid "+BORDER, borderRadius:8, marginTop:2, maxHeight:160, overflowY:"auto" }}>{catalog.employees.filter(e => e.name.toLowerCase().includes((empSearch[i]??row.employee??"").toLowerCase())).map(emp => (<button key={emp.id} type="button" onMouseDown={() => { setWorkRows(p => p.map((r,j) => j===i ? {...r, employee:emp.name, rate:emp.rate||r.rate} : r)); setEmpSearch(p => ({...p, [i]: emp.name})); }} style={{ display:"block", width:"100%", textAlign:"left", padding:"8px 12px", background:"transparent", border:"none", color:TEXT, cursor:"pointer", borderBottom:"1px solid "+BORDER, fontSize:13 }}>{emp.name}{emp.rate ? " - CHF "+emp.rate+"/h" : ""}</button>))}</div>)}</div>
                <button type="button" onClick={() => { if(workRows.length===1){ setWorkRows([{employee:"",from:"",to:"",rate:""}]); setEmpSearch({}); setEmpFocus({}); } else { setWorkRows(p => p.filter((_,j) => j!==i)); setEmpSearch(p => { const n={...p}; delete n[i]; return n; }); setEmpFocus(p => { const n={...p}; delete n[i]; return n; }); } }} style={{ ...dBtn, minWidth: 34 }}>✕</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom:6 }}>
                <div><div style={{ color: MUTED, fontSize: 11, marginBottom: 2 }}>{tr.report?.from || "Von"} 1</div><input placeholder="07:00" value={row.from} onChange={e => setWorkRows(p => p.map((r,j) => j===i ? {...r, from:e.target.value} : r))} style={iStyle} /></div>
                <div><div style={{ color: MUTED, fontSize: 11, marginBottom: 2 }}>{tr.report?.to || "Bis"} 1</div><input placeholder="12:00" value={row.to} onChange={e => setWorkRows(p => p.map((r,j) => j===i ? {...r, to:e.target.value} : r))} style={iStyle} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom:6 }}>
                <div><div style={{ color: MUTED, fontSize: 11, marginBottom: 2 }}>{tr.report?.from || "Von"} 2</div><input placeholder="13:00" value={row.from2||""} onChange={e => setWorkRows(p => p.map((r,j) => j===i ? {...r, from2:e.target.value} : r))} style={iStyle} /></div>
                <div><div style={{ color: MUTED, fontSize: 11, marginBottom: 2 }}>{tr.report?.to || "Bis"} 2</div><input placeholder="17:00" value={row.to2||""} onChange={e => setWorkRows(p => p.map((r,j) => j===i ? {...r, to2:e.target.value} : r))} style={iStyle} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div><div style={{ color: MUTED, fontSize: 11, marginBottom: 2 }}>{tr.offerte?.hours || "Std"}</div><input readOnly value={h.toFixed(2)} style={{ ...iStyle, color: GOLD }} /></div>
                <div><div style={{ color: MUTED, fontSize: 11, marginBottom: 2 }}>CHF/h</div><input placeholder="110" value={row.rate} onChange={e => setWorkRows(p => p.map((r,j) => j===i ? {...r, rate:e.target.value} : r))} style={iStyle} /></div>
              </div>
              <div style={{ textAlign: "right", color: GOLD, fontWeight: 700, fontSize: 13, marginTop: 6 }}>CHF {t.toFixed(2)}</div>
            </div>
          );
        })}

        {/* Material */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
          <h3 style={{ margin:0 }}>{tr.report?.material || "Material"}</h3>
          <button type="button" onClick={() => setMaterialRows(p => [...p, { name: "", qty: "", unit: "", price: "" }])} style={{ ...pBtn, minHeight:32, padding:"0 12px", fontSize:13 }}>+ {addRowLabel}</button>
        </div>
        {materialRows.map((row, i) => {
          const t = toNum(row.qty) * toNum(row.price);
          return (
            <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid " + BORDER, borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginBottom: 6 }}>
                <div style={{ position:"relative" }}><input placeholder={tr.report?.material || "Material"} value={matSearch[i] ?? row.name ?? ""} onChange={e => { setMatSearch(p => ({...p, [i]: e.target.value})); setMaterialRows(p => p.map((r,j) => j===i ? {...r, name:e.target.value} : r)); }} onFocus={() => setMatFocus(p => ({...p, [i]: true}))} onBlur={() => setTimeout(() => setMatFocus(p => ({...p, [i]: false})), 150)} style={{ ...iStyle, width:"100%" }} autoComplete="off"/>{matFocus[i] && (matSearch[i]??row.name??"").length > 0 && catalog.materials.filter(m => m.name.toLowerCase().includes((matSearch[i]??row.name??"").toLowerCase())).length > 0 && (<div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:50, background:"#1a1a1a", border:"1px solid "+BORDER, borderRadius:8, marginTop:2, maxHeight:160, overflowY:"auto" }}>{catalog.materials.filter(m => m.name.toLowerCase().includes((matSearch[i]??row.name??"").toLowerCase())).map(mat => (<button key={mat.id} type="button" onMouseDown={() => { setMaterialRows(p => p.map((r,j) => j===i ? {...r, name:mat.name, unit:mat.unit||r.unit, price:mat.price||r.price} : r)); setMatSearch(p => ({...p, [i]: mat.name})); }} style={{ display:"block", width:"100%", textAlign:"left", padding:"8px 12px", background:"transparent", border:"none", color:TEXT, cursor:"pointer", borderBottom:"1px solid "+BORDER, fontSize:13 }}>{mat.name}{mat.unit ? " ("+mat.unit+")" : ""}{mat.price ? " - CHF "+mat.price : ""}</button>))}</div>)}</div>
                <button type="button" onClick={() => { if(materialRows.length===1){ setMaterialRows([{name:"",qty:"",unit:"",price:""}]); setMatSearch({}); setMatFocus({}); } else { setMaterialRows(p => p.filter((_,j) => j!==i)); setMatSearch(p => { const n={...p}; delete n[i]; return n; }); setMatFocus(p => { const n={...p}; delete n[i]; return n; }); } }} style={{ ...dBtn, minWidth: 34 }}>✕</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px", gap: 8 }}>
                <input placeholder={tr.report?.name || "Bezeichnung"} value={row.name} onChange={e => setMaterialRows(p => p.map((r,j) => j===i ? {...r, name:e.target.value} : r))} style={iStyle} />
                <input placeholder={tr.report?.qty || "Menge"} value={row.qty} onChange={e => setMaterialRows(p => p.map((r,j) => j===i ? {...r, qty:e.target.value} : r))} style={iStyle} />
                <input placeholder={tr.report?.price || "CHF"} value={row.price} onChange={e => setMaterialRows(p => p.map((r,j) => j===i ? {...r, price:e.target.value} : r))} style={iStyle} />
              </div>
              <div style={{ textAlign: "right", color: GOLD, fontWeight: 700, fontSize: 13, marginTop: 6 }}>CHF {t.toFixed(2)}</div>
            </div>
          );
        })}

        <textarea placeholder={tr.report?.notes || "Notizen"} value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} style={{ ...iStyle, minHeight: 80, padding: 10 }} />

        {/* Abzüge einklappbar */}
        <button type="button" onClick={() => setShowAbzuege(p => !p)} style={{ ...gBtn, fontSize:13, minHeight:34, color:showAbzuege?GOLD:MUTED, borderColor:showAbzuege?GOLD:BORDER }}>
          {showAbzuege ? "▲" : "▼"} {abzuegeLabel}
        </button>
        {showAbzuege && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, padding:12, border:"1px solid rgba(212,168,83,0.2)", borderRadius:8 }}>
            <div><div style={{ fontSize: 12, color: MUTED, marginBottom: 2 }}>{tr.offerte?.discount || "Rabatt %"}</div><input placeholder="0" type="number" value={form.discountPct} onChange={e => set("discountPct", e.target.value)} style={iStyle} /></div>
            <div><div style={{ fontSize: 12, color: MUTED, marginBottom: 2 }}>{tr.offerte?.lumpsum || "Pauschalabzug CHF"}</div><input placeholder="0" type="number" value={form.lumpsum} onChange={e => set("lumpsum", e.target.value)} style={iStyle} /></div>
            <div><div style={{ fontSize: 12, color: MUTED, marginBottom: 2 }}>{tr.offerte?.skonto || "Skonto %"}</div><input placeholder="0" type="number" value={form.skontoPct} onChange={e => set("skontoPct", e.target.value)} style={iStyle} /></div>
            <div><div style={{ fontSize: 12, color: MUTED, marginBottom: 2 }}>{tr.offerte?.skontoDays || "Skonto-Frist (Tage)"}</div><input placeholder="10" type="number" value={form.skontoDays} onChange={e => set("skontoDays", e.target.value)} style={iStyle} /></div>
            <div><div style={{ fontSize: 12, color: MUTED, marginBottom: 2 }}>{tr.offerte?.payDays || "Zahlungsziel (Tage)"}</div><input placeholder="30" type="number" value={form.payDays} onChange={e => set("payDays", e.target.value)} style={iStyle} /></div>
          </div>
        )}

        {/* Totals */}
        <div style={{ borderTop: "1px solid " + BORDER, paddingTop: 12 }}>
          <div style={{ color: MUTED, fontSize: 13 }}>{tr.offerte?.subtotal || "Subtotal"}: CHF {formatCHF(subtotal)}</div>
          {toNum(form.discountPct) > 0 && <div style={{ color: MUTED, fontSize: 13 }}>{tr.offerte?.discount || "Rabatt"} {form.discountPct}%: -CHF {formatCHF(discountAmt)}</div>}
          {lumpsumAmt > 0 && <div style={{ color: MUTED, fontSize: 13 }}>{tr.offerte?.lumpsum || "Pauschalabzug"}: -CHF {formatCHF(lumpsumAmt)}</div>}
          <div style={{ color: MUTED, fontSize: 13 }}>{tr.report?.vat || "MwSt 8.1%"}: CHF {formatCHF(vat)}</div>
          {toNum(form.skontoPct) > 0 && <div style={{ color: MUTED, fontSize: 13 }}>{tr.offerte?.skonto || "Skonto"} {form.skontoPct}%: -CHF {formatCHF(skontoAmt)}</div>}
          <div style={{ color: GOLD, fontWeight: 800, fontSize: 20, marginTop: 8 }}>Total CHF {formatCHF(total)}</div>
        </div>

        <button type="button" onClick={() => setShowFoto(p=>!p)} style={{ background:showFoto?"rgba(212,168,83,0.2)":"rgba(212,168,83,0.07)", color:GOLD, border:"2px solid "+GOLD, borderRadius:10, padding:"14px 16px", fontWeight:700, fontSize:15, cursor:"pointer", width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>{'📷 ' + (language==="FR"?"Joindre photo":language==="IT"?"Allega foto":language==="EN"?"Attach photo":"Foto anhängen") + (showFoto ? ' ▲' : ' ▼')}</button>
        {showFoto && <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}><PhotoUpload label="" addPhotoLabel="Foto 1" value={form.photo} onChange={v => set("photo", v)} /><PhotoUpload label="" addPhotoLabel="Foto 2" value={form.photo2||""} onChange={v => set("photo2", v)} /></div>}
        {/* Unterschriften */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <h3 style={{ marginBottom: 4 }}>✍️ {tr.report?.employee || "Mitarbeiter"}</h3>
            <input placeholder={tr.report?.employee || "Name"} value={form.signerName} onChange={e => set("signerName", e.target.value)} style={{ ...iStyle, marginBottom: 6 }} />
            <SignaturePad clearLabel={tr.common?.delete || "Löschen"} value={form.signatureImage} onChange={v => set("signatureImage", v)} />
          </div>
          <div>
            <h3 style={{ marginBottom: 4 }}>✍️ {tr.customer?.title || "Kunde"}</h3>
            <input placeholder={tr.customer?.company || "Firmenname"} value={form.customerSignerName} onChange={e => set("customerSignerName", e.target.value)} style={{ ...iStyle, marginBottom: 6 }} />
            <SignaturePad clearLabel={tr.common?.delete || "Löschen"} value={form.customerSignatureImage} onChange={v => set("customerSignatureImage", v)} />
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8, marginTop: 8 }}>
          <button type="button" onClick={handleBack} style={{ background:"transparent", color:GOLD, border:"1px solid "+GOLD, borderRadius:10, padding:"14px", fontWeight:700, fontSize:15, cursor:"pointer" }}>{backLabel}</button>
          <button type="button" onClick={handleSave} style={pBtn}>{saveLabel}</button>
        </div>
        {(onPreview || onPDF) && <button type="button" onClick={() => onPreview ? onPreview({ ...form, workRows, materialRows, total, offerteNr: editingOfferte?.offerte_nr || nextNr, id: editingOfferte?.id }) : onPDF(editingOfferte)} style={{ ...gBtn, color: GOLD, borderColor: GOLD, marginTop:8, width:"100%" }}>PDF Vorschau</button>}
      </div>
    </SectionCard>
  );
}
