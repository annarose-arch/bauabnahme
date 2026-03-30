import { formatDateCH } from "./utils.js";

// ─── Swiss QR-Bill ─────────────────────────────────────────────────────────
export function buildSwissQR(
  iban, amount, creditorName, creditorAddress, creditorZip, creditorCity,
  debtorName, debtorAddress, debtorZip, debtorCity, ref, message
) {
  const lines = [
    "SPC", "0200", "1",
    iban.replace(/\s/g, ""),
    "K", creditorName || "", creditorAddress || "",
    `${creditorZip || ""} ${creditorCity || ""}`.trim(), "", "", "CH", "",
    "", "", "", "", "", "", "",
    amount ? Number(amount).toLocaleString('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2}) : "0.00", "CHF",
    "K", debtorName || "", debtorAddress || "",
    `${debtorZip || ""} ${debtorCity || ""}`.trim(), "", "", "CH", "",
    "NON", "", message || "", "EPD", "",
  ];
  const encoded = encodeURIComponent(lines.join("\n"));
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}&ecc=M`;
}

// ─── Rapport PDF HTML ──────────────────────────────────────────────────────
export function buildRapportHtml(
  report, p, firmName, firmLogo, firmAddress, firmContact,
  firmPhone, firmEmail, isPro, isDemoMode, mailto, customers, parseCustomerMeta
) {
  const work = p.workRows || [], mat = p.materialRows || [], tot = p.totals || {};
  const costs = p.costs || {}, photos = p.photos || {}, sig = p.signature || {};
  const name = report.customer || "-";
  const custRecord = customers.find(
    (c) => String(c.id) === String(p.customerId) || c.name === report.customer
  );
  const custMeta = custRecord ? parseCustomerMeta(custRecord) : {};
  const custStreet = p.address || custMeta.address || "-";
  const custZip = p.zip || custMeta.zip || "";
  const custCity = p.city || custMeta.city || "";
  const custZipCity = [custZip, custCity].filter(Boolean).join(" ");
  const custFullAddr = custZipCity ? `${custStreet}, ${custZipCity}` : custStreet;

  const wHtml = work
    .map((r, i) => `<tr><td>${i + 1}</td><td>${r.employee || "-"}</td><td>${r.from || "-"}–${r.to || "-"}</td><td>${Number(r.hours || 0).toLocaleString('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2})}</td><td>CHF ${Number(r.total || 0).toLocaleString('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2})}</td></tr>`)
    .join("");
  const mHtml = mat
    .map((r, i) => `<tr><td>${i + 1}</td><td>${r.name || "-"}</td><td>${r.qty || 0} ${r.unit || ""}</td><td>CHF ${Number(r.total || 0).toLocaleString('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2})}</td></tr>`)
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>Rapport ${p.rapportNr || report.id}</title>
<style>
body{font-family:Arial,sans-serif;color:#222;margin:24px;font-size:14px}
@page{margin:12mm;size:A4}
.letterhead{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid #d4a853}
.firm-info{display:flex;align-items:center;gap:14px}
.firm-details{font-size:12px;color:#444;line-height:1.6}
.firm-name{font-size:18px;font-weight:800;color:#111;margin-bottom:2px}
.report-header{text-align:right}
.report-title{font-size:20px;font-weight:700;color:#d4a853}
.btn{background:#d4a853;border:none;color:#111;padding:10px 14px;border-radius:8px;font-weight:700;text-decoration:none;margin-right:8px;cursor:pointer;font-size:14px}
.card{border:1px solid rgba(212,168,83,0.4);border-radius:10px;padding:12px;margin-bottom:12px}
table{width:100%;border-collapse:collapse;margin-top:6px}
th,td{border:1px solid #ddd;padding:6px 8px;font-size:13px;text-align:left}
th{background:#f9f4ec}
.total{color:#d4a853;font-size:24px;font-weight:800;text-align:right}
.watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:80px;font-weight:900;color:rgba(212,168,83,0.12);white-space:nowrap;pointer-events:none;z-index:1000}
@media print{.noprint{display:none}a[href]:after{content:none!important}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
${isDemoMode ? '<div class="watermark">ENTWURF</div>' : ""}
<div class="noprint" style="margin-bottom:14px">
${!isPro ? '<div style="background:#fff8e6;border:2px solid #d4a853;border-radius:8px;padding:10px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center"><strong>⭐ Testversion</strong><a href="https://buy.stripe.com/bJe5kD18Cc2m3y59Ux9AA02" style="background:#d4a853;color:#111;padding:6px 12px;border-radius:6px;font-weight:700;text-decoration:none">Pro CHF 29/Mt →</a></div>' : ""}
<button class="btn noprint" onclick="window.print()">💾 PDF / Drucken</button>
<a class="btn noprint" href="${mailto}">📧 E-Mail öffnen</a>
</div>
<div class="letterhead">
  <div class="firm-info">
    ${firmLogo ? `<img src="${firmLogo}" alt="Logo" style="height:65px;max-width:180px;object-fit:contain"/>` : ""}
    <div>
      <div class="firm-name">${firmName}</div>
      <div class="firm-details">
        ${firmContact ? `<div>${firmContact}</div>` : ""}
        ${firmAddress ? `<div>${firmAddress}</div>` : ""}
        ${firmPhone ? `<div>${firmPhone}</div>` : ""}
        ${firmEmail ? `<div>${firmEmail}</div>` : ""}
      </div>
    </div>
  </div>
  <div class="report-header">
    <div class="report-title">Rapport</div>
    <div style="font-size:13px;color:#555">Nr. ${p.rapportNr || report.id}</div>
    <div style="font-size:13px;color:#555">${formatDateCH(report.date)}</div>
  </div>
</div>
<div class="card">
  <table><tbody>
    <tr><td><b>Rapport-Nr:</b></td><td>${p.rapportNr || "-"}</td><td><b>Datum:</b></td><td>${formatDateCH(report.date)}</td></tr>
    <tr><td><b>Kunde:</b></td><td>${name}</td><td><b>Auftrag-Nr:</b></td><td>${p.orderNo || "-"}</td></tr>
    <tr><td><b>Adresse:</b></td><td colspan="3">${custFullAddr}</td></tr>
    ${p.projectName ? `<tr><td><b>Projekt:</b></td><td colspan="3">${p.projectName}</td></tr>` : ""}
  </tbody></table>
</div>
${photos.before || photos.after ? `<div class="card"><h3>Fotos</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${photos.before ? `<div><p><b>Vorher</b></p><img src="${photos.before}" style="width:100%;max-height:200px;object-fit:cover;border-radius:8px"/></div>` : ""}${photos.after ? `<div><p><b>Nachher</b></p><img src="${photos.after}" style="width:100%;max-height:200px;object-fit:cover;border-radius:8px"/></div>` : ""}</div></div>` : ""}
<div class="card"><h3>Arbeitsstunden</h3><table><thead><tr><th>#</th><th>Mitarbeiter</th><th>Zeit</th><th>Stunden</th><th>Total</th></tr></thead><tbody>${wHtml || "<tr><td colspan='5'>Keine Daten</td></tr>"}</tbody></table></div>
<div class="card"><h3>Material / Kranrapport</h3><table><thead><tr><th>#</th><th>Bezeichnung</th><th>Menge</th><th>Total</th></tr></thead><tbody>${mHtml || "<tr><td colspan='4'>Keine Daten</td></tr>"}</tbody></table></div>
<div class="card">
  <div><b>Spesen:</b> CHF ${Number(costs.expenses || 0).toLocaleString('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
  ${costs.notes ? `<div><b>Notizen:</b> ${costs.notes}</div>` : ""}
  <div><b>Subtotal:</b> CHF ${Number(tot.subtotal || 0).toLocaleString('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
  <div><b>MwSt 8.1%:</b> CHF ${Number(tot.vat || 0).toLocaleString('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
  <div class="total">TOTAL CHF ${Number(tot.total || 0).toLocaleString('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
</div>
${sig.image ? `<div class="card"><h3>Unterschrift</h3><div style="margin-bottom:4px"><b>${sig.name || "-"}</b></div><img src="${sig.image}" style="width:280px;border:1px solid rgba(212,168,83,0.4);border-radius:8px"/></div>` : ""}
</body></html>`;
}

// ─── Rechnung HTML ──────────────────────────────────────────────────────────
export function buildRechnungHtml({
  invoiceNr, firmName, firmLogo, firmContact, firmDetails,
  name, custAddr, custStreet, custZip, custCity,
  validWork, validMat, costs, subtotal, discountPct, discountAmt,
  vat, totalAmount, skontoPct, skontoAmt,
  dueDate, skontoDueDate, qrUrl,
  isPro, isDemoMode, reportDate, projectName,
  custEmail,
  rapportNr,
}) {
  const escText = (s) => String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const wHtml = validWork.map(r => `<tr><td>${r.employee || "-"}</td><td style="text-align:center">${r.from || "-"}–${r.to || "-"}</td><td style="text-align:center">${Number(r.hours || 0).toLocaleString('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2})} h</td><td style="text-align:right">CHF ${Number(r.total || 0).toLocaleString('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2})}</td></tr>`).join("");
  const mHtml = validMat.map(r => `<tr><td>${r.name || "-"}</td><td style="text-align:center">${r.qty || 0} ${r.unit || ""}</td><td style="text-align:center">CHF ${Number(r.price || 0).toLocaleString('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2})}</td><td style="text-align:right">CHF ${Number(r.total || 0).toLocaleString('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2})}</td></tr>`).join("");
  const mailSubject = `Rechnung ${invoiceNr}`;
  const mailBody = `Rechnungsnummer: ${invoiceNr}\nBetrag: CHF ${Number(totalAmount).toLocaleString('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2})}\nFälligkeitsdatum: ${dueDate}`;
  const emailTrim = custEmail != null ? String(custEmail).trim() : "";
  const mailtoHref =
    emailTrim.length > 0
      ? `mailto:${emailTrim}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`
      : "";
  const escHref = (u) => String(u).replace(/&/g, "&amp;").replace(/"/g, "&quot;");

  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>Rechnung ${invoiceNr}</title>
<style>
*{box-sizing:border-box}
@page{margin:16mm;size:A4}
body{font-family:Arial,sans-serif;color:#111;margin:0;padding:32px;font-size:14px;max-width:800px;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:16px;border-bottom:2px solid #111}
.firm-name{font-size:22px;font-weight:900;color:#111}
.firm-details{font-size:12px;color:#333;line-height:1.7;margin-top:4px}
.invoice-label{font-size:28px;font-weight:900;color:#111;text-align:right}
.invoice-meta{font-size:13px;color:#333;text-align:right;line-height:1.9}
.address-block{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:8px}
.address-box{border-left:3px solid #111;padding:10px 14px}
.address-label{font-size:10px;text-transform:uppercase;color:#666;font-weight:700;margin-bottom:4px;letter-spacing:1px}
.project-line{margin:16px 0 24px;padding:8px 0;border-bottom:1px solid #ddd;font-size:14px;font-style:italic;color:#333}
table{width:100%;border-collapse:collapse;margin-bottom:16px}
th{background:#111;color:#fff;padding:8px 10px;font-size:12px;text-align:left;font-weight:700}
td{padding:7px 10px;font-size:13px;border-bottom:1px solid #eee;color:#111}
tr:nth-child(even) td{background:#f8f8f8}
.section-title{font-size:11px;text-transform:uppercase;letter-spacing:1.5px;font-weight:800;color:#111;margin:20px 0 6px;border-bottom:2px solid #111;padding-bottom:4px}
.totals-box{display:flex;justify-content:flex-end;margin-bottom:20px}
.totals-inner{width:320px}
.totals-row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#333;border-bottom:1px solid #eee}
.totals-discount{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#111;font-weight:700;border-bottom:1px solid #eee}
.totals-total{display:flex;justify-content:space-between;padding:10px 0 6px;font-size:20px;font-weight:900;color:#111;border-top:2px solid #111;margin-top:4px}
.skonto-box{background:#f5f5f5;border-left:3px solid #555;padding:10px 14px;font-size:12px;color:#333;margin-bottom:20px}
.qr-section{border-top:2px solid #111;margin-top:28px;padding-top:18px;display:flex;gap:24px;align-items:flex-start}
.qr-title{font-size:15px;font-weight:800;color:#111;margin-bottom:12px}
.qr-fields{display:grid;gap:6px;font-size:12px;color:#333;line-height:1.6}
.qr-label{font-size:10px;text-transform:uppercase;color:#666;font-weight:700;letter-spacing:1px}
.qr-img{border:1px solid #ccc;padding:6px;background:#fff}
.no-iban{background:#f5f5f5;border:2px dashed #999;border-radius:6px;padding:14px;font-size:13px;color:#555;text-align:center}
.watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:80px;font-weight:900;color:rgba(0,0,0,0.06);white-space:nowrap;pointer-events:none;z-index:1000}
.btn{background:#111;border:none;color:#fff;padding:10px 16px;border-radius:6px;font-weight:700;cursor:pointer;font-size:14px;margin-right:8px}
@media print{.noprint{display:none}.qr-section{page-break-inside:avoid}a[href]:after{content:none!important}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
${isDemoMode ? '<div class="watermark">ENTWURF</div>' : ""}
<div class="noprint" style="margin-bottom:20px">
${!isPro ? '<div style="background:#f5f5f5;border:2px solid #111;border-radius:8px;padding:10px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center"><strong>⭐ Testversion</strong><a href="https://buy.stripe.com/bJe5kD18Cc2m3y59Ux9AA02" style="background:#111;color:#fff;padding:6px 12px;border-radius:6px;font-weight:700;text-decoration:none">Pro CHF 29/Mt →</a></div>' : ""}
<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
<button type="button" class="btn" onclick="window.print()">Drucken / PDF</button>
${mailtoHref ? `<a class="btn" href="${escHref(mailtoHref)}">📧 E-Mail</a>` : `<span class="btn btn-muted" title="Keine Kunden-E-Mail hinterlegt">📧 E-Mail</span>`}
</div>
</div>
<div class="header">
  <div>
    ${firmLogo ? `<img src="${firmLogo}" style="height:60px;max-width:160px;object-fit:contain;margin-bottom:8px;display:block"/>` : ""}
    <div class="firm-name">${firmName || firmContact || ""}</div>
    <div class="firm-details">${firmDetails}</div>
  </div>
  <div>
    <div class="invoice-label">Rechnung</div>
    <div class="invoice-meta">
      <div><strong>${invoiceNr}</strong></div>
      <div>${formatDateCH(reportDate)}</div>
      <div>Fällig: ${dueDate}</div>
    </div>
  </div>
</div>
<div class="address-block">
  <div class="address-box">
    <div class="address-label">Rechnungssteller</div>
    <strong>${firmName || firmContact}</strong><br/>${firmDetails}
  </div>
  <div class="address-box">
    <div class="address-label">Rechnungsempfänger</div>
    <strong>${name}</strong><br/>
    ${custStreet}<br/>
    ${[custZip, custCity].filter(Boolean).join(" ")}
  </div>
</div>
${rapportNr != null && String(rapportNr).trim() !== "" ? `<div class="ref-line">Bezug: Rapport Nr. ${escText(String(rapportNr).trim())} vom ${formatDateCH(reportDate)}</div>` : ""}
${projectName ? `<div class="project-line">Projekt: ${projectName}</div>` : ""}
${wHtml ? `<div class="section-title">Arbeitsstunden</div><table><thead><tr><th>Mitarbeiter</th><th style="text-align:center">Zeit</th><th style="text-align:center">Stunden</th><th style="text-align:right">Total</th></tr></thead><tbody>${wHtml}</tbody></table>` : ""}
${mHtml ? `<div class="section-title">Material</div><table><thead><tr><th>Bezeichnung</th><th style="text-align:center">Menge</th><th style="text-align:center">Preis</th><th style="text-align:right">Total</th></tr></thead><tbody>${mHtml}</tbody></table>` : ""}
<div class="totals-box"><div class="totals-inner">
  <div class="totals-row"><span>Subtotal</span><span>CHF ${Number(subtotal).toLocaleString('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div>
  ${discountPct > 0 ? `<div class="totals-discount"><span>Rabatt ${discountPct}%</span><span>− CHF ${Number(discountAmt).toLocaleString('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div>` : ""}
  <div class="totals-row"><span>MwSt 8.1%</span><span>CHF ${Number(vat).toLocaleString('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div>
  ${costs.expenses ? `<div class="totals-row"><span>Spesen</span><span>CHF ${Number(costs.expenses).toLocaleString('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div>` : ""}
  <div class="totals-total"><span>TOTAL CHF</span><span>${Number(totalAmount).toLocaleString('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div>
</div></div>
${skontoPct > 0 ? `<div class="skonto-box">Bei Zahlung bis ${skontoDueDate}: ${skontoPct}% Skonto → CHF ${(totalAmount - skontoAmt).toFixed(2)}</div>` : ""}
<div class="qr-section">
  <div class="qr-left">
    <div class="qr-title">Zahlung</div>
    <div class="qr-fields">
      ${qrUrl ? `<div><div class="qr-label">IBAN</div><div style="font-family:monospace">${custAddr}</div></div>` : '<div class="no-iban">Keine IBAN hinterlegt — bitte in Einstellungen ergänzen</div>'}
      <div><div class="qr-label">Zahlbar bis</div><div>${dueDate}</div></div>
      <div><div class="qr-label">Referenz</div><div>${invoiceNr}</div></div>
    </div>
  </div>
  ${qrUrl ? `<img src="${qrUrl}" width="160" height="160" class="qr-img" alt="QR Code"/>` : ""}
</div>
</body></html>`;

}
