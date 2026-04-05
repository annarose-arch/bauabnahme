import { GOLD, BORDER, MUTED } from "../lib/constants.js";
import { SectionCard } from "../components/UI.jsx";
import { RapporteListe, RapportDetail, Papierkorb } from "../features/rapporte/RapporteViews.jsx";
import { RapportForm } from "../features/rapporte/RapportForm.jsx";
import { KundenView, KundenDetail } from "../features/kunden/KundenViews.jsx";
import { HomeView } from "../features/rapporte/HomeView.jsx";
import { RechnungenView } from "../features/rechnungen/RechnungenViews.jsx";
import { RechnungForm } from "../features/rechnungen/RechnungForm.jsx";
import { KatalogView } from "../features/katalog/KatalogView.jsx";
import { EinstellungenView } from "../features/einstellungen/EinstellungenView.jsx";
import { supabase } from "../supabase.js";

export function RenderView({
  view, openedReport, selectedCustomer, editingReport, isDemo,
  reports, archivedReports, trashReports, trashCustomers, customers, invoices, trashInvoices, catalog, editingInvoice, onSaveInvoice,
  reportForm, setReportForm, workRows, setWorkRows, materialRows, setMaterialRows,
  customerForm, setCustomerForm,
  workSubtotal, materialSubtotal, vat, total,
  showCustomerSuggestions, setShowCustomerSuggestions,
  session, userEmail, nextRapportNr, setNextRapportNrState, nextInvoiceNr, setNextInvoiceNrState,
  language, onPickLanguage,
  // callbacks
  setOpenedReport, setSelectedCustomer, setEditingReport, startEdit, openPDF, moveToTrash,
  restore, hardDelete, updateStatus, handleCustomerSelect, handleSave,
  saveCustomer, deleteCustomer, restoreCustomer, hardDeleteCustomer, saveCatalog, saveInvoiceToStorage, deleteInvoice,
  reopenInvoice, openInvoice, downloadAndEmail, showNotice,
  onLogout, onNavigate, goTo, setEditingInvoice, hardDeleteInvoice, isAdmin = true,
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
      onDeleteReport={(r) => { moveToTrash(r); }}
      onReopenInvoice={(inv) => { setEditingInvoice(inv); goTo("edit-invoice"); }}
      onPreviewInvoice={reopenInvoice}
      onMarkInvoiceSent={inv => { saveInvoiceToStorage({ ...inv, status: "versendet" }); showNotice("✅ Als versendet markiert."); }}
      onMarkInvoicePaid={inv => { saveInvoiceToStorage({ ...inv, status: "bezahlt" }); showNotice("✅ Rechnung als bezahlt markiert."); }}
      onDeleteInvoice={deleteInvoice}
    />
  );

  // -- Home
  if (view === "home") return (
    <HomeView
      customers={customers}
      reports={reports}
      archivedReports={archivedReports}
      invoices={invoices}
      onSelectCustomer={setSelectedCustomer}
      goTo={goTo}
    />
  );

  // ── Kunden Liste ────────────────────────────────────────────────────────
  if (view === "customers") return (
    <KundenView
      customerForm={customerForm}
      setCustomerForm={setCustomerForm}
      customers={customers}
      onSave={saveCustomer}
      onSelect={setSelectedCustomer}
      onDelete={isAdmin ? deleteCustomer : null}
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
        setEditingReport(null);
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
      invoices={invoices}
      onOpen={setOpenedReport}
      onEdit={startEdit}
      onPDF={openPDF}
      onDelete={moveToTrash}
    />
  );

  // ── Rechnungen ──────────────────────────────────────────────────────────
  if (view === "edit-invoice") return (
       <RechnungForm
      invoice={editingInvoice}
      catalog={catalog}
      onSave={onSaveInvoice}
      onPreview={(inv) => { const w = window.open("","_blank","width=980,height=860"); if(w) reopenInvoice(inv, w); }}
      onCancel={() => goTo("invoices")}
    />
  );

  if (view === "invoices") return (
    <RechnungenView
      invoices={invoices}
      onReopen={reopenInvoice}
      onEdit={(inv) => { setEditingInvoice(inv); goTo("edit-invoice"); }}
      onMarkSent={inv => {
        saveInvoiceToStorage({ ...inv, status: "versendet" });
        showNotice("✅ Rechnung als versendet markiert.");
      }}
      onDelete={(id) => {
        deleteInvoice(id);
        showNotice("🗑 Rechnung in den Papierkorb verschoben.");
      }}
    />
  );

  // ── Papierkorb ──────────────────────────────────────────────────────────
  if (view === "trash") return (
    <Papierkorb
      trashReports={trashReports}
      trashInvoices={trashInvoices}
      trashCustomers={trashCustomers} onRestoreCustomer={restoreCustomer} onHardDeleteCustomer={hardDeleteCustomer}
      onRestore={restore}
      onHardDelete={hardDelete}
      onRestoreInvoice={(inv) => {
        restoreInvoice(inv);
        showNotice("✅ Rechnung wiederhergestellt.");
      }}
      onHardDeleteInvoice={(id) => {
        if (window.confirm("Rechnung endgültig löschen?")) {
          hardDeleteInvoice(id);
          showNotice("Rechnung endgültig gelöscht.");
        }
      }}
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
      language={language}
      onPickLanguage={onPickLanguage}
    />
  );

  return null;
}
