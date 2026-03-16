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
import { createReport, fetchCustomers, fetchReports, TABLE_SETUP_SQL } from "../supabase";

const dashboardCopy = {
  de: {
    title: "Dashboard",
    welcome: "Willkommen zuruck",
    logout: "Abmelden",
    nav: { new: "Neuer Rapport", all: "Alle Rapporte", customers: "Kunden", settings: "Einstellungen" },
    stats: { total: "Total Rapporte", open: "Offene Rapporte", customers: "Kunden", month: "Dieser Monat" },
    recent: "Letzte Rapporte",
    noReports: "Noch keine Rapporte vorhanden.",
    noCustomers: "Noch keine Kunden vorhanden.",
    form: {
      title: "Neuen Rapport erstellen",
      customer: "Kunde",
      status: "Status",
      date: "Datum",
      description: "Beschreibung",
      submit: "Rapport speichern",
      open: "Offen",
      done: "Erledigt"
    },
    settings: {
      title: "Einstellungen",
      language: "Standardsprache",
      notifications: "E-Mail Benachrichtigungen",
      save: "Speichern"
    },
    sqlHint: "Falls Tabellen fehlen: SQL aus src/supabase.js in Supabase SQL Editor ausfuhren.",
    reportSaved: "Rapport wurde gespeichert.",
    saveError: "Speichern fehlgeschlagen."
  },
  fr: {
    title: "Tableau de bord",
    welcome: "Bon retour",
    logout: "Deconnexion",
    nav: { new: "Nouveau rapport", all: "Tous les rapports", customers: "Clients", settings: "Parametres" },
    stats: { total: "Rapports totaux", open: "Rapports ouverts", customers: "Clients", month: "Ce mois-ci" },
    recent: "Rapports recents",
    noReports: "Aucun rapport pour le moment.",
    noCustomers: "Aucun client pour le moment.",
    form: {
      title: "Creer un nouveau rapport",
      customer: "Client",
      status: "Statut",
      date: "Date",
      description: "Description",
      submit: "Enregistrer le rapport",
      open: "Ouvert",
      done: "Termine"
    },
    settings: {
      title: "Parametres",
      language: "Langue par defaut",
      notifications: "Notifications par e-mail",
      save: "Enregistrer"
    },
    sqlHint: "Si les tables manquent: executez le SQL depuis src/supabase.js dans l'editeur SQL Supabase.",
    reportSaved: "Rapport enregistre.",
    saveError: "Echec de l'enregistrement."
  },
  it: {
    title: "Dashboard",
    welcome: "Bentornata",
    logout: "Esci",
    nav: { new: "Nuovo rapporto", all: "Tutti i rapporti", customers: "Clienti", settings: "Impostazioni" },
    stats: { total: "Rapporti totali", open: "Rapporti aperti", customers: "Clienti", month: "Questo mese" },
    recent: "Rapporti recenti",
    noReports: "Nessun rapporto disponibile.",
    noCustomers: "Nessun cliente disponibile.",
    form: {
      title: "Crea nuovo rapporto",
      customer: "Cliente",
      status: "Stato",
      date: "Data",
      description: "Descrizione",
      submit: "Salva rapporto",
      open: "Aperto",
      done: "Completato"
    },
    settings: {
      title: "Impostazioni",
      language: "Lingua predefinita",
      notifications: "Notifiche email",
      save: "Salva"
    },
    sqlHint: "Se mancano tabelle: esegui SQL da src/supabase.js nell'editor SQL Supabase.",
    reportSaved: "Rapporto salvato.",
    saveError: "Salvataggio non riuscito."
  },
  en: {
    title: "Dashboard",
    welcome: "Welcome back",
    logout: "Logout",
    nav: { new: "New Report", all: "All Reports", customers: "Customers", settings: "Settings" },
    stats: { total: "Total Reports", open: "Open Reports", customers: "Customers", month: "This Month" },
    recent: "Recent Reports",
    noReports: "No reports yet.",
    noCustomers: "No customers yet.",
    form: {
      title: "Create New Report",
      customer: "Customer",
      status: "Status",
      date: "Date",
      description: "Description",
      submit: "Save report",
      open: "Open",
      done: "Done"
    },
    settings: {
      title: "Settings",
      language: "Default language",
      notifications: "Email notifications",
      save: "Save"
    },
    sqlHint: "If tables are missing, run SQL from src/supabase.js in Supabase SQL editor.",
    reportSaved: "Report saved.",
    saveError: "Could not save report."
  }
};

