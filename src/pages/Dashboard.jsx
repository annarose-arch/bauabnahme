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
          <button onClick={handleSaveReport} style={pBtn}>Speichern</button>
          <button onClick={() => setView("home")} style={{...gBtn, marginLeft: 10}}>Abbrechen</button>
        </section>
      );
    }

   // --- 1. KUNDENVERWALTUNG (Mit Adresse, Tel, E-Mail & Auto-Nr) ---
    if (view === "customers") {
      const addItem = async () => {
        if (!newItemName) return;
        
        // Kundennummer generieren (Präfix + Zufallszahl/Zeit)
        const newCustNo = `${custNumberPrefix}${Math.floor(1000 + Math.random() * 9000)}`;
        
        const payload = { 
          name: newItemName, 
          user_id: userId,
          customer_number: newCustNo,
          address: custFields.address,
          contact_person: custFields.contact,
          email: custFields.email,
          phone: custFields.phone
        };

        const { data, error } = await supabase.from("customers").insert([payload]).select();
        if (!error && data) {
          setCustomers([...customers, data[0]]);
          setNewItemName("");
          setCustFields({ address: "", contact: "", email: "", phone: "" });
          setNotice(`✅ Kunde ${newCustNo} erstellt`);
          setTimeout(() => setNotice(""), 2000);
        } else {
          setNotice("Fehler: " + error?.message);
        }
      };

      return (
        <section style={{ background: CARD, padding: 25, borderRadius: 15 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={{ color: GOLD, margin: 0 }}>Kundenstamm</h2>
            <button onClick={() => setView("home")} style={gBtn}>Zurück</button>
          </div>

          <div style={{ background: PANEL, padding: 20, borderRadius: 12, marginBottom: 25, border: `1px solid ${BORDER}` }}>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: MUTED }}>Präfix:</span>
                <input style={{...iStyle, width: 80}} value={custNumberPrefix} onChange={e => setCustNumberPrefix(e.target.value)} />
              </div>
              
              <input style={iStyle} placeholder="Firmenname / Name *" value={newItemName} onChange={e => setNewItemName(e.target.value)} />
              <input style={iStyle} placeholder="Adresse (Strasse, PLZ, Ort)" value={custFields.address} onChange={e => setCustFields({...custFields, address: e.target.value})} />
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <input style={iStyle} placeholder="Ansprechperson" value={custFields.contact} onChange={e => setCustFields({...custFields, contact: e.target.value})} />
                <input style={iStyle} placeholder="Telefon" value={custFields.phone} onChange={e => setCustFields({...custFields, phone: e.target.value})} />
              </div>
              
              <input style={iStyle} placeholder="E-Mail" value={custFields.email} onChange={e => setCustFields({...custFields, email: e.target.value})} />
              <button onClick={addItem} style={pBtn}>+ Kunde speichern</button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {customers.map(c => (
              <div key={c.id} style={{ background: PANEL, padding: 15, borderRadius: 10, border: `1px solid ${BORDER}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <b style={{ color: GOLD }}>{c.customer_number}</b>
                  <button onClick={async () => { await supabase.from("customers").delete().eq("id", c.id); setCustomers(customers.filter(i => i.id !== c.id)); }} style={{ color: DANGER, background: "none", border: "none", cursor: "pointer" }}>Löschen</button>
                </div>
                <div style={{ fontWeight: "bold", fontSize: 16 }}>{c.name}</div>
                <div style={{ fontSize: 13, color: MUTED }}>{c.address}</div>
                <div style={{ fontSize: 12, marginTop: 5, color: GOLD }}>📞 {c.phone} | ✉️ {c.email}</div>
              </div>
            ))}
          </div>
        </section>
      );
    }

    // --- 2. MATERIAL & PERSONAL (Mit Preisen/Mengen) ---
    if (view === "material" || view === "staff") {
      const table = view === "material" ? "materials" : "staff";
      const list = view === "material" ? materials : staff;
      const title = view === "material" ? "Materialliste" : "Mitarbeiter";

      const addItem = async () => {
        if (!newItemName) return;
        const payload = { 
          name: newItemName, 
          user_id: userId,
          description: JSON.stringify({
            amount: reportForm.tempMenge || "0",
            unit: reportForm.tempEinheit || (view === "material" ? "Stk" : "Std"),
            price: reportForm.tempPreis || "0"
          })
        };
        const { data, error } = await supabase.from(table).insert([payload]).select();
        if (!error && data) {
          if (view === "material") setMaterials([...materials, data[0]]); else setStaff([...staff, data[0]]);
          setNewItemName("");
          setNotice("✅ Eintrag gespeichert");
          setTimeout(() => setNotice(""), 2000);
        }
      };

      return (
        <section style={{ background: CARD, padding: 25, borderRadius: 15 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={{ color: GOLD, margin: 0 }}>{title}</h2>
            <button onClick={() => setView("home")} style={gBtn}>Zurück</button>
          </div>

          <div style={{ background: PANEL, padding: 15, borderRadius: 10, marginBottom: 20, border: `1px solid ${BORDER}` }}>
            <div style={{ display: "grid", gap: 10 }}>
              <input style={iStyle} placeholder="Bezeichnung / Name" value={newItemName} onChange={e => setNewItemName(e.target.value)} />
              <div style={{ display: "flex", gap: 5 }}>
                <input type="number" placeholder="Menge" style={iStyle} onChange={e => setReportForm({...reportForm, tempMenge: e.target.value})} />
                <input placeholder="Einh." style={iStyle} onChange={e => setReportForm({...reportForm, tempEinheit: e.target.value})} />
                <input type="number" placeholder="Preis/Lohn" style={iStyle} onChange={e => setReportForm({...reportForm, tempPreis: e.target.value})} />
              </div>
              <button onClick={addItem} style={pBtn}>+ Hinzufügen</button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {list.map(item => {
              let details = { amount: 0, unit: "", price: 0 };
              try { if(item.description) details = JSON.parse(item.description); } catch(e) {}
              return (
                <div key={item.id} style={{ background: PANEL, padding: 12, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${BORDER}` }}>
                  <div>
                    <div style={{ fontWeight: "bold" }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: GOLD }}>{details.amount} {details.unit} | {details.price} CHF</div>
                  </div>
                  <button onClick={async () => { await supabase.from(table).delete().eq("id", item.id); if (view === "material") setMaterials(materials.filter(m => m.id !== item.id)); else setStaff(staff.filter(s => s.id !== item.id)); }} style={{ color: DANGER, background: "none", border: "none", cursor: "pointer" }}>Löschen</button>
                </div>
              );
            })}
          </div>
        </section>
      );
    }
