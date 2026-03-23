// src/utils/exportUtils.js

export const formatDateCH = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  return isNaN(d) ? dateStr : d.toLocaleDateString("de-CH");
};

export async function generateInvoice(report, discountPct, skontoPct, payDays, skontoDays, meta, p) {
  // 1. Fenster öffnen
  const win = window.open("", "_blank");
  if (!win) {
    alert("Bitte Popups erlauben!");
    return;
  }

  // 2. Daten vorbereiten (für dein Template)
  const invoiceNr = `RE-${Date.now().toString().slice(-6)}`;
  const inv = { status: "definitiv" }; // Standardwert

  // 3. Das schicke HTML schreiben (Dein Code von oben)
  win.document.write(`
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>Rechnung ${invoiceNr}</title>
      <style>
        /* Dein CSS von oben */
        *{box-sizing:border-box} @page{margin:16mm;size:A4}
        body{font-family:Arial,sans-serif;color:#111;margin:0;padding:32px;font-size:14px;max-width:800px;margin:0 auto}
        .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:16px;border-bottom:2px solid #111}
        .firm-name{font-size:22px;font-weight:900}
        .invoice-label{font-size:28px;font-weight:900;text-align:right}
        .btn{background:#111;border:none;color:#fff;padding:10px 16px;border-radius:6px;font-weight:700;cursor:pointer;font-size:14px}
        @media print{.noprint{display:none}}
      </style>
    </head>
    <body>
      <div class="noprint" style="margin-bottom:20px;">
        <button class="btn" onclick="window.print()">💾 Drucken / PDF</button>
      </div>
      
      <div class="header">
        <div>
          <div class="firm-name">${meta?.company || "Deine Firma"}</div>
          <div style="font-size:12px;">${meta?.address || "Deine Adresse"}</div>
        </div>
        <div>
          <div class="invoice-label">RECHNUNG</div>
          <div style="text-align:right;">Nr: ${invoiceNr}</div>
        </div>
      </div>

      <div style="margin-top:40px;">
        <strong>Rechnung an:</strong><br>
        ${report?.customer || "Unbekannter Kunde"}
      </div>

      <table style="width:100%; margin-top:30px; border-collapse:collapse;">
        <thead>
          <tr style="background:#111; color:#fff;">
            <th style="padding:10px; text-align:left;">Position</th>
            <th style="padding:10px; text-align:right;">Betrag</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:10px; border-bottom:1px solid #eee;">Bauabnahme / Rapport</td>
            <td style="padding:10px; border-bottom:1px solid #eee; text-align:right;">CHF ${p?.totals?.subtotal || "0.00"}</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top:20px; text-align:right; font-weight:bold; font-size:18px;">
        Total: CHF ${((p?.totals?.subtotal || 0) * (1 - (discountPct/100))).toFixed(2)}
      </div>
    </body>
    </html>
  `);

  win.document.close();
}
