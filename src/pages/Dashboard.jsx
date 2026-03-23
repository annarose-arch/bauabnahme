import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { buildPdfHtml } from "../exportUtils";

// --- STYLES ---
const BG = "#0a0a0a", PANEL = "#141414", CARD = "#1a1a1a";
const TEXT = "#f0ece4", MUTED = "#b9b0a3", GOLD = "#d4a853";
const BORDER = "rgba(212,168,83,0.25)", DANGER = "#e05c5c";

const iStyle = { minHeight: 40, borderRadius: 8, border: `1px solid ${BORDER}`, background: PANEL, color: TEXT, padding: "0 10px", width: "100%" };
const pBtn = { minHeight: 38, borderRadius: 8, border: "none", background: GOLD, color: "#111", fontWeight: 700, cursor: "pointer", padding: "0 14px" };
const gBtn = { minHeight: 38, borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: TEXT, cursor: "pointer", padding: "0 14px" };
const dBtn = { minHeight: 34, borderRadius: 8, border: `1px solid ${DANGER}`, background: "transparent", color: DANGER, cursor: "pointer", padding: "0 10px", fontSize: 13 };

export default function Dashboard({ session, onLogout }) {
  const userId = session?.user?.id;

  // --- STATES ---
  const [view, setView] = useState("home");
  const [reports, setReports] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [staff, setStaff] = useState([]);
  const [notice, setNotice] = useState("");
  const [openedReport, setOpenedReport] = useState(null);
  const [statusFilter, setStatusFilter] = useState("offen");
  const [newItemName, setNewItemName] = useState("");
  const [custNumberPrefix, setCustNumberPrefix] = useState("KD-"); // Standard-Präfix
  const [custFields, setCustFields] = useState({
  address: "",
  contact: "",
  email: "",
  phone: ""
});

  const [reportForm, setReportForm] = useState({
    customer: "", date: new Date().toISOString().split('T')[0], notes: "",
    tempMenge: "", tempEinheit: "Stk", tempPreis: "",
    rows: [{ worker: "", from: "07:00", to: "16:00", pause: "0.5", total: "8.50" }]
  });

  // --- DATA LOADING ---
  useEffect(() => {
    if (!userId) return;
    const loadData = async () => {
      const resR = await supabase.from("reports").select("*").eq("user_id", userId).order("id", { ascending: false });
      if (resR.data) setReports(resR.data);
      const resC = await supabase.from("customers").select("*").eq("user_id", userId).order("name");
      if (resC.data) setCustomers(resC.data);
      const resM = await supabase.from("materials").select("*").eq("user_id", userId).order("name");
      if (resM.data) setMaterials(resM.data);
      const resS = await supabase.from("staff").select("*").eq("user_id", userId).order("name");
      if (resS.data) setStaff(resS.data);
    };
    loadData();
  }, [userId]);

  // --- HELPERS ---
  const calculateRowTotal = (from, to, pause) => {
    const [fH, fM] = from.split(':').map(Number);
    const [tH, tM] = to.split(':').map(Number);
    let diff = (tH * 60 + tM) - (fH * 60 + fM);
    if (diff < 0) diff += 1440;
    return Math.max(0, (diff / 60) - (parseFloat(pause) || 0)).toFixed(2);
  };

  const handleSaveReport = async () => {
    if (!reportForm.customer) return setNotice("⚠️ Bitte Kunde wählen!");
    
    setNotice("Speichere...");

    const { data, error } = await supabase.from("reports").insert([{
      user_id: userId,
      customer: reportForm.customer,
      date: reportForm.date,
      // Wir senden es als reines Objekt, jsonb in Supabase erledigt den Rest
      description: { 
        notes: reportForm.notes, 
        rows: reportForm.rows 
      },
      status: "offen"
    }]).select();

    if (error) {
      console.error("Supabase Error Details:", error);
      // Zeigt dir genau an, welches Feld Probleme macht:
      setNotice("❌ Fehler: " + error.message); 
    } else {
      setNotice("✅ Rapport erfolgreich gespeichert!");
      setReports([data[0], ...reports]);
      setTimeout(() => {
        setNotice("");
        setView("home");
      }, 1500);
    }
  };
  
  // --- VIEWS ---
  const renderHome = () => {
    const filtered = reports.filter(r => r.status === statusFilter);
    return (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 15, marginBottom: 25 }}>
          {["offen", "rechnung", "archiv"].map(s => (
            <div key={s} onClick={() => setStatusFilter(s)} style={{ background: CARD, padding: 20, borderRadius: 12, cursor: "pointer", border: statusFilter === s ? `2px solid ${GOLD}` : `1px solid ${BORDER}` }}>
              <div style={{ color: MUTED, fontSize: 11, textTransform: "uppercase" }}>{s}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: s === "archiv" ? DANGER : GOLD }}>{reports.filter(r => r.status === s).length}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 30, overflowX: "auto" }}>
          <button onClick={() => setView("customers")} style={gBtn}>👥 Kunden</button>
          <button onClick={() => setView("material")} style={gBtn}>📦 Material</button>
          <button onClick={() => setView("staff")} style={gBtn}>👷 Personal</button>
          <button onClick={() => setView("new-report")} style={pBtn}>+ Neuer Rapport</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
          {filtered.map(r => (
            <div key={r.id} onClick={() => setOpenedReport(r)} style={{ background: CARD, padding: 20, borderRadius: 14, border: `1px solid ${BORDER}`, cursor: "pointer" }}>
              <div style={{ fontWeight: 800, color: GOLD }}>{r.customer}</div>
              <div style={{ color: MUTED, fontSize: 12 }}>{r.date}</div>
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
          <button onClick={() => setOpenedReport(null)} style={gBtn}>Zurück</button>
        </section>
      );
    }

   // --- 3. RAPPORT-ERSTELLUNG ---
    if (view === "new-report") {
      const updateRow = (idx, field, val) => {
        const rows = [...reportForm.rows];
        rows[idx][field] = val;
        // Automatische Berechnung der Stunden
        if (field === "from" || field === "to" || field === "pause") {
          rows[idx].total = calculateRowTotal(rows[idx].from, rows[idx].to, rows[idx].pause);
        }
        setReportForm({ ...reportForm, rows });
      };

      const addRow = () => {
        setReportForm({
          ...reportForm,
          rows: [...reportForm.rows, { worker: "", from: "07:00", to: "16:00", pause: "0.5", total: "8.50" }]
        });
      };

      const removeRow = (idx) => {
        const rows = reportForm.rows.filter((_, i) => i !== idx);
        setReportForm({ ...reportForm, rows });
      };

      return (
        <section style={{ background: CARD, padding: 25, borderRadius: 15 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={{ color: GOLD, margin: 0 }}>Neuer Arbeitsrapport</h2>
            <button onClick={() => setView("home")} style={gBtn}>Abbrechen</button>
          </div>

          <div style={{ display: "grid", gap: 15, marginBottom: 25 }}>
            {/* Kundenwahl & Datum */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, color: MUTED, display: "block", marginBottom: 5 }}>Kunde auswählen:</label>
                <select 
                  style={iStyle} 
                  value={reportForm.customer} 
                  onChange={e => setReportForm({...reportForm, customer: e.target.value})}
                >
                  <option value="">-- Bitte wählen --</option>
                  {customers.map(c => <option key={c.id} value={c.name}>{c.name} ({c.customer_number})</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: MUTED, display: "block", marginBottom: 5 }}>Datum:</label>
                <input type="date" style={iStyle} value={reportForm.date} onChange={e => setReportForm({...reportForm, date: e.target.value})} />
              </div>
            </div>

            {/* Zeiterfassung Tabelle */}
            <div style={{ overflowX: "auto", background: PANEL, padding: 15, borderRadius: 10, border: `1px solid ${BORDER}` }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ color: MUTED, fontSize: 12, textAlign: "left" }}>
                    <th style={{ padding: 5 }}>Mitarbeiter</th>
                    <th style={{ padding: 5 }}>Von</th>
                    <th style={{ padding: 5 }}>Bis</th>
                    <th style={{ padding: 5 }}>Pause</th>
                    <th style={{ padding: 5 }}>Std.</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {reportForm.rows.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: 5 }}>
                        <select style={iStyle} value={row.worker} onChange={e => updateRow(idx, "worker", e.target.value)}>
                          <option value="">--</option>
                          {staff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: 5 }}><input type="time" style={iStyle} value={row.from} onChange={e => updateRow(idx, "from", e.target.value)} /></td>
                      <td style={{ padding: 5 }}><input type="time" style={iStyle} value={row.to} onChange={e => updateRow(idx, "to", e.target.value)} /></td>
                      <td style={{ padding: 5 }}><input type="number" step="0.5" style={iStyle} value={row.pause} onChange={e => updateRow(idx, "pause", e.target.value)} /></td>
                      <td style={{ padding: 5, color: GOLD, fontWeight: "bold" }}>{row.total}</td>
                      <td style={{ padding: 5 }}>
                        <button onClick={() => removeRow(idx)} style={{ background: "none", border: "none", color: DANGER, cursor: "pointer" }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={addRow} style={{ ...gBtn, marginTop: 10, width: "100%", borderStyle: "dashed" }}>+ Zeile hinzufügen</button>
            </div>

            {/* Material & Bemerkungen */}
            <div>
              <label style={{ fontSize: 12, color: MUTED, display: "block", marginBottom: 5 }}>Arbeitsbeschrieb / Material / Bemerkungen:</label>
              <textarea 
                style={{ ...iStyle, height: 100, padding: 10, resize: "vertical" }} 
                placeholder="Was wurde gemacht? Welches Material wurde verbraucht?"
                value={reportForm.notes}
                onChange={e => setReportForm({...reportForm, notes: e.target.value})}
              />
            </div>

            <button 
              onClick={handleSaveReport} 
              style={{ ...pBtn, height: 50, fontSize: 16, marginTop: 10 }}
            >
              Rapport finalisieren & speichern
            </button>
          </div>
        </section>
      );
    }
