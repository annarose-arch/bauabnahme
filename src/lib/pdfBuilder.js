import { t } from "./translations.js";
import { formatDateCH } from "./utils.js";

// ─── Swiss QR-Bill ─────────────────────────────────────────────────────────
export function buildSwissQR(
  iban, amount, creditorName, creditorAddress, creditorZip, creditorCity,
  debtorName, debtorAddress, debtorZip, debtorCity, ref, message
) {
  // Gibt Daten-JSON zurück für swissqrbill Browser-Rendering
  return JSON.stringify({
    iban: (iban||"").replace(/\s/g,""),
    amount: Number(amount)||0,
    creditorName: creditorName||"",
    creditorStreet: (creditorAddress||"").split(",")[0].trim(),
    creditorZip: String(creditorZip||"").trim(),
    creditorCity: String(creditorCity||"").trim(),
    debtorName: debtorName||"",
    debtorStreet: (debtorAddress||"").split("\n")[0].trim(),
    debtorZip: String(debtorZip||"").trim() || ((debtorAddress||"").split("\n")[1]||"").trim().split(" ")[0]||"",
    debtorCity: String(debtorCity||"").trim() || ((debtorAddress||"").split("\n")[1]||"").trim().split(" ").slice(1).join(" ")||"",
    message: message||"",
    reference: undefined
  });
}

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
@media print{.noprint{display:none !important}a[href]:after{content:none !important}a{color:inherit;text-decoration:none}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
${isDemoMode ? '<div class="watermark">${tr.draft}</div>' : ""}
<div class="noprint" style="margin-bottom:14px">
${!isPro ? `<div style="background:#fff8e6;border:2px solid #d4a853;border-radius:8px;padding:10px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center"><strong>⭐ ${language==="FR"?"Version Starter":language==="IT"?"Versione Starter":language==="EN"?"Starter version":"Starter Version"}</strong><a href="https://buy.stripe.com/6oU28r18C8Qad8FfeR9AA09" style="background:#d4a853;color:#111;padding:6px 12px;border-radius:6px;font-weight:700;text-decoration:none">${language==="FR"?"Passer à Pro →":language==="IT"?"Passa a Pro →":language==="EN"?"Upgrade to Pro →":"Upgrade auf Pro →"}</a></div>` : ""}
<button onclick="window.close()" style="background:#d4a853;color:#111;border:none;border-radius:6px;padding:6px 14px;font-size:14px;cursor:pointer;margin-right:8px">✕</button>
<button class="btn noprint" onclick="if(navigator.share){navigator.share({title:document.title,url:window.location.href}).catch(()=>{})}else{window.print()}" style="background:#d4a853;color:#111">📤 ${tr.share||'Teilen'}</button>
<button class="btn noprint" onclick="window.print()">${tr.print}</button>
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
${sig.image || custSig.image ? `<div class="card" style="display:flex;gap:32px"><div>${sig.image ? `<h3>${tr.employee}</h3><div style="margin-bottom:4px"><b>${sig.name || "-"}</b></div><img src="${sig.image}" style="width:180px;border:1px solid rgba(212,168,83,0.4);border-radius:8px"/>` : ""}</div><div>${custSig.image ? `<h3>${tr.customer}</h3><div style="margin-bottom:4px"><b>${custSig.name || "-"}</b></div><img src="${custSig.image}" style="width:220px;border:1px solid rgba(212,168,83,0.4);border-radius:8px"/>` : ""}</div></div>` : ""}
</body></html>`
}// ─── Rechnung HTML ──────────────────────────────────────────────────────────
export function buildRechnungHtml({ language = "DE",
  invoiceNr, firmName, firmLogo, firmContact, firmAddress = "", firmPhone = "", firmEmail = "", firmMwst = "",
  name, custAddr, custStreet, custZip, custCity,
  validWork, validMat, costs, subtotal, discountPct, discountAmt,
  vat, totalAmount, skontoPct, skontoAmt,
  dueDate, skontoDueDate, qrUrl, payDays = 30, skontoDays = 10, firmIban = "",
  isPro, isDemoMode, reportDate, projectName,
  custEmail, rapportNr,
  // legacy compat
  firmDetails,
}) {
  const tr = (t[language] || t.DE).pdf;
  const fmt = n => Number(n||0).toLocaleString('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2});
  const esc = s => String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const labelInvoice = language==="FR"?"Facture":language==="IT"?"Fattura":language==="EN"?"Invoice":"Rechnung";
  const labelDue = language==="FR"?"Payable jusqu'au":language==="IT"?"Pagabile entro":language==="EN"?"Due date":"Zahlbar bis";
  const labelRecipient = language==="FR"?"Destinataire":language==="IT"?"Destinatario":language==="EN"?"Recipient":"Empfänger";
  const labelSubtotal = language==="FR"?"Sous-total":language==="IT"?"Subtotale":language==="EN"?"Subtotal":"Subtotal";
  const labelDiscount = language==="FR"?"Rabais":language==="IT"?"Sconto":language==="EN"?"Discount":"Rabatt";
  const labelVat = "MwSt 8.1%";
  const labelSkonto = language==="FR"?"Escompte":language==="IT"?"Sconto cassa":language==="EN"?"Cash discount":"Skonto";
  const labelStarter = language==="FR"?"Version Starter":language==="IT"?"Versione Starter":language==="EN"?"Starter version":"Starter Version";
  const labelUpgrade = language==="FR"?"Passer à Pro →":language==="IT"?"Passa a Pro →":language==="EN"?"Upgrade to Pro →":"Upgrade auf Pro →";
  const labelTip = language==="FR"?"Conseil: Désactivez les en-têtes et pieds de page dans la boîte de dialogue d'impression.":language==="IT"?"Suggerimento: Disattivare intestazioni e piè di pagina nella finestra di stampa.":language==="EN"?"Tip: Disable headers and footers in the print dialog for a clean PDF.":"Tipp: Kopf- und Fusszeilen im Druckdialog deaktivieren für ein sauberes PDF.";

  const mailSubject = labelInvoice + ' ' + invoiceNr;
  const mailBody = invoiceNr + ' CHF ' + fmt(totalAmount);
  const mailtoHref = custEmail ? 'mailto:' + custEmail + '?subject=' + encodeURIComponent(mailSubject) + '&body=' + encodeURIComponent(mailBody) : '';

  const custAddrFull = custAddr || [custStreet,[custZip,custCity].filter(Boolean).join(' ')].filter(Boolean).join('\n');

  const wHtml = (validWork||[]).map(r => `<tr><td>${esc(r.employee||'-')}</td><td style="text-align:center">${esc(r.from||'-')}–${esc(r.to||'-')}</td><td style="text-align:right">${Number(r.hours||0).toLocaleString('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2})} h</td><td style="text-align:right">${fmt(r.total||0)}</td></tr>`).join('');
  const mHtml = (validMat||[]).map(r => { const tot = Number(r.total||0)||Number(r.qty||0)*Number(r.price||0); return `<tr><td>${esc(r.name||'-')}</td><td style="text-align:right">${r.qty||0} ${esc(r.unit||'')}</td><td style="text-align:right">${fmt(r.price||0)}</td><td style="text-align:right">${fmt(tot)}</td></tr>`; }).join('');

  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>${labelInvoice} ${invoiceNr}</title>
<style>
*{box-sizing:border-box}
@page{margin:16mm;size:A4}
body{font-family:Arial,sans-serif;color:#111;margin:0 auto;padding:32px;font-size:14px;max-width:800px}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}
.invoice-label{font-size:28px;font-weight:900;color:#111;text-align:right}
.invoice-meta{font-size:13px;color:#333;text-align:right;line-height:1.9}
.address-box{width:260px;padding:10px 14px;border-left:3px solid #111;font-size:13px;line-height:1.5}
.address-label{font-size:10px;text-transform:uppercase;color:#666;font-weight:700;margin-bottom:4px;letter-spacing:1px}
.section-title{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#555;margin:20px 0 6px;border-bottom:1px solid #ddd;padding-bottom:4px}
.data-table{width:100%;border-collapse:collapse;margin-bottom:16px}
.data-table th{background:#111;color:#fff;padding:8px 10px;text-align:left;font-size:12px;font-weight:700}
.data-table th.r{text-align:right}
.data-table td{padding:7px 10px;border-bottom:1px solid #eee;font-size:13px}
.data-table td.r{text-align:right}
.data-table tr:nth-child(even) td{background:#f8f8f8}
.btn{background:#111;border:none;color:#fff;padding:10px 16px;border-radius:6px;font-weight:700;cursor:pointer;font-size:14px;margin-right:8px;text-decoration:none;display:inline-block}
.watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:80px;font-weight:900;color:rgba(0,0,0,0.06);white-space:nowrap;pointer-events:none;z-index:1000}
@media print{.noprint{display:none !important}a[href]:after{content:none !important}a{color:inherit;text-decoration:none}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
${isDemoMode ? '<div class="watermark">ENTWURF</div>' : ''}
<div class="noprint" style="margin-bottom:20px">
${!isPro ? `<div style="background:#f5f5f5;border:2px solid #111;border-radius:8px;padding:10px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center"><strong>⭐ ${labelStarter}</strong><a href="https://buy.stripe.com/6oU28r18C8Qad8FfeR9AA09" style="background:#111;color:#fff;padding:6px 12px;border-radius:6px;font-weight:700;text-decoration:none">${labelUpgrade}</a></div>` : ''}
<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
<button onclick="window.close()" style="background:#d4a853;color:#111;border:none;border-radius:6px;padding:6px 14px;font-size:14px;cursor:pointer;margin-right:8px">✕</button>
<button type="button" class="btn" onclick="window.print()">${tr.print||'Drucken / PDF'}</button>
${mailtoHref ? `<a class="btn" href="${mailtoHref.replace(/&/g,'&amp;')}">📧 ${tr.email||'E-Mail'}</a>` : `<span class="btn" style="opacity:0.4;cursor:default">📧 ${tr.email||'E-Mail'}</span>`}
</div>
<div style="font-size:11px;color:#888;margin-top:8px">${labelTip}</div>
</div>

<div class="header">
  <div style="text-align:left">
    ${firmLogo ? `<img src="${firmLogo}" style="height:86px;max-width:220px;object-fit:contain;margin-bottom:8px;display:block"/>` : ''}
    <div style="font-size:14px;font-weight:700">${esc(firmName||firmContact||'')}</div>
    <div style="font-size:13px;color:#555;line-height:1.5;margin-top:2px">${[firmAddress,firmPhone,firmEmail,firmMwst?"MWST-Nr: "+firmMwst:""].filter(Boolean).map(esc).join("<br/>")}</div>
  </div>
  <div>
    <div class="invoice-label">${labelInvoice}</div>
    <div class="invoice-meta">
      <div><strong>${esc(invoiceNr)}</strong></div>
      <div>${esc(reportDate||'')}</div>
      ${dueDate && dueDate!=='-' ? `<div>${labelDue}: ${esc(dueDate)}</div>` : ''}
    </div>
  </div>
</div>

<div style="border-top:2px solid #111;padding-top:16px;display:flex;justify-content:flex-end;margin:16px 0 28px;padding-right:0">
  <div class="address-box">
    <div class="address-label">${labelRecipient}</div>
    <strong>${esc((name||"").trim())}</strong><br/>
    ${custAddrFull.split("\n").filter(Boolean).map(l => esc(l)).join("<br/>")}</span>
  </div>
</div>

${projectName ? `<div style="margin:0 0 20px;font-size:14px;font-style:italic;color:#333;border-bottom:1px solid #ddd;padding-bottom:8px">${esc(projectName)}</div>` : ''}
${rapportNr ? `<div style="margin:0 0 12px;font-size:12px;color:#666">${String(rapportNr).startsWith("OF-") ? (language==="FR"?"Réf. Offre":language==="IT"?"Rif. Offerta":language==="EN"?"Quote Ref.":"Offerten-Ref.") : "Rapport Nr."} ${esc(String(rapportNr))}</div>` : ""}

${wHtml ? `<div class="section-title">${tr.workHours||'Arbeitsstunden'}</div><table class="data-table"><thead><tr><th>${tr.employee||'Mitarbeiter'}</th><th style="text-align:center">Zeit</th><th style="text-align:right">Std</th><th style="text-align:right">Total</th></tr></thead><tbody>${wHtml}</tbody></table>` : ''}
${mHtml ? `<div class="section-title">${tr.material||'Material'}</div><table class="data-table"><thead><tr><th>${tr.description||'Bezeichnung'}</th><th class="r">${tr.qty||'Menge'}</th><th class="r">${tr.price||'Preis'}</th><th class="r">Total</th></tr></thead><tbody>${mHtml}</tbody></table>` : ''}
${(costs&&costs.expenses) ? `<div style="text-align:right;font-size:13px;margin:-8px 0 8px">${tr.expenses||'Spesen'}: CHF ${fmt(costs.expenses)}</div>` : ''}

<div style="display:flex;justify-content:flex-end;margin-top:32px">
  <table style="width:300px;border-collapse:collapse">
    <tr><td style="padding:2px 8px;font-size:13px">${labelSubtotal}</td><td style="padding:2px 4px;font-size:13px;text-align:right">CHF</td><td style="padding:2px 0;font-size:13px;text-align:right;min-width:80px">${fmt(subtotal)}</td></tr>
    ${discountPct>0 ? `<tr><td style="padding:2px 8px;font-size:13px">${labelDiscount} ${discountPct}%</td><td style="padding:2px 4px;font-size:13px;text-align:right">CHF</td><td style="padding:2px 0;font-size:13px;text-align:right">−${fmt(discountAmt)}</td></tr>` : ''}
    <tr><td style="padding:2px 8px;font-size:13px">${labelVat}</td><td style="padding:2px 4px;font-size:13px;text-align:right">CHF</td><td style="padding:2px 0;font-size:13px;text-align:right">${fmt(vat)}</td></tr>
    <tr style="border-top:2px solid #111"><td style="padding:6px 8px 2px;font-size:16px;font-weight:900">TOTAL</td><td style="padding:6px 4px 2px;font-size:16px;font-weight:900;text-align:right">CHF</td><td style="padding:6px 0 2px;font-size:16px;font-weight:900;text-align:right">${fmt(totalAmount)}</td></tr>
  </table>
</div>

${(payDays||skontoPct>0) ? `<div style="margin-top:24px;font-size:13px;color:#333">${payDays ? `<div>${language==="FR"?"Délai de paiement":language==="IT"?"Termine pagamento":language==="EN"?"Payment terms":"Zahlungsziel"}: ${payDays} ${language==="FR"?"jours":language==="IT"?"giorni":language==="EN"?"days":"Tage"}</div>` : ""}${skontoPct>0 ? `<div>${labelSkonto} ${skontoPct}% bis ${skontoDueDate}: CHF ${fmt(Number(totalAmount)-Number(skontoAmt))}</div>` : ""}</div>` : ""}

${qrUrl ? `
<script src="/swissqrbill.js"></script>
<div id="zahlteil-container" style="page-break-before:always;margin-top:0"></div>
<script>
(function() {
  try {
    var data = JSON.parse('${qrUrl.replace(/'/g, "\\'")}');
    var billData = {
      currency: "CHF",
      amount: data.amount,
      creditor: {
        account: data.iban,
        name: data.creditorName,
        address: data.creditorStreet,
        buildingNumber: "",
        zip: parseInt(data.creditorZip)||0,
        city: data.creditorCity,
        country: "CH"
      },
      debtor: data.debtorName ? {
        name: data.debtorName,
        address: data.debtorStreet,
        buildingNumber: "",
        zip: parseInt(data.debtorZip)||0,
        city: data.debtorCity,
        country: "CH"
      } : undefined,
      message: data.message || undefined
    };
    var ibanClean = data.iban ? data.iban.replace(/\s/g,"") : ""; var isQRIBAN = ibanClean && parseInt(ibanClean.substring(4,8)) >= 3000 && parseInt(ibanClean.substring(4,8)) <= 3199;
    if(isQRIBAN){var refBase=(data.message||"").replace(/[^0-9]/g,"").padStart(26,"0").slice(-26);var table=[0,9,4,6,8,2,7,1,3,5];var carry=0;for(var ix=0;ix<refBase.length;ix++)carry=table[(carry+parseInt(refBase[ix]))%10];billData.reference=refBase+((10-carry)%10);}
    var SQB = SwissQRBill.svg.SwissQRBill; var bill = new SQB(billData, { language: "${language||'DE'}" });
    document.getElementById("zahlteil-container").innerHTML = bill.toString();
  } catch(e) {
    console.error("SwissQRBill error:", e.message);
    document.getElementById("zahlteil-container").innerHTML = '<p style="color:red">Zahlteil konnte nicht generiert werden: ' + e.message + '</p>';
  }
})();
</script>` : ""}
</body></html>`;
}

export function buildMahnungHtml({ language = "DE",
  invoiceNr, mahnungNr, firmName, firmLogo, firmContact, firmAddress = "", firmPhone = "", firmEmail = "", firmMwst = "",
  name, custAddr, originalAmount, mahnungFee, mahnungNotes, newDueDate, reportDate,
  isPro, isDemoMode, custEmail = "", projectName = "", qrUrl = "", iban = "", firmIban = ""
}) {
  const lb = {
    DE:{title:"Mahnung",nr:"Mahnung Nr.",original:"Originalrechnung",fee:"Mahngebühr",total:"Gesamtbetrag",due:"Zahlbar bis",note:"Hinweis",noteText:"Bitte begleichen Sie den ausstehenden Betrag bis zum angegebenen Datum. Bei weiterer Nichtzahlung behalten wir uns rechtliche Schritte vor.",print:"Drucken / PDF",email:"E-Mail",date:"Datum",recipient:"Empfänger",starter:"Starter Version",upgrade:"Upgrade auf Pro →",tip:"Tipp: Kopf- und Fusszeilen im Druckdialog deaktivieren."},
    FR:{title:"Rappel",nr:"Rappel N°",original:"Facture originale",fee:"Frais de rappel",total:"Montant total",due:"Payable jusqu'au",note:"Remarque",noteText:"Veuillez régler le montant dû avant la date indiquée.",print:"Imprimer / PDF",email:"E-Mail",date:"Date",recipient:"Destinataire",starter:"Version Starter",upgrade:"Passer à Pro →",tip:"Conseil: Désactivez les en-têtes et pieds de page."},
    IT:{title:"Sollecito",nr:"Sollecito N.",original:"Fattura originale",fee:"Spese di sollecito",total:"Importo totale",due:"Pagabile entro",note:"Nota",noteText:"Si prega di saldare l'importo entro la data indicata.",print:"Stampa / PDF",email:"E-Mail",date:"Data",recipient:"Destinatario",starter:"Versione Starter",upgrade:"Passa a Pro →",tip:"Suggerimento: Disattivare intestazioni e piè di pagina."},
    EN:{title:"Reminder",nr:"Reminder No.",original:"Original invoice",fee:"Reminder fee",total:"Total amount",due:"Payable by",note:"Note",noteText:"Please settle the outstanding amount by the date indicated.",print:"Print / PDF",email:"E-Mail",date:"Date",recipient:"Recipient",starter:"Starter version",upgrade:"Upgrade to Pro →",tip:"Tip: Disable headers and footers in the print dialog."},
  }[language] || {title:"Mahnung",nr:"Mahnung Nr.",original:"Originalrechnung",fee:"Mahngebühr",total:"Gesamtbetrag",due:"Zahlbar bis",note:"Hinweis",noteText:"Bitte begleichen Sie den ausstehenden Betrag.",print:"Drucken / PDF",email:"E-Mail",date:"Datum",recipient:"Empfänger",starter:"Starter Version",upgrade:"Upgrade auf Pro →",tip:"Tipp: Kopf- und Fusszeilen deaktivieren."};
  const fmt = n => Number(n||0).toLocaleString('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2});
  const esc = s => String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const totalDue = Number(originalAmount||0) + Number(mahnungFee||0);
  const custAddrLines = (custAddr||'').split('\n').filter(Boolean);

  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>${lb.title} ${invoiceNr}</title>
<style>
*{box-sizing:border-box}
@page{margin:16mm;size:A4}
body{font-family:Arial,sans-serif;color:#111;margin:0 auto;padding:32px;font-size:14px;max-width:800px}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0}
.invoice-label{font-size:28px;font-weight:900;color:#111;text-align:right}
.invoice-meta{font-size:13px;color:#333;text-align:right;line-height:1.9}
.address-box{width:240px;padding:10px 14px;border-left:3px solid #111}
.address-label{font-size:10px;text-transform:uppercase;color:#666;font-weight:700;margin-bottom:4px;letter-spacing:1px}
.data-table{width:100%;border-collapse:collapse;margin-bottom:16px}
.data-table th{background:#111;color:#fff;padding:8px 10px;text-align:left;font-size:12px;font-weight:700}
.data-table th.r{text-align:right}
.data-table td{padding:7px 10px;border-bottom:1px solid #eee;font-size:13px}
.data-table td.r{text-align:right}
.btn{background:#111;border:none;color:#fff;padding:10px 16px;border-radius:6px;font-weight:700;cursor:pointer;font-size:14px;margin-right:8px;text-decoration:none;display:inline-block}
.watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:80px;font-weight:900;color:rgba(0,0,0,0.06);white-space:nowrap;pointer-events:none;z-index:0}
@media print{.noprint{display:none !important}a[href]:after{content:none !important}a{color:inherit;text-decoration:none}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
${isDemoMode ? '<div class="watermark">ENTWURF</div>' : ''}
<div class="noprint" style="margin-bottom:20px">
${!isPro ? `<div style="background:#f5f5f5;border:2px solid #111;border-radius:8px;padding:10px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center"><strong>⭐ ${lb.starter}</strong><a href="https://buy.stripe.com/6oU28r18C8Qad8FfeR9AA09" style="background:#111;color:#fff;padding:6px 12px;border-radius:6px;font-weight:700;text-decoration:none">${lb.upgrade}</a></div>` : ''}
<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
<button onclick="window.close()" style="background:#d4a853;color:#111;border:none;border-radius:6px;padding:6px 14px;font-size:14px;cursor:pointer;margin-right:8px">✕</button>
<button type="button" class="btn" onclick="window.print()">🖨 ${lb.print}</button>
${custEmail ? `<a class="btn" href="mailto:${custEmail}?subject=${encodeURIComponent(lb.title+' '+invoiceNr)}">📧 ${lb.email}</a>` : ''}
</div>
<div style="font-size:11px;color:#888;margin-top:6px">${lb.tip}</div>
</div>

<div class="header">
  <div style="text-align:left">
    ${firmLogo ? `<img src="${firmLogo}" style="height:86px;max-width:220px;object-fit:contain;margin-bottom:8px;display:block"/>` : ''}
    <div style="font-size:14px;font-weight:700">${esc(firmName||firmContact||'')}</div>
    <div style="font-size:13px;color:#555;line-height:1.5;margin-top:2px">${[firmAddress,firmPhone,firmEmail,firmMwst?'MWST-Nr: '+firmMwst:''].filter(Boolean).map(esc).join('<br/>')}</div>
  </div>
  <div>
    <div class="invoice-label">${lb.title}</div>
    <div class="invoice-meta">
      <div><strong>${lb.nr} ${esc(String(mahnungNr||1))}</strong></div>
      <div>${esc(reportDate||'')}</div>
    </div>
  </div>
</div>

<div style="display:flex;justify-content:flex-end;margin:20px 0 32px;padding-right:0">
  <div class="address-box">
    <div class="address-label">${lb.recipient}</div>
    <div style="font-size:13px;line-height:1.7;text-align:left"><strong>${esc((name||"").trim())}</strong><br/>${custAddrLines.map(esc).join("<br/>")}</div>
  </div>
</div>

${projectName ? `<div style="margin:0 0 16px;font-size:13px;font-style:italic;color:#333;border-bottom:1px solid #ddd;padding-bottom:6px">${esc(projectName)}</div>` : ''}

<table class="data-table">
  <thead><tr><th>${lb.original}</th><th class="r">CHF</th></tr></thead>
  <tbody>
    <tr><td>${lb.original}: ${esc(invoiceNr)}</td><td class="r">${fmt(originalAmount)}</td></tr>
    ${Number(mahnungFee||0)>0 ? `<tr><td>${lb.fee}</td><td class="r">${fmt(mahnungFee)}</td></tr>` : ''}
  </tbody>
</table>

<div style="display:flex;justify-content:flex-end;margin-top:16px">
  <table style="width:300px;border-collapse:collapse">
    <tr style="border-top:2px solid #111"><td style="padding:6px 8px;font-size:16px;font-weight:900">${lb.total}</td><td style="padding:6px 4px;font-size:16px;font-weight:900;text-align:right">CHF</td><td style="padding:6px 0;font-size:16px;font-weight:900;text-align:right;min-width:80px">${fmt(totalDue)}</td></tr>
  </table>
</div>

<div style="background:#f5f5f5;border-left:3px solid #111;padding:8px 12px;font-size:13px;color:#111;margin-top:16px"><strong>${lb.due}:</strong> ${esc(newDueDate||'')}</div>
${mahnungNotes ? `<div style="background:#f5f5f5;border-left:3px solid #555;padding:8px 12px;font-size:12px;color:#333;margin-top:8px"><strong>${lb.note}:</strong> ${esc(mahnungNotes)}</div>` : ''}
<div style="background:#f5f5f5;border-left:3px solid #555;padding:8px 12px;font-size:12px;color:#555;margin-top:8px">${lb.noteText}</div>

${qrUrl ? `
<div id="mahnung-zahlteil" style="margin-top:32px"></div>
<script src="/swissqrbill.js"></` + `script>
<script>
(function(){
  try {
    var d=JSON.parse('${qrUrl.replace(/'/g,"\\'")}');
    var bd={currency:"CHF",amount:d.amount,creditor:{account:d.iban,name:d.creditorName,address:d.creditorStreet,buildingNumber:"",zip:parseInt(d.creditorZip)||0,city:d.creditorCity,country:"CH"},debtor:d.debtorName&&d.debtorZip?{name:d.debtorName,address:d.debtorStreet,buildingNumber:"",zip:parseInt(d.debtorZip)||0,city:d.debtorCity,country:"CH"}:undefined,message:d.message||undefined};
    var ibanC=d.iban?d.iban.replace(/\\s/g,""):""; var isQR=ibanC&&parseInt(ibanC.substring(4,8))>=3000&&parseInt(ibanC.substring(4,8))<=3199;
    if(isQR){var refBase2=(d.message||"").replace(/[^0-9]/g,"").padStart(26,"0").slice(-26);var table2=[0,9,4,6,8,2,7,1,3,5];var carry2=0;for(var i2=0;i2<refBase2.length;i2++)carry2=table2[(carry2+parseInt(refBase2[i2]))%10];bd.reference=refBase2+((10-carry2)%10);}
    var bill=new SwissQRBill.svg.SwissQRBill(bd,{language:"${language||'DE'}"});
    document.getElementById("mahnung-zahlteil").innerHTML=bill.toString();
  }catch(e){console.error(e);}
})();
</` + `script>` : ''}
</body></html>`;
}


export function buildOfferteHtml({ language = "DE",
  offerteNr, firmName, firmLogo, firmContact, firmAddress, firmPhone, firmEmail, firmMwst = "",
  name, custAddr, validUntil, payDays, skontoPct, skontoAmt, skontoDays,
  workRows, materialRows, subtotal, discountPct, discountAmt, lumpsum,
  vat, total, notes, projectName, reportDate, custEmail,
  isPro, isDemoMode,
  signatureImage, customerSignatureImage, signerName, customerSignerName,
  photo,
}) {
  const tr = (t[language] || t.DE).pdf;
  const esc = s => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const fmt = n => Number(n||0).toLocaleString('de-CH',{minimumFractionDigits:2,maximumFractionDigits:2});

  const wHtml = (workRows||[]).filter(r=>r.employee||r.hours>0).map(r => {
    const h = Number(r.hours||0); const tot = h*Number(r.rate||0);
    return `<tr><td>${esc(r.employee||"-")}</td><td style="text-align:center">${esc(r.from||"-")}–${esc(r.to||"-")}</td><td style="text-align:right">${fmt(h)} h</td><td style="text-align:right">${fmt(tot)}</td></tr>`;
  }).join("");

  const mHtml = (materialRows||[]).filter(r=>r.name||r.qty>0).map(r => {
    const tot = Number(r.qty||0)*Number(r.price||0);
    return `<tr><td>${esc(r.name||"-")}</td><td style="text-align:right">${r.qty||0} ${esc(r.unit||"")}</td><td style="text-align:right">${fmt(r.price||0)}</td><td style="text-align:right">${fmt(tot)}</td></tr>`;
  }).join("");

  const labelOfferte = language==="FR"?"Offre":language==="IT"?"Offerta":language==="EN"?"Quote":"Offerte";
  const labelValidUntil = language==="FR"?"Valable jusqu'au":language==="IT"?"Valido fino al":language==="EN"?"Valid until":"Gültig bis";
  const labelPayDays = language==="FR"?"Délai de paiement":language==="IT"?"Termine pagamento":language==="EN"?"Payment terms":"Zahlungsziel";
  const labelSkonto = language==="FR"?"Escompte":language==="IT"?"Sconto cassa":language==="EN"?"Cash discount":"Skonto";
  const labelDiscount = language==="FR"?"Rabais":language==="IT"?"Sconto":language==="EN"?"Discount":"Rabatt";
  const labelLumpsum = language==="FR"?"Déduction forfaitaire":language==="IT"?"Deduzione forfettaria":language==="EN"?"Lump sum":"Pauschalabzug";

  const mailSubject = `${labelOfferte} OF-${offerteNr} – ${name||""}`;
  const mailBody = `Guten Tag\n\nIm Anhang finden Sie die Offerte.\n\nKunde: ${name||""}\nDatum: ${reportDate||""}\nTOTAL CHF: ${fmt(total)}`;
  const mailtoHref = custEmail
    ? `mailto:${custEmail}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`
    : `mailto:?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;

  const firmDetails = [firmContact&&firmName?firmContact:"", firmAddress, firmPhone, firmEmail].filter(Boolean).join("<br/>");

  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>${labelOfferte} OF-${offerteNr}</title>
<style>
*{box-sizing:border-box}
@page{margin:16mm;size:A4}
body{font-family:Arial,sans-serif;color:#111;margin:0 auto;padding:32px;font-size:14px;max-width:800px}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}
.invoice-label{font-size:28px;font-weight:900;color:#111;text-align:right}
.invoice-meta{font-size:13px;color:#333;text-align:right;line-height:1.9}
.address-box{width:240px;padding:10px 14px;border-left:3px solid #111}
.address-label{font-size:10px;text-transform:uppercase;color:#666;font-weight:700;margin-bottom:4px;letter-spacing:1px}
.section-title{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#555;margin:20px 0 6px;border-bottom:1px solid #ddd;padding-bottom:4px}
.data-table{width:100%;border-collapse:collapse;margin-bottom:16px}
.data-table th{background:#f5f5f5;padding:8px;text-align:left;font-size:12px;border-bottom:2px solid #ddd}
.data-table td{padding:7px 8px;border-bottom:1px solid #eee;font-size:13px}
.totals-box{display:flex;justify-content:flex-end;margin-top:16px}
.totals-inner{width:320px}
.totals-row{display:grid;grid-template-columns:1fr 40px 120px;padding:2px 0;font-size:13px;color:#333}
.totals-row span:last-child{text-align:right}
.totals-row span:nth-child(2){text-align:left;color:#555}
.totals-total{display:grid;grid-template-columns:1fr 40px 120px;font-size:18px;font-weight:900;border-top:2px solid #111;margin-top:6px;padding-top:6px}
.totals-total span:last-child{text-align:right}
.btn{background:#111;border:none;color:#fff;padding:10px 16px;border-radius:6px;font-weight:700;cursor:pointer;font-size:14px;margin-right:8px;text-decoration:none;display:inline-block}
.watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:80px;font-weight:900;color:rgba(0,0,0,0.06);white-space:nowrap;pointer-events:none;z-index:1000}
@media print{.noprint{display:none !important}a[href]:after{content:none !important}a{color:inherit;text-decoration:none}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
${isDemoMode ? '<div class="watermark">DEMO</div>' : ""}
<div class="noprint" style="margin-bottom:20px">
${!isPro ? `<div style="background:#f5f5f5;border:2px solid #111;border-radius:8px;padding:10px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center"><strong>⭐ ${language==="FR"?"Version Starter":language==="IT"?"Versione Starter":language==="EN"?"Starter version":"Starter Version"}</strong><a href="https://buy.stripe.com/6oU28r18C8Qad8FfeR9AA09" style="background:#111;color:#fff;padding:6px 12px;border-radius:6px;font-weight:700;text-decoration:none">${language==="FR"?"Passer à Pro →":language==="IT"?"Passa a Pro →":language==="EN"?"Upgrade to Pro →":"Upgrade auf Pro →"}</a></div>` : ""}
<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
<button onclick="window.close()" style="background:#d4a853;color:#111;border:none;border-radius:6px;padding:6px 14px;font-size:14px;cursor:pointer;margin-right:8px">✕</button>
<button type="button" class="btn" onclick="window.print()">${tr.print}</button>
<a class="btn" href="${mailtoHref}">📧 ${tr.email}</a>
</div>
<div style="font-size:11px;color:#888;margin-top:8px">${language==="FR"?"Conseil: Désactivez les en-têtes et pieds de page dans la boîte de dialogue d'impression.":language==="IT"?"Suggerimento: Disattivare intestazioni e piè di pagina nella finestra di stampa.":language==="EN"?"Tip: Disable headers and footers in the print dialog for a clean PDF.":"Tipp: Kopf- und Fusszeilen im Druckdialog deaktivieren für ein sauberes PDF."}</div>
</div>

<div class="header">
  <div style="text-align:left">
    ${firmLogo ? `<img src="${firmLogo}" style="height:86px;max-width:220px;object-fit:contain;margin-bottom:8px;display:block"/>` : ""}
    <div style="font-size:14px;font-weight:700">${esc(firmName||firmContact||"")}</div>
    <div style="font-size:11px;color:#555;line-height:1.7;margin-top:2px">
      ${firmAddress ? `<div>${esc(firmAddress)}</div>` : ""}
      ${firmPhone ? `<div>${esc(firmPhone)}</div>` : ""}
      ${firmEmail ? `<div>${esc(firmEmail)}</div>` : ""}
      ${firmMwst ? `<div>MWST-Nr: ${esc(firmMwst)}</div>` : ""}
    </div>
  </div>
  <div>
    <div class="invoice-label">${labelOfferte}</div>
    <div class="invoice-meta">
      <div><strong>OF-${esc(String(offerteNr))}</strong></div>
      <div>${esc(reportDate||"")}</div>
      ${validUntil ? `<div>${labelValidUntil}: ${esc(validUntil)}</div>` : ""}
    </div>
  </div>
</div>

<div style="display:flex;justify-content:flex-end;margin:24px 0 32px">
  <div class="address-box">
    <div class="address-label">${tr.recipient||"An"}</div>
    <strong>${esc(name||"")}</strong><br/>
    <span style="white-space:pre-line">${esc(custAddr||"")}</span>
  </div>
</div>

${projectName ? `<div style="margin:0 0 20px;font-size:14px;font-style:italic;color:#333;border-bottom:1px solid #ddd;padding-bottom:8px">${tr.project||"Projekt"}: <strong>${esc(projectName)}</strong></div>` : ""}

${wHtml ? `<div class="section-title">${tr.workHours}</div><table class="data-table"><thead><tr><th>${tr.employee}</th><th style="text-align:center">Zeit</th><th style="text-align:right">${tr.hours}</th><th style="text-align:right">Total</th></tr></thead><tbody>${wHtml}</tbody></table>` : ""}

${mHtml ? `<div class="section-title">${tr.material}</div><table class="data-table"><thead><tr><th>${tr.description}</th><th style="text-align:right">${tr.qty}</th><th style="text-align:right">${tr.price}</th><th style="text-align:right">Total</th></tr></thead><tbody>${mHtml}</tbody></table>` : ""}

<div style="display:flex;justify-content:flex-end;margin-top:16px"><table style="width:320px;border-collapse:collapse">
  <tr><td style="padding:2px 8px;font-size:13px">${tr.subtotal}</td><td style="padding:2px 4px;font-size:13px;text-align:right">CHF</td><td style="padding:2px 0;font-size:13px;text-align:right">${fmt(subtotal)}</td></tr>
  ${Number(discountPct)>0 ? `<tr><td style="padding:2px 8px;font-size:13px">${labelDiscount} ${discountPct}%</td><td style="padding:2px 4px;font-size:13px;text-align:right">CHF</td><td style="padding:2px 0;font-size:13px;text-align:right">−${fmt(discountAmt)}</td></tr>` : ""}
  ${Number(lumpsum)>0 ? `<tr><td style="padding:2px 8px;font-size:13px">${labelLumpsum}</td><td style="padding:2px 4px;font-size:13px;text-align:right">CHF</td><td style="padding:2px 0;font-size:13px;text-align:right">−${fmt(lumpsum)}</td></tr>` : ""}
  <tr><td style="padding:2px 8px;font-size:13px">${tr.vat}</td><td style="padding:2px 4px;font-size:13px;text-align:right">CHF</td><td style="padding:2px 0;font-size:13px;text-align:right">${fmt(vat)}</td></tr>
  <tr style="border-top:2px solid #111"><td style="padding:6px 8px 2px;font-size:16px;font-weight:900">TOTAL</td><td style="padding:6px 4px 2px;font-size:16px;font-weight:900;text-align:right">CHF</td><td style="padding:6px 0 2px;font-size:16px;font-weight:900;text-align:right">${fmt(total)}</td></tr>
</table></div>

${payDays ? `<div style="margin-top:64px;font-size:13px;color:#333">${labelPayDays}: ${payDays} ${language==="FR"?"jours":language==="IT"?"giorni":language==="EN"?"days":"Tage"}</div>` : ""}
${Number(skontoPct)>0 ? `<div style="font-size:13px;color:#333">${labelSkonto} ${skontoPct}% / ${skontoDays} ${language==="FR"?"jours":language==="IT"?"giorni":language==="EN"?"days":"Tage"}: CHF ${fmt(Number(total)-Number(skontoAmt))}</div>` : ""}
${notes ? `<div style="margin-top:16px;font-size:13px;color:#333"><strong>${tr.notes}:</strong><br>${esc(notes)}</div>` : ""}


${(signatureImage || customerSignatureImage) ? `<div class="card" style="display:flex;gap:32px;margin-top:16px;page-break-inside:avoid">
  <div>${signatureImage ? `<h3>${tr.employee}</h3><div style="margin-bottom:4px"><b>${esc(signerName||"-")}</b></div><img src="${signatureImage}" style="width:220px;border:1px solid rgba(212,168,83,0.4);border-radius:8px"/>` : ""}</div>
  <div>${customerSignatureImage ? `<h3>${tr.customer}</h3><div style="margin-bottom:4px"><b>${esc(customerSignerName||"-")}</b></div><img src="${customerSignatureImage}" style="width:220px;border:1px solid rgba(212,168,83,0.4);border-radius:8px"/>` : ""}</div>
</div>` : ""}
${photo ? `<div class="card" style="margin-top:16px"><h3>${tr.photos||"Fotos"}</h3><img src="${photo}" style="max-width:300px;max-height:200px;object-fit:cover;border-radius:8px"/></div>` : ""}

<div style="margin-top:40px;font-size:11px;color:#888;text-align:center;border-top:1px solid #ddd;padding-top:10px">
  ${esc(firmName||"")} ${firmAddress ? "· "+esc(firmAddress) : ""} ${firmPhone ? "· "+esc(firmPhone) : ""} ${firmEmail ? "· "+esc(firmEmail) : ""}
</div>
</body></html>`;
}
