import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "../supabase";
import { buildPdfHtml, formatDateCH, generateInvoice } from "../exportUtils";

// --- STYLES & HILFSFUNKTIONEN ---
const BG = "#0a0a0a", PANEL = "#141414", CARD = "#1a1a1a";
const TEXT = "#f0ece4", MUTED = "#b9b0a3", GOLD = "#d4a853";
const BORDER = "rgba(212,168,83,0.25)", DANGER = "#e05c5c";

const iStyle = { minHeight: 40, borderRadius: 8, border: `1px solid ${BORDER}`, background: PANEL, color: TEXT, padding: "0 10px", width: "100%" };
const pBtn = { minHeight: 38, borderRadius: 8, border: "none", background: GOLD, color: "#111", fontWeight: 700, cursor: "pointer", padding: "0 14px" };
const gBtn = { minHeight: 38, borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: TEXT, cursor: "pointer", padding: "0 14px" };
const dBtn = { minHeight: 34, borderRadius: 8, border: `1px solid ${DANGER}`, background: "transparent", color: DANGER, cursor: "pointer", padding: "0 10px", fontSize: 13 };

function parseJson(v, fb = {}) { try { return JSON.parse(v) || fb; } catch { return fb; } }
function parseReport(r) { return parseJson(r?.description, {}); }

const calculateRowTotal = (from, to, pause) => {
  if (!from || !to) return "0.00";
  const [fH, fM] = from.split(':').map(Number);
  const [tH, tM] = to.split(':').map(Number);
  let diff = (tH * 60 + tM) - (fH * 60 + fM);
  if (diff < 0) diff += 1440; 
  const total = (diff / 60) - (parseFloat(pause) || 0);
  return Math.max(0, total).toFixed(2);
};

