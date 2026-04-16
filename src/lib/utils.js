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
  try {
    return JSON.parse(v) || fb;
  } catch {
    return fb;
  }
}
/** Supabase returns `description` as an object (json/jsonb); legacy rows may store JSON as a string. */
export function parseReport(r) {
  const d = r?.description;
  if (d != null && typeof d === "object" && !Array.isArray(d)) {
    return d;
  }
  if (typeof d === "string") {
    return parseJson(d, {});
  }
  return {};
}
export function parseCustomerMeta(c) {
  return parseJson(c?.address, {});
}

// ─── Datum ─────────────────────────────────────────────────────────────────
export function formatDateCH(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("de-CH");
}

/** Einheitliche Rapport-Zeile für Listen & Karten (parseReport für Nr., Projekt, Total). */
export function formatReportCardSummary(r) {
  const p = parseReport(r);
  const nr = p.rapportNr != null && String(p.rapportNr).trim() !== "" ? String(p.rapportNr).trim() : "—";
  const project = (p.projectName && String(p.projectName).trim()) ? String(p.projectName).trim() : "—";
  const customer = (r.customer && String(r.customer).trim()) ? String(r.customer).trim() : "—";
  const date = formatDateCH(r.date);
  const total = toNum(p.totals?.total).toFixed(2);
  return `Nr.${nr} · ${project} · ${customer} · ${date} · CHF ${total}`;
}

// ─── localStorage Nummern ──────────────────────────────────────────────────
export function getNextNr(key, fallback = 1001) {
  return parseInt(localStorage.getItem(key) || String(fallback), 10);
}
export function setNextNr(key, value) {
  localStorage.setItem(key, String(value));
}
