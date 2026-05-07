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
import { useState, useRef } from "react";
import { supabase } from "../supabase.js";
import { OffertenListe } from "../features/offerten/OffertenViews.jsx";
import { OfferteDetail } from "../features/offerten/OfferteDetail.jsx";
import { OfferteForm } from "../features/offerten/OfferteForm.jsx";
import { useTranslation } from "../lib/translations.js";

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
  setOpenedReport, setSelectedCustomer, setEditingReport, startEdit, openPDF, previewReportPDF, moveToTrash,
  restore, hardDelete, updateStatus, handleCustomerSelect, handleSave,
 saveCustomer, deleteCustomer, restoreCustomer, hardDeleteCustomer, saveCatalog, saveInvoiceToStorage, deleteInvoice, editCustomer,
  reopenInvoice, openInvoice, downloadAndEmail, showNotice, allInvoices, restoreInvoice,
  onLogout, onNavigate, goTo, setEditingInvoice, hardDeleteInvoice, stornoInvoice = ()=>{}, isAdmin = true, firmSettings = null, currentPlan = "starter", offerten = [], archivedOfferten = [], saveOfferte, nextOfferteNr = 1001, openOffertePDF, previewOffertePDF, updateOfferteStatus, deleteOfferte, createRapportFromOfferte, createInvoiceFromOfferte, openedOfferte, setOpenedOfferte, trashOfferten = [], restoreOfferte, hardDeleteOfferte,
  emptyForm,
  userId,
  onMahnung,
  onRefreshFirm,
}) {
  const tr = useTranslation(language);
  const [editingOfferte, setEditingOfferte] = useState(null);
  const [editingOfferteFromCustomer, setEditingOfferteFromCustomer] = useState(false);
  const savedCustomerRef = useRef(null);
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
      language={language}
      isDemo={isDemo}
    />
  );

  // ── Kunden Detail ───────────────────────────────────────────────────────
  if (selectedCustomer) return (
    <KundenDetail
      customer={selectedCustomer}
      reports={reports}
      archivedReports={archivedReports}
      invoices={allInvoices || invoices}
      onBack={() => setSelectedCustomer(null)}
      onOpenReport={r => { setOpenedReport(r); }}
      onEditReport={r => { savedCustomerRef.current = selectedCustomer; console.log("savedCustomerRef set to:", selectedCustomer?.name); startEdit(r); }}
      onPDF={openPDF}
      onInvoice={openInvoice}
      onDeleteReport={(r) => { moveToTrash(r); }}
      onReopenInvoice={(inv) => { savedCustomerRef.current = selectedCustomer; setEditingInvoice(inv); goTo("edit-invoice"); }}
      onPreviewInvoice={reopenInvoice}
      onMarkInvoiceSent={inv => { if(!isAdmin){showNotice("⛔ " + (tr?.common?.adminOnly || "Nur Admin")); return;} saveInvoiceToStorage({ ...inv, status: "versendet" }); showNotice("✅ Als versendet markiert."); }}
      onMarkInvoicePaid={inv => { if(!isAdmin){showNotice("⛔ " + (tr?.common?.adminOnly || "Nur Admin")); return;} saveInvoiceToStorage({ ...inv, status: "bezahlt" }); showNotice("✅ Rechnung als bezahlt markiert."); }}
      onMahnung={onMahnung}
      isAdmin={isAdmin}
      onDeleteInvoice={isAdmin ? deleteInvoice : ()=>showNotice("⛔ " + (tr?.common?.adminOnly || "Nur Admin"))} onStorno={stornoInvoice}
      language={language}
      isAdmin={isAdmin}
      offerten={[...offerten, ...archivedOfferten, ...trashOfferten]}
      onOpenOfferte={o => { savedCustomerRef.current = selectedCustomer; setOpenedOfferte(o); goTo("offerte-detail"); }}
      onEditOfferte={o => { savedCustomerRef.current = selectedCustomer; setEditingOfferte(o); setEditingOfferteFromCustomer(true); goTo("new-offerte"); }}
      onPDFOfferte={openOffertePDF}
      onDeleteOfferte={deleteOfferte}
      onCreateInvoice={createInvoiceFromOfferte}
    />
  );

  // -- Offerten
  if (view === "offerten") return <OffertenListe offerten={offerten} invoices={allInvoices||invoices} language={language} onNew={() => { setEditingOfferte(null); goTo("new-offerte"); }} onOpen={o => { setOpenedOfferte(o); goTo("offerte-detail"); }} onEdit={o => { setEditingOfferte(o); setOpenedOfferte(null); goTo("new-offerte"); }} onPDF={openOffertePDF} onDelete={deleteOfferte} goTo={goTo} />;
  if (view === "offerte-detail" && openedOfferte) return <OfferteDetail offerte={openedOfferte} language={language} onBack={() => { if(savedCustomerRef.current){ const c = savedCustomerRef.current; savedCustomerRef.current = null; setSelectedCustomer(c); setView("customers"); } else goTo("offerten"); }} onEdit={o => { setEditingOfferte(o); setOpenedOfferte(null); goTo("new-offerte"); }} onPDF={openOffertePDF} onStatusChange={updateOfferteStatus} onDelete={deleteOfferte} onCreateRapport={createRapportFromOfferte} onCreateInvoice={createInvoiceFromOfferte} isAdmin={isAdmin} />;
      isDemo={isDemo}
  if (view === "new-offerte") return <OfferteForm key={editingOfferte?.id || "new"} language={language} catalog={catalog} customers={customers} reports={[...reports, ...archivedReports]} nextNr={nextOfferteNr} editingOfferte={editingOfferte} onSave={saveOfferte} onBack={() => { setEditingOfferteFromCustomer(false); goTo("offerten"); }} onBackToCustomer={editingOfferteFromCustomer ? () => { setEditingOfferteFromCustomer(false); setEditingOfferte(null); setSelectedCustomer(savedCustomerRef.current); } : null} onPDF={openOffertePDF} onPreview={previewOffertePDF} />;

  // -- Home
  if (view === "home") return (
    <HomeView
      customers={customers}
      reports={reports}
      archivedReports={archivedReports}
      invoices={invoices}
      offerten={offerten}
      onSelectCustomer={setSelectedCustomer}
      goTo={goTo}
      language={language}
    />
  );

  // ── Kunden Liste ────────────────────────────────────────────────────────
  if (view === "customers") return (
    <KundenView
      language={language}      customerForm={customerForm}
      setCustomerForm={setCustomerForm}
      customers={customers}
      onSave={saveCustomer}
      onSelect={setSelectedCustomer}
      onDelete={isAdmin ? deleteCustomer : null}
      onEdit={isAdmin ? editCustomer : null}
    />
  );

  // ── Neuer Rapport ───────────────────────────────────────────────────────
  if (view === "new-report") return (
    <RapportForm language={language}
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
      onBackToCustomer={savedCustomerRef.current ? () => { const c = savedCustomerRef.current; savedCustomerRef.current = null; setEditingReport(null); setReportForm(emptyForm); setSelectedCustomer(c); } : selectedCustomer ? () => { setEditingReport(null); setReportForm(emptyForm); } : null}
      onPDF={openPDF}
      onPreview={previewReportPDF}
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
      language={language}
      goTo={goTo}
      customers={customers}
    />
  );

  // ── Rechnungen ──────────────────────────────────────────────────────────
  if (view === "edit-invoice") return (
       <RechnungForm
      language={language}      invoice={editingInvoice}
      catalog={catalog}
      reports={reports}
      archivedReports={archivedReports}
      onSave={onSaveInvoice}
      onPreview={(inv) => { const w = window.open("","_blank","width=980,height=860"); if(w) reopenInvoice(inv, w); }}
      onCancel={() => goTo("invoices")}
      onBackToCustomer={savedCustomerRef.current ? () => { const c = savedCustomerRef.current; savedCustomerRef.current = null; setEditingInvoice(null); setSelectedCustomer(c); } : null}
    />
  );

  if (view === "invoices") return (
    <RechnungenView
      invoices={invoices}
      language={language}
      onReopen={reopenInvoice}
      onEdit={(inv) => { if(!isAdmin){showNotice("⛔ "+(language==="FR"?"Réservé à l admin":language==="IT"?"Solo amministratore":language==="EN"?"Admin only":"Nur Admin")); return;} setEditingInvoice(inv); goTo("edit-invoice"); }}
      onMarkSent={inv => {
        if(!isAdmin){showNotice("⛔ "+(language==="FR"?"Réservé à l admin":language==="IT"?"Solo amministratore":language==="EN"?"Admin only":"Nur Admin")); return;}
        saveInvoiceToStorage({ ...inv, status: "versendet" });
        showNotice("✅ Rechnung als versendet markiert.");
      }}
      onStorno={stornoInvoice} onDelete={(id) => {
        if(!isAdmin){showNotice("⛔ "+(language==="FR"?"Réservé à l admin":language==="IT"?"Solo amministratore":language==="EN"?"Admin only":"Nur Admin")); return;}
        deleteInvoice(id);
        showNotice("🗑 Rechnung in den Papierkorb verschoben.");
      }}
      goTo={goTo}
      onMahnung={onMahnung}
      isAdmin={isAdmin}
    />
  );

  // ── Papierkorb ──────────────────────────────────────────────────────────
  if (view === "trash") return (
    <Papierkorb
      language={language}      trashReports={trashReports}
      trashInvoices={isAdmin ? trashInvoices : []}
      trashCustomers={isAdmin ? trashCustomers : []}
      trashOfferten={trashOfferten}
      onRestoreOfferte={restoreOfferte}
      onHardDeleteOfferte={isAdmin ? hardDeleteOfferte : ()=>showNotice("⛔ Nur Admin")} onRestoreCustomer={restoreCustomer} onHardDeleteCustomer={hardDeleteCustomer}
      onRestore={restore}
      onHardDelete={hardDelete}
      isAdmin={isAdmin}
      isAdmin={isAdmin}
      onRestoreInvoice={(inv) => {
        restoreInvoice(inv);
        showNotice("✅ Rechnung wiederhergestellt.");
      }}
      onHardDeleteInvoice={(id) => {
        if (window.confirm(language==="FR"?"Supprimer la facture?":language==="IT"?"Eliminare la fattura?":language==="EN"?"Delete invoice permanently?":"Rechnung endgültig löschen?")) {
          if(!isAdmin){showNotice("⛔ " + (tr?.common?.adminOnly || "Nur Admin")); return;} hardDeleteInvoice(id);
          showNotice("Rechnung endgültig gelöscht.");
        }
      }}
    />
  );

  // ── Katalog ─────────────────────────────────────────────────────────────
  if (view === "catalog") return (
    <KatalogView isAdmin={isAdmin}
      catalog={catalog}
      onSaveCatalog={saveCatalog}
      showNotice={showNotice}
      language={language}
    />
  );

  // ── Einstellungen ───────────────────────────────────────────────────────
  if (view === "settings") return (
    <EinstellungenView isAdmin={isAdmin} firmSettings={firmSettings} onRefreshFirm={onRefreshFirm} currentPlan={currentPlan} isDemo={isDemo}
      session={session}
      userEmail={userEmail}
      showNotice={showNotice}
      onLogout={onLogout}
      onNavigate={onNavigate}
      nextRapportNr={nextRapportNr}
      setNextRapportNrState={setNextRapportNrState}
      nextInvoiceNr={nextInvoiceNr}
      nextOfferteNr={nextOfferteNr}
      setNextOfferteNrState={v => { setNextOfferteNr(v); }}
      setNextInvoiceNrState={setNextInvoiceNrState}
      language={language}
      onPickLanguage={onPickLanguage}
    />
  );

  return null;
}
