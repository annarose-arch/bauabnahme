import { useState } from "react";
import { GOLD, BORDER, MUTED, TEXT, iStyle, pBtn, gBtn, dBtn } from "../../lib/constants";
import { SectionCard } from "../../components/UI";

export function KatalogView({ catalog, onSaveCatalog, showNotice }) {
  const [tab, setTab] = useState("employees");
  const [newEmployee, setNewEmployee] = useState({ name: "", rate: "" });
  const [newMaterial, setNewMaterial] = useState({ name: "", unit: "", price: "" });

  return (
    <SectionCard>
      <h2 style={{ marginTop: 0 }}>📦 Katalog</h2>
      <p style={{ color: MUTED, marginTop: 0, fontSize: 14 }}>
        Hinterlege deine Mitarbeiter mit Stundensätzen und Materialien mit Preisen. Diese kannst du beim Erstellen von Rapporten per Dropdown auswählen.
      </p>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[["employees", "👷 Mitarbeiter"], ["materials", "🔧 Material"]].map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            style={{ ...gBtn, fontWeight: tab === k ? 700 : 400, borderColor: tab === k ? GOLD : BORDER, color: tab === k ? GOLD : TEXT, background: tab === k ? "rgba(212,168,83,0.1)" : "transparent" }}>
            {l}
          </button>
        ))}
      </div>

      {/* Mitarbeiter */}
      {tab === "employees" && <>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginBottom: 12, alignItems: "center" }}>
          <input placeholder="Name (z.B. Max Muster)" value={newEmployee.name} onChange={e => setNewEmployee(p => ({ ...p, name: e.target.value }))} style={iStyle} />
          <input placeholder="CHF/h (z.B. 110)" value={newEmployee.rate} onChange={e => setNewEmployee(p => ({ ...p, rate: e.target.value }))} style={iStyle} />
          <button type="button" style={pBtn} onClick={() => {
            if (!newEmployee.name.trim()) return;
            onSaveCatalog({ ...catalog, employees: [...catalog.employees, { id: Date.now(), ...newEmployee }] });
            setNewEmployee({ name: "", rate: "" });
            showNotice("✅ Mitarbeiter gespeichert.");
          }}>+ Hinzufügen</button>
        </div>
        {catalog.employees.length === 0 && <p style={{ color: MUTED, fontSize: 13 }}>Noch keine Mitarbeiter hinterlegt.</p>}
        {catalog.employees.map(emp => (
          <div key={emp.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong>{emp.name}</strong>
              {emp.rate && <span style={{ color: MUTED, fontSize: 13, marginLeft: 10 }}>CHF {emp.rate}/h</span>}
            </div>
            <button type="button" style={dBtn} onClick={() => onSaveCatalog({ ...catalog, employees: catalog.employees.filter(e => e.id !== emp.id) })}>✕</button>
          </div>
        ))}
      </>}

      {/* Material */}
      {tab === "materials" && <>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, marginBottom: 12, alignItems: "center" }}>
          <input placeholder="Bezeichnung (z.B. Beton B25)" value={newMaterial.name} onChange={e => setNewMaterial(p => ({ ...p, name: e.target.value }))} style={iStyle} />
          <input placeholder="Einheit (z.B. m³)" value={newMaterial.unit} onChange={e => setNewMaterial(p => ({ ...p, unit: e.target.value }))} style={iStyle} />
          <input placeholder="CHF Preis" value={newMaterial.price} onChange={e => setNewMaterial(p => ({ ...p, price: e.target.value }))} style={iStyle} />
          <button type="button" style={pBtn} onClick={() => {
            if (!newMaterial.name.trim()) return;
            onSaveCatalog({ ...catalog, materials: [...catalog.materials, { id: Date.now(), ...newMaterial }] });
            setNewMaterial({ name: "", unit: "", price: "" });
            showNotice("✅ Material gespeichert.");
          }}>+ Hinzufügen</button>
        </div>
        {catalog.materials.length === 0 && <p style={{ color: MUTED, fontSize: 13 }}>Noch keine Materialien hinterlegt.</p>}
        {catalog.materials.map(mat => (
          <div key={mat.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong>{mat.name}</strong>
              {mat.unit && <span style={{ color: MUTED, fontSize: 13, marginLeft: 8 }}>{mat.unit}</span>}
              {mat.price && <span style={{ color: GOLD, fontSize: 13, marginLeft: 10 }}>CHF {mat.price}</span>}
            </div>
            <button type="button" style={dBtn} onClick={() => onSaveCatalog({ ...catalog, materials: catalog.materials.filter(m => m.id !== mat.id) })}>✕</button>
          </div>
        ))}
      </>}
    </SectionCard>
  );
}
