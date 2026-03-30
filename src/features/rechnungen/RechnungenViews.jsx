import { GOLD, BORDER, MUTED, TEXT, iStyle, pBtn, gBtn, dBtn } from "../../lib/constants.js";
import { formatDateCH, formatCHF } from "../../lib/utils.js";
import { SectionCard } from "../../components/UI.jsx";

// ─── Rechnungsliste ────────────────────────────────────────────────────────
export function RechnungenView({ invoices, onReopen, onEdit, onMarkSent, onDelete }) {
  return (
    <SectionCard>
      <h2 style={{ marginTop: 0 }}>🧾 Rechnungen</h2>
      {invoices.length === 0 && <p style={{ color: MUTED }}>Noch keine Rechnungen erstellt.</p>}
      <div style={{ display: "grid", gap: 10 }}>
        {invoices.filter(inv => inv.status === "entwurf").map(inv => {
          const projectName = (inv.reportData?.projectName && String(inv.reportData.projectName).trim()) || "—";
          const summaryLine = `${inv.invoiceNr} · ${projectName} · ${inv.customer || "—"} · ${formatDateCH(inv.date)} · CHF ${formatCHF(inv.totalAmount)}`;
          return (
          <div key={inv.id} style={{ border: `1px solid ${inv.status === "versendet" ? GOLD : BORDER}`, borderRadius: 10, padding: "12px 14px", background: "rgba(255,255,255,0.02)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              <div style={{ minWidth: 0, flex: "1 1 200px" }}>
                <div style={{ fontWeight: 700, color: GOLD, fontSize: 14, lineHeight: 1.45, wordBreak: "break-word" }}>{summaryLine}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <span style={{
                  fontSize: 11, padding: "2px 8px", borderRadius: 4, fontWeight: 700,
                  background: inv.status === "versendet" ? "rgba(212,168,83,0.15)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${inv.status === "versendet" ? GOLD : BORDER}`,
                  color: inv.status === "versendet" ? GOLD : MUTED,
                }}>
                  {inv.status === "versendet" ? "✅ Versendet" : "📝 Entwurf"}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>
              <button type="button" onClick={() => onEdit && onEdit(inv)} style={{ ...gBtn, minHeight: 32, fontSize: 13 }}>✏️ Bearbeiten </button>
              <button type="button" onClick={() => onReopen(inv)} style={{ ...gBtn, minHeight: 32, fontSize: 13 }}>🖨 PDF</button>
              {inv.status === "entwurf" && (
                <button type="button" onClick={() => onMarkSent(inv)} style={{ ...gBtn, minHeight: 32, fontSize: 13, color: GOLD, borderColor: GOLD }}>
                  ✅ Als versendet markieren
                </button>
              )}
              <button type="button" onClick={() => { if (window.confirm("Rechnung in den Papierkorb verschieben?")) onDelete(inv.id); }} style={{ ...dBtn, minHeight: 32, fontSize: 13 }}>🗑 Löschen</button>
            </div>
          </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ─── Rechnung Modal (Rabatt / Skonto) ──────────────────────────────────────
export function RechnungModal({
  invoiceModal, onClose,
  invoiceDiscount, setInvoiceDiscount,
  invoiceSkonto, setInvoiceSkonto,
  invoicePayDays, setInvoicePayDays,
  invoiceSkontoDays, setInvoiceSkontoDays,
  onGenerate, parseReport,
}) {
  if (!invoiceModal) return null;
  const p = parseReport(invoiceModal);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 600, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}>
      <div style={{ background: "#1a1a1a", border: `1px solid ${BORDER}`, borderRadius: 16, padding: 28, maxWidth: 460, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", overflowY: "auto", maxHeight: "90vh" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, color: GOLD, fontSize: 18 }}>🧾 Rechnung erstellen</h2>
          <button onClick={onClose} style={{ ...gBtn, minHeight: 32, padding: "0 10px", fontSize: 16 }}>✕</button>
        </div>
        <div style={{ display: "grid", gap: 16 }}>

          {/* Zahlungsfrist */}
          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 14, border: `1px solid ${BORDER}` }}>
            <div style={{ color: MUTED, fontSize: 11, marginBottom: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>Zahlungsfrist</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {["10", "20", "30", "45", "60"].map(d => (
                <button key={d} type="button" onClick={() => setInvoicePayDays(d)}
                  style={{ minHeight: 34, borderRadius: 8, padding: "0 14px", cursor: "pointer", fontWeight: invoicePayDays === d ? 700 : 400, background: invoicePayDays === d ? GOLD : "transparent", color: invoicePayDays === d ? "#111" : MUTED, border: `1px solid ${invoicePayDays === d ? GOLD : BORDER}`, fontSize: 13 }}>
                  {d} Tage
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="number" min="1" max="365" value={invoicePayDays} onChange={e => setInvoicePayDays(e.target.value)} style={{ ...iStyle, width: 80, textAlign: "center", fontWeight: 700 }} />
              <span style={{ color: MUTED, fontSize: 13 }}>Tage → Fällig am <b style={{ color: TEXT }}>{formatDateCH(new Date(new Date(invoiceModal.date).getTime() + (parseInt(invoicePayDays) || 30) * 86400000).toISOString().slice(0, 10))}</b></span>
            </div>
          </div>

          {/* Rabatt */}
          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 14, border: `1px solid ${BORDER}` }}>
            <div style={{ color: MUTED, fontSize: 11, marginBottom: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>Rabatt</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="number" min="0" max="100" step="0.5" value={invoiceDiscount} onChange={e => setInvoiceDiscount(e.target.value)} style={{ ...iStyle, width: 90, fontSize: 18, fontWeight: 700, textAlign: "center" }} />
              <span style={{ color: TEXT, fontSize: 20, fontWeight: 700 }}>%</span>
              {parseFloat(invoiceDiscount) > 0 && <span style={{ color: GOLD, fontSize: 13 }}>
                − CHF {(Number(p.totals?.subtotal || 0) * (parseFloat(invoiceDiscount) / 100)).toFixed(2)}
              </span>}
            </div>
          </div>

          {/* Skonto */}
          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 14, border: `1px solid ${BORDER}` }}>
            <div style={{ color: MUTED, fontSize: 11, marginBottom: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>Skonto (Frühzahlerrabatt)</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <input type="number" min="0" max="100" step="0.5" value={invoiceSkonto} onChange={e => setInvoiceSkonto(e.target.value)} style={{ ...iStyle, width: 90, fontSize: 18, fontWeight: 700, textAlign: "center" }} />
              <span style={{ color: TEXT, fontSize: 20, fontWeight: 700 }}>%</span>
              {parseFloat(invoiceSkonto) > 0 && <span style={{ color: MUTED, fontSize: 13 }}>bei Zahlung innert</span>}
            </div>
            {parseFloat(invoiceSkonto) > 0 && <>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                {["5", "10", "15", "20", "30"].map(d => (
                  <button key={d} type="button" onClick={() => setInvoiceSkontoDays(d)}
                    style={{ minHeight: 32, borderRadius: 8, padding: "0 12px", cursor: "pointer", fontWeight: invoiceSkontoDays === d ? 700 : 400, background: invoiceSkontoDays === d ? GOLD : "transparent", color: invoiceSkontoDays === d ? "#111" : MUTED, border: `1px solid ${invoiceSkontoDays === d ? GOLD : BORDER}`, fontSize: 13 }}>
                    {d} Tage
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="number" min="1" max="60" value={invoiceSkontoDays} onChange={e => setInvoiceSkontoDays(e.target.value)} style={{ ...iStyle, width: 80, textAlign: "center", fontWeight: 700 }} />
                <span style={{ color: MUTED, fontSize: 13 }}>Tage → bis <b style={{ color: TEXT }}>{formatDateCH(new Date(new Date(invoiceModal.date).getTime() + (parseInt(invoiceSkontoDays) || 10) * 86400000).toISOString().slice(0, 10))}</b></span>
              </div>
            </>}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ ...gBtn, flex: 1 }}>Abbrechen</button>
            <button type="button" style={{ ...pBtn, flex: 2, fontSize: 15 }}
              onClick={() => onGenerate(invoiceModal, parseFloat(invoiceDiscount) || 0, parseFloat(invoiceSkonto) || 0, invoicePayDays, invoiceSkontoDays)}>
              Rechnung öffnen →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
// rebuild 1774887475