export default function Dashboard({ session, onLogout }) {
  const userId = session?.user?.id;

  // --- HIER MÜSSEN ALLE STATES STEHEN ---
  const [view, setView] = useState("home");
  const [reports, setReports] = useState([]);
  const [notice, setNotice] = useState("");
  const [openedReport, setOpenedReport] = useState(null);
  const [statusFilter, setStatusFilter] = useState("offen");

  // Diese 4 Zeilen müssen HIER hin (innerhalb der Funktion):
  const [customers, setCustomers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [staff, setStaff] = useState([]);
  const [newItemName, setNewItemName] = useState(""); 

  const [reportForm, setReportForm] = useState({
    customer: "",
    date: new Date().toISOString().split('T')[0],
    notes: "",
    rows: [{ worker: "", from: "07:00", to: "16:00", pause: "0.5", total: "8.50" }]
  });

  // ... ab hier kommt dein useEffect ...
  // --- DATEN LADEN ---
  useEffect(() => {
    if (!userId) return;
    const loadAllData = async () => {
      // Rapporte laden
      const resR = await supabase.from("reports").select("*").eq("user_id", userId).order("id", { ascending: false });
      if (resR.data) setReports(resR.data);

      // Kunden laden
      const resC = await supabase.from("customers").select("*").eq("user_id", userId).order("name");
      if (resC.data) setCustomers(resC.data);

      // Material laden
      const resM = await supabase.from("materials").select("*").eq("user_id", userId).order("name");
      if (resM.data) setMaterials(resM.data);

      // Mitarbeiter laden
      const resS = await supabase.from("staff").select("*").eq("user_id", userId).order("name");
      if (resS.data) setStaff(resS.data);
    };
    loadAllData();
  }, [userId]);

  // --- AKTIONEN ---
const handleSave = async () => {
  if (!reportForm.customer) {
    setNotice("Bitte einen Kunden wählen!");
    return;
  }

  // Wir bauen das Objekt für die Datenbank
  const newEntry = {
    user_id: userId, // Ganz wichtig!
    customer: reportForm.customer,
    date: reportForm.date,
    description: JSON.stringify({
      notes: reportForm.notes,
      rows: reportForm.rows // Hier stecken deine Stundenzeilen drin
    }),
    status: "offen"
  };

  const { data, error } = await supabase
    .from("reports")
    .insert([newEntry])
    .select(); // .select() hilft uns zu prüfen, ob es geklappt hat

  if (error) {
    console.error("Speicherfehler:", error);
    setNotice("Fehler beim Speichern: " + error.message);
  } else {
    setNotice("✅ Rapport erfolgreich gespeichert!");
    
    // Wir aktualisieren die lokale Liste sofort, ohne Neuladen
    setReports([data[0], ...reports]); 
    
    // Zurück zur Übersicht
    setTimeout(() => {
      setNotice("");
      setView("home");
    }, 1000);
  }
};

  const openPDF = (report) => {
    const p = parseReport(report);
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(buildPdfHtml(report, p, {}));
      win.document.close();
    }
  };

  // --- SUB-VIEWS ---
  const renderHome = () => {
   const filtered = reports.filter(r => r.status === (statusFilter || "offen"));
    return (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 15, marginBottom: 25 }}>
          <div onClick={() => setStatusFilter("offen")} style={{ background: CARD, padding: 20, borderRadius: 12, cursor: "pointer", border: statusFilter === "offen" ? `2px solid ${GOLD}` : `1px solid ${BORDER}` }}>
            <div style={{ color: MUTED, fontSize: 11 }}>OFFEN</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: GOLD }}>{reports.filter(r => r.status === "offen").length}</div>
          </div>
          <div onClick={() => setStatusFilter("rechnung")} style={{ background: CARD, padding: 20, borderRadius: 12, cursor: "pointer", border: statusFilter === "rechnung" ? `2px solid ${GOLD}` : `1px solid ${BORDER}` }}>
            <div style={{ color: MUTED, fontSize: 11 }}>RECHNUNG</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: TEXT }}>{reports.filter(r => r.status === "rechnung").length}</div>
          </div>
          <div onClick={() => setStatusFilter("archiv")} style={{ background: CARD, padding: 20, borderRadius: 12, cursor: "pointer", border: statusFilter === "archiv" ? `2px solid ${DANGER}` : `1px solid ${BORDER}` }}>
            <div style={{ color: MUTED, fontSize: 11 }}>ARCHIV</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: DANGER }}>{reports.filter(r => r.status === "archiv").length}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 30 }}>
            <button onClick={() => setView("new-report")} style={pBtn}>+ Neuer Rapport</button>
            <button onClick={() => setView("home")} style={gBtn}>🏠 Home</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
          {filtered.map(r => (
            <div key={r.id} onClick={() => setOpenedReport(r)} style={{ background: CARD, padding: 20, borderRadius: 14, border: `1px solid ${BORDER}`, cursor: "pointer" }}>
              <div style={{ fontWeight: 800, color: GOLD }}>{r.customer}</div>
              <div style={{ color: MUTED, fontSize: 12 }}>{r.date}</div>
              <div style={{ marginTop: 10, fontSize: 13, opacity: 0.7 }}>{parseReport(r).notes?.substring(0, 40)}...</div>
            </div>
          ))}
        </div>
      </>
    );
  };

  const renderView = () => {
    if (openedReport) {
      return (
        <section style={{ background: CARD, padding: 25, borderRadius: 15 }}>
          <h2 style={{ color: GOLD }}>{openedReport.customer}</h2>
          <p>{openedReport.date}</p>
          <button onClick={() => openPDF(openedReport)} style={pBtn}>📄 PDF öffnen</button>
          <button onClick={() => setOpenedReport(null)} style={{...gBtn, marginLeft: 10}}>Schließen</button>
        </section>
      );
    }

   if (view === "new-report") {
      const updateRow = (idx, field, val) => {
        const rows = [...reportForm.rows];
        rows[idx][field] = val;
        rows[idx].total = calculateRowTotal(rows[idx].from, rows[idx].to, rows[idx].pause);
        setReportForm({ ...reportForm, rows });
      };

      return (
        <section style={{ background: CARD, padding: 25, borderRadius: 15 }}>
          <h2 style={{ color: GOLD }}>Neuer Rapport</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15, marginBottom: 20 }}>
            {/* KUNDEN-DROPDOWN */}
            <div>
              <label style={{ fontSize: 11, color: MUTED, display: "block", marginBottom: 4 }}>KUNDE</label>
              <select 
                style={iStyle} 
                value={reportForm.customer} 
                onChange={e => setReportForm({...reportForm, customer: e.target.value})}
              >
                <option value="">-- Kunde wählen --</option>
                {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, color: MUTED, display: "block", marginBottom: 4 }}>DATUM</label>
              <input type="date" style={iStyle} value={reportForm.date} onChange={e => setReportForm({...reportForm, date: e.target.value})} />
            </div>
          </div>

          <table style={{ width: "100%", marginBottom: 15 }}>
            <thead>
              <tr style={{ color: MUTED, fontSize: 12, textAlign: "left" }}>
                <th>Mitarbeiter</th>
                <th>Von</th>
                <th>Bis</th>
                <th>Pause</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {reportForm.rows.map((row, idx) => (
                <tr key={idx}>
                  {/* MITARBEITER-DROPDOWN IN DER ZEILE */}
                  <td>
                    <select 
                      style={iStyle} 
                      value={row.worker} 
                      onChange={e => updateRow(idx, "worker", e.target.value)}
                    >
                      <option value="">-- Name --</option>
                      {staff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </td>
                  <td><input type="time" style={iStyle} value={row.from} onChange={e => updateRow(idx, "from", e.target.value)} /></td>
                  <td><input type="time" style={iStyle} value={row.to} onChange={e => updateRow(idx, "to", e.target.value)} /></td>
                  <td><input type="number" step="0.5" style={{...iStyle, width: '60px'}} value={row.pause} onChange={e => updateRow(idx, "pause", e.target.value)} /></td>
                  <td style={{ color: GOLD, fontWeight: 'bold', paddingLeft: '10px' }}>{row.total}h</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <button 
            onClick={() => setReportForm({...reportForm, rows: [...reportForm.rows, {worker:"", from:"07:00", to:"16:00", pause:"0.5", total:"8.50"}]})} 
            style={{...gBtn, width: "100%", marginBottom: 20, borderStyle: 'dashed'}}
          >
            + Weitere Zeile (Mitarbeiter) hinzufügen
          </button>
          
          <label style={{ fontSize: 11, color: MUTED, display: "block", marginBottom: 4 }}>NOTIZEN / MATERIAL / KRANRAPPORT</label>
          <textarea 
            style={{...iStyle, minHeight: 120, marginBottom: 20, paddingTop: 10}} 
            placeholder="Hier Materialliste oder Kranzeiten eintragen..." 
            value={reportForm.notes} 
            onChange={e => setReportForm({...reportForm, notes: e.target.value})} 
          />
          
          <div style={{ display: "flex", gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setView("home")} style={gBtn}>Abbrechen</button>
            <button onClick={handleSave} style={{...pBtn, padding: '0 30px'}}>Rapport Speichern</button>
          </div>
        </section>
      );
    }
// --- STAMMDATEN ANSICHT (Kunden, Material, Mitarbeiter) ---
    if (["customers", "material", "staff"].includes(view)) {
      const table = view === "customers" ? "customers" : view === "material" ? "materials" : "staff";
      const list = view === "customers" ? customers : view === "material" ? materials : staff;
      const title = view === "customers" ? "Kundenstamm" : view === "material" ? "Materialliste" : "Mitarbeiter";

      const addItem = async () => {
        if (!newItemName) return;
        const { data, error } = await supabase.from(table).insert([{ name: newItemName, user_id: userId }]).select();
        if (!error) {
          if (view === "customers") setCustomers([...customers, data[0]]);
          if (view === "material") setMaterials([...materials, data[0]]);
          if (view === "staff") setStaff([...staff, data[0]]);
          setNewItemName("");
        }
      };

      const deleteItem = async (id) => {
        const { error } = await supabase.from(table).delete().eq("id", id);
        if (!error) {
          if (view === "customers") setCustomers(customers.filter(i => i.id !== id));
          if (view === "material") setMaterials(materials.filter(i => i.id !== id));
          if (view === "staff") setStaff(staff.filter(i => i.id !== id));
        }
      };

      return (
        <section style={{ background: CARD, padding: 25, borderRadius: 15 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={{ color: GOLD, margin: 0 }}>{title}</h2>
            <button onClick={() => setView("home")} style={gBtn}>Zurück</button>
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <input style={iStyle} placeholder="Name..." value={newItemName} onChange={(e) => setNewItemName(e.target.value)} />
            <button onClick={addItem} style={pBtn}>Hinzufügen</button>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {list.map(item => (
              <div key={item.id} style={{ background: PANEL, padding: "12px 15px", borderRadius: 10, display: "flex", justifyContent: "space-between", border: `1px solid ${BORDER}` }}>
                <span>{item.name}</span>
                <button onClick={() => deleteItem(item.id)} style={{ background: "none", border: "none", color: DANGER, cursor: "pointer" }}>Löschen</button>
              </div>
            ))}
          </div>
        </section>
      );
    }

    // WICHTIG: Wenn keine View aktiv ist, zeige das Home-Grid
    return renderHome();
  }; // <--- Schließt renderView

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#f0ece4" }}>
      <header style={{ padding: 20, borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 900, color: GOLD, fontSize: 20 }}>PRO-RAPPORT</span>
        <button onClick={onLogout} style={dBtn}>Logout</button>
      </header>
      <main style={{ padding: 20 }}>
        {notice && <div style={{ background: GOLD, color: "#000", padding: 10, borderRadius: 8, marginBottom: 20 }}>{notice}</div>}
        {renderView()}
      </main>
    </div>
  );
} 