export default function Dashboard({ lang = "en", onNavigate, onLogout, session }) {
  const t = dashboardCopy[lang] || dashboardCopy.en;
  const userId = session?.user?.id;
  const [view, setView] = useState("all");
  const [reports, setReports] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [message, setMessage] = useState("");

  const [reportForm, setReportForm] = useState({
    customer: "",
    status: "open",
    date: new Date().toISOString().slice(0, 10),
    description: ""
  });

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
      { key: "new", label: t.nav.new, icon: FilePlus2 },
      { key: "all", label: t.nav.all, icon: FileText },
      { key: "customers", label: t.nav.customers, icon: Users },
      { key: "settings", label: t.nav.settings, icon: Settings }
    ],
    [t]
  );

  useEffect(() => {
    if (!userId) return;
    const loadReports = async () => {
      setLoadingReports(true);
      const { data } = await fetchReports(userId);
      setReports(data || []);
      setLoadingReports(false);
    };
    loadReports();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const loadCustomers = async () => {
      setLoadingCustomers(true);
      const { data } = await fetchCustomers(userId);
      setCustomers(data || []);
      setLoadingCustomers(false);
    };
    loadCustomers();
  }, [userId]);

  const openReportsCount = reports.filter((item) => (item.status || "").toLowerCase() === "open").length;
  const thisMonthCount = reports.filter((item) => {
    if (!item.date) return false;
    const now = new Date();
    const d = new Date(item.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const stats = [
    { label: t.stats.total, value: String(reports.length), icon: ClipboardList },
    { label: t.stats.open, value: String(openReportsCount), icon: AlertCircle },
    { label: t.stats.customers, value: String(customers.length), icon: Users },
    { label: t.stats.month, value: String(thisMonthCount), icon: CalendarDays }
  ];

  const saveReport = async () => {
    if (!userId || !reportForm.customer.trim()) return;
    const payload = {
      user_id: userId,
      customer: reportForm.customer.trim(),
      status: reportForm.status,
      date: reportForm.date,
      description: reportForm.description
    };
    const { data, error } = await createReport(payload);
    if (error) {
      setMessage(t.saveError);
      return;
    }
    setReports((prev) => [data, ...prev]);
    setReportForm((prev) => ({ ...prev, customer: "", description: "" }));
    setMessage(t.reportSaved);
    setView("all");
  };

  const renderMainView = () => {
    if (view === "new") {
      return (
        <section style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>{t.form.title}</h2>
          <div style={{ display: "grid", gap: 12 }}>
            <label>
              <div style={{ marginBottom: 6, color: colors.muted }}>{t.form.customer}</div>
              <input
                value={reportForm.customer}
                onChange={(event) => setReportForm((prev) => ({ ...prev, customer: event.target.value }))}
                style={{ width: "100%", minHeight: 42, background: "#111", color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 8, padding: "0 12px", outline: "none" }}
              />
            </label>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
              <label>
                <div style={{ marginBottom: 6, color: colors.muted }}>{t.form.status}</div>
                <select
                  value={reportForm.status}
                  onChange={(event) => setReportForm((prev) => ({ ...prev, status: event.target.value }))}
                  style={{ width: "100%", minHeight: 42, background: "#111", color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 8, padding: "0 10px", outline: "none" }}
                >
                  <option value="open">{t.form.open}</option>
                  <option value="done">{t.form.done}</option>
                </select>
              </label>
              <label>
                <div style={{ marginBottom: 6, color: colors.muted }}>{t.form.date}</div>
                <input
                  type="date"
                  value={reportForm.date}
                  onChange={(event) => setReportForm((prev) => ({ ...prev, date: event.target.value }))}
                  style={{ width: "100%", minHeight: 42, background: "#111", color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 8, padding: "0 10px", outline: "none" }}
                />
              </label>
            </div>
            <label>
              <div style={{ marginBottom: 6, color: colors.muted }}>{t.form.description}</div>
              <textarea
                value={reportForm.description}
                onChange={(event) => setReportForm((prev) => ({ ...prev, description: event.target.value }))}
                rows={4}
                style={{ width: "100%", background: "#111", color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 12, outline: "none" }}
              />
            </label>
            <button
              onClick={saveReport}
              style={{ border: "none", background: colors.gold, color: "#111", minHeight: 44, borderRadius: 10, fontWeight: 700, cursor: "pointer" }}
            >
              {t.form.submit}
            </button>
          </div>
        </section>
      );
    }

    if (view === "customers") {
      return (
        <section style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>{t.nav.customers}</h2>
          {loadingCustomers ? (
            <p style={{ color: colors.muted }}>Loading...</p>
          ) : customers.length === 0 ? (
            <p style={{ color: colors.muted }}>{t.noCustomers}</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {customers.map((customer) => (
                <div key={customer.id} style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: "10px 12px", display: "grid", gap: 4 }}>
                  <strong>{customer.name}</strong>
                  <span style={{ color: colors.muted }}>{customer.address || "-"}</span>
                  <span style={{ color: colors.muted }}>{customer.phone || "-"} | {customer.email || "-"}</span>
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
          <div style={{ display: "grid", gap: 12 }}>
            <label>
              <div style={{ marginBottom: 6, color: colors.muted }}>{t.settings.language}</div>
              <select style={{ width: "100%", minHeight: 42, background: "#111", color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 8, padding: "0 10px" }}>
                <option>{lang.toUpperCase()}</option>
              </select>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="checkbox" defaultChecked />
              <span style={{ color: colors.muted }}>{t.settings.notifications}</span>
            </label>
            <button style={{ border: "none", background: colors.gold, color: "#111", minHeight: 44, borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>
              {t.settings.save}
            </button>
            <p style={{ color: colors.muted, marginBottom: 0 }}>{t.sqlHint}</p>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: colors.muted, fontSize: 12, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 10 }}>
              {TABLE_SETUP_SQL.reports.trim()}
            </pre>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: colors.muted, fontSize: 12, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 10 }}>
              {TABLE_SETUP_SQL.customers.trim()}
            </pre>
          </div>
        </section>
      );
    }

    return (
      <section style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 16 }}>
        <h2 style={{ marginTop: 0, marginBottom: 12 }}>{t.recent}</h2>
        {loadingReports ? (
          <p style={{ color: colors.muted }}>Loading...</p>
        ) : reports.length === 0 ? (
          <p style={{ color: colors.muted }}>{t.noReports}</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {reports.map((report) => (
              <div key={report.id} style={{ display: "grid", gridTemplateColumns: "90px 1fr 90px 120px", gap: 10, alignItems: "center", border: `1px solid ${colors.border}`, borderRadius: 10, padding: "10px 12px" }}>
                <strong>R-{report.id}</strong>
                <span style={{ color: colors.muted }}>{report.customer}</span>
                <span style={{ color: (report.status || "").toLowerCase() === "open" ? colors.gold : "#80c783", fontWeight: 600 }}>
                  {(report.status || "").toLowerCase() === "open" ? t.form.open : t.form.done}
                </span>
                <span style={{ color: colors.muted }}>{report.date}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", minHeight: "100vh" }}>
        <aside style={{ borderRight: `1px solid ${colors.border}`, background: colors.panel, padding: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 18 }}>
            Bau<span style={{ color: colors.gold }}>Abnahme</span>
          </div>
          <nav style={{ display: "grid", gap: 8 }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const selected = view === item.key;
              return (
                <button
                  type="button"
                  key={item.key}
                  onClick={() => setView(item.key)}
                  aria-pressed={selected}
                  style={{ border: `1px solid ${selected ? colors.gold : colors.border}`, background: selected ? "rgba(212,168,83,0.12)" : "transparent", color: colors.text, minHeight: 44, borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: "0 12px", textAlign: "left" }}
                >
                  <Icon size={16} color={colors.gold} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <main style={{ padding: 20 }}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: "clamp(1.4rem, 3vw, 2rem)" }}>{t.title}</h1>
              <p style={{ marginTop: 6, marginBottom: 0, color: colors.muted }}>{t.welcome}{session?.user?.email ? `, ${session.user.email}` : ""}</p>
            </div>
            <button
              onClick={() => {
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

          <section style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(4, minmax(0, 1fr))", marginBottom: 16 }}>
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <article key={stat.label} style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ color: colors.muted, fontSize: 13 }}>{stat.label}</span>
                    <Icon size={16} color={colors.gold} />
                  </div>
                  <strong style={{ fontSize: 28 }}>{stat.value}</strong>
                </article>
              );
            })}
          </section>

          {message && (
            <p style={{ marginTop: 0, marginBottom: 12, color: message === t.reportSaved ? "#9fdc9f" : "#ff9c9c" }}>
              {message}
            </p>
          )}

          {renderMainView()}
        </main>
      </div>
    </div>
  );
}
