import { useEffect, useState } from "react";
import { COLORS, inputStyle, primaryBtn } from "../../lib/constants.js";
import { Panel } from "../../components/UI.jsx";

const STORAGE_KEY = "bauabnahme_katalog_items";

function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function KatalogView() {
  const [items, setItems] = useState(() => loadItems());
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("Stk.");
  const [price, setPrice] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = () => {
    if (!name.trim()) return;
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setItems((prev) => [
      { id, name: name.trim(), unit: unit.trim() || "Stk.", price: price.trim() },
      ...prev
    ]);
    setName("");
    setUnit("Stk.");
    setPrice("");
  };

  const removeItem = (id) => setItems((prev) => prev.filter((x) => x.id !== id));

  return (
    <Panel>
      <h2 style={{ marginTop: 0 }}>Material-Katalog</h2>
      <p style={{ color: COLORS.muted, marginTop: 0 }}>
        Standard-Artikel für Rapporte und Rechnungen. Daten werden lokal im Browser gespeichert.
      </p>
      <div style={{ display: "grid", gap: 10, marginBottom: 16, maxWidth: 560 }}>
        <input placeholder="Bezeichnung" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input placeholder="Einheit (z. B. Stk., m²)" value={unit} onChange={(e) => setUnit(e.target.value)} style={inputStyle} />
          <input placeholder="Referenzpreis CHF (optional)" value={price} onChange={(e) => setPrice(e.target.value)} style={inputStyle} />
        </div>
        <button type="button" onClick={addItem} style={{ ...primaryBtn, alignSelf: "start" }}>Artikel speichern</button>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {items.length === 0 ? (
          <div style={{ color: COLORS.muted }}>Noch keine Artikel.</div>
        ) : (
          items.map((row) => (
            <div
              key={row.id}
              style={{
                border: `1px solid ${COLORS.border}`,
                borderRadius: 10,
                padding: "10px 12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap"
              }}
            >
              <div>
                <strong>{row.name}</strong>
                <span style={{ color: COLORS.muted, marginLeft: 8 }}>{row.unit}</span>
                {row.price ? <span style={{ color: COLORS.gold, marginLeft: 8 }}>CHF {row.price}</span> : null}
              </div>
              <button
                type="button"
                onClick={() => removeItem(row.id)}
                style={{ minHeight: 34, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.text, padding: "0 12px", cursor: "pointer" }}
              >
                Entfernen
              </button>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}
