import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "../supabase";
import { buildPdfHtml, formatDateCH, generateInvoice } from "../exportUtils";

const BG = "#0a0a0a", PANEL = "#141414", CARD = "#1a1a1a";
const TEXT = "#f0ece4", MUTED = "#b9b0a3", GOLD = "#d4a853";
const BORDER = "rgba(212,168,83,0.25)", DANGER = "#e05c5c";

const iStyle = { minHeight: 40, borderRadius: 8, border: `1px solid ${BORDER}`, background: PANEL, color: TEXT, padding: "0 10px" };
const pBtn = { minHeight: 38, borderRadius: 8, border: "none", background: GOLD, color: "#111", fontWeight: 700, cursor: "pointer", padding: "0 14px" };
const gBtn = { minHeight: 38, borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: TEXT, cursor: "pointer", padding: "0 14px" };
const dBtn = { minHeight: 34, borderRadius: 8, border: `1px solid ${DANGER}`, background: "transparent", color: DANGER, cursor: "pointer", padding: "0 10px", fontSize: 13 };

function toNum(v) { const n = parseFloat(v); return isFinite(n) ? n : 0; }

function calcHours(from, to) {
  if (!from || !to || from.length < 4 || to.length < 4) return 0;
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  if ([fh, fm, th, tm].some(isNaN)) return 0;
  const s = fh * 60 + fm;
  let e = th * 60 + tm;
  if (e <= s) e += 1440;
  const d = e - s;
  if (d <= 0 || d > 1440) return 0;
  return Math.round(d / 60 * 100) / 100;
}

function parseJson(v, fb = {}) { try { return JSON.parse(v) || fb; } catch { return fb; } }
function parseReport(r) { return parseJson(r?.description, {}); }
function parseCustomerMeta(c) { return parseJson(c?.address, {}); }

function SignaturePad({ value, onChange }) {
  const ref = useRef(null);
  const drawing = useRef(false);
  const last = useRef(null);
  const getPos = (e, c) => {
    const r = c.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (cx - r.left) * (c.width / r.width), y: (cy - r.top) * (c.height / r.height) };
  };
  const start = (e) => { e.preventDefault(); drawing.current = true; last.current = getPos(e, ref.current); };
  const draw = (e) => {
    e.preventDefault();
    if (!drawing.current) return;
    const c = ref.current, ctx = c.getContext("2d"), p = getPos(e, c);
    ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last.current = p;
  };
  const end = (e) => { e.preventDefault(); if (!drawing.current) return; drawing.current = false; onChange(ref.current.toDataURL()); };
  const clear = () => { ref.current.getContext("2d").clearRect(0, 0, 600, 160); onChange(""); };
  useEffect(() => { if (!value && ref.current) ref.current.getContext("2d").clearRect(0, 0, 600, 160); }, [value]);
  return (
    <div>
      <canvas ref={ref} width={600} height={160}
        style={{ display: "block", width: "100%", height: 160, border: `1px solid ${BORDER}`, borderRadius: 8, background: "#111", touchAction: "none", cursor: "crosshair" }}
        onMouseDown={start} onMouseMove={draw} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={draw} onTouchEnd={end} />
      <button type="button" onClick={clear} style={{ ...gBtn, marginTop: 6, fontSize: 13, minHeight: 32 }}>Unterschrift löschen</button>
    </div>
  );
}

function PhotoUpload({ label, value, onChange }) {
  const ref = useRef(null);
  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => onChange(ev.target.result);
    r.readAsDataURL(f);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ color: MUTED, fontSize: 13 }}>{label}</span>
      {value ? (
        <div style={{ position: "relative" }}>
          <img src={value} alt={label} style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 8, border: `1px solid ${BORDER}` }} />
          <button type="button" onClick={() => onChange("")} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: 13 }}>✕</button>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()} style={{ ...gBtn, minHeight: 80, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 4, fontSize: 13, color: MUTED }}>
          <span style={{ fontSize: 24 }}>📷</span><span>Foto hinzufügen</span>
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={onFile} />
    </div>
  );
}

export default function Dashboard({ session, onLogout }) {
  const userId = session?.user?.id;

  // HIER DIE STATES:
  const [view, setView] = useState("home");
  const [reports, setReports] = useState([]);
  const [notice, setNotice] = useState("");
  const [openedReport, setOpenedReport] = useState(null); // Das hat gefehlt!
  const [statusFilter, setStatusFilter] = useState("offen");
  const [reportForm, setReportForm] = useState({
    customer: "",
    date: new Date().toISOString().split('T')[0],
    notes: "",
    rows: [],
    materialRows: []
  });
  
  useEffect(() => {
    const loadData = async () => {
      if (!userId) return;
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", userId)
        .order("id", { ascending: false });

      if (error) {
        setNotice("Fehler: " + error.message);
      } else {
        setReports(data || []);
      }
    };
    loadData();
  }, [userId]);

  // 2. Hilfsfunktionen
  const openPDF = (report) => {
    const p = parseReport(report);
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(buildPdfHtml(report, p, session?.user?.user_metadata || {}));
      win.document.close();
    }
  };

  const handleSave = async () => {
    if (!reportForm.customer) {
      setNotice("Bitte einen Kunden angeben.");
      return;
    }
    const { error } = await supabase.from("reports").insert([{
      user_id: userId,
      customer: reportForm.customer,
      date: reportForm.date,
      description: JSON.stringify({ 
        notes: reportForm.notes,
        rows: reportForm.rows, // Hier sind deine Arbeitszeiten drin
        materialRows: reportForm.materialRows 
      }),
      status: "offen"
    }]);

    if (error) {
      setNotice("Fehler: " + error.message);
    } else {
      setNotice("Erfolgreich gespeichert!");
      setView("home");
      window.location.reload(); 
    }
  };

