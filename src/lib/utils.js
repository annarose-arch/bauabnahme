export function toNumber(value) {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export function calcHours(from, to) {
  if (!from || !to) return 0;
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  const s = fh * 60 + fm;
  const e = th * 60 + tm;
  if (e <= s) return 0;
  return Math.round((((e - s) / 60) + Number.EPSILON) * 100) / 100;
}

export function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (_e) {
    return fallback;
  }
}

export function parseReport(report) {
  return parseJson(report?.description, {});
}

export function parseCustomerMeta(customer) {
  return parseJson(customer?.address, {});
}
