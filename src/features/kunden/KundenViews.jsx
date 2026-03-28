import { useState, useMemo } from "react";
import { GOLD, BORDER, MUTED, TEXT, iStyle, pBtn, gBtn, dBtn } from "../../lib/constants.js";
import { parseReport, parseCustomerMeta, toNum, formatDateCH } from "../../lib/utils.js";
import { SectionCard } from "../../components/UI.jsx";

function isLinkedReport(r, customer) {
  const rp = parseReport(r);
  return String(rp.customerId) === String(customer.id) || r.customer === customer.name;
}

function revenueForCustomer(customer, reports, archivedReports) {
  const all = [...reports, ...archivedReports];
  return all.filter((r) => isLinkedReport(r, customer)).reduce((s, r) => s + toNum(parseReport(r)?.totals?.total), 0);
}

// ─── Kundenliste + Formular ────────────────────────────────────────────────
export function KundenView({
  customerForm,
  setCustomerForm,
  customers,
  reports = [],
  archivedReports = [],
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

      <div style={{ marginBottom: 12 }}>
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
        {filteredCustomers.map((c) => {
          const m = parseCustomerMeta(c);
          const rev = revenueForCustomer(c, reports, archivedReports);
          return (
            <div
              key={c.id}
              style={{
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                padding: "12px 14px",
                background: "rgba(255,255,255,0.02)",
                display: "grid",
                gap: 8,
                minHeight: 0,
              }}
            >
              <button
                type="button"
                onClick={() => onSelect(c)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: TEXT,
                  fontWeight: 700,
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 15,
                  padding: 0,
                  lineHeight: 1.3,
                }}
              >
                {c.name}
              </button>
              <div style={{ color: MUTED, fontSize: 12 }}>
                <span style={{ color: GOLD, fontWeight: 600 }}>{m.kundennummer || "—"}</span>
                <span> · Umsatz </span>
                <span style={{ color: GOLD, fontWeight: 700 }}>CHF {rev.toFixed(2)}</span>
              </div>
              <button type="button" onClick={() => onDelete(c)} style={{ ...dBtn, minHeight: 32, fontSize: 12, justifySelf: "start" }}>
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
  const rp = parseReport(r);
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 6 }}>
          <div>
            <div style={{ marginBottom: 3 }}>
              <strong style={{ color: GOLD, fontSize: 15 }}>Nr. {rp.rapportNr || "—"}</strong>
              <span style={{ color: MUTED, fontSize: 13 }}> · {formatDateCH(r.date)}</span>
            </div>
            {rp.projectName && (
              <div style={{ color: TEXT, fontSize: 13, fontWeight: 500 }}>📋 {rp.projectName}</div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
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
            <span style={{ fontWeight: 800, color: GOLD, fontSize: 15 }}>CHF {toNum(rp.totals?.total).toFixed(2)}</span>
          </div>
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
  const [detailTab, setDetailTab] = useState("active");
  const m = parseCustomerMeta(customer);
  const allCustomerReports = [...reports, ...archivedReports];
  const linked = allCustomerReports.filter((r) => isLinkedReport(r, customer));
  const linkedActive = linked.filter((r) => r.status === "offen" || r.status === "bearbeitet");
  const linkedArchive = linked.filter((r) => r.status === "gesendet" || r.status === "archiviert");
  const revenue = linked.reduce((s, r) => s + toNum(parseReport(r)?.totals?.total), 0);
  const custInvoices = invoices.filter((inv) => String(inv.customerId) === String(customer.id) || inv.customer === customer.name);

  const tabBtn = (id, label, count) => (
    <button
      type="button"
      key={id}
      onClick={() => setDetailTab(id)}
      style={{
        flex: 1,
        minHeight: 40,
        borderRadius: 8,
        cursor: "pointer",
        fontWeight: detailTab === id ? 700 : 500,
        fontSize: 13,
        border: `1px solid ${detailTab === id ? GOLD : BORDER}`,
        background: detailTab === id ? "rgba(212,168,83,0.12)" : "transparent",
        color: detailTab === id ? GOLD : MUTED,
      }}
    >
      {label} ({count})
    </button>
  );

  const listForTab = detailTab === "active" ? linkedActive : linkedArchive;

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

      <h3 style={{ marginBottom: 10 }}>Rapporte</h3>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {tabBtn("active", "Aktive Rapporte", linkedActive.length)}
        {tabBtn("archive", "Archiv", linkedArchive.length)}
      </div>

      {listForTab.length === 0 && (
        <p style={{ color: MUTED, fontSize: 13, marginBottom: 14 }}>
          {detailTab === "active" ? "Keine aktiven Rapporte (offen / bearbeitet)." : "Keine archivierten Rapporte (gesendet / archiviert)."}
        </p>
      )}
      <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
        {listForTab.map((r) => (
          <ReportRowCard
            key={r.id}
            r={r}
            isArchived={r.status === "archiviert" || r.status === "gesendet"}
            onOpenReport={onOpenReport}
            onEditReport={onEditReport}
            onPDF={onPDF}
            onInvoice={onInvoice}
            onDeleteReport={onDeleteReport}
          />
        ))}
      </div>

      {custInvoices.length > 0 && (
        <>
          <h3 style={{ marginBottom: 8, marginTop: 4 }}>🧾 Rechnungen ({custInvoices.length})</h3>
          <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
            {custInvoices.map((inv) => (
              <div key={inv.id} style={{ border: `1px solid ${inv.status === "versendet" ? GOLD : BORDER}`, borderRadius: 10, padding: "12px 14px", background: "rgba(255,255,255,0.02)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div>
                    <strong style={{ color: GOLD }}>{inv.invoiceNr}</strong>
                    <span style={{ color: MUTED, fontSize: 12, marginLeft: 8 }}>{formatDateCH(inv.date)}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 800, color: TEXT }}>CHF {Number(inv.totalAmount).toFixed(2)}</span>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontWeight: 700,
                        border: `1px solid ${inv.status === "versendet" ? GOLD : BORDER}`,
                        color: inv.status === "versendet" ? GOLD : MUTED,
                      }}
                    >
                      {inv.status === "versendet" ? "✅ Versendet" : "📝 Entwurf"}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>
                  <button type="button" onClick={() => onReopenInvoice(inv)} style={{ ...gBtn, minHeight: 32, fontSize: 13 }}>
                    🖨 Öffnen
                  </button>
                  {inv.status === "entwurf" && (
                    <button type="button" onClick={() => onMarkInvoiceSent(inv)} style={{ ...pBtn, minHeight: 32, fontSize: 13 }}>
                      ✅ Versendet
                    </button>
                  )}
                  <button type="button" onClick={() => onDeleteInvoice(inv.id)} style={{ ...dBtn, minHeight: 32, fontSize: 13 }}>
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ color: GOLD, fontWeight: 800, fontSize: 20, marginTop: 4, marginBottom: 14 }}>Gesamtumsatz CHF {revenue.toFixed(2)}</div>
      <button type="button" onClick={onBack} style={gBtn}>
        Zurück
      </button>
    </SectionCard>
  );
}
