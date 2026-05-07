import { useState } from "react";
import { useTranslation } from "../../lib/translations.js";
import { GOLD, BORDER, MUTED, TEXT, iStyle, pBtn, gBtn, dBtn } from "../../lib/constants.js";
import { SectionCard } from "../../components/UI.jsx";

const EMPLOYEE_BADGE_BG = [
  "rgba(212,168,83,0.22)",
  "rgba(100,180,160,0.22)",
  "rgba(130,150,220,0.22)",
  "rgba(200,130,160,0.2)",
];

const compactInput = { ...iStyle, minHeight: 34, fontSize: 13, padding: "6px 10px" };

export function KatalogView({ catalog, onSaveCatalog, showNotice, language = "DE", isAdmin = true }) {
  const [tab, setTab] = useState("employees");
  const [search, setSearch] = useState("");
  const tr = useTranslation(language);
  const [newEmployee, setNewEmployee] = useState({ name: "", rate: "" });
  const [newMaterial, setNewMaterial] = useState({ name: "", unit: "", price: "", category: "" });
  const [selectedCategory, setSelectedCategory] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const allCategories = [...new Set((catalog.materials||[]).map(m=>m.category).filter(Boolean))].sort();

  const empCount = catalog.employees?.length ?? 0;
  const matCount = catalog.materials?.length ?? 0;

  return (
    <SectionCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10, alignItems: "center" }}>
        {[
          ["employees", "👷 " + tr.report.employee, empCount],
          ["materials", "🔧 " + tr.report.material, matCount],
        ].map(([k, label, n]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            style={{
              ...gBtn,
              minHeight: 36,
              padding: "0 12px",
              fontSize: 13,
              fontWeight: tab === k ? 700 : 400,
              borderColor: tab === k ? GOLD : BORDER,
              color: tab === k ? GOLD : TEXT,
              background: tab === k ? "rgba(212,168,83,0.1)" : "transparent",
            }}
          >
            {label}{" "}
            <span style={{ color: MUTED, fontWeight: 500 }}>({n})</span>
          </button>
        ))}
      </div>

      <input placeholder={language==="FR"?"Rechercher...":language==="IT"?"Cerca...":language==="EN"?"Search...":"Suchen..."} value={search} onChange={e => setSearch(e.target.value)} style={{ ...iStyle, width:"100%", marginBottom:8 }} />
      {tab==="materials" && allCategories.length > 0 && <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}><button type="button" onClick={()=>setSelectedCategory("")} style={{...gBtn,minHeight:28,padding:"0 10px",fontSize:12,borderColor:!selectedCategory?GOLD:BORDER,color:!selectedCategory?GOLD:MUTED}}>{tr.catalog?.allCategories || "Alle"}</button>{allCategories.map(cat=><button key={cat} type="button" onClick={()=>setSelectedCategory(cat===selectedCategory?"":cat)} style={{...gBtn,minHeight:28,padding:"0 10px",fontSize:12,borderColor:selectedCategory===cat?GOLD:BORDER,color:selectedCategory===cat?GOLD:MUTED}}>{cat}</button>)}</div>}
      {tab === "employees" && (
        <>
          <div style={{ color: MUTED, fontSize: 12, marginBottom: 8 }}>
            {empCount} {tr.report.employee}
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 12,
              alignItems: "center",
              padding: "8px 10px",
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              background: "rgba(0,0,0,0.2)",
            }}
          >
            <input
              placeholder="Name"
              value={newEmployee.name}
              onChange={(e) => setNewEmployee((p) => ({ ...p, name: e.target.value }))}
              style={{ ...compactInput, flex: "1 1 120px", minWidth: 0 }}
            />
            <input
              placeholder="CHF/h"
              value={newEmployee.rate}
              onChange={(e) => setNewEmployee((p) => ({ ...p, rate: e.target.value }))}
              style={{ ...compactInput, flex: "0 1 88px", width: 88 }}
            />
            <button
              type="button"
              style={{ ...pBtn, minHeight: 34, padding: "0 14px", fontSize: 13 }}
              onClick={() => {
                if (!newEmployee.name.trim()) return;
                if(!isAdmin){showNotice("⛔ " + (tr?.common?.adminOnly || "Nur Admin")); return;} onSaveCatalog({ ...catalog, employees: [...catalog.employees, { id: Date.now(), ...newEmployee }] });
                setNewEmployee({ name: "", rate: "" });
                showNotice("✅ Mitarbeiter gespeichert.");
              }}
            >
              + {tr.common.save}
            </button>
          </div>
          {empCount === 0 && <p style={{ color: MUTED, fontSize: 13 }}>{tr.report.employee}: 0</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
            {[...catalog.employees].filter(emp => !search.trim() || (emp.name||"").toLowerCase().includes(search.toLowerCase())).sort((a,b) => (a.name||"").localeCompare(b.name||"")).map((emp, i) => (
              <div
                key={emp.id}
                style={{
                  border: `1px solid ${BORDER}`,
                  borderRadius: 10,
                  padding: "10px 10px 8px",
                  background: "rgba(255,255,255,0.02)",
                  display: "grid",
                  gap: 8,
                  position: "relative",
                }}
              >
                <button
                  type="button"
                  title="Entfernen"
                  style={{ ...dBtn, position: "absolute", top: 8, right: 8, minHeight: 28, width: 28, padding: 0, fontSize: 14, lineHeight: 1 }}
                  onClick={() => { if(!isAdmin){showNotice("⛔ " + (tr?.common?.adminOnly || "Nur Admin")); return;} onSaveCatalog({ ...catalog, employees: catalog.employees.filter((e) => e.id !== emp.id) })}}
                >
                  ✕
                </button>
                <div style={{ fontWeight: 700, color: TEXT, fontSize: 15, paddingRight: 32, lineHeight: 1.25 }}>{emp.name}</div>
                <div style={{ fontSize: 14, color: GOLD, fontWeight: 700 }}>CHF {emp.rate || "—"} /h</div>
                <span
                  style={{
                    display: "inline-block",
                    alignSelf: "start",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.02em",
                    textTransform: "uppercase",
                    padding: "4px 10px",
                    borderRadius: 6,
                    background: EMPLOYEE_BADGE_BG[i % EMPLOYEE_BADGE_BG.length],
                    color: TEXT,
                    border: `1px solid ${BORDER}`,
                  }}
                >
                  {tr.report.rate}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "materials" && (
        <>
          <div style={{ color: MUTED, fontSize: 12, marginBottom: 8 }}>
            {matCount} {tr.report.material}
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 12,
              alignItems: "center",
              padding: "8px 10px",
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              background: "rgba(0,0,0,0.2)",
            }}
          >
            <input
              placeholder={tr.report.name}
              value={newMaterial.name}
              onChange={(e) => setNewMaterial((p) => ({ ...p, name: e.target.value }))}
              style={{ ...compactInput, flex: "1 1 140px", minWidth: 0 }}
            />
            <input
              placeholder={tr.report.unit}
              value={newMaterial.unit}
              onChange={(e) => setNewMaterial((p) => ({ ...p, unit: e.target.value }))}
              style={{ ...compactInput, flex: "0 1 72px", width: 72 }}
            />
            <input
              placeholder="CHF"
              value={newMaterial.price}
              onChange={(e) => setNewMaterial((p) => ({ ...p, price: e.target.value }))}
              style={{ ...compactInput, flex: "0 1 80px", width: 80 }}
            />
            <input
              placeholder={tr.catalog?.category || "Kategorie"}
              value={newMaterial.category}
              onChange={(e) => setNewMaterial((p) => ({ ...p, category: e.target.value }))}
              list="cat-suggestions"
              style={{ ...compactInput, flex: "1 1 120px", minWidth: 0 }}
            />
            <datalist id="cat-suggestions">{allCategories.map(cat=><option key={cat} value={cat}/>)}</datalist>
            <button
              type="button"
              style={{ ...pBtn, minHeight: 34, padding: "0 14px", fontSize: 13 }}
              onClick={() => {
                if (!newMaterial.name.trim()) return;
                if(!isAdmin){showNotice("⛔ " + (tr?.common?.adminOnly || "Nur Admin")); return;} onSaveCatalog({ ...catalog, materials: [...catalog.materials, { id: Date.now(), ...newMaterial }] });
                setNewMaterial({ name: "", unit: "", price: "", category: "" });
                showNotice("✅ Material gespeichert.");
              }}
            >
              + {tr.common.save}
            </button>
          </div>
          {matCount === 0 && <p style={{ color: MUTED, fontSize: 13 }}>Noch keine Materialien hinterlegt.</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
            
          {[...catalog.materials].filter(mat => !search.trim() || (mat.name||"").toLowerCase().includes(search.toLowerCase())).filter(mat => !selectedCategory || mat.category===selectedCategory).sort((a,b) => (a.name||"").localeCompare(b.name||"")).map((mat) => (
              <div
                key={mat.id}
                style={{
                  border: `1px solid ${BORDER}`,
                  borderRadius: 10,
                  padding: "10px 10px 8px",
                  background: "rgba(255,255,255,0.02)",
                  display: "grid",
                  gap: 6,
                  position: "relative",
                }}
              >
                <button
                  type="button"
                  title="Entfernen"
                  style={{ ...dBtn, position: "absolute", top: 8, right: 8, minHeight: 28, width: 28, padding: 0, fontSize: 14, lineHeight: 1 }}
                  onClick={() => { if(!isAdmin){showNotice("⛔ " + (tr?.common?.adminOnly || "Nur Admin")); return;} onSaveCatalog({ ...catalog, materials: catalog.materials.filter((m) => m.id !== mat.id) })}}
                >
                  ✕
                </button>
                <div style={{ fontWeight: 700, color: TEXT, fontSize: 15, paddingRight: 32, lineHeight: 1.25 }}>{mat.name}</div>
                <div style={{ fontSize: 13, color: MUTED }}>
                  {tr.report.unit}: <span style={{ color: TEXT, fontWeight: 600 }}>{mat.unit || "—"}</span>
                </div>
                <div style={{ fontSize: 14, color: GOLD, fontWeight: 700 }}>CHF {mat.price || "—"}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </SectionCard>
  );
}
