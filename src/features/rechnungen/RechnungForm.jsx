import { useTranslation } from "../../lib/translations.js";
import { useState } from "react";
import { GOLD, BORDER, MUTED, TEXT, iStyle, pBtn, gBtn, dBtn } from "../../lib/constants.js";
import { formatCHF } from "../../lib/utils.js";
import { SectionCard } from "../../components/UI.jsx";

export function RechnungForm({ language = "DE", invoice, catalog = { employees: [], materials: [] }, reports = [], archivedReports = [], onSave, onCancel, onPreview, onBackToCustomer }) {
  const tr = useTranslation(language);
  const rd = invoice?.reportData || {};
  const [showAbzuege, setShowAbzuege] = useState(false);
  const [showRapport, setShowRapport] = useState(false);
  const [rapportSearch, setRapportSearch] = useState("");
  const [descSearch, setDescSearch] = useState({});
  const [descFocus, setDescFocus] = useState({});

  const backLabel = language==="FR"?"Retour":language==="IT"?"Indietro":language==="EN"?"Back":tr.common?.back||"Zurück";
  const saveLabel = language==="FR"?"Enregistrer":language==="IT"?"Salva":language==="EN"?"Save":tr.common?.save||"Speichern";
  const customerLabel = language==="FR"?"Nom du client":language==="IT"?"Nome cliente":language==="EN"?"Customer name":"Kundenname";
  const addressLabel = language==="FR"?"Adresse":language==="IT"?"Indirizzo":language==="EN"?"Address":"Adresse";
  const projectLabel = language==="FR"?"Nom du projet":language==="IT"?"Nome progetto":language==="EN"?"Project name":"Projektname";
  const rapportLabel = language==="FR"?"Joindre rapport":language==="IT"?"Allega rapporto":language==="EN"?"Attach report":"Rapport anhängen";
  const abzuegeLabel = language==="FR"?"Déductions & Conditions":language==="IT"?"Deduzioni & Condizioni":language==="EN"?"Deductions & Conditions":"Abzüge & Konditionen";
  const addRowLabel = language==="FR"?"Ajouter ligne":language==="IT"?"Aggiungi riga":language==="EN"?"Add row":"Zeile hinzufügen";

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
    projektbezeichnung: invoice?.projektbezeichnung || rd.projectName || "",
    rapportRef: invoice?.reportData?.rapportNr || "",
    attachedReportIds: invoice?.attachedReportIds || [],
    paymentDays: invoice?.paymentDays || 30,
    skontoPct: invoice?.skontoPct || 0,
    skontoDays: invoice?.skontoDays || 10,
    iban: invoice?.iban || "",
    notes: invoice?.notes || "",
    discount: invoice?.discount || 0,
    date: invoice?.date || new Date().toISOString().slice(0,10),
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
    const workRows = rows.filter(r => (catalog.employees||[]).find(e => e.name === r.description));
    const materialRows = rows.filter(r => (catalog.materials||[]).find(m => m.name === r.description));
    const workRowsMapped = workRows.map(r => ({ employee: r.description, from: "", to: "", hours: Number(r.qty), rate: Number(r.price), total: Number(r.qty)*Number(r.price) }));
    const matRowsMapped = materialRows.map(r => ({ name: r.description, qty: Number(r.qty), unit: r.unit||"St", price: Number(r.price), total: Number(r.qty)*Number(r.price) }));
    const otherRows = rows.filter(r => !workRows.includes(r) && !materialRows.includes(r)).map(r => ({ employee: r.description, from: "", to: "", hours: Number(r.qty), rate: Number(r.price), total: Number(r.qty)*Number(r.price) }));
    const reportData = { ...(invoice?.reportData||{}), workRows: [...workRowsMapped, ...otherRows], materialRows: matRowsMapped };
    return { ...invoice, ...form, lineItems: rows, reportData, subtotal, vat, total, totalAmount: total, discountAmt, skontoAmt, date: form.date };
  };

  const handleBack = () => { if(onBackToCustomer) onBackToCustomer(); else if(onCancel) onCancel(); };

  const allCatalog = [...(catalog.employees||[]).map(e => ({name:e.name, detail:"CHF "+e.rate+"/h", unit:"h", price:e.rate})), ...(catalog.materials||[]).map(m => ({name:m.name, detail:"CHF "+m.price+" ("+m.unit+")", unit:m.unit, price:m.price}))];

  return (
    <SectionCard>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <button type="button" onClick={handleBack} style={{ background:"transparent", color:GOLD, border:"1px solid "+GOLD, borderRadius:8, padding:"8px 14px", fontWeight:600, fontSize:14, cursor:"pointer" }}>{backLabel}</button>
        <div style={{ color:GOLD, fontWeight:700, fontSize:18 }}>{tr.invoice?.title||"Rechnung"}</div>
        <div style={{ minWidth:80 }}></div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <input placeholder={customerLabel+" *"} value={form.customerName} onChange={e => set("customerName", e.target.value)} style={iStyle} />
        <input placeholder={addressLabel} value={form.customerAddress} onChange={e => set("customerAddress", e.target.value)} style={iStyle} />
        <input placeholder={projectLabel} value={form.projektbezeichnung} onChange={e => set("projektbezeichnung", e.target.value)} style={iStyle} />
        <div><div style={{ fontSize:12, color:MUTED, marginBottom:2 }}>{language==="FR"?"Date":language==="IT"?"Data":language==="EN"?"Date":"Datum"}</div><input type="date" value={form.date||new Date().toISOString().slice(0,10)} onChange={e => set("date", e.target.value)} style={{ ...iStyle, width:"100%" }} /></div>

        {/* Positionen */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
          <h3 style={{ margin:0 }}>{tr.invoice?.positions||"Positionen"}</h3>
          <button type="button" onClick={addRow} style={{ ...pBtn, minHeight:32, padding:"0 12px", fontSize:13 }}>+ {addRowLabel}</button>
        </div>
        {rows.map((row, i) => {
          const rowTotal = Number(row.qty) * Number(row.price);
          const dq = descSearch[i] ?? row.description ?? "";
          const filtered = allCatalog.filter(c => c.name.toLowerCase().includes(dq.toLowerCase()));
          return (
            <div key={i} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid "+BORDER, borderRadius:8, padding:"10px 12px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:8, marginBottom:6, position:"relative" }}>
                <div style={{ position:"relative" }}>
                  <input placeholder={tr.invoice?.description||"Beschreibung"} value={dq}
                    onChange={e => { setDescSearch(p => ({...p, [i]: e.target.value})); updateRow(i, "description", e.target.value); }}
                    style={{ ...iStyle, width:"100%" }} autoComplete="off" onFocus={() => setDescFocus(p => ({...p, [i]: true}))} onBlur={() => setTimeout(() => setDescFocus(p => ({...p, [i]: false})), 150)} />
                  {dq.length > 0 && filtered.length > 0 && descFocus[i] && (
                    <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:50, background:"#1a1a1a", border:"1px solid "+BORDER, borderRadius:8, marginTop:2, maxHeight:160, overflowY:"auto" }}>
                      {filtered.map((c,j) => (
                        <button key={j} type="button" onMouseDown={() => { updateRow(i,"description",c.name); updateRow(i,"price",c.price||0); updateRow(i,"unit",c.unit||"St"); setDescSearch(p => ({...p, [i]: c.name})); }}
                          style={{ display:"block", width:"100%", textAlign:"left", padding:"8px 12px", background:"transparent", border:"none", color:TEXT, cursor:"pointer", borderBottom:"1px solid "+BORDER, fontSize:13 }}>
                          {c.name} — {c.detail}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => removeRow(i)} style={{ ...dBtn, minWidth:34 }}>✕</button>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 80px 80px", gap:8 }}>
                <input placeholder={tr.invoice?.qty||"Menge"} type="number" value={row.qty} onChange={e => updateRow(i,"qty",e.target.value)} style={iStyle} />
                <input placeholder={tr.invoice?.unit||"Einheit"} value={row.unit} onChange={e => updateRow(i,"unit",e.target.value)} style={iStyle} />
                <input placeholder={tr.invoice?.price||"CHF"} type="number" value={row.price} onChange={e => updateRow(i,"price",e.target.value)} style={iStyle} />
              </div>
              <div style={{ textAlign:"right", color:GOLD, fontWeight:700, fontSize:13, marginTop:6 }}>CHF {formatCHF(rowTotal)}</div>
            </div>
          );
        })}

        <textarea placeholder={tr.report?.notes||"Notizen"} value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} style={{ ...iStyle, minHeight:60, padding:10 }} />

        {/* Abzüge einklappbar */}
        <button type="button" onClick={() => setShowAbzuege(p=>!p)} style={{ background:showAbzuege?"rgba(212,168,83,0.15)":"rgba(212,168,83,0.05)", color:GOLD, border:"1px solid "+GOLD, borderRadius:8, padding:"10px 16px", fontWeight:600, fontSize:13, cursor:"pointer", width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          {showAbzuege ? "▲" : "▼"} {abzuegeLabel}
        </button>
        {showAbzuege && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:8, padding:12, border:"1px solid rgba(212,168,83,0.2)", borderRadius:8 }}>
            <div><div style={{ fontSize:12, color:MUTED, marginBottom:2 }}>{tr.invoice?.discount||"Rabatt %"}</div><input placeholder="0" type="number" value={form.discount} onChange={e => set("discount", e.target.value)} style={iStyle} /></div>
            <div><div style={{ fontSize:12, color:MUTED, marginBottom:2 }}>{tr.invoice?.payDays||"Zahlungsziel (Tage)"}</div><input placeholder="30" type="number" value={form.paymentDays} onChange={e => set("paymentDays", e.target.value)} style={iStyle} /></div>
            <div><div style={{ fontSize:12, color:MUTED, marginBottom:2 }}>{tr.invoice?.skonto||"Skonto %"}</div><input placeholder="0" type="number" value={form.skontoPct} onChange={e => set("skontoPct", e.target.value)} style={iStyle} /></div>
            <div><div style={{ fontSize:12, color:MUTED, marginBottom:2 }}>{tr.invoice?.skontoDays||"Skonto-Frist"}</div><input placeholder="10" type="number" value={form.skontoDays} onChange={e => set("skontoDays", e.target.value)} style={iStyle} /></div>
            <input placeholder="IBAN" value={form.iban} onChange={e => set("iban", e.target.value)} style={{ ...iStyle, gridColumn:"1/-1" }} />
          </div>
        )}

        {/* Rapport anhängen einklappbar */}
        <button type="button" onClick={() => setShowRapport(p=>!p)} style={{ background:showRapport?"rgba(212,168,83,0.15)":"rgba(212,168,83,0.05)", color:GOLD, border:"1px solid "+GOLD, borderRadius:8, padding:"10px 16px", fontWeight:600, fontSize:13, cursor:"pointer", width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          {showRapport ? "▲" : "▼"} 📎 {rapportLabel}
        </button>
        {showRapport && (
          <div style={{ padding:12, border:"1px solid rgba(212,168,83,0.2)", borderRadius:8 }}>
            <input placeholder={tr.offerte?.rapportSearch||"Rapport suchen..."} value={rapportSearch} onChange={e => setRapportSearch(e.target.value)} style={{ ...iStyle, width:"100%", marginBottom:8 }} />
            <div style={{ maxHeight:160, overflowY:"auto", border:"1px solid "+BORDER, borderRadius:8, padding:6 }}>
              {[...reports, ...archivedReports].filter(r => (!form.customerName || r.customer === form.customerName) && (!rapportSearch || r.customer?.toLowerCase().includes(rapportSearch.toLowerCase()) || String(r.description?.rapportNr||r.id).includes(rapportSearch))).map(r => {
                const rp = r.description || {};
                const id = String(r.id);
                const sel = (form.attachedReportIds||[]).includes(id);
                return <div key={id} onClick={() => set("attachedReportIds", sel ? (form.attachedReportIds||[]).filter(x=>x!==id) : [...(form.attachedReportIds||[]), id])}
                  style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 8px", borderRadius:6, cursor:"pointer", marginBottom:2, background:sel?"rgba(212,168,83,0.15)":"transparent", border:"1px solid "+(sel?GOLD:"transparent") }}>
                  <span style={{ color:sel?GOLD:TEXT, fontSize:13 }}>{sel?"☑":"☐"} Nr.{rp.rapportNr||id.slice(0,6)} — {r.customer} — {r.date}</span>
                </div>;
              })}
            </div>
          </div>
        )}

        {/* Totals */}
        <div style={{ borderTop:"1px solid "+BORDER, paddingTop:12 }}>
          <div style={{ color:MUTED, fontSize:13 }}>Subtotal: CHF {formatCHF(subtotal)}</div>
          {Number(form.discount) > 0 && <div style={{ color:MUTED, fontSize:13 }}>{tr.invoice?.discount||"Rabatt"} {form.discount}%: -CHF {formatCHF(discountAmt)}</div>}
          <div style={{ color:MUTED, fontSize:13 }}>{tr.report?.vat||"MwSt 8.1%"}: CHF {formatCHF(vat)}</div>
          {Number(form.skontoPct) > 0 && <div style={{ color:MUTED, fontSize:13 }}>{tr.invoice?.skonto||"Skonto"} {form.skontoPct}% ({form.skontoDays} {tr.common?.days||"Tage"}): -CHF {formatCHF(skontoAmt)}</div>}
          <div style={{ color:GOLD, fontWeight:800, fontSize:20, marginTop:8 }}>Total CHF {formatCHF(total)}</div>
        </div>

        {/* Buttons */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:8, marginTop:8 }}>
          <button type="button" onClick={handleBack} style={{ background:"transparent", color:GOLD, border:"1px solid "+GOLD, borderRadius:10, padding:"14px", fontWeight:700, fontSize:15, cursor:"pointer" }}>{backLabel}</button>
          <button type="button" onClick={() => onSave(buildInvoice())} style={pBtn}>{saveLabel}</button>
        </div>
        {onPreview && <button type="button" onClick={() => onPreview(buildInvoice())} style={{ ...gBtn, color:GOLD, borderColor:GOLD, marginTop:8, width:"100%" }}>PDF</button>}
      </div>
    </SectionCard>
  );
}
