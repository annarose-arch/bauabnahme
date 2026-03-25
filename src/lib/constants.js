export const COLORS = {
  bg: "#0a0a0a",
  panel: "#141414",
  card: "#1a1a1a",
  text: "#f0ece4",
  muted: "#b9b0a3",
  gold: "#d4a853",
  border: "rgba(212,168,83,0.25)"
};

export const STATUS_COLORS = {
  offen: "#d4a853",
  bearbeitet: "#4b7bec",
  gesendet: "#d4a853",
  archiviert: "#80c783",
  geloescht: "#8b8b8b"
};

export const STATUS_OPTIONS = ["offen", "bearbeitet", "gesendet", "archiviert"];
export const LANGUAGE_OPTIONS = ["DE", "FR", "IT", "EN"];

export const inputStyle = {
  minHeight: 40,
  borderRadius: 8,
  border: `1px solid ${COLORS.border}`,
  background: "#111",
  color: COLORS.text,
  padding: "0 10px"
};

export const primaryBtn = {
  minHeight: 38,
  borderRadius: 8,
  border: "none",
  background: COLORS.gold,
  color: "#111",
  fontWeight: 700,
  cursor: "pointer",
  padding: "0 12px"
};
