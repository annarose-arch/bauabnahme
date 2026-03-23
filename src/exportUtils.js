// src/utils/exportUtils.js

export const formatDateCH = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  return isNaN(d) ? dateStr : d.toLocaleDateString("de-CH");
};

export function buildPdfHtml(report, p, meta) {
  // Falls p oder report fehlen, verhindern wir einen Absturz
  const data = p || {};
  const r = report || {};
  return `
    <html>
      <head><title>Export</title></head>
      <body style="font-family:sans-serif;padding:20px;">
        <h1>Rapport</h1>
        <p>Kunde: ${r.customer || 'Unbekannt'}</p>
        <hr />
        <p>Inhalt folgt...</p>
      </body>
    </html>`;
}

export async function generateInvoice(report, discountPct, skontoPct, payDays, skontoDays, meta, p) {
  // Wir definieren 'win' sauber am Anfang der Funktion
  const win = window.open("", "_blank");
  
  if (!win) {
    alert("Bitte erlaube Popups für diese Seite, um die Rechnung anzuzeigen.");
    return;
  }

  const invoiceNr = `RE-${Date.now().toString().slice(-6)}`;
  
  win.document.write(`
    <html>
      <head>
        <title>Rechnung ${invoiceNr}</title>
        <style>
          body { font-family: sans-serif; padding: 40px; color: #333; }
          .gold { color: #d4a853; }
        </style>
      </head>
      <body>
        <h1 class="gold">Rechnung ${invoiceNr}</h1>
        <p>Kunde: ${report?.customer || 'Unbekannt'}</p>
        <hr />
        <p>Zahlbar innert ${payDays} Tagen.</p>
        <button onclick="window.print()">Drucken / Als PDF speichern</button>
      </body>
    </html>
  `);
  win.document.close();
}
