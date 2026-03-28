import { GOLD, BORDER, MUTED } from "../lib/constants.js";
import { SectionCard } from "../components/UI.jsx";
import { RapporteListe, RapportDetail, Papierkorb } from "../features/rapporte/RapporteViews.jsx";
import { RapportForm } from "../features/rapporte/RapportForm.jsx";
import { KundenView, KundenDetail } from "../features/kunden/KundenViews.jsx";
import { RechnungenView } from "../features/rechnungen/RechnungenViews.jsx";
import { KatalogView } from "../features/katalog/KatalogView.jsx";
import { EinstellungenView } from "../features/einstellungen/EinstellungenView.jsx";
import { supabase } from "../supabase.js";

export function RenderView({
  view, openedReport, selectedCustomer, editingReport, isDemo,
  reports, archivedReports, trashReports, customers, invoices, trashInvoices, catalog,
  reportForm, setReportForm, workRows, setWorkRows, materialRows, setMaterialRows,
  customerForm, setCustomerForm,
  workSubtotal, materialSubtotal, vat, total,
  showCustomerSuggestions, setShowCustomerSuggestions,
  session, userEmail, nextRapportNr, setNextRapportNrState, nextInvoiceNr, setNextInvoiceNrState,
  language, onPickLanguage,
  // callbacks
  setOpenedReport, setSelectedCustomer, setEditingReport, startEdit, openPDF, moveToTrash,
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
        if (!isDemo) {
          const { error } = await supabase.from("reports").update({ status: "geloescht" }).eq("id", r.id).eq("user_id", userId);
          if (error) { showNotice("Fehler: " + error.message); return; }
        }
        setSelectedCustomer(prev => prev);
        showNotice("🗑 Rapport in den Papierkorb verschoben.");
      }}
      onReopenInvoice={reopenInvoice}
      onMarkInvoiceSent={inv => { saveInvoiceToStorage({ ...inv, status: "versendet" }); showNotice("✅ Als versendet markiert."); }}
      onMarkInvoicePaid={inv => { saveInvoiceToStorage({ ...inv, status: "bezahlt" }); showNotice("✅ Rechnung als bezahlt markiert."); }}
      onDeleteInvoice={deleteInvoice}
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
  if (view === "invoices") return (
    <RechnungenView
      invoices={invoices}
      onReopen={reopenInvoice}
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
