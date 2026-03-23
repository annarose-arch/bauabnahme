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

  // --- STATES ---
  const [view, setView] = useState("home");
  const [reports, setReports] = useState([]);
  const [notice, setNotice] = useState("");
  const [openedReport, setOpenedReport] = useState(null);
  const [statusFilter, setStatusFilter] = useState("offen");
  const [reportForm, setReportForm] = useState({
    customer: "",
    date: new Date().toISOString().split('T')[0],
    notes: "",
    rows: [{ worker: "", from: "07:00", to: "16:00", pause: "0.5", total: "8.50" }]
  });

  // --- DATEN LADEN ---
  useEffect(() => {
    if (!userId) return;
    const loadReports = async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", userId)
        .order("id", { ascending: false });
      if (error) setNotice(error.message);
      else setReports(data || []);
    };
    loadReports();
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
    const filtered = reports.filter(r => r.status === statusFilter);
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
            <input style={iStyle} placeholder="Kunde" value={reportForm.customer} onChange={e => setReportForm({...reportForm, customer: e.target.value})} />
            <input type="date" style={iStyle} value={reportForm.date} onChange={e => setReportForm({...reportForm, date: e.target.value})} />
          </div>

          <table style={{ width: "100%", marginBottom: 15 }}>
            <thead><tr style={{ color: MUTED, fontSize: 12 }}><th>Mitarbeiter</th><th>Von</th><th>Bis</th><th>Pause</th><th>Total</th></tr></thead>
            <tbody>
              {reportForm.rows.map((row, idx) => (
                <tr key={idx}>
                  <td><input style={iStyle} value={row.worker} onChange={e => updateRow(idx, "worker", e.target.value)} /></td>
                  <td><input type="time" style={iStyle} value={row.from} onChange={e => updateRow(idx, "from", e.target.value)} /></td>
                  <td><input type="time" style={iStyle} value={row.to} onChange={e => updateRow(idx, "to", e.target.value)} /></td>
                  <td><input type="number" step="0.5" style={iStyle} value={row.pause} onChange={e => updateRow(idx, "pause", e.target.value)} /></td>
                  <td style={{ color: GOLD }}>{row.total}h</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <button onClick={() => setReportForm({...reportForm, rows: [...reportForm.rows, {worker:"", from:"07:00", to:"16:00", pause:"0.5", total:"8.50"}]})} style={{...gBtn, width: "100%", marginBottom: 20}}>+ Zeile</button>
          
          <textarea style={{...iStyle, minHeight: 100, marginBottom: 20}} placeholder="Notizen..." value={reportForm.notes} onChange={e => setReportForm({...reportForm, notes: e.target.value})} />
          
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleSave} style={pBtn}>Speichern</button>
            <button onClick={() => setView("home")} style={gBtn}>Abbrechen</button>
          </div>
        </section>
      );
    }

    return renderHome();
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT }}>
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
