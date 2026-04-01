import { useState } from "react";
import { GOLD, BORDER, MUTED, TEXT, iStyle, pBtn, gBtn, dBtn } from "../../lib/constants.js";
import { SectionCard } from "../../components/UI.jsx";

const EMPLOYEE_BADGE_BG = [
  "rgba(212,168,83,0.22)",
  "rgba(100,180,160,0.22)",
  "rgba(130,150,220,0.22)",
  "rgba(200,130,160,0.2)",
];

const compactInput = { ...iStyle, minHeight: 34, fontSize: 13, padding: "6px 10px" };

export function KatalogView({ catalog, onSaveCatalog, showNotice }) {
  const [tab, setTab] = useState("employees");
  const [newEmployee, setNewEmployee] = useState({ name: "", rate: "" });
  const [newMaterial, setNewMaterial] = useState({ name: "", unit: "", price: "" });

  const empCount = catalog.employees?.length ?? 0;
  const matCount = catalog.materials?.length ?? 0;

  return (
    <SectionCard>
      <h2 style={{ marginTop: 0 }}>📦 Katalog</h2>
      <p style={{ color: MUTED, marginTop: 0, marginBottom: 10, fontSize: 13, lineHeight: 1.45 }}>
        Mitarbeiter und Materialien für Rapporte. Auswahl im Rapport-Formular per Dropdown.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10, alignItems: "center" }}>
        {[
          ["employees", "👷 Mitarbeiter", empCount],
          ["materials", "🔧 Material", matCount],
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

      {tab === "employees" && (
        <>
          <div style={{ color: MUTED, fontSize: 12, marginBottom: 8 }}>
            {empCount} Mitarbeiter gespeichert
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
                onSaveCatalog({ ...catalog, employees: [...catalog.employees, { id: Date.now(), ...newEmployee }] });
                setNewEmployee({ name: "", rate: "" });
                showNotice("✅ Mitarbeiter gespeichert.");
              }}
            >
              + Hinzufügen
            </button>
          </div>
          {empCount === 0 && <p style={{ color: MUTED, fontSize: 13 }}>Noch keine Mitarbeiter hinterlegt.</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            {[...catalog.employees].sort((a,b) => (a.name||"").localeCompare(b.name||"")).map((emp, i) => (
              <div
                key={emp.id}
                style={{
                  border: `1px solid ${BORDER}`,
                  borderRadius: 10,
                  padding: "12px 12px 10px",
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
                  onClick={() => onSaveCatalog({ ...catalog, employees: catalog.employees.filter((e) => e.id !== emp.id) })}
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
                  Stundensatz
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "materials" && (
        <>
          <div style={{ color: MUTED, fontSize: 12, marginBottom: 8 }}>
            {matCount} {matCount === 1 ? "Material" : "Materialien"} gespeichert
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
              placeholder="Bezeichnung"
              value={newMaterial.name}
              onChange={(e) => setNewMaterial((p) => ({ ...p, name: e.target.value }))}
              style={{ ...compactInput, flex: "1 1 140px", minWidth: 0 }}
            />
            <input
              placeholder="Einheit"
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
            <button
              type="button"
              style={{ ...pBtn, minHeight: 34, padding: "0 14px", fontSize: 13 }}
              onClick={() => {
                if (!newMaterial.name.trim()) return;
                onSaveCatalog({ ...catalog, materials: [...catalog.materials, { id: Date.now(), ...newMaterial }] });
                setNewMaterial({ name: "", unit: "", price: "" });
                showNotice("✅ Material gespeichert.");
              }}
            >
              + Hinzufügen
            </button>
          </div>
          {matCount === 0 && <p style={{ color: MUTED, fontSize: 13 }}>Noch keine Materialien hinterlegt.</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            {catalog.materials.map((mat) => (
              <div
                key={mat.id}
                style={{
                  border: `1px solid ${BORDER}`,
                  borderRadius: 10,
                  padding: "12px 12px 10px",
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
                  onClick={() => onSaveCatalog({ ...catalog, materials: catalog.materials.filter((m) => m.id !== mat.id) })}
                >
                  ✕
                </button>
                <div style={{ fontWeight: 700, color: TEXT, fontSize: 15, paddingRight: 32, lineHeight: 1.25 }}>{mat.name}</div>
                <div style={{ fontSize: 13, color: MUTED }}>
                  Einheit: <span style={{ color: TEXT, fontWeight: 600 }}>{mat.unit || "—"}</span>
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
