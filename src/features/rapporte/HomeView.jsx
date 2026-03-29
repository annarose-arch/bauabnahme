cd ~/Desktop/bauabnahme && python3 << 'PYEOF'
content = '''import { useState } from "react";
import { GOLD, BORDER, MUTED, TEXT, iStyle, gBtn } from "../../lib/constants.js";
import { SectionCard } from "../../components/UI.jsx";
import { parseReport, parseCustomerMeta, toNum, formatDateCH } from "../../lib/utils.js";

export function HomeView({ customers = [], reports = [], archivedReports = [], invoices = [], onSelectCustomer, goTo }) {
  const [search, setSearch] = useState("");
  const openReports = reports.filter(r => r.status === "offen" || r.status === "bearbeitet");
  const pendingInvoices = invoices.filter(i => i.status === "entwurf" || i.status === "versendet");
  const pendingTotal = pendingInvoices.reduce((s, i) => s + toNum(i.totalAmount), 0);
  const q = search.trim().toLowerCase();
  const searchResults = q.length > 1 ? [
    ...customers.filter(c => c.name?.toLowerCase().includes(q)).map(c => ({ type: "Kunde", label: c.name, sub: parseCustomerMeta(c).kundennummer || "", item: c })),
    ...invoices.filter(i => i.invoiceNr?.toLowerCase().includes(q)).map(i => ({ type: "Rechnung", label: i.invoiceNr, sub: i.customer, item: customers.find(c => String(c.id) === String(i.customerId)) })),
    ...[...reports, ...archivedReports].filter(r => { const rp = parseReport(r); return rp.projectName?.toLowerCase().includes(q) || String(rp.rapportNr).includes(q); }).map(r => { const rp = parseReport(r); return { type: "Rapport", label: "Nr. " + rp.rapportNr + " - " + (rp.projectName || r.customer), sub: r.customer, item: customers.find(c => String(c.id) === String(rp.customerId)) }; }),
  ].slice(0, 8) : [];

  return (
    <div style={{ padding: "0 0 40px" }}>
      <h2 style={{ color: GOLD, marginTop: 0 }}>BauAbnahme</h2>
      <SectionCard>
        <input placeholder="Suchen: Kunde, Rechnungsnummer, Projekt..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...iStyle, width: "100%", fontSize: 15, marginBottom: searchResults.length ? 8 : 0 }} />
        {searchResults.length > 0 && (
          <div style={{ display: "grid", gap: 6 }}>
            {searchResults.map((r, i) => (
              <div key={i} onClick={() => { if (r.item) { onSelectCustomer(r.item); setSearch(""); } }} style={{ border: "1px solid " + BORDER, borderRadius: 8, padding: "10px 14px", cursor: r.item ? "pointer" : "default", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 11, color: GOLD, border: "1px solid " + GOLD, borderRadius: 4, padding: "1px 6px", marginRight: 8 }}>{r.type}</span>
                  <span style={{ color: TEXT, fontWeight: 600 }}>{r.label}</span>
                </div>
                <span style={{ color: MUTED, fontSize: 12 }}>{r.sub}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
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
          <button type="button" onClick={() => goTo("invoices")} style={gBtn}>Alle anzeigen</button>
        </SectionCard>
      </div>
      <SectionCard>
        <h3 style={{ marginTop: 0, color: GOLD }}>Letzte Rapporte</h3>
        {openReports.slice(0, 5).map(r => {
          const rp = parseReport(r);
          const c = customers.find(c => String(c.id) === String(rp.customerId));
          return (
            <div key={r.id} onClick={() => { if (c) onSelectCustomer(c); }} style={{ border: "1px solid " + BORDER, borderRadius: 8, padding: "10px 14px", marginBottom: 8, cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ color: TEXT, fontWeight: 600 }}>Nr. {rp.rapportNr} - {rp.projectName || r.customer}</div>
                <div style={{ color: MUTED, fontSize: 12 }}>{r.customer} - {formatDateCH(r.date)}</div>
              </div>
              <div style={{ color: GOLD, fontWeight: 700 }}>CHF {toNum(rp.totals?.total).toFixed(2)}</div>
            </div>
          );
        })}
        {openReports.length === 0 && <p style={{ color: MUTED }}>Keine offenen Rapporte.</p>}
      </SectionCard>
    </div>
  );
}
'''
with open('src/features/rapporte/HomeView.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')
PYEOF
npm run build && git add . && git commit -m "New home dashboard" && git push
