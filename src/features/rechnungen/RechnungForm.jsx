import { useEffect, useMemo, useState } from "react";
import { GOLD, BORDER, MUTED, TEXT, iStyle, pBtn, gBtn, dBtn } from "../../lib/constants.js";
import { toNum, formatDateCH, calcHours } from "../../lib/utils.js";
import { SectionCard } from "../../components/UI.jsx";

const VAT_RATE = 0.081;

function emptyLine() {
  return { description: "", quantity: "", unitPrice: "" };
}

/** Adresse aus Rapport: Strasse + PLZ/Ort (eine Zeile PLZ und Ort). */
function customerAddressFromReportData(p) {
  if (!p || typeof p !== "object") return "";
  const street = String(p.address ?? "").trim();
  const zip = String(p.zip ?? "").trim();
  const city = String(p.city ?? "").trim();
  const line2 = [zip, city].filter(Boolean).join(" ");
  const built = [street, line2].filter(Boolean).join("\n");
  if (built) return built;
  if (p.customerAddress != null && String(p.customerAddress).trim()) return String(p.customerAddress).trim();
  return "";
}

function mapInvoiceLine(l) {
  return {
    description: l.description != null ? String(l.description) : "",
    quantity: l.quantity != null && l.quantity !== "" ? String(l.quantity) : "",
    unitPrice: l.unitPrice != null && l.unitPrice !== "" ? String(l.unitPrice) : "",
  };
}

/** Positionen aus Rapport-Zeilen, wenn noch keine invoiceLines. */
function lineItemsFromReportWorkAndMaterial(p) {
  if (!p || typeof p !== "object") return null;
  const out = [];
  for (const r of p.workRows || []) {
    const h = toNum(r.hours) > 0 ? toNum(r.hours) : calcHours(r.from, r.to);
    const rate = r.rate != null ? String(r.rate) : "";
    if (!String(r.employee || "").trim() && h <= 0) continue;
    out.push({
      description: String(r.employee || "").trim() ? `Arbeit: ${String(r.employee).trim()}` : "Arbeit",
      quantity: h > 0 ? String(h) : "",
      unitPrice: rate,
    });
  }
  for (const r of p.materialRows || []) {
    if (!String(r.name || "").trim() && toNum(r.qty) <= 0) continue;
    out.push({
      description: String(r.name || "").trim() || "Material",
      quantity: r.qty != null && r.qty !== "" ? String(r.qty) : "",
      unitPrice: r.price != null && r.price !== "" ? String(r.price) : "",
    });
  }
  return out.length > 0 ? out : null;
}

function stateFromInvoice(inv) {
  if (!inv) {
    return {
      invoiceNr: "",
      date: new Date().toISOString().slice(0, 10),
      customer: "",
      customerAddress: "",
      projectTitle: "",
      rapportNrRef: "",
      iban: "",
      payDays: "30",
      discountPercent: "0",
      skontoPercent: "0",
      skontoDays: "10",
      notes: "",
      lineItems: [emptyLine()],
      customerId: "",
      status: "entwurf",
    };
  }
  const p = inv.reportData && typeof inv.reportData === "object" ? inv.reportData : {};
  const rawLines = Array.isArray(p.invoiceLines) ? p.invoiceLines : [];
  const fromRapport = lineItemsFromReportWorkAndMaterial(p);
  const lines =
    rawLines.length > 0
      ? rawLines.map(mapInvoiceLine)
      : fromRapport != null
        ? fromRapport.map(mapInvoiceLine)
        : [emptyLine()];
  return {
    invoiceNr: inv.invoiceNr != null ? String(inv.invoiceNr) : "",
    date: inv.date || new Date().toISOString().slice(0, 10),
    customer: inv.customer != null ? String(inv.customer) : "",
    customerAddress: customerAddressFromReportData(p),
    projectTitle: p.projectName != null ? String(p.projectName) : "",
    rapportNrRef: p.rapportNr != null ? String(p.rapportNr) : "",
    iban: p.iban != null ? String(p.iban) : inv.iban != null ? String(inv.iban) : "",
    payDays: String(inv.payDays != null ? inv.payDays : 30),
    discountPercent: String(inv.discountPercent != null ? inv.discountPercent : p.discountPercent != null ? p.discountPercent : "0"),
    skontoPercent: String(
      inv.skontoPercent != null ? inv.skontoPercent : p.skontoPct != null ? p.skontoPct : p.skontoPercent != null ? p.skontoPercent : "0"
    ),
    skontoDays: String(inv.skontoDays != null ? inv.skontoDays : p.skontoDays != null ? p.skontoDays : "10"),
    notes: inv.notes != null ? String(inv.notes) : p.costs?.notes != null ? String(p.costs.notes) : "",
    lineItems: lines,
    customerId: inv.customerId != null ? String(inv.customerId) : "",
    status: inv.status != null ? String(inv.status) : "entwurf",
  };
}

