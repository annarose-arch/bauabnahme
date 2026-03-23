// src/utils/exportUtils.js

export const formatDateCH = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  return isNaN(d) ? dateStr : d.toLocaleDateString("de-CH");
};

export function buildPdfHtml(report, p, meta, isPro, isDemoMode, mailto) {
  const { workRows = [], materialRows = [], totals = {}, costs = {}, photos = {}, signature = {} } = p;
  
  const wHtml = workRows.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${r.employee || "-"}</td>
      <td>${r.from || "-"}–${r.to || "-"}</td>
      <td>${Number(r.hours || 0).toFixed(2)}</td>
      <td>CHF ${Number(r.total || 0).toFixed(2)}</td>
    </tr>
  `).join("");

  const mHtml = materialRows.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${r.name || "-"}</td>
      <td>${r.qty || 0} ${r.unit || ""}</td>
      <td>CHF ${Number(r.total || 0).toFixed(2)}</td>
    </tr>
  `).join("");

  return `
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>Rapport ${p.rapportNr || report.id}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 30px; color: #222; line-height: 1.4; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #d4a853; padding-bottom: 10px; margin-bottom: 20px; }
        .firm-name { font-size: 20px; font-weight: bold; }
        .report-title { font-size: 24px; color: #d4a853; font-weight: bold; }
        .card { border: 1px solid #eee; padding: 15px; margin-bottom: 15px; border-radius: 8px; background: #fdfdfd; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background: #f9f9f9; text-align: left; }
        th, td { border: 1px solid #eee; padding: 8px; font-size: 13px; }
        .total-box { text-align: right; margin-top: 20px; font-size: 18px; font-weight: bold; color: #d4a853; }
        @media print { .noprint { display: none; } }
      </style>
    </head>
    <body>
      <div class="noprint" style="margin-bottom: 20px;">
        <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer; background: #d4a853; border: none; font-weight: bold; border-radius: 5px;">PDF speichern / Drucken</button>
      </div>
      <div class="header">
        <div>
          <div class="firm-name">${meta.company_name || "Mein Unternehmen"}</div>
          <div>${meta.address || ""}</div>
        </div>
        <div style="text-align: right;">
          <div class="report-title">Rapport</div>
          <div>Nr: ${p.rapportNr || "-"}</div>
        </div>
      </div>
      <div class="card">
        <strong>Kunde:</strong> ${report.customer}<br>
        <strong>Datum:</strong> ${formatDateCH(report.date)}<br>
        ${p.projectName ? `<strong>Projekt:</strong> ${p.projectName}` : ""}
      </div>
      <h3>Arbeitsstunden</h3>
      <table>
        <thead><tr><th>#</th><th>Mitarbeiter</th><th>Zeitraum</th><th>Std.</th><th>Betrag</th></tr></thead>
        <tbody>${wHtml || '<tr><td colspan="5">Keine Einträge</td></tr>'}</tbody>
      </table>
      <h3>Material</h3>
      <table>
        <thead><tr><th>#</th><th>Material</th><th>Menge</th><th>Betrag</th></tr></thead>
        <tbody>${mHtml || '<tr><td colspan="4">Keine Einträge</td></tr>'}</tbody>
      </table>
      <div class="total-box">Gesamttotal: CHF ${Number(totals.total || 0).toFixed(2)}</div>
    </body>
    </html>
  `;
}
// src/utils/exportUtils.js Erweiterung

export async function generateInvoice(report, discountPct, skontoPct, payDays, skontoDays, meta, p) {
    const invoiceNr = `RE-${Date.now().toString().slice(-6)}`;
    const subtotal = Number(p.totals?.subtotal || 0);
    const discountAmt = subtotal * (discountPct / 100);
    const totalAmount = (subtotal - discountAmt) * 1.081; // Inkl. MwSt

    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(`
        <html>
        <head><title>Rechnung ${invoiceNr}</title></head>
        <body style="font-family:sans-serif; padding:40px;">
            <h1>Rechnung ${invoiceNr}</h1>
            <p>Kunde: ${report.customer}</p>
            <hr>
            <p>Subtotal: CHF ${subtotal.toFixed(2)}</p>
            <p>Rabatt (${discountPct}%): -CHF ${discountAmt.toFixed(2)}</p>
            <h2 style="color:gold;">Total: CHF ${totalAmount.toFixed(2)}</h2>
            <p>Zahlbar innert ${payDays} Tagen</p>
            <button onclick="window.print()">Drucken</button>
        </body>
        </html>
    `);
    win.document.close();
}
