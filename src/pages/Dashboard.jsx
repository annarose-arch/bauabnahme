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
    if (!reportForm.customer) return setNotice("Kunde fehlt!");
    const { error } = await supabase.from("reports").insert([{
      user_id: userId, customer: reportForm.customer, date: reportForm.date,
      description: JSON.stringify({ notes: reportForm.notes, rows: reportForm.rows }),
      status: "offen"
    }]);
    if (error) setNotice(error.message);
    else window.location.reload();
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
          <button onClick={() => setOpenedReport(null)} style={gBtn}>Zurück</button>
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
          <select style={{...iStyle, marginBottom: 15}} value={reportForm.customer} onChange={e => setReportForm({...reportForm, customer: e.target.value})}>
            <option value="">-- Kunde wählen --</option>
            {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <table style={{ width: "100%", marginBottom: 15 }}>
            <thead><tr style={{ color: MUTED, fontSize: 12 }}><th>Name</th><th>Von</th><th>Bis</th><th>P.</th><th>Total</th></tr></thead>
            <tbody>
              {reportForm.rows.map((row, idx) => (
                <tr key={idx}>
                  <td>
                    <select style={iStyle} value={row.worker} onChange={e => updateRow(idx, "worker", e.target.value)}>
                      <option value="">--</option>
                      {staff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </td>
                  <td><input type="time" style={iStyle} value={row.from} onChange={e => updateRow(idx, "from", e.target.value)} /></td>
                  <td><input type="time" style={iStyle} value={row.to} onChange={e => updateRow(idx, "to", e.target.value)} /></td>
                  <td><input type="number" step="0.5" style={iStyle} value={row.pause} onChange={e => updateRow(idx, "pause", e.target.value)} /></td>
                  <td style={{ color: GOLD }}>{row.total}h</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={handleSaveReport} style={pBtn}>Speichern</button>
          <button onClick={() => setView("home")} style={{...gBtn, marginLeft: 10}}>Abbrechen</button>
        </section>
      );
    }

    if (["customers", "material", "staff"].includes(view)) {
      const table = view === "customers" ? "customers" : view === "material" ? "materials" : "staff";
      const list = view === "customers" ? customers : view === "material" ? materials : staff;
      const addItem = async () => {
        if (!newItemName) return;
        let payload = { name: newItemName, user_id: userId };
        if (view === "material") payload.description = JSON.stringify({ amount: reportForm.tempMenge, unit: reportForm.tempEinheit, price: reportForm.tempPreis });
        const { data, error } = await supabase.from(table).insert([payload]).select();
        if (!error) window.location.reload();
      };
      return (
        <section style={{ background: CARD, padding: 25, borderRadius: 15 }}>
          <h2 style={{ color: GOLD, textTransform: "uppercase" }}>{view}</h2>
          <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
            <input style={iStyle} placeholder="Bezeichnung" value={newItemName} onChange={e => setNewItemName(e.target.value)} />
            {view === "material" && (
              <div style={{ display: "flex", gap: 5 }}>
                <input type="number" placeholder="Menge" style={iStyle} onChange={e => setReportForm({...reportForm, tempMenge: e.target.value})} />
                <input placeholder="Einh." style={iStyle} onChange={e => setReportForm({...reportForm, tempEinheit: e.target.value})} />
                <input type="number" placeholder="Preis" style={iStyle} onChange={e => setReportForm({...reportForm, tempPreis: e.target.value})} />
              </div>
            )}
            <button onClick={addItem} style={pBtn}>Hinzufügen</button>
            <button onClick={() => setView("home")} style={gBtn}>Zurück</button>
          </div>
          {list.map(item => (
            <div key={item.id} style={{ padding: 10, borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between" }}>
              <span>{item.name}</span>
              <button onClick={async () => { await supabase.from(table).delete().eq("id", item.id); window.location.reload(); }} style={{ color: DANGER, background: "none", border: "none" }}>Löschen</button>
            </div>
          ))}
        </section>
      );
    }

    return renderHome();
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT }}>
      <header style={{ padding: 20, borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 900, color: GOLD }}>PRO-RAPPORT</span>
        <button onClick={onLogout} style={dBtn}>Logout</button>
      </header>
      <main style={{ padding: 20 }}>
        {notice && <div style={{ color: GOLD, marginBottom: 20 }}>{notice}</div>}
        {renderView()}
      </main>
    </div>
  );
}
