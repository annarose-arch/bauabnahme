import HomeView from "../features/rapporte/HomeView.jsx";
import NewReportView from "../features/rapporte/NewReportView.jsx";
import ReportsListView from "../features/rapporte/ReportsListView.jsx";
import TrashView from "../features/rapporte/TrashView.jsx";
import ReportDetailView from "../features/rapporte/ReportDetailView.jsx";
import KundenView from "../features/kunden/KundenView.jsx";
import CustomerDetailView from "../features/kunden/CustomerDetailView.jsx";
import KatalogView from "../features/katalog/KatalogView.jsx";
import RechnungenView from "../features/rechnungen/RechnungenView.jsx";
import EinstellungenView from "../features/einstellungen/EinstellungenView.jsx";

/**
 * Central switch for dashboard main content: Rapporte, Kunden, Katalog, Rechnungen, Einstellungen.
 */
export default function RenderView({
  view,
  openedReport,
  setOpenedReport,
  selectedCustomerDetail,
  setSelectedCustomerDetail,
  renderStatus,
  userEmail,
  reports,
  trashReports,
  customers,
  projects,
  loading,
  openReports,
  customerForm,
  setCustomerForm,
  reportForm,
  setReportForm,
  workRows,
  setWorkRows,
  materialRows,
  setMaterialRows,
  customerProjects,
  vat,
  total,
  handleCustomerSelectInReport,
  handleProjectSelectInReport,
  handleSaveReport,
  handleAddCustomer,
  handleDeleteCustomer,
  handleAddProject,
  handleMoveToTrash,
  handleRestore,
  handleHardDelete,
  handleUpdateReportStatus,
  setView,
  language,
  setLanguage,
  showUpgrade,
  setShowUpgrade,
  setNotice,
  onLogout,
  onNavigate
}) {
  if (openedReport) {
    return (
      <ReportDetailView
        openedReport={openedReport}
        setOpenedReport={setOpenedReport}
        handleUpdateReportStatus={handleUpdateReportStatus}
        userEmail={userEmail}
        renderStatus={renderStatus}
      />
    );
  }

  if (selectedCustomerDetail) {
    return (
      <CustomerDetailView
        selectedCustomerDetail={selectedCustomerDetail}
        setSelectedCustomerDetail={setSelectedCustomerDetail}
        projects={projects}
        reports={reports}
        handleAddProject={handleAddProject}
      />
    );
  }

  if (view === "home") {
    return (
      <HomeView
        userEmail={userEmail}
        reports={reports}
        openReports={openReports}
        customers={customers}
      />
    );
  }

  if (view === "customers") {
    return (
      <KundenView
        customerForm={customerForm}
        setCustomerForm={setCustomerForm}
        handleAddCustomer={handleAddCustomer}
        customers={customers}
        setSelectedCustomerDetail={setSelectedCustomerDetail}
        handleDeleteCustomer={handleDeleteCustomer}
      />
    );
  }

  if (view === "new-report") {
    return (
      <NewReportView
        customers={customers}
        customerProjects={customerProjects}
        reportForm={reportForm}
        setReportForm={setReportForm}
        workRows={workRows}
        setWorkRows={setWorkRows}
        materialRows={materialRows}
        setMaterialRows={setMaterialRows}
        handleCustomerSelectInReport={handleCustomerSelectInReport}
        handleProjectSelectInReport={handleProjectSelectInReport}
        handleSaveReport={handleSaveReport}
        vat={vat}
        total={total}
      />
    );
  }

  if (view === "reports") {
    return (
      <ReportsListView
        loading={loading}
        reports={reports}
        setOpenedReport={setOpenedReport}
        handleMoveToTrash={handleMoveToTrash}
        handleUpdateReportStatus={handleUpdateReportStatus}
        userEmail={userEmail}
        renderStatus={renderStatus}
      />
    );
  }

  if (view === "katalog") {
    return <KatalogView />;
  }

  if (view === "rechnungen") {
    return (
      <RechnungenView
        reports={reports}
        userEmail={userEmail}
        setOpenedReport={setOpenedReport}
        setView={setView}
      />
    );
  }

  if (view === "trash") {
    return (
      <TrashView
        loading={loading}
        trashReports={trashReports}
        handleRestore={handleRestore}
        handleHardDelete={handleHardDelete}
      />
    );
  }

  if (view === "settings") {
    return (
      <EinstellungenView
        userEmail={userEmail}
        language={language}
        setLanguage={setLanguage}
        showUpgrade={showUpgrade}
        setShowUpgrade={setShowUpgrade}
        setNotice={setNotice}
        onLogout={onLogout}
        onNavigate={onNavigate}
      />
    );
  }

  return null;
}
