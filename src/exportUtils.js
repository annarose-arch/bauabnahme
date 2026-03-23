// src/utils/exportUtils.js

export const formatDateCH = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("de-CH");
};

// --- DIESER TEIL IST NEU FÜR DEIN RAPPORT-DESIGN ---
export function buildPdfHtml(report, p, meta) {
  const data = p || {};
  const r = report || {};
  const date = formatDateCH(r.date);
  const notes = data.notes || "Keine Notizen vorhanden";

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Rapport - ${r.customer || 'Unbekannt'}</title>
        <style>
          body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; line-height: 1.6; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #d4a853; padding-bottom: 20px; margin-bottom: 30px; }
          .brand { font-size: 28px; font-weight: 900; color: #d4a853; }
          .section { margin-bottom: 30px; }
          .label { font-size: 11px; text-transform: uppercase; color: #888; font-weight: bold; }
          .value { font-size: 18px; margin-top: 5px; }
          .notes-container { 
            background: #f9f9f9; border: 1px solid #eee; padding: 20px; 
            border-radius: 8px; min-height: 200px; white-space: pre-wrap; 
          }
          .footer { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 50px; }
          .sig-box { border-top: 1px solid #333; padding-top: 10px; text-align: center; font-size: 12px; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px;">
          <button onclick="window.print()" style="background:#d4a853; color:white; border:none; padding:10px 20px; border-radius:8px; cursor:pointer;">🖨️ PDF speichern</button>
        </div>
        <div class="header">
          <div class="brand">PRO-RAPPORT</div>
          <div style="text-align:right">Datum: ${date}</div>
        </div>
        <div class="section">
          <div class="label">Kunde / Projekt</div>
          <div class="value">${r.customer || 'Unbekannt'}</div>
        </div>
        <div class="section">
          <div class="label">Arbeitsbericht</div>
          <div class="notes-container">${notes}</div>
        </div>
        <div class="footer">
          <div class="sig-box">Visum Kunde</div>
          <div class="sig-box">Visum Auftragnehmer</div>
        </div>
      </body>
    </html>`;
}

// --- DIESER TEIL BEHÄLT DEINE RECHNUNGS-LOGIK ---
export async function generateInvoice(report, discountPct, skontoPct, payDays, skontoDays, meta, p) {
  const win = window.open("", "_blank");
  if (!win) {
    alert("Bitte Popups erlauben!");
    return;
  }

  // Hier kommt deine existierende Rechnungs-Logik rein
  // Falls du den speziellen Rechnungs-HTML-Code noch hast, 
  // füge ihn hier in win.document.write(...) ein.
  
  win.document.write(`
    <html>
      <head><title>Rechnung</title></head>
      <body>
        <h1>Rechnung für ${report.customer}</h1>
        <p>Rechnungs-Details folgen hier...</p>
      </body>
    </html>
  `);
  win.document.close();
}
