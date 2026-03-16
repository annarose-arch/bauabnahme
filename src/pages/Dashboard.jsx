import { useEffect, useMemo, useState } from "react";
import {
  FilePlus2,
  FileText,
  Users,
  Settings,
  ClipboardList,
  AlertCircle,
  CalendarDays,
  LogOut
} from "lucide-react";
import { createReport, fetchCustomers, fetchReports } from "../supabase";

const copy = {
  de: {
    title: "Dashboard",
    welcome: "Willkommen zuruck",
    logout: "Abmelden",
    nav: {
      home: "Start",
      newReport: "Neuer Rapport",
      reports: "Alle Rapporte",
      customers: "Kunden",
      settings: "Einstellungen"
    },
    stats: { total: "Total Rapporte", open: "Offene Rapporte", customers: "Kunden", month: "Dieser Monat" },
    noReports: "Noch keine Rapporte vorhanden.",
    noCustomers: "Noch keine Kunden vorhanden.",
    form: {
      title: "Neuen Rapport erstellen",
      customer: "Kunde",
      status: "Status",
      date: "Datum",
      description: "Beschreibung",
      save: "Rapport speichern",
      open: "Offen",
      done: "Erledigt"
    },
    settings: {
      title: "Einstellungen",
      language: "Standardsprache",
      notifications: "E-Mail Benachrichtigungen",
      save: "Speichern"
    }
  },
  en: {
    title: "Dashboard",
    welcome: "Welcome back",
    logout: "Logout",
    nav: {
      home: "Home",
      newReport: "New Report",
      reports: "All Reports",
      customers: "Customers",
      settings: "Settings"
    },
    stats: { total: "Total Reports", open: "Open Reports", customers: "Customers", month: "This Month" },
    noReports: "No reports yet.",
    noCustomers: "No customers yet.",
    form: {
      title: "Create New Report",
      customer: "Customer",
      status: "Status",
      date: "Date",
      description: "Description",
      save: "Save Report",
      open: "Open",
      done: "Done"
    },
    settings: {
      title: "Settings",
      language: "Default language",
      notifications: "Email notifications",
      save: "Save"
    }
  }
};

