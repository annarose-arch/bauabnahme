import { t } from "./translations.js";
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
  firmPhone, firmEmail, isPro, isDemoMode, mailto, customers, parseCustomerMeta, language = "DE"
) {
  const tr = (t[language] || t.DE).pdf;
  const work = p.workRows || [], mat = p.materialRows || [], tot = p.totals || {};
  const costs = p.costs || {}, photos = p.photos || {}, sig = p.signature || {}, custSig = p.customerSignature || {}
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
${isDemoMode ? '<div class="watermark">${tr.draft}</div>' : ""}
<div class="noprint" style="margin-bottom:14px">
${!isPro ? '<div style="background:#fff8e6;border:2px solid #d4a853;border-radius:8px;padding:10px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center"><strong>⭐ Testversion</strong><a href="https://buy.stripe.com/bJe5kD18Cc2m3y59Ux9AA02" style="background:#d4a853;color:#111;padding:6px 12px;border-radius:6px;font-weight:700;text-decoration:none">Pro CHF 29/Mt →</a></div>' : ""}
<button class="btn noprint" onclick="window.print()">${tr.print}</button>
<a class="btn noprint" href="${mailto}">📧 ${tr.email}</a>
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
    <div class="report-title">${tr.rapport}</div>
    <div style="font-size:13px;color:#555">Nr. ${p.rapportNr || report.id}</div>
    <div style="font-size:13px;color:#555">${formatDateCH(report.date)}</div>
  </div>
</div>
<div class="card">
  <table><tbody>
    <tr><td><b>Rapport-Nr:</b></td><td>${p.rapportNr || "-"}</td><td><b>${tr.date}:</b></td><td>${formatDateCH(report.date)}</td></tr>
    <tr><td><b>${tr.customer}:</b></td><td>${name}</td><td><b>${tr.orderNo}:</b></td><td>${p.orderNo || "-"}</td></tr>
    <tr><td><b>${tr.address}:</b></td><td colspan="3">${custFullAddr}</td></tr>
    ${p.projectName ? `<tr><td><b>${tr.project}:</b></td><td colspan="3">${p.projectName}</td></tr>` : ""}
  </tbody></table>
</div>
${photos.before || photos.after ? `<div class="card"><h3>${tr.photos}</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${photos.before ? `<div><p><b>${tr.before}</b></p><img src="${photos.before}" style="width:100%;max-height:200px;object-fit:cover;border-radius:8px"/></div>` : ""}${photos.after ? `<div><p><b>${tr.after}</b></p><img src="${photos.after}" style="width:100%;max-height:200px;object-fit:cover;border-radius:8px"/></div>` : ""}</div></div>` : ""}
<div class="card"><h3>${tr.workHours}</h3><table><thead><tr><th>#</th><th>${tr.employee}</th><th>${tr.time}</th><th>${tr.hours}</th><th>${tr.total}</th></tr></thead><tbody>${wHtml || "<tr><td colspan='5'>Keine Daten</td></tr>"}</tbody></table></div>
<div class="card"><h3>${tr.material}</h3><table><thead><tr><th>#</th><th>${tr.description}</th><th>${tr.qty}</th><th>${tr.total}</th></tr></thead><tbody>${mHtml || "<tr><td colspan='4'>Keine Daten</td></tr>"}</tbody></table></div>
<div class="card">
  <div><b>${tr.expenses}:</b> CHF ${Number(costs.expenses || 0).toLocaleString('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
  ${costs.notes ? `<div><b>${tr.notes}:</b> ${costs.notes}</div>` : ""}
  <div><b>${tr.subtotal}:</b> CHF ${Number(tot.subtotal || 0).toLocaleString('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
  <div><b>${tr.vat}:</b> CHF ${Number(tot.vat || 0).toLocaleString('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
  <div class="total">TOTAL CHF ${Number(tot.total || 0).toLocaleString('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
</div>
${sig.image || custSig.image ? `<div class="card" style="display:flex;gap:32px"><div>${sig.image ? `<h3>${tr.employee}</h3><div style="margin-bottom:4px"><b>${sig.name || "-"}</b></div><img src="${sig.image}" style="width:220px;border:1px solid rgba(212,168,83,0.4);border-radius:8px"/>` : ""}</div><div>${custSig.image ? `<h3>${tr.customer}</h3><div style="margin-bottom:4px"><b>${custSig.name || "-"}</b></div><img src="${custSig.image}" style="width:220px;border:1px solid rgba(212,168,83,0.4);border-radius:8px"/>` : ""}</div></div>` : ""}

</body></html>`;
}

// ─── Rechnung HTML ──────────────────────────────────────────────────────────
export function buildRechnungHtml({ language = "DE",
  invoiceNr, firmName, firmLogo, firmContact, firmDetails,
  name, custAddr, custStreet, custZip, custCity,
  validWork, validMat, costs, subtotal, discountPct, discountAmt,
  vat, totalAmount, skontoPct, skontoAmt,
  dueDate, skontoDueDate, qrUrl,
  isPro, isDemoMode, reportDate, projectName,
  custEmail, rapportNr,
}) {
  const tr = (t[language] || t.DE).pdf;
  const escText = (s) => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const fCHF = (n) => Number(n||0).toLocaleString('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2});
  const emailTrim = custEmail != null ? String(custEmail).trim() : "";
  const mailSubject = `Rechnung ${invoiceNr}`;
  const mailBody = `Rechnungsnummer: ${invoiceNr}\nBetrag: CHF ${fCHF(totalAmount)}\nFälligkeitsdatum: ${dueDate}`;
  const mailtoHref = emailTrim ? `mailto:${emailTrim}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}` : "";
  const escHref = (u) => String(u).replace(/&/g,"&amp;").replace(/"/g,"&quot;");

  const wHtml = validWork.map(r => `
    <tr>
      <td>${r.employee || "-"}</td>
      <td class="num">${r.from || "-"}–${r.to || "-"}</td>
      <td class="num">${fCHF(r.hours)} h</td>
      <td class="num">CHF ${fCHF(r.total)}</td>
    </tr>`).join("");

  const mHtml = validMat.map(r => `
    <tr>
      <td>${r.name || "-"}</td>
      <td class="num">${r.qty || 0} ${r.unit || ""}</td>
      <td class="num">CHF ${fCHF(r.price)}</td>
      <td class="num">CHF ${fCHF(r.total)}</td>
    </tr>`).join("");

  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>Rechnung ${invoiceNr}</title>
<style>
*{box-sizing:border-box}
@page{margin:16mm;size:A4}
body{font-family:Arial,sans-serif;color:#111;padding:32px;font-size:14px;max-width:800px;margin:0 auto}
.noprint{margin-bottom:20px}
.btn{background:#111;border:none;color:#fff;padding:10px 16px;border-radius:6px;font-weight:700;cursor:pointer;font-size:14px;margin-right:8px;text-decoration:none;display:inline-block}
.watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:80px;font-weight:900;color:rgba(0,0,0,0.06);white-space:nowrap;pointer-events:none;z-index:1000}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:16px;border-bottom:2px solid #111}
.firm-name{font-size:20px;font-weight:900}
.firm-details{font-size:12px;color:#555;line-height:1.7;margin-top:4px}
.invoice-label{font-size:28px;font-weight:900;text-align:right}
.invoice-meta{font-size:13px;color:#444;text-align:right;line-height:2}
.address-block{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:24px 0}
.address-box{border-left:3px solid #111;padding:10px 16px}
.address-label{font-size:10px;text-transform:uppercase;color:#888;font-weight:700;letter-spacing:1px;margin-bottom:4px}
.ref-line{margin:8px 0 4px;font-size:13px;color:#555}
.project-line{margin:4px 0 20px;font-size:13px;font-style:italic;color:#555;padding-bottom:12px;border-bottom:1px solid #eee}
.section-title{font-size:11px;text-transform:uppercase;letter-spacing:1.5px;font-weight:800;margin:24px 0 0;border-bottom:2px solid #111;padding-bottom:4px}
table{width:100%;border-collapse:collapse;margin-bottom:8px}
th{background:#111;color:#fff;padding:10px 12px;font-size:12px;font-weight:700;text-align:left}
th.num{text-align:right}
td{padding:9px 12px;font-size:13px;border-bottom:1px solid #eee}
td.num{text-align:right;font-family:monospace;white-space:nowrap}
tr:nth-child(even) td{background:#f9f9f9}
.totals{display:flex;justify-content:flex-end;margin:24px 0}
.totals table{width:360px;border-collapse:collapse}
.totals td{padding:6px 10px;font-size:13px;border:none}
.totals td.num{text-align:right;font-family:monospace;white-space:nowrap;width:120px}
.totals tr.total-row td{border-top:2px solid #111;font-size:18px;font-weight:900;padding-top:10px}
.skonto-box{background:#f5f5f5;border-left:3px solid #555;padding:10px 16px;font-size:12px;color:#444;margin:8px 0 20px}
.qr-section{border-top:2px solid #111;margin-top:32px;padding-top:20px;display:flex;gap:28px;align-items:flex-start}
.qr-title{font-size:15px;font-weight:800;margin-bottom:12px}
.qr-fields{display:grid;gap:8px;font-size:12px;color:#444}
.qr-label{font-size:10px;text-transform:uppercase;color:#888;font-weight:700;letter-spacing:1px;margin-bottom:2px}
.qr-img{border:1px solid #ccc;padding:6px;background:#fff}
.no-iban{background:#f5f5f5;border:2px dashed #bbb;border-radius:6px;padding:14px;font-size:13px;color:#666;text-align:center}
@media print{.noprint{display:none}a[href]:after{content:none!important}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}.qr-section{page-break-inside:avoid}}
</style></head><body>
${isDemoMode ? `<div class="watermark">${tr.draft}</div>` : ""}
<div class="noprint">
  ${!isPro ? `<div style="background:#f5f5f5;border:2px solid #111;border-radius:8px;padding:10px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center"><strong>⭐ Testversion</strong><a href="https://buy.stripe.com/bJe5kD18Cc2m3y59Ux9AA02" style="background:#111;color:#fff;padding:6px 12px;border-radius:6px;font-weight:700;text-decoration:none">Pro CHF 29/Mt →</a></div>` : ""}
  <button type="button" class="btn" onclick="window.print()">${tr.print}</button>
  ${mailtoHref ? `<a class="btn" href="${escHref(mailtoHref)}">📧 ${tr.email}</a>` : `<span class="btn" style="opacity:0.5">📧 ${tr.email}</span>`}
</div>
<div class="header">
  <div>
    ${firmLogo ? `<img src="${firmLogo}" style="height:60px;max-width:160px;object-fit:contain;margin-bottom:8px;display:block"/>` : ""}
    <div class="firm-name">${firmName || firmContact || ""}</div>
    <div class="firm-details">${firmDetails}</div>
  </div>
  <div>
    <div class="invoice-label">${tr.invoice}</div>
    <div class="invoice-meta">
      <div><strong>${invoiceNr}</strong></div>
      <div>${formatDateCH(reportDate)}</div>
      <div>${tr.dueDate}: <strong>${dueDate}</strong></div>
    </div>
  </div>
</div>
<div class="address-block">
  <div class="address-box">
    <div class="address-label">${tr.issuer}</div>
    <strong>${firmName || firmContact}</strong><br/>${firmDetails}
  </div>
  <div class="address-box">
    <div class="address-label">${tr.recipient}</div>
    <strong>${name}</strong><br/>${custStreet}<br/>${[custZip,custCity].filter(Boolean).join(" ")}
  </div>
</div>
${rapportNr != null && String(rapportNr).trim() !== "" ? `<div class="ref-line">${tr.ref}: Rapport Nr. ${escText(String(rapportNr).trim())} vom ${formatDateCH(reportDate)}</div>` : ""}
${projectName ? `<div class="project-line">${tr.project}: ${projectName}</div>` : ""}
${wHtml ? `<div class="section-title">${tr.workHours}</div><table><thead><tr><th>${tr.employee}</th><th class="num">${tr.time}</th><th class="num">${tr.hours}</th><th class="num">Total</th></tr></thead><tbody>${wHtml}</tbody></table>` : ""}
${mHtml ? `<div class="section-title">${tr.material}</div><table><thead><tr><th>${tr.description}</th><th class="num">${tr.qty}</th><th class="num">${tr.price}</th><th class="num">Total</th></tr></thead><tbody>${mHtml}</tbody></table>` : ""}
<div class="totals"><table>
  <tr><td>${tr.subtotal}</td><td class="num">CHF ${fCHF(subtotal)}</td></tr>
  ${discountPct > 0 ? `<tr><td>${tr.discount} ${discountPct}%</td><td class="num">− CHF ${fCHF(discountAmt)}</td></tr>` : ""}
  <tr><td>${tr.vat}</td><td class="num">CHF ${fCHF(vat)}</td></tr>
  ${costs.expenses ? `<tr><td>${tr.expenses}</td><td class="num">CHF ${fCHF(costs.expenses)}</td></tr>` : ""}
  <tr class="total-row"><td>TOTAL</td><td class="num">CHF ${fCHF(totalAmount)}</td></tr>
</table></div>
${skontoPct > 0 ? `<div class="skonto-box">${tr.skonto} ${skontoPct}% ${tr.dueDate} ${skontoDueDate}: CHF ${fCHF(totalAmount - skontoAmt)}</div>` : ""}
<div class="qr-section">
  <div>
    <div class="qr-title">${tr.payment}</div>
    <div class="qr-fields">
      ${qrUrl ? `<div><div class="qr-label">IBAN</div><div style="font-family:monospace">${custAddr}</div></div>` : `<div class="no-iban">${tr.noIban}</div>`}
      <div><div class="qr-label">${tr.dueDate}</div><div>${dueDate}</div></div>
      <div><div class="qr-label">${tr.reference}</div><div>${invoiceNr}</div></div>
    </div>
  </div>
  ${qrUrl ? `<img src="${qrUrl}" width="160" height="160" class="qr-img" alt="QR"/>` : ""}
</div>
</body></html>`;
}
