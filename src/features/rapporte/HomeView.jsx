Inhalte sind nutzergeneriert und ungeprüft.
Anpassen


import os
path = os.path.expanduser('~/Desktop/bauabnahme/src/features/rapporte/HomeView.jsx')
code = r"""import { useState } from "react";
import { GOLD, BORDER, MUTED, TEXT, iStyle, gBtn } from "../../lib/constants.js";
import { SectionCard } from "../../components/UI.jsx";
import { parseReport, parseCustomerMeta, toNum, formatDateCH } from "../../lib/utils.js";

export function HomeView({ customers = [], reports = [], archivedReports = [], invoices = [], onSelectCustomer, goTo }) {
  const [search, setSearch] = useState("");
  const open = reports.filter(r => r.status === "offen" || r.status === "bearbeitet");
  const pending = invoices.filter(i => i.status === "entwurf" || i.status === "versendet");
  const total = pending.reduce((s, i) => s + toNum(i.totalAmount), 0);
  const q = search.trim().toLowerCase();
  const results = q.length > 1 ? [
    ...customers.filter(c => c.name && c.name.toLowerCase().includes(q)).map(c => ({ type: "Kunde", label: c.name, item: c })),
    ...invoices.filter(i => i.invoiceNr && i.invoiceNr.toLowerCase().includes(q)).map(i => ({ type: "Rechnung", label: i.invoiceNr, item: customers.find(c => String(c.id) === String(i.customerId)) || null })),
  ].slice(0, 6) : [];
  return (
    <div style={{ padding: "0 0 40px" }}>
      <h2 style={{ color: GOLD, marginTop: 0 }}>BauAbnahme</h2>
      <SectionCard>
        <input placeholder="Suchen: Kunde, Rechnungsnummer..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...iStyle, width: "100%" }} />
        {results.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {results.map((r, i) => (
              <div key={i} onClick={() => { if (r.item) { onSelectCustomer(r.item); setSearch(""); } }}
                style={{ border: "1px solid " + BORDER, borderRadius: 8, padding: "10px", marginBottom: 6, cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: GOLD, border: "1px solid " + GOLD, borderRadius: 4, padding: "1px 6px", marginRight: 8 }}>{r.type}</span>
                <span>{r.label}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "12px 0" }}>
        <SectionCard>
          <div style={{ color: MUTED, fontSize: 12 }}>Offene Rapporte</div>
          <div style={{ color: GOLD, fontWeight: 800, fontSize: 32, margin: "8px 0" }}>{open.length}</div>
          <button type="button" onClick={() => goTo("reports")} style={gBtn}>Anzeigen</button>
        </SectionCard>
        <SectionCard>
          <div style={{ color: MUTED, fontSize: 12 }}>Ausstehende Rechnungen</div>
          <div style={{ color: GOLD, fontWeight: 800, fontSize: 20, margin: "4px 0" }}>CHF {total.toFixed(2)}</div>
          <div style={{ color: MUTED, fontSize: 12, marginBottom: 8 }}>{pending.length} Rechnungen</div>
          <button type="button" onClick={() => goTo("invoices")} style={gBtn}>Anzeigen</button>
        </SectionCard>
      </div>
      <SectionCard>
        <h3 style={{ marginTop: 0, color: GOLD }}>Letzte Rapporte</h3>
        {open.slice(0, 5).map(r => {
          const rp = parseReport(r);
          const c = customers.find(x => String(x.id) === String(rp.customerId));
          return (
            <div key={r.id} onClick={() => c && onSelectCustomer(c)}
              style={{ border: "1px solid " + BORDER, borderRadius: 8, padding: "10px", marginBottom: 8, cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 600 }}>Nr. {rp.rapportNr} - {rp.projectName || r.customer}</div>
                <div style={{ color: MUTED, fontSize: 12 }}>{r.customer}</div>
              </div>
              <div style={{ color: GOLD, fontWeight: 700 }}>CHF {toNum(rp.totals && rp.totals.total).toFixed(2)}</div>
            </div>
          );
        })}
        {open.length === 0 && <p style={{ color: MUTED }}>Keine offenen Rapporte.</p>}
      </SectionCard>
    </div>
  );
}
"""
with open(path, 'w', encoding='utf-8') as f:
    f.write(code)
print("Done! Written to:", path)
Inhalte sind nutzergeneriert und ungeprüft.
	1.	
	1.	
