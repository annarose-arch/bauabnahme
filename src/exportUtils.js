// src/utils/exportUtils.js

export const formatDateCH = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("de-CH");
};

// In exportUtils.js
export function buildPdfHtml(report, p, meta) {
  const r = report || {};
  const data = p || {};
  const rows = data.rows || []; // Deine Arbeitsstunden

  return `
    <html>
      <head>
        <style>
          body { font-family: sans-serif; padding: 40px; }
          .header { border-bottom: 2px solid #d4a853; margin-bottom: 30px; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #f4f4f4; text-align: left; padding: 10px; border-bottom: 1px solid #ddd; }
          td { padding: 10px; border-bottom: 1px solid #eee; }
          .total-row { font-weight: bold; background: #fdfaf3; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="color:#d4a853; margin:0;">ARBEITSRAPPORT</h1>
          <p>Kunde: <strong>${r.customer}</strong> | Datum: ${formatDateCH(r.date)}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Mitarbeiter</th>
              <th>Von/Bis</th>
              <th>Pause</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                <td>${row.worker || '-'}</td>
                <td>${row.from || ''} - ${row.to || ''}</td>
                <td>${row.pause || '0'}h</td>
                <td>${row.total || '0'}h</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top:30px;">
          <strong>Bemerkungen:</strong><br>
          <p>${data.notes || 'Keine Bemerkungen'}</p>
        </div>
      </body>
    </html>
  `;
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
