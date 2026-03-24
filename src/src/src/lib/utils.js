// ─── Berechnungen ──────────────────────────────────────────────────────────
export function toNum(v) {
  const n = parseFloat(v);
  return isFinite(n) ? n : 0;
}

export function calcHours(from, to) {
  if (!from || !to || from.length < 4 || to.length < 4) return 0;
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  if ([fh, fm, th, tm].some(isNaN)) return 0;
  const s = fh * 60 + fm;
  let e = th * 60 + tm;
  if (e <= s) e += 1440;
  const d = e - s;
  if (d <= 0 || d > 1440) return 0;
  return Math.round((d / 60) * 100) / 100;
}

// ─── JSON Parsing ──────────────────────────────────────────────────────────
export function parseJson(v, fb = {}) {
  try { return JSON.parse(v) || fb; } catch { return fb; }
}
export function parseReport(r)       { return parseJson(r?.description, {}); }
export function parseCustomerMeta(c) { return parseJson(c?.address, {}); }

// ─── Datum ─────────────────────────────────────────────────────────────────
export function formatDateCH(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("de-CH");
}

// ─── localStorage Nummern ──────────────────────────────────────────────────
export function getNextNr(key, fallback = 1001) {
  return parseInt(localStorage.getItem(key) || String(fallback));
}
export function setNextNr(key, value) {
  localStorage.setItem(key, String(value));
}
