import { GOLD, BORDER, MUTED } from "../lib/constants";
import { SectionCard } from "../components/UI";
import { RapporteListe, RapportDetail, Papierkorb } from "../features/rapporte/RapporteViews";
import { RapportForm } from "../features/rapporte/RapportForm";
import { KundenView, KundenDetail } from "../features/kunden/KundenViews";
import { RechnungenView } from "../features/rechnungen/RechnungenViews";
import { KatalogView } from "../features/katalog/KatalogView";
import { EinstellungenView } from "../features/einstellungen/EinstellungenView";
import { supabase } from "../supabase";
import { parseReport, toNum } from "../lib/utils";

export function RenderView({
  view, openedReport, selectedCustomer, editingReport, isDemo,
  reports, archivedReports, trashReports, customers, invoices, catalog,
  reportForm, setReportForm, workRows, setWorkRows, materialRows, setMaterialRows,
  customerForm, setCustomerForm,
  workSubtotal, materialSubtotal, vat, total,
  showCustomerSuggestions, setShowCustomerSuggestions,
  session, userEmail, nextRapportNr, setNextRapportNrState, nextInvoiceNr, setNextInvoiceNrState,
  // callbacks
  setOpenedReport, setSelectedCustomer, startEdit, openPDF, moveToTrash,
  restore, hardDelete, updateStatus, handleCustomerSelect, handleSave,
  saveCustomer, deleteCustomer, saveCatalog, saveInvoiceToStorage, deleteInvoice,
  reopenInvoice, openInvoice, downloadAndEmail, showNotice,
  onLogout, onNavigate, goTo,
  emptyForm,
  userId,
}) {
  // ── Rapport Detail ──────────────────────────────────────────────────────
  if (openedReport) return (
    <RapportDetail
      report={openedReport}
      onBack={() => setOpenedReport(null)}
      onEdit={startEdit}
      onPDF={openPDF}
      onEmail={downloadAndEmail}
      onInvoice={openInvoice}
      onStatusChange={updateStatus}
    />
  );

  // ── Kunden Detail ───────────────────────────────────────────────────────
  if (selectedCustomer) return (
    <KundenDetail
      customer={selectedCustomer}
      reports={reports}
      archivedReports={archivedReports}
      invoices={invoices}
      onBack={() => setSelectedCustomer(null)}
      onOpenReport={r => { setSelectedCustomer(null); setOpenedReport(r); }}
      onEditReport={r => { setSelectedCustomer(null); startEdit(r); }}
      onPDF={openPDF}
      onInvoice={openInvoice}
      onDeleteReport={async (r) => {
        const deleted = { ...r, status: "geloescht" };
        if (!isDemo) {
          const { error } = await supabase.from("reports").update({ status: "geloescht" }).eq("id", r.id).eq("user_id", userId);
          if (error) { showNotice("Fehler: " + error.message); return; }
        }
        setSelectedCustomer(prev => prev);
        showNotice("🗑 Rapport in den Papierkorb verschoben.");
      }}
      onReopenInvoice={reopenInvoice}
      onMarkInvoiceSent={inv => { saveInvoiceToStorage({ ...inv, status: "versendet" }); showNotice("✅ Als versendet markiert."); }}
      onDeleteInvoice={deleteInvoice}
      showNotice={showNotice}
    />
  );

  // ── Home ────────────────────────────────────────────────────────────────
  if (view === "home") return (
    <SectionCard>
      <h2 style={{ marginTop: 0 }}>Start</h2>
      <p style={{ color: MUTED }}>Willkommen, {userEmail || "Demo"}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
        {[
          { l: "Rapporte", v: reports.length },
          { l: "Offen", v: reports.filter(r => r.status === "offen").length },
          { l: "Kunden", v: customers.length },
        ].map(s => (
          <div key={s.l} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14 }}>
            <div style={{ color: MUTED, fontSize: 13 }}>{s.l}</div>
            <strong style={{ fontSize: 26, color: GOLD }}>{s.v}</strong>
          </div>
        ))}
      </div>
    </SectionCard>
  );

  // ── Kunden Liste ────────────────────────────────────────────────────────
  if (view === "customers") return (
    <KundenView
      customerForm={customerForm}
      setCustomerForm={setCustomerForm}
      customers={customers}
      onSave={saveCustomer}
      onSelect={setSelectedCustomer}
      onDelete={deleteCustomer}
    />
  );

  // ── Neuer Rapport ───────────────────────────────────────────────────────
  if (view === "new-report") return (
    <RapportForm
      editingReport={editingReport}
      reportForm={reportForm}
      setReportForm={setReportForm}
      workRows={workRows}
      setWorkRows={setWorkRows}
      materialRows={materialRows}
      setMaterialRows={setMaterialRows}
      customers={customers}
      catalog={catalog}
      workSubtotal={workSubtotal}
      materialSubtotal={materialSubtotal}
      vat={vat}
      total={total}
      showCustomerSuggestions={showCustomerSuggestions}
      setShowCustomerSuggestions={setShowCustomerSuggestions}
      onCustomerSelect={handleCustomerSelect}
      onSave={handleSave}
      onCancel={() => {
        setEditingReport && setEditingReport(null);
        setReportForm(emptyForm);
        setWorkRows([{ employee: "", from: "", to: "", rate: "" }]);
        setMaterialRows([{ name: "", qty: "", unit: "", price: "" }]);
        goTo("reports");
      }}
    />
  );

  // ── Rapporte Liste ──────────────────────────────────────────────────────
  if (view === "reports") return (
    <RapporteListe
      reports={reports}
      archivedReports={archivedReports}
      onOpen={setOpenedReport}
      onEdit={startEdit}
      onPDF={openPDF}
      onDelete={moveToTrash}
    />
  );

  // ── Rechnungen ──────────────────────────────────────────────────────────
  if (view === "invoices") return (
    <RechnungenView
      invoices={invoices}
      onReopen={reopenInvoice}
      onMarkSent={inv => {
        saveInvoiceToStorage({ ...inv, status: "versendet" });
        showNotice("✅ Rechnung als versendet markiert.");
      }}
      onDelete={id => { if (window.confirm("Rechnung löschen?")) deleteInvoice(id); }}
    />
  );

  // ── Papierkorb ──────────────────────────────────────────────────────────
  if (view === "trash") return (
    <Papierkorb
      trashReports={trashReports}
      onRestore={restore}
      onHardDelete={hardDelete}
    />
  );

  // ── Katalog ─────────────────────────────────────────────────────────────
  if (view === "catalog") return (
    <KatalogView
      catalog={catalog}
      onSaveCatalog={saveCatalog}
      showNotice={showNotice}
    />
  );

  // ── Einstellungen ───────────────────────────────────────────────────────
  if (view === "settings") return (
    <EinstellungenView
      session={session}
      userEmail={userEmail}
      showNotice={showNotice}
      onLogout={onLogout}
      onNavigate={onNavigate}
      nextRapportNr={nextRapportNr}
      setNextRapportNrState={setNextRapportNrState}
      nextInvoiceNr={nextInvoiceNr}
      setNextInvoiceNrState={setNextInvoiceNrState}
    />
  );

  return null;
}