export default function Dashboard({ lang = "en", onNavigate, onLogout, session }) {
  const t = copy[lang] || copy.en;
  const userId = session?.user?.id;
  const [view, setView] = useState("home");
  const [reports, setReports] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [reportForm, setReportForm] = useState({
    customer: "",
    status: "open",
    date: new Date().toISOString().slice(0, 10),
    description: ""
  });

  const setDashboardView = (nextView, source) => {
    console.log(`[Dashboard] ${source} -> setView(${nextView})`);
    setView(nextView);
  };

  const colors = {
    bg: "#0a0a0a",
    panel: "#141414",
    card: "#1a1a1a",
    text: "#f4efe6",
    muted: "#b9b0a3",
    gold: "#d4a853",
    border: "rgba(212,168,83,0.25)"
  };

  const navItems = useMemo(
    () => [
      { key: "home", label: t.nav.home, icon: ClipboardList },
      { key: "new-report", label: t.nav.newReport, icon: FilePlus2 },
      { key: "reports", label: t.nav.reports, icon: FileText },
      { key: "customers", label: t.nav.customers, icon: Users },
      { key: "settings", label: t.nav.settings, icon: Settings }
    ],
    [t]
  );

  useEffect(() => {
    if (!userId) return;
    fetchReports(userId).then(({ data }) => setReports(data || []));
    fetchCustomers(userId).then(({ data }) => setCustomers(data || []));
  }, [userId]);

  useEffect(() => {
    console.log(`[Dashboard] view state changed to: ${view}`);
  }, [view]);

  const openReports = reports.filter((r) => (r.status || "").toLowerCase() === "open").length;
  const thisMonth = reports.filter((r) => {
    if (!r.date) return false;
    const d = new Date(r.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const handleSaveReport = async () => {
    console.log("[Dashboard] save report button clicked");
    if (!userId || !reportForm.customer.trim()) return;
    const payload = {
      user_id: userId,
      customer: reportForm.customer.trim(),
      status: reportForm.status,
      date: reportForm.date,
      description: reportForm.description
    };
    const { data } = await createReport(payload);
    if (data) {
      setReports((prev) => [data, ...prev]);
      setReportForm((prev) => ({ ...prev, customer: "", description: "" }));
      setDashboardView("reports", "save report success");
    }
  };

  const renderMain = () => {
    if (view === "new-report") {
      return (
        <section style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>{t.form.title}</h2>
          <div style={{ display: "grid", gap: 12 }}>
            <input value={reportForm.customer} onChange={(e) => setReportForm((p) => ({ ...p, customer: e.target.value }))} placeholder={t.form.customer} style={{ minHeight: 42, borderRadius: 8, border: `1px solid ${colors.border}`, background: "#111", color: colors.text, padding: "0 12px" }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <select value={reportForm.status} onChange={(e) => setReportForm((p) => ({ ...p, status: e.target.value }))} style={{ minHeight: 42, borderRadius: 8, border: `1px solid ${colors.border}`, background: "#111", color: colors.text, padding: "0 12px" }}>
                <option value="open">{t.form.open}</option>
                <option value="done">{t.form.done}</option>
              </select>
              <input type="date" value={reportForm.date} onChange={(e) => setReportForm((p) => ({ ...p, date: e.target.value }))} style={{ minHeight: 42, borderRadius: 8, border: `1px solid ${colors.border}`, background: "#111", color: colors.text, padding: "0 12px" }} />
            </div>
            <textarea value={reportForm.description} onChange={(e) => setReportForm((p) => ({ ...p, description: e.target.value }))} placeholder={t.form.description} rows={4} style={{ borderRadius: 8, border: `1px solid ${colors.border}`, background: "#111", color: colors.text, padding: 12 }} />
            <button type="button" onClick={handleSaveReport} style={{ minHeight: 44, borderRadius: 10, border: "none", background: colors.gold, color: "#111", fontWeight: 700, cursor: "pointer" }}>
              {t.form.save}
            </button>
          </div>
        </section>
      );
    }

    if (view === "reports") {
      return (
        <section style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>{t.nav.reports}</h2>
          {reports.length === 0 ? (
            <p style={{ color: colors.muted }}>{t.noReports}</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {reports.map((r) => (
                <div key={r.id} style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: "10px 12px", display: "grid", gridTemplateColumns: "90px 1fr 90px 120px", gap: 10 }}>
                  <strong>R-{r.id}</strong>
                  <span style={{ color: colors.muted }}>{r.customer}</span>
                  <span style={{ color: (r.status || "").toLowerCase() === "open" ? colors.gold : "#80c783" }}>{(r.status || "").toLowerCase() === "open" ? t.form.open : t.form.done}</span>
                  <span style={{ color: colors.muted }}>{r.date}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      );
    }

    if (view === "customers") {
      return (
        <section style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>{t.nav.customers}</h2>
          {customers.length === 0 ? (
            <p style={{ color: colors.muted }}>{t.noCustomers}</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {customers.map((c) => (
                <div key={c.id} style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: "10px 12px" }}>
                  <strong>{c.name}</strong>
                  <div style={{ color: colors.muted }}>{c.address || "-"}</div>
                  <div style={{ color: colors.muted }}>{c.phone || "-"} | {c.email || "-"}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      );
    }

    if (view === "settings") {
      return (
        <section style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>{t.settings.title}</h2>
          <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <input type="checkbox" defaultChecked />
            <span style={{ color: colors.muted }}>{t.settings.notifications}</span>
          </label>
          <button type="button" onClick={() => setDashboardView("home", "settings save")} style={{ minHeight: 44, borderRadius: 10, border: "none", background: colors.gold, color: "#111", fontWeight: 700, cursor: "pointer", padding: "0 14px" }}>
            {t.settings.save}
          </button>
        </section>
      );
    }

    return (
      <section style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 16 }}>
        <h2 style={{ marginTop: 0, marginBottom: 12 }}>{t.title}</h2>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
          <div style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 12 }}><div style={{ color: colors.muted, fontSize: 13 }}>{t.stats.total}</div><strong style={{ fontSize: 24 }}>{reports.length}</strong></div>
          <div style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 12 }}><div style={{ color: colors.muted, fontSize: 13 }}>{t.stats.open}</div><strong style={{ fontSize: 24 }}>{openReports}</strong></div>
          <div style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 12 }}><div style={{ color: colors.muted, fontSize: 13 }}>{t.stats.customers}</div><strong style={{ fontSize: 24 }}>{customers.length}</strong></div>
          <div style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 12 }}><div style={{ color: colors.muted, fontSize: 13 }}>{t.stats.month}</div><strong style={{ fontSize: 24 }}>{thisMonth}</strong></div>
        </div>
      </section>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", minHeight: "100vh" }}>
        <aside style={{ borderRight: `1px solid ${colors.border}`, background: colors.panel, padding: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 18 }}>Bau<span style={{ color: colors.gold }}>Abnahme</span></div>
          <nav style={{ display: "grid", gap: 8 }}>
            <button type="button" onClick={() => setDashboardView("new-report", "sidebar new report")} style={{ border: `1px solid ${view === "new-report" ? colors.gold : colors.border}`, background: view === "new-report" ? "rgba(212,168,83,0.12)" : "transparent", color: colors.text, minHeight: 44, borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: "0 12px", textAlign: "left" }}><FilePlus2 size={16} color={colors.gold} />{t.nav.newReport}</button>
            <button type="button" onClick={() => setDashboardView("reports", "sidebar all reports")} style={{ border: `1px solid ${view === "reports" ? colors.gold : colors.border}`, background: view === "reports" ? "rgba(212,168,83,0.12)" : "transparent", color: colors.text, minHeight: 44, borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: "0 12px", textAlign: "left" }}><FileText size={16} color={colors.gold} />{t.nav.reports}</button>
            <button type="button" onClick={() => setDashboardView("customers", "sidebar customers")} style={{ border: `1px solid ${view === "customers" ? colors.gold : colors.border}`, background: view === "customers" ? "rgba(212,168,83,0.12)" : "transparent", color: colors.text, minHeight: 44, borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: "0 12px", textAlign: "left" }}><Users size={16} color={colors.gold} />{t.nav.customers}</button>
            <button type="button" onClick={() => setDashboardView("settings", "sidebar settings")} style={{ border: `1px solid ${view === "settings" ? colors.gold : colors.border}`, background: view === "settings" ? "rgba(212,168,83,0.12)" : "transparent", color: colors.text, minHeight: 44, borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: "0 12px", textAlign: "left" }}><Settings size={16} color={colors.gold} />{t.nav.settings}</button>
          </nav>
        </aside>

        <main style={{ padding: 20 }}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: "clamp(1.4rem, 3vw, 2rem)" }}>{t.title}</h1>
              <p style={{ marginTop: 6, marginBottom: 0, color: colors.muted }}>{t.welcome}{session?.user?.email ? `, ${session.user.email}` : ""}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                console.log("[Dashboard] logout button clicked");
                if (onLogout) {
                  onLogout();
                  return;
                }
                onNavigate("/");
              }}
              style={{ border: `1px solid ${colors.border}`, background: "transparent", color: colors.text, minHeight: 44, borderRadius: 10, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, padding: "0 14px", fontWeight: 600 }}
            >
              <LogOut size={16} color={colors.gold} />
              {t.logout}
            </button>
          </header>

          {renderMain()}
        </main>
      </div>
    </div>
  );
}
