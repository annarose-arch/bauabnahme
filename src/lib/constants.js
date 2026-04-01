// ─── Farben ────────────────────────────────────────────────────────────────
export const BG     = "#0a0a0a";
export const PANEL  = "#141414";
export const CARD   = "#1a1a1a";
export const TEXT   = "#f0ece4";
export const MUTED  = "#b9b0a3";
export const GOLD   = "#d4a853";
export const BORDER = "rgba(212,168,83,0.25)";
export const DANGER = "#e05c5c";

// ─── Shared Button / Input Styles ─────────────────────────────────────────
export const iStyle = {
  minHeight: 40, borderRadius: 8,
  border: `1px solid ${BORDER}`, background: PANEL,
  color: TEXT, padding: "0 10px",
};
export const pBtn = {
  minHeight: 38, borderRadius: 8, border: "none",
  background: GOLD, color: "#111", fontWeight: 700,
  cursor: "pointer", padding: "0 14px",
};
export const gBtn = {
  minHeight: 38, borderRadius: 8,
  border: `1px solid ${BORDER}`, background: "transparent",
  color: TEXT, cursor: "pointer", padding: "0 14px",
};
export const dBtn = {
  minHeight: 34, borderRadius: 8,
  border: `1px solid ${DANGER}`, background: "transparent",
  color: DANGER, cursor: "pointer", padding: "0 10px", fontSize: 13,
};

export const isMobile = () => window.innerWidth < 600;
