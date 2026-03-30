import { useState } from "react";
import { GOLD, BORDER, MUTED, TEXT, iStyle, gBtn, pBtn } from "../../lib/constants.js";
import { SectionCard } from "../../components/UI.jsx";
import { parseReport, parseCustomerMeta, toNum, formatDateCH } from "../../lib/utils.js";

export function HomeView({ customers = [], reports = [], archivedReports = [], invoices = [], onSelectCustomer, goTo }) {
  const [search, setSearch] = useState("");

  const openReports = reports.filter(r => r.status === "offen" || r.status === "bearbeitet");
  const pendingInvoices = invoices.filter(i => i.status === "entwurf" || i.status === "versendet");
  const pendingTotal = pendingInvoices.reduce((s, i) => s + toNum(i.totalAmount), 0);

  const searchResults = search.trim().length > 1 ? (() => {
    const q = search.toLowerCase();
    const results = [];
    customers.forEach(c => {
      const m = parseCustomerMeta(c);
     �s(q) || m.kundennummer?.toLowerCase().includes(q)) {
        results.push({ type: "kunde", label: c.name, sub: m.kundennummer || "", item: c });
      }
    });
    invoices.forEach(i => {
      if (i.invoiceNr {
        const c = customers.find(c => String(c.id) === String(i.customerId));
        results.push({ type: "rechnung", label: i.invoiceNr, sub: i.customer, item: c || null, inv: i });
      }
    });
    [...reports, ...archivedReports].forEach(r => {
   �  if (rp.projectName?.toLowerCase().includes(q) || String(rp.rapportNr)?.includes(q)) {
        const c = customers.find(c => String(c.id) === String(rp.customerId));
        results.push({ type: "rapport", label: `Nr. ${rp.rapportNr} - ${rp.projectName || r.customer}`, sub: r.customer, item: c || null });
      }
    });
8);
  })() : [];

  return (
    <div style={{ padding: "0 0 40px" }}>
      <h2 style={{ color: GOLD, marginTop: 0 }}>BauAbnahme</h2>

      <SectionCard>
        <input
          placeholder="Suchen: Kunde, Rechnungsnummer, Projekt..."
          value={search}
          style={{ ...iStyle, width: "100%", fontSize: 15, marginBottom: searchResults.length ? 8 : 0 }}
          autoFocus
        />
        {searchResults.length > 0 && (
          <div style={{ display: "grid", gap: 6 }}>
            {searchResults.map((r, i)ck={() => { if (r.item) { onSelectCustomer(r.item); setSearch(""); } }}
                style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", cursor: r.item ? "pointer" : "default", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
              �order: `1px solid ${GOLD}`, borderRadius: 4, padding: "1px 6px", marginRight: 8 }}>
                    {r.type === "kunde" ? "Kunde" : r.type === "rechnuRapport"}
                  </span>
                  <span style={{ color: TEXT, fontWeight: 600 }}>{r.label}</span>
                </div>
                <span style={{ color: MUTED, fontSize: 12 }}>{r.sub}</span>
      �ard>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <SectionCard>
          <div style={{ color: MUTED, fontSize: 12, marginBottom: 4 }}>Offene Rapporte</div>
          <div style={{ color: GOLD, fontWeight: 800, fontSize: 32, marginBottom: 8 }}>{openReports.length}</div>
          <button type="button" onClick={() => goTo("reports")} style={gBtn}>Alle anzeigen</button>
        </SectionCard>
        <SectionCard>
          <div style={{ color: MUTED, fontSize: 12, marginBottom: 4 }}>Ausstehende Rechnungen</div>
          <div style={{ color: GOLD, fontWeight: 800, fontSize: 24, marginBottom: 4 }}>CHF {pendingTotal.toFixed(2)}</div>
          <div style={{ color: MUTED, fontSize: 12, marginBottom: 8 }}>{pendingInvoices.length} Rechnungen</div>
          <buttionCard>
      </div>

      <SectionCard>
        <h3 style={{ marginTop: 0, color: GOLD }}>Letzte Rapporte</h3>
        {openReports.slice(0, 5).map(r => {
          const rp = parseReport(r);
          const c .customerId));
          return (
            <div key={r.id}
              onClick={() => { if (c) onSelectCustomer(c); }}
              style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", marginBottom: 8, cursor: "pointer", display: "flex", justifyContent: "s    <div style={{ color: TEXT, fontWeight: 600 }}>Nr. {rp.rapportNr} · {rp.projectName || r.customer}</div>
                <div style={{ color: MUTED, fontSize: 12 }}>{r.customer} · {formatDateCH(r.date)}</div>
            �{ color: GOLD, fontWeight: 700 }}>CHF {toNum(rp.totals?.total).toFixed(2)}</div>
            </div>
          );
        })}
        {opeolor: MUTED }}>Keine offenen Rapporte.</p>}
      </SectionCard>
    </div>
  );
}
