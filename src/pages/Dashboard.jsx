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

const dashboardCopy = {
  de: {
    title: "Dashboard",
    welcome: "Willkommen zuruck, Anna",
    logout: "Abmelden",
    nav: { new: "Neuer Rapport", all: "Alle Rapporte", customers: "Kunden", settings: "Einstellungen" },
    stats: { total: "Total Rapporte", open: "Offene Rapporte", customers: "Kunden", month: "Dieser Monat" },
    recent: "Letzte Rapporte",
    open: "Offen",
    done: "Erledigt"
  },
  fr: {
    title: "Tableau de bord",
    welcome: "Bon retour, Anna",
    logout: "Deconnexion",
    nav: { new: "Nouveau rapport", all: "Tous les rapports", customers: "Clients", settings: "Parametres" },
    stats: { total: "Rapports totaux", open: "Rapports ouverts", customers: "Clients", month: "Ce mois-ci" },
    recent: "Rapports recents",
    open: "Ouvert",
    done: "Termine"
  },
  it: {
    title: "Dashboard",
    welcome: "Bentornata, Anna",
    logout: "Esci",
    nav: { new: "Nuovo rapporto", all: "Tutti i rapporti", customers: "Clienti", settings: "Impostazioni" },
    stats: { total: "Rapporti totali", open: "Rapporti aperti", customers: "Clienti", month: "Questo mese" },
    recent: "Rapporti recenti",
    open: "Aperto",
    done: "Completato"
  },
  en: {
    title: "Dashboard",
    welcome: "Welcome back, Anna",
    logout: "Logout",
    nav: { new: "New Report", all: "All Reports", customers: "Customers", settings: "Settings" },
    stats: { total: "Total Reports", open: "Open Reports", customers: "Customers", month: "This Month" },
    recent: "Recent Reports",
    open: "Open",
    done: "Done"
  }
};

export default function Dashboard({ lang = "en", onNavigate }) {
  const t = dashboardCopy[lang] || dashboardCopy.en;
  const navItems = [
    { key: "new", label: t.nav.new, icon: FilePlus2 },
    { key: "all", label: t.nav.all, icon: FileText },
    { key: "customers", label: t.nav.customers, icon: Users },
    { key: "settings", label: t.nav.settings, icon: Settings }
  ];

  const stats = [
    { label: t.stats.total, value: "126", icon: ClipboardList },
    { label: t.stats.open, value: "18", icon: AlertCircle },
    { label: t.stats.customers, value: "43", icon: Users },
    { label: t.stats.month, value: "24", icon: CalendarDays }
  ];

  const recentReports = [
    { id: "R-1021", customer: "Muller AG", status: t.open, date: "2026-03-15" },
    { id: "R-1019", customer: "Dupont SA", status: t.done, date: "2026-03-14" },
    { id: "R-1018", customer: "Rossi Costruzioni", status: t.open, date: "2026-03-13" },
    { id: "R-1015", customer: "Schmid Bau", status: t.done, date: "2026-03-11" }
  ];

  const colors = {
    bg: "#0a0a0a",
    panel: "#141414",
    card: "#1a1a1a",
    text: "#f4efe6",
    muted: "#b9b0a3",
    gold: "#d4a853",
    border: "rgba(212,168,83,0.25)"
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
              return (
                <button
                  key={item.key}
                  style={{ border: `1px solid ${colors.border}`, background: "transparent", color: colors.text, minHeight: 44, borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: "0 12px", textAlign: "left" }}
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
              <p style={{ marginTop: 6, marginBottom: 0, color: colors.muted }}>{t.welcome}</p>
            </div>
            <button
              onClick={() => onNavigate("/")}
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

          <section style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 16 }}>
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>{t.recent}</h2>
            <div style={{ display: "grid", gap: 10 }}>
              {recentReports.map((report) => (
                <div
                  key={report.id}
                  style={{ display: "grid", gridTemplateColumns: "120px 1fr 90px 120px", gap: 10, alignItems: "center", border: `1px solid ${colors.border}`, borderRadius: 10, padding: "10px 12px" }}
                >
                  <strong>{report.id}</strong>
                  <span style={{ color: colors.muted }}>{report.customer}</span>
                  <span style={{ color: report.status === t.open ? colors.gold : "#80c783", fontWeight: 600 }}>{report.status}</span>
                  <span style={{ color: colors.muted }}>{report.date}</span>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
