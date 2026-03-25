import { parseReport } from "./utils.js";

/**
 * Opens a printable HTML rapport in a new window and provides mailto for email clients.
 */
export function openPdfEmailWindow(report, userEmail) {
  const p = parseReport(report);
  const work = p.workRows || [];
  const material = p.materialRows || [];
  const totals = p.totals || {};
  const costs = p.costs || {};
  const photos = p.photos || {};
  const sig = p.signature || {};

  const customerName = report.customer || p.customer || "-";
  const customerEmail = p.customerEmail || "";
  const projectNo = p.projektnummer || "-";
  const subject = `BauAbnahme Rapport - ${customerName} - ${report.date || p.date || "-"}`;
  const body = [
    "BauAbnahme Rapport",
    "",
    `Kunde: ${customerName}`,
    `Datum: ${report.date || p.date || "-"}`,
    `Projektnummer: ${projectNo}`,
    `Zwischensumme CHF: ${Number(totals.subtotal || 0).toFixed(2)}`,
    `MwSt 8.1% CHF: ${Number(totals.vat || 0).toFixed(2)}`,
    `TOTAL CHF: ${Number(totals.total || 0).toFixed(2)}`
  ].join("\n");
  const mailto = `mailto:${encodeURIComponent(customerEmail)}?cc=${encodeURIComponent(userEmail || "")}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const win = window.open("", "_blank", "width=980,height=760");
  if (!win) return;

  const workRowsHtml = work
    .map((row, i) => `<tr><td>${i + 1}</td><td>${row.employee || "-"}</td><td>${row.from || "-"} - ${row.to || "-"}</td><td>${Number(row.hours || 0).toFixed(2)}</td><td>CHF ${Number(row.total || 0).toFixed(2)}</td></tr>`)
    .join("");
  const matRowsHtml = material
    .map((row, i) => `<tr><td>${i + 1}</td><td>${row.name || "-"}</td><td>${row.qty || 0} ${row.unit || ""}</td><td>CHF ${Number(row.total || 0).toFixed(2)}</td></tr>`)
    .join("");

  win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Rapport ${report.id}</title>
<style>
body { font-family: Arial, sans-serif; color: #222; margin: 24px; }
.top { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:16px; }
.brand { font-size:28px; font-weight:700; color:#d4a853; }
.btn { background:#d4a853; border:none; color:#111; padding:10px 14px; border-radius:8px; font-weight:700; text-decoration:none; }
.card { border:1px solid rgba(212,168,83,0.4); border-radius:10px; padding:12px; margin-bottom:12px; }
table { width:100%; border-collapse:collapse; margin-top:6px; }
th,td { border:1px solid #ddd; padding:6px 8px; font-size:13px; text-align:left; }
.total { color:#d4a853; font-size:24px; font-weight:800; text-align:right; }
.photos { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.photos img, .sig img { width:100%; max-height:220px; object-fit:cover; border:1px solid rgba(212,168,83,0.4); border-radius:8px; }
@media print { .actions { display:none; } }
</style>
</head>
<body>
  <div class="top">
    <div class="brand">BauAbnahme</div>
    <div class="actions">
      <button class="btn" onclick="window.print()">Drucken/Speichern als PDF</button>
      <a class="btn" href="${mailto}">Per E-Mail senden</a>
    </div>
  </div>
  <div class="card">
    <div><strong>Kunde:</strong> ${customerName}</div>
    <div><strong>Datum:</strong> ${report.date || p.date || "-"}</div>
    <div><strong>Auftrag-Nr:</strong> ${p.orderNo || "-"}</div>
    <div><strong>Projektnummer:</strong> ${projectNo}</div>
    <div><strong>Adresse:</strong> ${p.address || "-"}</div>
  </div>
  ${(photos.before || photos.after) ? `<div class="card"><h3>Fotos</h3><div class="photos"><div>${photos.before ? `<img src="${photos.before}" alt="Vorher" />` : "Kein Vorher Foto"}</div><div>${photos.after ? `<img src="${photos.after}" alt="Nachher" />` : "Kein Nachher Foto"}</div></div></div>` : ""}
  <div class="card"><h3>Arbeitsstunden</h3><table><thead><tr><th>#</th><th>Mitarbeiter</th><th>Zeit</th><th>Stunden</th><th>Total</th></tr></thead><tbody>${workRowsHtml || "<tr><td colspan='5'>Keine Daten</td></tr>"}</tbody></table></div>
  <div class="card"><h3>Material</h3><table><thead><tr><th>#</th><th>Bezeichnung</th><th>Menge</th><th>Total</th></tr></thead><tbody>${matRowsHtml || "<tr><td colspan='4'>Keine Daten</td></tr>"}</tbody></table></div>
  <div class="card">
    <div><strong>Spesen:</strong> CHF ${Number(costs.expenses || 0).toFixed(2)}</div>
    <div><strong>Notizen:</strong> ${costs.notes || "-"}</div>
    <div><strong>MwSt 8.1%:</strong> CHF ${Number(totals.vat || 0).toFixed(2)}</div>
    <div class="total">TOTAL CHF ${Number(totals.total || 0).toFixed(2)}</div>
  </div>
  ${sig.image ? `<div class="card sig"><h3>Unterschrift</h3><div>${sig.name || "-"}</div><img src="${sig.image}" alt="Unterschrift" /></div>` : ""}
</body>
</html>`);
  win.document.close();
}
