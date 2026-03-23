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

export default function Dashboard({ session, onLogout, onNavigate, isDemo = false }) {
  const userId = session?.user?.id;
  const userEmail = session?.user?.email || "";

  const [view, setView] = useState("home");
  const [reports, setReports] = useState([]);
  const [notice, setNotice] = useState("");
  const [openedReport, setOpenedReport] = useState(null);
 const [reportForm, setReportForm] = useState({ 
    customer: "", 
    date: new Date().toISOString().split('T')[0], 
    notes: "" 
  });
 const [nextInvoiceNr, setNextInvoiceNrState] = useState(() => parseInt(localStorage.getItem("bauabnahme_next_invoice_nr") || "1001"));

useEffect(() => {
    const loadData = async () => {
      if (!userId) return;
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", userId)
        .order("id", { ascending: false });

      if (error) {
        setNotice("Fehler beim Laden: " + error.message);
      } else {
        setReports(data || []);
      }
    };
    loadData();
  }, [userId]);

  const openPDF = (report) => {
    const p = parseReport(report);
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(buildPdfHtml(report, p, session?.user?.user_metadata || {}));
      win.document.close();
    }
  };

  const handleSave = async () => {
    console.log("Speichervorgang gestartet...", reportForm); // Test-Log

    if (!reportForm.customer) {
      setNotice("Bitte einen Kunden angeben.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("reports")
        .insert([
          {
            user_id: userId,
            customer: reportForm.customer,
            date: reportForm.date,
            description: JSON.stringify({ notes: reportForm.notes }),
            status: "offen",
          },
        ])
        .select(); // .select() hilft uns zu sehen, ob wirklich was zurückkommt

      if (error) {
        console.error("Supabase Fehler:", error);
        setNotice("Fehler beim Speichern: " + error.message);
      } else {
        console.log("Erfolgreich gespeichert:", data);
        setNotice("Erfolgreich gespeichert!");
        
        // Formular zurücksetzen
        setReportForm({ customer: "", date: new Date().toISOString().split('T')[0], notes: "" });
        
        // Zurück zur Liste
        setView("home");
        
        // Daten neu laden, damit der neue Rapport erscheint
        window.location.reload(); 
      }
    } catch (err) {
      console.error("Unerwarteter Fehler:", err);
      setNotice("Ein unerwarteter Fehler ist aufgetreten.");
    }
  };

  const renderView = () => {
    if (openedReport) {
      return (
        <section style={{ background: CARD, padding: 20, borderRadius: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={{ color: GOLD, margin: 0 }}>Details</h2>
            <button onClick={() => setOpenedReport(null)} style={gBtn}>Zurück</button>
          </div>
          <button onClick={() => openPDF(openedReport)} style={pBtn}>📄 PDF öffnen</button>
        </section>
      );
    }

    if (view === "new-report") {
      return (
        <section style={{ background: CARD, padding: 20, borderRadius: 12 }}>
          <h2 style={{ color: GOLD }}>Neuer Rapport</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input style={iStyle} placeholder="Kunde" value={reportForm.customer} onChange={(e) => setReportForm({...reportForm, customer: e.target.value})} />
            <textarea style={{...iStyle, minHeight: 100}} placeholder="Notizen" onChange={(e) => setReportForm({...reportForm, notes: e.target.value})} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setView("home")} style={gBtn}>Abbrechen</button>
              <button onClick={handleSave} style={pBtn}>Speichern</button>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section style={{ background: CARD, padding: 20, borderRadius: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ color: GOLD, margin: 0 }}>Deine Rapporte</h2>
          <button onClick={() => setView("new-report")} style={pBtn}>+ Neu</button>
        </div>
        {reports.length === 0 ? (
          <p style={{ color: MUTED }}>Keine Rapporte vorhanden.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {reports.map(r => (
              <div key={r.id} onClick={() => setOpenedReport(r)} style={{ padding: 15, background: PANEL, borderRadius: 8, cursor: "pointer", border: `1px solid ${BORDER}` }}>
                {r.customer}
              </div>
            ))}
          </div>
        )}
      </section>
    );
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: BG, color: TEXT }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header style={{ padding: 20, borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 900, color: GOLD }}>PRO-RAPPORT</span>
          <button onClick={onLogout} style={dBtn}>Logout</button>
        </header>
        <main style={{ padding: 20 }}>
          {notice && <div style={{ color: GOLD, marginBottom: 12 }}>{notice}</div>}
          {renderView()}
        </main>
      </div>
    </div>
  );
}