const renderHome = () => {
    const filtered = reports.filter(r => r.status === (statusFilter || "offen"));

    return (
      <>
        {/* 1. STATUS-KACHELN */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 15, marginBottom: 25 }}>
          <div 
            onClick={() => setStatusFilter("offen")}
            style={{ 
              background: CARD, padding: 20, borderRadius: 12, cursor: "pointer", 
              border: statusFilter === "offen" ? `2px solid ${GOLD}` : `1px solid ${BORDER}`,
              boxShadow: statusFilter === "offen" ? `0 0 10px ${BORDER}` : "none"
            }}
          >
            <div style={{ color: MUTED, fontSize: 11, fontWeight: 700 }}>OFFEN</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: GOLD }}>
              {reports.filter(r => r.status === "offen").length}
            </div>
          </div>
          
          <div 
            onClick={() => setStatusFilter("rechnung")}
            style={{ 
              background: CARD, padding: 20, borderRadius: 12, cursor: "pointer", 
              border: statusFilter === "rechnung" ? `2px solid ${GOLD}` : `1px solid ${BORDER}`
            }}
          >
            <div style={{ color: MUTED, fontSize: 11, fontWeight: 700 }}>RECHNUNG</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: TEXT }}>
              {reports.filter(r => r.status === "rechnung").length}
            </div>
          </div>

          <div 
            onClick={() => setStatusFilter("archiv")}
            style={{ 
              background: CARD, padding: 20, borderRadius: 12, cursor: "pointer", 
              border: statusFilter === "archiv" ? `2px solid ${DANGER}` : `1px solid ${BORDER}`
            }}
          >
            <div style={{ color: MUTED, fontSize: 11, fontWeight: 700 }}>ARCHIV</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: DANGER }}>
              {reports.filter(r => r.status === "archiv").length}
            </div>
          </div>
        </div>

        {/* 2. NAVIGATION */}
        <div style={{ display: "flex", gap: 10, marginBottom: 30, overflowX: "auto", paddingBottom: 5 }}>
          <button onClick={() => setView("customers")} style={gBtn}>👥 Kunden</button>
          <button onClick={() => setView("material")} style={gBtn}>📦 Material</button>
          <button onClick={() => setView("staff")} style={gBtn}>👷 Mitarbeiter</button>
          <button onClick={() => setView("new-report")} style={pBtn}>+ Neuer Rapport</button>
        </div>

        {/* 3. RAPPORT-GRID (DEIN AUFBAU) */}
        <h3 style={{ color: GOLD, marginBottom: 20 }}>
          {statusFilter === "offen" ? "Aktuelle Aufträge" : statusFilter === "rechnung" ? "Verrechnete Rapporte" : "Archiv"}
        </h3>
        
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", 
          gap: 20 
        }}>
          {filtered.map(r => {
            const details = parseReport(r);
            return (
              <div 
                key={r.id} 
                onClick={() => setOpenedReport(r)}
                style={{ 
                  background: CARD, padding: 20, borderRadius: 14, 
                  border: `1px solid ${BORDER}`, cursor: "pointer",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
                  position: "relative", overflow: "hidden"
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 18, color: GOLD, marginBottom: 5 }}>{r.customer}</div>
                <div style={{ color: MUTED, fontSize: 12, marginBottom: 15 }}>📅 {r.date}</div>
                
                <div style={{ 
                  fontSize: 14, color: TEXT, opacity: 0.8, height: 40, 
                  overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" 
                }}>
                  {details.notes || "Kein Text erfasst..."}
                </div>

                <div style={{ marginTop: 15, paddingTop: 12, borderTop: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: GOLD, fontSize: 13, fontWeight: 600 }}>Ansehen ➔</span>
                  <span style={{ fontSize: 10, color: MUTED }}>ID: #{r.id}</span>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 50, background: CARD, borderRadius: 15, color: MUTED }}>
            Keine Rapporte gefunden.
          </div>
        )}
      </>
    );
  };

  const calculateRowTotal = (from, to, pause) => {
  if (!from || !to) return 0;
  const [fH, fM] = from.split(':').map(Number);
  const [tH, tM] = to.split(':').map(Number);
  let diff = (tH * 60 + tM) - (fH * 60 + fM);
  if (diff < 0) diff += 1440; // Über Mitternacht
  const total = (diff / 60) - (parseFloat(pause) || 0);
  return Math.max(0, total).toFixed(2);
};
  
  const renderView = () => {
    if (openedReport) {
      return (
        <section style={{ background: CARD, padding: 20, borderRadius: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={{ color: GOLD, margin: 0 }}>Details: {openedReport.customer}</h2>
            <button onClick={() => setOpenedReport(null)} style={gBtn}>Zurück</button>
          </div>
          <button onClick={() => openPDF(openedReport)} style={pBtn}>📄 PDF öffnen</button>
        </section>
      );
    }
    if (view === "new-report") {
      const addRow = () => {
        setReportForm({
          ...reportForm,
          rows: [...reportForm.rows, { worker: "", from: "07:00", to: "16:00", pause: "0.5", total: "8.50" }]
        });
      };

      const updateRow = (index, field, value) => {
        const newRows = [...reportForm.rows];
        newRows[index][field] = value;
        if (field === "from" || field === "to" || field === "pause") {
          newRows[index].total = calculateRowTotal(newRows[index].from, newRows[index].to, newRows[index].pause);
        }
        setReportForm({ ...reportForm, rows: newRows });
      };

      return (
        <section style={{ background: CARD, padding: 25, borderRadius: 15, maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{ color: GOLD, marginBottom: 20, borderBottom: `1px solid ${BORDER}`, paddingBottom: 10 }}>Neuer Arbeitsrapport</h2>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15, marginBottom: 25 }}>
            <div>
              <label style={{ fontSize: 12, color: MUTED, display: "block", marginBottom: 5 }}>KUNDE / PROJEKT</label>
              <input 
                style={iStyle} 
                placeholder="Name des Kunden" 
                value={reportForm.customer} 
                onChange={(e) => setReportForm({...reportForm, customer: e.target.value})} 
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: MUTED, display: "block", marginBottom: 5 }}>DATUM</label>
              <input 
                type="date" 
                style={iStyle} 
                value={reportForm.date} 
                onChange={(e) => setReportForm({...reportForm, date: e.target.value})} 
              />
            </div>
          </div>

          <h3 style={{ color: GOLD, fontSize: 16, marginBottom: 10 }}>Arbeitsstunden</h3>
          <div style={{ overflowX: "auto", marginBottom: 20 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: MUTED, fontSize: 12, textAlign: "left" }}>
                  <th style={{ padding: 8 }}>Mitarbeiter</th>
                  <th style={{ padding: 8 }}>Von</th>
                  <th style={{ padding: 8 }}>Bis</th>
                  <th style={{ padding: 8 }}>Pause (h)</th>
                  <th style={{ padding: 8 }}>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {reportForm.rows.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td><input style={{...iStyle, width: "100%"}} value={row.worker} onChange={(e) => updateRow(idx, "worker", e.target.value)} placeholder="Name" /></td>
                    <td><input type="time" style={iStyle} value={row.from} onChange={(e) => updateRow(idx, "from", e.target.value)} /></td>
                    <td><input type="time" style={iStyle} value={row.to} onChange={(e) => updateRow(idx, "to", e.target.value)} /></td>
                    <td><input type="number" step="0.25" style={{...iStyle, width: 60}} value={row.pause} onChange={(e) => updateRow(idx, "pause", e.target.value)} /></td>
                    <td style={{ fontWeight: "bold", color: GOLD }}>{row.total}h</td>
                    <td>
                      <button 
                        onClick={() => {
                          const r = [...reportForm.rows];
                          r.splice(idx, 1);
                          setReportForm({...reportForm, rows: r});
                        }} 
                        style={{ background: "none", border: "none", color: DANGER, cursor: "pointer" }}
                      >✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={addRow} style={{ ...gBtn, marginTop: 10, width: "100%", borderStyle: "dashed" }}>+ Zeile hinzufügen</button>
          </div>

          <div style={{ marginBottom: 25 }}>
            <label style={{ fontSize: 12, color: MUTED, display: "block", marginBottom: 5 }}>NOTIZEN / MATERIAL / KRAN</label>
            <textarea 
              style={{ ...iStyle, width: "100%", minHeight: 120, paddingTop: 10 }} 
              placeholder="Besondere Vorkommnisse, verwendetes Material oder Kranstunden..." 
              value={reportForm.notes} 
              onChange={(e) => setReportForm({...reportForm, notes: e.target.value})}
            />
          </div>

          <div style={{ display: "flex", gap: 15, justifyContent: "flex-end" }}>
            <button onClick={() => setView("home")} style={gBtn}>Abbrechen</button>
            <button onClick={handleSave} style={{ ...pBtn, padding: "0 30px" }}>Rapport Speichern</button>
          </div>
        </section>
      );
    }
