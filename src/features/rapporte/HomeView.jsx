import { useTranslation } from "../../lib/translations.js";
import { useState } from "react";
import { GOLD, BORDER, MUTED, TEXT, iStyle, gBtn } from "../../lib/constants.js";
import { SectionCard } from "../../components/UI.jsx";
import { parseReport, formatCHF, parseCustomerMeta, toNum } from "../../lib/utils.js";

export function HomeView({ customers = [], reports = [], archivedReports = [], invoices = [], onSelectCustomer, goTo, language = "DE" }) {
  const tr = useTranslation(language);
  const [search, setSearch] = useState("");
  const open = reports.filter(r => r.status === "offen" || r.status === "bearbeitet");
  const pending = invoices.filter(i => i.status === "entwurf" || i.status === "versendet");
  const total = pending.reduce((s, i) => s + toNum(i.totalAmount), 0);
  const q = search.trim().toLowerCase();
  const results = q.length > 1 ? [
    ...customers.filter(c => {
      const m = parseCustomerMeta(c);
      return c.name?.toLowerCase().includes(q) || m.kundennummer?.toLowerCase().includes(q) || m.address?.toLowerCase().includes(q);
    }).map(c => { const m = parseCustomerMeta(c); return { type: "Kunde", label: c.name, sub: m.kundennummer || "", item: c }; }),
    ...[...reports, ...archivedReports].filter(r => {
      const rp = parseReport(r);
      return String(rp.rapportNr).includes(q) || rp.projectName?.toLowerCase().includes(q);
    }).map(r => { const rp = parseReport(r); const c = customers.find(x => String(x.id) === String(rp.customerId)); return { type: "Rapport", label: "Nr." + rp.rapportNr + " - " + (rp.projectName || r.customer), sub: r.customer, item: c || null }; }),
    ...invoices.filter(i => i.invoiceNr?.toLowerCase().includes(q)).map(i => { const c = customers.find(x => String(x.id) === String(i.customerId)); return { type: "Rechnung", label: i.invoiceNr, sub: i.customer, item: c || null }; }),
  ].slice(0, 8) : [];
  return (
    <div style={{ padding: "0 0 40px" }}>
      <h2 style={{ color: GOLD, marginTop: 0 }}>BauAbnahme</h2>
      <SectionCard>
        <input placeholder={tr.common.search} value={search} onChange={e => setSearch(e.target.value)} style={{ ...iStyle, width: "100%" }} />
        {results.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {results.map((r, i) => (
              <div key={i} onClick={() => { if (r.item) { onSelectCustomer(r.item); setSearch(""); } }}
                style={{ border: "1px solid " + BORDER, borderRadius: 8, padding: "10px", marginBottom: 6, cursor: r.item ? "pointer" : "default", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 11, color: GOLD, border: "1px solid " + GOLD, borderRadius: 4, padding: "1px 6px", marginRight: 8 }}>{r.type}</span>
                  <span style={{ fontWeight: 600 }}>{r.label}</span>
                </div>
                <span style={{ color: MUTED, fontSize: 12 }}>{r.sub}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "12px 0" }}>
        <SectionCard>
          <div style={{ color: MUTED, fontSize: 12 }}>{tr.nav.reports}</div>
          <div style={{ color: GOLD, fontWeight: 800, fontSize: 32, margin: "8px 0" }}>{open.length}</div>
          <button type="button" onClick={() => goTo("reports")} style={gBtn}>{tr.common.show}</button>
        </SectionCard>
        <SectionCard>
          <div style={{ color: MUTED, fontSize: 12 }}>{tr.nav.invoices}</div>
          <div style={{ color: GOLD, fontWeight: 800, fontSize: 20, margin: "4px 0" }}>CHF {formatCHF(total)}</div>
          <div style={{ color: MUTED, fontSize: 12, marginBottom: 8 }}>{pending.length} {tr.nav.invoices}</div>
          <button type="button" onClick={() => goTo("invoices")} style={gBtn}>{tr.common.show}</button>
        </SectionCard>
      </div>
    </div>
  );
}
