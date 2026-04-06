import { useRef, useEffect } from "react";
import { GOLD, BORDER, PANEL, TEXT, MUTED, gBtn } from "../lib/constants.js";

// ─── SignaturePad ──────────────────────────────────────────────────────────
export function SignaturePad({ value, onChange, clearLabel }) {
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

  useEffect(() => {
    if (!value && ref.current) ref.current.getContext("2d").clearRect(0, 0, 600, 160);
  }, [value]);

  return (
    <div>
      <canvas
        ref={ref} width={600} height={160}
        style={{ display: "block", width: "100%", height: 160, border: `1px solid ${BORDER}`, borderRadius: 8, background: "#111", touchAction: "none", cursor: "crosshair" }}
        onMouseDown={start} onMouseMove={draw} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={draw} onTouchEnd={end}
      />
      <button type="button" onClick={clear} style={{ ...gBtn, marginTop: 6, fontSize: 13, minHeight: 32 }}>
        {clearLabel || "Unterschrift löschen"}
      </button>
    </div>
  );
}

// ─── PhotoUpload ───────────────────────────────────────────────────────────
export function PhotoUpload({ label, value, onChange, addPhotoLabel }) {
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
        <button type="button" onClick={() => ref.current?.click()}
          style={{ ...gBtn, minHeight: 80, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 4, fontSize: 13, color: MUTED }}>
          <span style={{ fontSize: 24 }}>📷</span><span>{addPhotoLabel || "Foto hinzufügen"}</span>
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={onFile} />
    </div>
  );
}

// ─── SectionCard ───────────────────────────────────────────────────────────
export function SectionCard({ children }) {
  return (
    <section style={{ background: "#1a1a1a", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
      {children}
    </section>
  );
}

// ─── Notice Banner ─────────────────────────────────────────────────────────
export function NoticeBanner({ message }) {
  if (!message) return null;
  return (
    <div style={{ marginBottom: 12, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 14px", color: GOLD, background: "rgba(212,168,83,0.08)" }}>
      {message}
    </div>
  );
}

// ─── Demo Banner ───────────────────────────────────────────────────────────
export function DemoBanner({ onNavigate, pBtn, gBtn }) {
  return (
    <div style={{ marginBottom: 12, background: "rgba(212,168,83,0.15)", border: `2px solid ${GOLD}`, borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
      <span style={{ color: GOLD, fontWeight: 700 }}>🎯 Demo-Modus — Daten werden nicht gespeichert</span>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => onNavigate("/login")} style={pBtn}>Registrieren</button>
        <button onClick={() => onNavigate("/")} style={gBtn}>Zurück</button>
      </div>
    </div>
  );
}