function buildPayload(form, invoice) {
  const lines = form.lineItems
    .map((row) => {
      const qty = toNum(row.quantity);
      const up = toNum(row.unitPrice);
      const lineTotal = Math.round(qty * up * 100) / 100;
      return {
        description: String(row.description || "").trim(),
        quantity: qty,
        unitPrice: up,
        lineTotal,
      };
    })
    .filter((l) => l.description || l.lineTotal > 0);

  const subtotal = Math.round(lines.reduce((s, l) => s + l.lineTotal, 0) * 100) / 100;
  const dPct = toNum(form.discountPercent);
  const discountAmount = Math.round(subtotal * (dPct / 100) * 100) / 100;
  const netAfterDiscount = Math.round((subtotal - discountAmount) * 100) / 100;
  const vatAmount = Math.round(netAfterDiscount * VAT_RATE * 100) / 100;
  const totalAmount = Math.round((netAfterDiscount + vatAmount) * 100) / 100;
  const payDaysNum = Math.max(1, parseInt(String(form.payDays), 10) || 30);
  const skontoPct = toNum(form.skontoPercent);
  const skontoDaysNum = Math.max(1, parseInt(String(form.skontoDays), 10) || 10);

  const baseReport =
    invoice?.reportData && typeof invoice.reportData === "object" && !Array.isArray(invoice.reportData) ? { ...invoice.reportData } : {};

  const addrLines = String(form.customerAddress || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const streetLine = addrLines[0] || "";
  const lastLine = addrLines[addrLines.length - 1] || "";
  const plzOrt = /^(\d{4,5})\s+(.+)$/.exec(lastLine);
  const zip = plzOrt ? plzOrt[1] : baseReport.zip || "";
  const city = plzOrt ? plzOrt[2] : baseReport.city || "";

  const rapportNr = String(form.rapportNrRef || "").trim() || baseReport.rapportNr;

  return {
    id: invoice?.id ?? Date.now(),
    invoiceNr: String(form.invoiceNr || "").trim(),
    customer: String(form.customer || "").trim(),
    customerId: form.customerId || invoice?.customerId || "",
    date: form.date,
    status: form.status || invoice?.status || "entwurf",
    totalAmount,
    payDays: payDaysNum,
    discountPercent: dPct,
    skontoPercent: skontoPct,
    skontoDays: skontoDaysNum,
    iban: String(form.iban || "").trim(),
    notes: form.notes,
    rapportNr,
    lineItems: lines,
    subtotal,
    discountAmount,
    netAfterDiscount,
    vatRate: VAT_RATE,
    vatAmount,
    reportData: {
      ...baseReport,
      rapportNr,
      projectName: String(form.projectTitle || "").trim(),
      customerAddress: String(form.customerAddress || "").trim(),
      address: streetLine,
      zip,
      city,
      iban: String(form.iban || "").trim(),
      invoiceLines: lines,
      discountPercent: dPct,
      skontoPct,
      skontoDays: skontoDaysNum,
      totals: {
        subtotal,
        discountAmount,
        subtotalAfterDiscount: netAfterDiscount,
        vat: vatAmount,
        total: totalAmount,
      },
      costs: { ...(baseReport.costs && typeof baseReport.costs === "object" ? baseReport.costs : {}), notes: form.notes },
    },
  };
}

/**
 * @param {object|null} invoice — bestehende Rechnung oder null für neu
 * @param {(data: object) => void} onSave
 * @param {() => void} [onCancel]
 * @param {(form: object) => void} [onPreview] — aktueller Formularzustand für PDF-Vorschau
 */
export function RechnungForm({ invoice = null, onSave, onCancel, onPreview }) {
  const [form, setForm] = useState(() => stateFromInvoice(invoice));

  const invoiceKey = invoice?.id ?? "new";
  useEffect(() => {
    setForm(stateFromInvoice(invoice));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when invoice id changes only
  }, [invoiceKey]);

  const { subtotal, discountAmount, netAfterDiscount, vatAmount, totalAmount } = useMemo(() => {
    const parts = form.lineItems.map((row) => toNum(row.quantity) * toNum(row.unitPrice));
    const sub = Math.round(parts.reduce((s, l) => s + l, 0) * 100) / 100;
    const dPct = toNum(form.discountPercent);
    const disc = Math.round(sub * (dPct / 100) * 100) / 100;
    const net = Math.round((sub - disc) * 100) / 100;
    const vat = Math.round(net * VAT_RATE * 100) / 100;
    const tot = Math.round((net + vat) * 100) / 100;
    return { subtotal: sub, discountAmount: disc, netAfterDiscount: net, vatAmount: vat, totalAmount: tot };
  }, [form.lineItems, form.discountPercent]);

  const payDaysNum = Math.max(1, parseInt(String(form.payDays), 10) || 30);
  let dueLabel = "—";
  try {
    const t = new Date(form.date + "T12:00:00").getTime() + payDaysNum * 86400000;
    dueLabel = formatDateCH(new Date(t).toISOString().slice(0, 10));
  } catch {
    dueLabel = "—";
  }

  const setLines = (fn) => setForm((p) => ({ ...p, lineItems: fn(p.lineItems) }));

  const tableHeaderStyle = {
    display: "grid",
    gridTemplateColumns: "minmax(120px, 2fr) 72px 100px 88px 40px",
    gap: 8,
    alignItems: "center",
    color: MUTED,
    fontSize: 11,
    fontWeight: 600,
    marginBottom: 4,
    paddingLeft: 2,
  };

  const rowGridStyle = {
    display: "grid",
    gridTemplateColumns: "minmax(120px, 2fr) 72px 100px 88px 40px",
    gap: 8,
    alignItems: "center",
  };

  return (
    <SectionCard>
      <h2 style={{ marginTop: 0 }}>{invoice ? "Rechnung bearbeiten" : "Neue Rechnung"}</h2>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input placeholder="Rechnungsnummer" value={form.invoiceNr} onChange={(e) => setForm((p) => ({ ...p, invoiceNr: e.target.value }))} style={iStyle} />
          <input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} style={iStyle} />
        </div>

        <h3 style={{ marginBottom: 4 }}>👤 Kunde</h3>
        <input placeholder="Kundenname *" value={form.customer} onChange={(e) => setForm((p) => ({ ...p, customer: e.target.value }))} style={iStyle} />
        <textarea
          placeholder="Adresse (mehrzeilig möglich)"
          value={form.customerAddress}
          onChange={(e) => setForm((p) => ({ ...p, customerAddress: e.target.value }))}
          rows={3}
          style={{ ...iStyle, minHeight: 72, padding: 10 }}
        />

        <h3 style={{ marginBottom: 4 }}>📎 Auftrag</h3>
        <input
          placeholder="Projektbezeichnung"
          value={form.projectTitle}
          onChange={(e) => setForm((p) => ({ ...p, projectTitle: e.target.value }))}
          style={iStyle}
        />
        <input
          placeholder="Rapport-Referenznummer"
          value={form.rapportNrRef}
          onChange={(e) => setForm((p) => ({ ...p, rapportNrRef: e.target.value }))}
          style={iStyle}
        />

        <h3 style={{ marginBottom: 4 }}>📋 Positionen</h3>
        <div style={tableHeaderStyle}>
          <span>Beschreibung</span>
          <span>Menge</span>
          <span>EP CHF</span>
          <span>Total</span>
          <span />
        </div>
        {form.lineItems.map((row, i) => {
          const lineTotal = Math.round(toNum(row.quantity) * toNum(row.unitPrice) * 100) / 100;
          return (
            <div
              key={i}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${BORDER}`,
                borderRadius: 8,
                padding: "10px 12px",
                marginBottom: 6,
              }}
            >
              <div style={rowGridStyle}>
                <input
                  placeholder="Beschreibung"
                  value={row.description}
                  onChange={(e) => setLines((rows) => rows.map((r, j) => (j === i ? { ...r, description: e.target.value } : r)))}
                  style={{ ...iStyle, width: "100%", minWidth: 0 }}
                />
                <input
                  placeholder="1"
                  value={row.quantity}
                  onChange={(e) => setLines((rows) => rows.map((r, j) => (j === i ? { ...r, quantity: e.target.value } : r)))}
                  style={iStyle}
                />
                <input
                  placeholder="0.00"
                  value={row.unitPrice}
                  onChange={(e) => setLines((rows) => rows.map((r, j) => (j === i ? { ...r, unitPrice: e.target.value } : r)))}
                  style={iStyle}
                />
                <input readOnly value={lineTotal.toFixed(2)} style={{ ...iStyle, color: GOLD, fontWeight: 700, textAlign: "right" }} />
                <button type="button" onClick={() => setLines((rows) => rows.filter((_, j) => j !== i))} style={{ ...dBtn, minWidth: 34, padding: "0 6px" }} disabled={form.lineItems.length === 1}>
                  ✕
                </button>
              </div>
            </div>
          );
        })}
        <button type="button" onClick={() => setLines((rows) => [...rows, emptyLine()])} style={{ ...pBtn, width: 200, justifySelf: "start" }}>
          + Zeile hinzufügen
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "end" }}>
          <div>
            <div style={{ color: MUTED, fontSize: 11, marginBottom: 3 }}>Rabatt %</div>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              placeholder="z. B. 0"
              value={form.discountPercent}
              onChange={(e) => setForm((p) => ({ ...p, discountPercent: e.target.value }))}
              style={iStyle}
            />
          </div>
          <div>
            <div style={{ color: MUTED, fontSize: 11, marginBottom: 3 }}>Zahlungsziel (Tage)</div>
            <input
              type="number"
              min={1}
              max={365}
              placeholder="30"
              value={form.payDays}
              onChange={(e) => setForm((p) => ({ ...p, payDays: e.target.value }))}
              style={iStyle}
            />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "end" }}>
          <div>
            <div style={{ color: MUTED, fontSize: 11, marginBottom: 3 }}>Skonto %</div>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              placeholder="z. B. 0"
              value={form.skontoPercent}
              onChange={(e) => setForm((p) => ({ ...p, skontoPercent: e.target.value }))}
              style={iStyle}
            />
          </div>
          <div>
            <div style={{ color: MUTED, fontSize: 11, marginBottom: 3 }}>Skonto-Frist (Tage)</div>
            <input
              type="number"
              min={1}
              max={120}
              placeholder="10"
              value={form.skontoDays}
              onChange={(e) => setForm((p) => ({ ...p, skontoDays: e.target.value }))}
              style={iStyle}
            />
          </div>
        </div>
        <div style={{ color: MUTED, fontSize: 13 }}>
          Standard 30 Tage · Fällig am <b style={{ color: TEXT }}>{dueLabel}</b>
        </div>
        {toNum(form.discountPercent) > 0 && (
          <div style={{ color: MUTED, fontSize: 13 }}>
            Rabattbetrag: <span style={{ color: GOLD, fontWeight: 700 }}>− CHF {discountAmount.toFixed(2)}</span>
          </div>
        )}

        <h3 style={{ marginBottom: 4 }}>🏦 Zahlung</h3>
        <input placeholder="IBAN" value={form.iban} onChange={(e) => setForm((p) => ({ ...p, iban: e.target.value }))} style={iStyle} />

        <textarea
          placeholder="Notizen"
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          rows={3}
          style={{ ...iStyle, minHeight: 80, padding: 10 }}
        />

        <div style={{ color: MUTED, fontSize: 13 }}>Zwischensumme: CHF {subtotal.toFixed(2)}</div>
        <div style={{ color: MUTED, fontSize: 13 }}>Nach Rabatt: CHF {netAfterDiscount.toFixed(2)}</div>
        <div style={{ color: MUTED, fontSize: 13 }}>MwSt 8.1%: CHF {vatAmount.toFixed(2)}</div>
        <div style={{ color: GOLD, fontSize: 26, fontWeight: 800 }}>Total CHF {totalAmount.toFixed(2)}</div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", position: "relative", zIndex: 30, marginTop: 4 }}>
          <button type="button" onClick={() => onSave?.(buildPayload(form, invoice))} style={pBtn}>
            Rechnung speichern
          </button>
          {onPreview && (
            <button type="button" onClick={() => onPreview({ ...form })} style={gBtn}>
              PDF Vorschau
            </button>
          )}
          {onCancel && (
            <button type="button" onClick={onCancel} style={gBtn}>
              Abbrechen
            </button>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
