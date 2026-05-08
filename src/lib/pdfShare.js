import jsPDF from "jspdf";
import { formatDateCH } from "./utils.js";

export async function shareRapportAsPDF(report, p, firmName, firmLogo, firmAddress, firmContact, firmPhone, firmEmail, language = "DE") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, M = 16;
  let y = M;

  // Farben
  const gold = [212, 168, 83];
  const dark = [17, 17, 17];
  const gray = [100, 100, 100];

  // Firmenname
  doc.setFontSize(16);
  doc.setTextColor(...dark);
  doc.setFont("helvetica", "bold");
  doc.text(firmName || "BauAbnahme", M, y);

  // Rapport Titel rechts
  doc.setFontSize(20);
  doc.setTextColor(...gold);
  doc.text("Rapport", W - M, y, { align: "right" });
  y += 6;

  // Firmeninfo
  doc.setFontSize(9);
  doc.setTextColor(...gray);
  doc.setFont("helvetica", "normal");
  if (firmAddress) doc.text(firmAddress, M, y); y += 4;
  if (firmPhone) doc.text(firmPhone, M, y); y += 4;
  if (firmEmail) doc.text(firmEmail, M, y); y += 4;

  // Rapport Nr + Datum rechts
  doc.setFontSize(10);
  doc.text(`Nr. ${p.rapportNr || report.id}`, W - M, y - 8, { align: "right" });
  doc.text(formatDateCH(report.date), W - M, y - 4, { align: "right" });

  // Trennlinie
  y += 4;
  doc.setDrawColor(...gold);
  doc.setLineWidth(0.5);
  doc.line(M, y, W - M, y);
  y += 6;

  // Kundendaten
  doc.setFontSize(10);
  doc.setTextColor(...dark);
  doc.setFont("helvetica", "bold");
  doc.text("Kunde:", M, y);
  doc.setFont("helvetica", "normal");
  doc.text(report.customer || "-", M + 25, y); y += 5;
  if (p.address) { doc.text("Adresse:", M, y); doc.text(p.address, M + 25, y); y += 5; }
  if (p.orderNo) { doc.text("Auftrag-Nr:", M, y); doc.text(String(p.orderNo), M + 25, y); y += 5; }
  if (p.projectName) { doc.text("Projekt:", M, y); doc.text(p.projectName, M + 25, y); y += 5; }
  y += 3;

  // Arbeitsstunden
  const work = p.workRows || [];
  if (work.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Arbeitsstunden", M, y); y += 4;
    doc.setLineWidth(0.2);
    doc.setDrawColor(200, 200, 200);
    doc.line(M, y, W - M, y); y += 4;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    work.forEach(r => {
      doc.text(r.employee || "-", M, y);
      doc.text(`${r.from || "-"} – ${r.to || "-"}`, M + 50, y);
      doc.text(`${Number(r.hours || 0).toFixed(2)} h`, M + 100, y);
      doc.text(`CHF ${Number(r.total || 0).toFixed(2)}`, W - M, y, { align: "right" });
      y += 5;
    });
    y += 2;
  }

  // Material
  const mat = p.materialRows || [];
  if (mat.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Material", M, y); y += 4;
    doc.setLineWidth(0.2);
    doc.setDrawColor(200, 200, 200);
    doc.line(M, y, W - M, y); y += 4;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    mat.forEach(r => {
      doc.text(r.name || "-", M, y);
      doc.text(`${r.qty || 0} ${r.unit || ""}`, M + 80, y);
      doc.text(`CHF ${Number(r.total || 0).toFixed(2)}`, W - M, y, { align: "right" });
      y += 5;
    });
    y += 2;
  }

  // Totals
  const tot = p.totals || {};
  const costs = p.costs || {};
  y += 3;
  doc.setDrawColor(...gold);
  doc.setLineWidth(0.3);
  doc.line(M, y, W - M, y); y += 5;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  if (costs.expenses) { doc.text("Spesen:", M, y); doc.text(`CHF ${Number(costs.expenses).toFixed(2)}`, W - M, y, { align: "right" }); y += 5; }
  doc.text("Subtotal:", M, y); doc.text(`CHF ${Number(tot.subtotal || 0).toFixed(2)}`, W - M, y, { align: "right" }); y += 5;
  doc.text("MwSt 8.1%:", M, y); doc.text(`CHF ${Number(tot.vat || 0).toFixed(2)}`, W - M, y, { align: "right" }); y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...gold);
  doc.text("TOTAL CHF", M, y);
  doc.text(Number(tot.total || 0).toFixed(2), W - M, y, { align: "right" });

  // PDF als Blob
  const blob = doc.output("blob");
  const file = new File([blob], `Rapport_${p.rapportNr || report.id}_${report.customer || "Kunde"}.pdf`, { type: "application/pdf" });

  // Share oder Download
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: `Rapport ${p.rapportNr || report.id}` });
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  }
}
