import { useState, useMemo } from "react";
import { GOLD, BORDER, MUTED, TEXT, iStyle, pBtn, gBtn, dBtn } from "../../lib/constants.js";
import { parseReport, parseCustomerMeta, toNum, formatDateCH, formatReportCardSummary } from "../../lib/utils.js";
import { SectionCard } from "../../components/UI.jsx";

function isLinkedReport(r, customer) {
  const rp = parseReport(r);
  return String(rp.customerId) === String(customer.id) || r.customer === customer.name;
}

/** Prefer row.status; fall back to description payload (some rows can be out of sync). */
function normalizeReportStatus(r) {
  const top = String(r?.status ?? "").trim().toLowerCase();
  if (top) return top;
  const p = parseReport(r);
  return String(p?.status ?? "").trim().toLowerCase();
}

const ACTIVE_TAB_STATUSES = new Set(["offen", "bearbeitet"]);
const ARCHIVE_TAB_STATUSES = new Set(["archiviert", "gesendet"]);

function normalizeInvoiceStatus(inv) {
  return String(inv?.status ?? "").trim().toLowerCase();
}

// ─── Kundenliste + Formular ────────────────────────────────────────────────
export function KundenView({
  customerForm,
  setCustomerForm,
  customers,
  onSave,
  onSelect,
  onDelete,
}) {
  const [search, setSearch] = useState("");
  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => (c.name || "").toLowerCase().includes(q));
  }, [customers, search]);

  return (
    <SectionCard>
      <h2 style={{ marginTop: 0 }}>Kunden</h2>
      <div style={{ marginBottom: 14 }}>
        <input
          type="search"
          placeholder="Kunden suchen (Name)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...iStyle, width: "100%", maxWidth: 420 }}
        />
        {search.trim() && (
          <div style={{ color: MUTED, fontSize: 12, marginTop: 6 }}>
            {filteredCustomers.length} von {customers.length} Kunden
          </div>
        )}
      </div>
      <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
        <input placeholder="Firmenname *" value={customerForm.company} onChange={(e) => setCustomerForm((p) => ({ ...p, company: e.target.value }))} style={iStyle} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <input placeholder="Vorname" value={customerForm.firstName} onChange={(e) => setCustomerForm((p) => ({ ...p, firstName: e.target.value }))} style={iStyle} />
          <input placeholder="Nachname" value={customerForm.lastName} onChange={(e) => setCustomerForm((p) => ({ ...p, lastName: e.target.value }))} style={iStyle} />
        </div>
        <input placeholder="Adresse" value={customerForm.address} onChange={(e) => setCustomerForm((p) => ({ ...p, address: e.target.value }))} style={iStyle} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
          <input placeholder="PLZ" value={customerForm.zip} onChange={(e) => setCustomerForm((p) => ({ ...p, zip: e.target.value }))} style={iStyle} />
          <input placeholder="Ort" value={customerForm.city} onChange={(e) => setCustomerForm((p) => ({ ...p, city: e.target.value }))} style={iStyle} />
        </div>
        <input placeholder="Telefon" value={customerForm.phone} onChange={(e) => setCustomerForm((p) => ({ ...p, phone: e.target.value }))} style={iStyle} />
        <input placeholder="Email" value={customerForm.email} onChange={(e) => setCustomerForm((p) => ({ ...p, email: e.target.value }))} style={iStyle} />
        <button type="button" onClick={onSave} style={pBtn}>
          Kunden speichern
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
        {filteredCustomers.map((c) => {
          const m = parseCustomerMeta(c);
          return (
            <div
              key={c.id}
              onClick={() => onSelect(c)}
              style={{
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                padding: "12px 14px",
                background: "rgba(255,255,255,0.02)",
                display: "grid",
                gap: 8,
                minHeight: 0,
                cursor: "pointer",
              }}
            >
              <div style={{ color: TEXT, fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>{c.name}</div>
              <div style={{ color: MUTED, fontSize: 12 }}>
                <span style={{ color: MUTED }}>Kundennummer </span>
                <span style={{ color: GOLD, fontWeight: 600 }}>{m.kundennummer || "—"}</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(c);
                }}
                style={{ ...dBtn, minHeight: 32, fontSize: 12, justifySelf: "start" }}
              >
                Löschen
              </button>
            </div>
          );
        })}
      </div>
      {filteredCustomers.length === 0 && customers.length > 0 && <p style={{ color: MUTED, marginTop: 12 }}>Keine Treffer für „{search.trim()}“.</p>}
      {customers.length === 0 && <p style={{ color: MUTED, marginTop: 12 }}>Noch keine Kunden.</p>}
    </SectionCard>
  );
}

