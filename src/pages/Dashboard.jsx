import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function Dashboard({ session, onLogout, onNavigate }) {
  const [currentView, setCurrentView] = useState("home");
  const [reports, setReports] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  const colors = {
    bg: "#0a0a0a",
    panel: "#141414",
    card: "#1a1a1a",
    text: "#f4efe6",
    muted: "#b9b0a3",
    gold: "#d4a853",
    border: "rgba(212,168,83,0.25)"
  };

  const userId = session?.user?.id;

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      if (!userId) return;
      setLoading(true);
      const [reportsRes, customersRes] = await Promise.all([
        supabase
          .from("reports")
          .select("id, customer, status, date")
          .eq("user_id", userId)
          .order("date", { ascending: false }),
        supabase
          .from("customers")
          .select("id, name, email")
          .eq("user_id", userId)
          .order("name", { ascending: true })
      ]);

      if (!isMounted) return;
      setReports(reportsRes.data || []);
      setCustomers(customersRes.data || []);
      setLoading(false);
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  const renderView = () => {
    if (currentView === "new-report") {
      return (
        <section style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 18 }}>
          <h2 style={{ marginTop: 0 }}>Neuer Rapport</h2>
          <p style={{ color: colors.muted, marginBottom: 0 }}>
            Test View aktiv: <strong style={{ color: colors.gold }}>new-report</strong>
          </p>
        </section>
      );
    }

    if (currentView === "reports") {
      return (
        <section style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 18 }}>
          <h2 style={{ marginTop: 0 }}>Alle Rapporte</h2>
          <p style={{ color: colors.muted }}>
            Test View aktiv: <strong style={{ color: colors.gold }}>reports</strong>
          </p>
          {loading ? (
            <p style={{ color: colors.muted }}>Lade Rapporte...</p>
          ) : reports.length === 0 ? (
            <p style={{ color: colors.muted }}>Keine Rapporte gefunden.</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {reports.map((report) => (
                <div key={report.id} style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: "10px 12px" }}>
                  <strong>R-{report.id}</strong>
                  <div style={{ color: colors.muted }}>{report.customer || "-"}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      );
    }

    if (currentView === "customers") {
      return (
        <section style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 18 }}>
          <h2 style={{ marginTop: 0 }}>Kunden</h2>
          <p style={{ color: colors.muted }}>
            Test View aktiv: <strong style={{ color: colors.gold }}>customers</strong>
          </p>
          {loading ? (
            <p style={{ color: colors.muted }}>Lade Kunden...</p>
          ) : customers.length === 0 ? (
            <p style={{ color: colors.muted }}>Keine Kunden gefunden.</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {customers.map((customer) => (
                <div key={customer.id} style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: "10px 12px" }}>
                  <strong>{customer.name || "-"}</strong>
                  <div style={{ color: colors.muted }}>{customer.email || "-"}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      );
    }

    if (currentView === "settings") {
      return (
        <section style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 18 }}>
          <h2 style={{ marginTop: 0 }}>Einstellungen</h2>
          <p style={{ color: colors.muted, marginBottom: 0 }}>
            Test View aktiv: <strong style={{ color: colors.gold }}>settings</strong>
          </p>
        </section>
      );
    }

    return (
      <section style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 18 }}>
        <h2 style={{ marginTop: 0 }}>Start</h2>
        <p style={{ color: colors.muted }}>
          Test View aktiv: <strong style={{ color: colors.gold }}>home</strong>
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
          <div style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 12 }}>
            <div style={{ color: colors.muted, fontSize: 13 }}>Rapporte</div>
            <strong style={{ fontSize: 24 }}>{reports.length}</strong>
          </div>
          <div style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 12 }}>
            <div style={{ color: colors.muted, fontSize: 13 }}>Kunden</div>
            <strong style={{ fontSize: 24 }}>{customers.length}</strong>
          </div>
          <div style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 12 }}>
            <div style={{ color: colors.muted, fontSize: 13 }}>Aktive Ansicht</div>
            <strong style={{ fontSize: 24, color: colors.gold }}>{currentView}</strong>
          </div>
        </div>
      </section>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" }}>
        <aside style={{ borderRight: `1px solid ${colors.border}`, background: colors.panel, padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 16 }}>
            Bau<span style={{ color: colors.gold }}>Abnahme</span>
          </div>

          <nav style={{ display: "grid", gap: 8 }}>
            <button type="button" onClick={() => setCurrentView("home")} style={{ minHeight: 42, borderRadius: 10, border: `1px solid ${currentView === "home" ? colors.gold : colors.border}`, background: currentView === "home" ? "rgba(212,168,83,0.12)" : "transparent", color: colors.text, textAlign: "left", padding: "0 12px", cursor: "pointer" }}>Start</button>
            <button type="button" onClick={() => setCurrentView("new-report")} style={{ minHeight: 42, borderRadius: 10, border: `1px solid ${currentView === "new-report" ? colors.gold : colors.border}`, background: currentView === "new-report" ? "rgba(212,168,83,0.12)" : "transparent", color: colors.text, textAlign: "left", padding: "0 12px", cursor: "pointer" }}>Neuer Rapport</button>
            <button type="button" onClick={() => setCurrentView("reports")} style={{ minHeight: 42, borderRadius: 10, border: `1px solid ${currentView === "reports" ? colors.gold : colors.border}`, background: currentView === "reports" ? "rgba(212,168,83,0.12)" : "transparent", color: colors.text, textAlign: "left", padding: "0 12px", cursor: "pointer" }}>Alle Rapporte</button>
            <button type="button" onClick={() => setCurrentView("customers")} style={{ minHeight: 42, borderRadius: 10, border: `1px solid ${currentView === "customers" ? colors.gold : colors.border}`, background: currentView === "customers" ? "rgba(212,168,83,0.12)" : "transparent", color: colors.text, textAlign: "left", padding: "0 12px", cursor: "pointer" }}>Kunden</button>
            <button type="button" onClick={() => setCurrentView("settings")} style={{ minHeight: 42, borderRadius: 10, border: `1px solid ${currentView === "settings" ? colors.gold : colors.border}`, background: currentView === "settings" ? "rgba(212,168,83,0.12)" : "transparent", color: colors.text, textAlign: "left", padding: "0 12px", cursor: "pointer" }}>Einstellungen</button>
          </nav>
        </aside>

        <main style={{ padding: 20 }}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: "clamp(1.4rem, 3vw, 2rem)" }}>Dashboard</h1>
              <p style={{ marginTop: 6, marginBottom: 0, color: colors.muted }}>
                {session?.user?.email || "Nicht angemeldet"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (onLogout) {
                  onLogout();
                  return;
                }
                if (onNavigate) onNavigate("/");
              }}
              style={{ minHeight: 42, borderRadius: 10, border: `1px solid ${colors.border}`, background: "transparent", color: colors.text, cursor: "pointer", padding: "0 14px" }}
            >
              Abmelden
            </button>
          </header>

          {renderView()}
        </main>
      </div>
    </div>
  );
}
