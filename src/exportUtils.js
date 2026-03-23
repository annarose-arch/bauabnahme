// src/utils/exportUtils.js

export const formatDateCH = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  return isNaN(d) ? dateStr : d.toLocaleDateString("de-CH");
};

export function buildPdfHtml(report, p, meta) {
  return `<html><body><h1>Rapport ${p.rapportNr || report.id}</h1><p>Kunde: ${report.customer}</p></body></html>`;
}

export async function generateInvoice(report, discountPct, skontoPct, payDays, skontoDays, meta, p) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<html><body><h1>Rechnung</h1><p>Kunde: ${report.customer}</p></body></html>`);
  win.document.close();
}