function ReportRowCard({ r, isArchived, onOpenReport, onEditReport, onPDF, onInvoice, onDeleteReport }) {
  return (
    <div
      style={{
        border: `1px solid ${isArchived ? GOLD : BORDER}`,
        borderRadius: 10,
        padding: "12px 14px",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <button
        type="button"
        onClick={() => onOpenReport(r)}
        style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", marginBottom: 10, padding: 0 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
          <div style={{ color: TEXT, fontSize: 13, lineHeight: 1.45, flex: "1 1 200px" }}>{formatReportCardSummary(r)}</div>
          <span
            style={{
              fontSize: 12,
              color: isArchived ? GOLD : MUTED,
              border: `1px solid ${isArchived ? GOLD : BORDER}`,
              borderRadius: 4,
              padding: "2px 8px",
              fontWeight: 700,
            }}
          >
            {r.status}
          </span>
        </div>
      </button>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>
        <button type="button" onClick={() => onEditReport(r)} style={{ ...gBtn, minHeight: 32, fontSize: 13 }}>
          ✏️ Bearbeiten
        </button>
        <button type="button" onClick={() => onPDF(r)} style={{ ...gBtn, minHeight: 32, fontSize: 13 }}>
          🖨 PDF
        </button>
        <button type="button" onClick={() => onInvoice(r)} style={{ ...gBtn, minHeight: 32, fontSize: 13, color: "#7ddb9a", borderColor: "#2d7a45" }}>
          🧾 Rechnung
        </button>
        <button type="button" onClick={() => onDeleteReport(r)} style={{ ...dBtn, minHeight: 32, fontSize: 13 }}>
          🗑 Löschen
        </button>
      </div>
    </div>
  );
}

/** Same invoice row layout as RechnungenViews.jsx (summary line + badge + actions). */
function InvoiceRowCard({ inv, onReopenInvoice, onMarkInvoiceSent, onDeleteInvoice }) {
  const projectName = (inv.reportData?.projectName && String(inv.reportData.projectName).trim()) || "—";
  const summaryLine = `${inv.invoiceNr} · ${projectName} · ${inv.customer || "—"} · ${formatDateCH(inv.date)} · CHF ${Number(inv.totalAmount).toFixed(2)}`;
  return (
    <div
      style={{
        border: `1px solid ${inv.status === "versendet" ? GOLD : BORDER}`,
        borderRadius: 10,
        padding: "12px 14px",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        <div style={{ minWidth: 0, flex: "1 1 200px" }}>
          <div style={{ fontWeight: 700, color: GOLD, fontSize: 14, lineHeight: 1.45, wordBreak: "break-word" }}>{summaryLine}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <span
            style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 4,
              fontWeight: 700,
              background: inv.status === "versendet" ? "rgba(212,168,83,0.15)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${inv.status === "versendet" ? GOLD : BORDER}`,
              color: inv.status === "versendet" ? GOLD : MUTED,
            }}
          >
            {inv.status === "versendet" ? "✅ Versendet" : "📝 Entwurf"}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>
        <button type="button" onClick={() => onReopenInvoice(inv)} style={{ ...pBtn, minHeight: 32, fontSize: 13 }}>
          🖨 Öffnen / Drucken
        </button>
        {inv.status === "entwurf" && (
          <button type="button" onClick={() => onMarkInvoiceSent(inv)} style={{ ...gBtn, minHeight: 32, fontSize: 13, color: GOLD, borderColor: GOLD }}>
            ✅ Als versendet markieren
          </button>
        )}
        <button type="button" onClick={() => onDeleteInvoice(inv.id)} style={{ ...dBtn, minHeight: 32, fontSize: 13 }}>
          🗑 Löschen
        </button>
      </div>
    </div>
  );
}

// ─── Kunden Detail ─────────────────────────────────────────────────────────
export function KundenDetail({
  customer,
  reports,
  archivedReports,
  invoices,
  onBack,
  onOpenReport,
  onEditReport,
  onPDF,
  onInvoice,
  onDeleteReport,
  onReopenInvoice,
  onMarkInvoiceSent,
  onDeleteInvoice,
}) {
  const [detailTab, setDetailTab] = useState("rapporte-aktiv");
  const m = parseCustomerMeta(customer);
  const linkedMap = new Map();
  for (const r of [...reports, ...archivedReports]) {
    if (!isLinkedReport(r, customer)) continue;
    linkedMap.set(r.id, r);
  }
  const linked = [...linkedMap.values()];
  const linkedActive = linked.filter((r) => ACTIVE_TAB_STATUSES.has(normalizeReportStatus(r)));
  const linkedArchive = linked.filter((r) => ARCHIVE_TAB_STATUSES.has(normalizeReportStatus(r)));
  const revenue = linked.reduce((s, r) => s + toNum(parseReport(r)?.totals?.total), 0);
  const custInvoices = invoices.filter((inv) => String(inv.customerId) === String(customer.id) || inv.customer === customer.name);
  const invoicesActive = custInvoices.filter((inv) => normalizeInvoiceStatus(inv) === "entwurf");
  const invoicesGesendet = custInvoices.filter((inv) => normalizeInvoiceStatus(inv) === "versendet");
  const invoicesArchive = custInvoices.filter((inv) => normalizeInvoiceStatus(inv) === "bezahlt");

  const tabBtn = (id, label, count) => (
    <button
      type="button"
      key={id}
      onClick={() => setDetailTab(id)}
      style={{
        flex: "1 1 160px",
        minHeight: 40,
        borderRadius: 8,
        cursor: "pointer",
        fontWeight: detailTab === id ? 700 : 500,
        fontSize: 12,
        border: `1px solid ${detailTab === id ? GOLD : BORDER}`,
        background: detailTab === id ? "rgba(212,168,83,0.12)" : "transparent",
        color: detailTab === id ? GOLD : MUTED,
      }}
    >
      {label} ({count})
    </button>
  );

  const reportListForTab =
    detailTab === "rapporte-aktiv" ? linkedActive : detailTab === "rapporte-archiv" ? linkedArchive : null;
  const invoiceListForTab =
    detailTab === "rechnungen-offen" ? invoicesActive : detailTab === "rechnungen-gesendet" ? invoicesGesendet : detailTab === "rechnungen-archiv" ? invoicesArchive : null;

  const emptyTabHint =
    detailTab === "rapporte-aktiv"
      ? "Keine Rapporte mit Status offen oder bearbeitet."
      : detailTab === "rapporte-archiv"
        ? "Keine Rapporte mit Status archiviert oder gesendet."
        : detailTab === "rechnungen-offen"
          ? "Keine offenen Rechnungen (Entwurf)."
          : "Keine versendeten Rechnungen.";

  const currentTabItems = reportListForTab != null ? reportListForTab : invoiceListForTab;

  return (
    <SectionCard>
      <h2 style={{ marginTop: 0 }}>{customer.name}</h2>
      <div style={{ display: "grid", gap: 4, marginBottom: 14 }}>
        <div>
          <b>Kundennummer:</b> {m.kundennummer || "-"}
        </div>
        <div>
          <b>Ansprechperson:</b> {[m.firstName, m.lastName].filter(Boolean).join(" ") || "-"}
        </div>
        <div>
          <b>Adresse:</b> {m.address || "-"}, {m.zip || "-"} {m.city || "-"}
        </div>
        <div>
          <b>Telefon:</b> {customer.phone || "-"}
        </div>
        <div>
          <b>E-Mail:</b> {customer.email || "-"}
        </div>
      </div>

      <h3 style={{ marginBottom: 10 }}>Rapporte & Rechnungen</h3>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {tabBtn("rapporte-aktiv", "Rapporte Aktiv", linkedActive.length)}
        {tabBtn("rapporte-archiv", "Rapporte Archiv", linkedArchive.length)}
        {tabBtn("rechnungen-offen", "Rechnungen Offen", invoicesActive.length)}
        {tabBtn("rechnungen-gesendet", "Rechnungen Gesendet", invoicesGesendet.length)}
        {tabBtn("rechnungen-archiv", "Rechnungen Archiv", invoicesArchive.length)}
      </div>

      {currentTabItems.length === 0 && (
        <p style={{ color: MUTED, fontSize: 13, marginBottom: 14 }}>{emptyTabHint}</p>
      )}
      {reportListForTab && reportListForTab.length > 0 && (
        <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
          {reportListForTab.map((r) => (
            <ReportRowCard
              key={r.id}
              r={r}
              isArchived={ARCHIVE_TAB_STATUSES.has(normalizeReportStatus(r))}
              onOpenReport={onOpenReport}
              onEditReport={onEditReport}
              onPDF={onPDF}
              onInvoice={onInvoice}
              onDeleteReport={onDeleteReport}
            />
          ))}
        </div>
      )}
      {invoiceListForTab && invoiceListForTab.length > 0 && (
        <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
          {invoiceListForTab.map((inv) => (
            <InvoiceRowCard
              key={inv.id}
              inv={inv}
              onReopenInvoice={onReopenInvoice}
              onMarkInvoiceSent={onMarkInvoiceSent}
              onDeleteInvoice={onDeleteInvoice}
            />
          ))}
        </div>
      )}

      <div style={{ color: GOLD, fontWeight: 800, fontSize: 20, marginTop: 4, marginBottom: 14 }}>Gesamtumsatz CHF {revenue.toFixed(2)}</div>
      <button type="button" onClick={onBack} style={gBtn}>
        Zurück
      </button>
    </SectionCard>
  );
}
