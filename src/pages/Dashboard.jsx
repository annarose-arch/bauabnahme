import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function Dashboard({ session, onLogout, onNavigate }) {
  const [currentView, setCurrentView] = useState("home");
  const [reports, setReports] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [notice, setNotice] = useState("");

  const [reportForm, setReportForm] = useState({
    customer: "",
    description: "",
    date: new Date().toISOString().slice(0, 10),
    status: "open"
  });

  const [customerForm, setCustomerForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: ""
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

  const userId = session?.user?.id;
  const userEmail = session?.user?.email || "";

  const inputStyle = {
    minHeight: 42,
    borderRadius: 10,
    border: `1px solid ${colors.border}`,
    background: "#111",
    color: colors.text,
    padding: "0 12px"
  };

  const buttonPrimary = {
    minHeight: 44,
    borderRadius: 10,
    border: "none",
    background: colors.gold,
    color: "#111",
    fontWeight: 700,
    cursor: "pointer",
    padding: "0 14px"
  };

  const fetchReports = async () => {
    if (!userId) return;
    setLoadingReports(true);
    const { data, error } = await supabase.from("reports").select("*");
    console.log("reports:", data, "error:", error);
    const filteredReports = (data || [])
      .filter((report) => report.user_id === userId)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    setReports(filteredReports);
    setLoadingReports(false);
  };

  const fetchCustomers = async () => {
    if (!userId) return;
    setLoadingCustomers(true);
    const { data } = await supabase
      .from("customers")
      .select("id, name, address, phone, email")
      .eq("user_id", userId)
      .order("name", { ascending: true });
    setCustomers(data || []);
    setLoadingCustomers(false);
  };

  useEffect(() => {
    if (!userId) {
      setReports([]);
      setCustomers([]);
      return;
    }
    const loadData = async () => {
      await Promise.all([fetchReports(), fetchCustomers()]);
    };
    loadData();
  }, [userId]);

  const handleSaveReport = async () => {
    if (!userId || !reportForm.customer.trim()) {
      setNotice("Bitte Kundenname ausfullen.");
      return;
    }
    setSavingReport(true);
    setNotice("");
    const { error } = await supabase.from("reports").insert({
      user_id: userId,
      customer: reportForm.customer.trim(),
      description: reportForm.description.trim(),
      date: reportForm.date,
      status: reportForm.status
    });
    setSavingReport(false);

    if (error) {
      setNotice("Rapport konnte nicht gespeichert werden.");
      return;
    }

    setReportForm((prev) => ({ ...prev, customer: "", description: "" }));
    setNotice("Rapport gespeichert.");
    await fetchReports();
    setCurrentView("reports");
  };

  const handleSaveCustomer = async () => {
    if (!userId || !customerForm.name.trim()) {
      setNotice("Bitte Kundenname ausfullen.");
      return;
    }
    setSavingCustomer(true);
    setNotice("");
    const { error } = await supabase.from("customers").insert({
      user_id: userId,
      name: customerForm.name.trim(),
      address: customerForm.address.trim(),
      phone: customerForm.phone.trim(),
      email: customerForm.email.trim()
    });
    setSavingCustomer(false);

    if (error) {
      setNotice("Kunde konnte nicht gespeichert werden.");
      return;
    }

    setCustomerForm({ name: "", address: "", phone: "", email: "" });
    setNotice("Kunde gespeichert.");
    await fetchCustomers();
  };

  const handlePasswordReset = async () => {
    if (!userEmail) {
      setNotice("Keine E-Mail im Konto gefunden.");
      return;
    }
    setNotice("");
    const { error } = await supabase.auth.resetPasswordForEmail(userEmail);
    if (error) {
      setNotice("Passwort-Reset konnte nicht gestartet werden.");
      return;
    }
    setNotice("Passwort-Reset E-Mail wurde gesendet.");
  };

  const renderView = () => {
    if (currentView === "new-report") {
      return (
        <section style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 18 }}>
          <h2 style={{ marginTop: 0 }}>Neuer Rapport</h2>
          <div style={{ display: "grid", gap: 12 }}>
            <input
              type="text"
              placeholder="Kundenname"
              value={reportForm.customer}
              onChange={(e) => setReportForm((prev) => ({ ...prev, customer: e.target.value }))}
              style={inputStyle}
            />
            <textarea
              placeholder="Beschreibung"
              value={reportForm.description}
              onChange={(e) => setReportForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={4}
              style={{ ...inputStyle, minHeight: 110, padding: 12 }}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input
                type="date"
                value={reportForm.date}
                onChange={(e) => setReportForm((prev) => ({ ...prev, date: e.target.value }))}
                style={inputStyle}
              />
              <select
                value={reportForm.status}
                onChange={(e) => setReportForm((prev) => ({ ...prev, status: e.target.value }))}
                style={inputStyle}
              >
                <option value="open">Offen</option>
                <option value="done">Erledigt</option>
              </select>
            </div>
            <button type="button" onClick={handleSaveReport} disabled={savingReport} style={{ ...buttonPrimary, opacity: savingReport ? 0.7 : 1 }}>
              {savingReport ? "Speichert..." : "Rapport speichern"}
            </button>
          </div>
        </section>
      );
    }

    if (currentView === "reports") {
      return (
        <section style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 18 }}>
          <h2 style={{ marginTop: 0 }}>Alle Rapporte</h2>
          {loadingReports ? (
            <p style={{ color: colors.muted }}>Lade Rapporte...</p>
          ) : reports.length === 0 ? (
            <p style={{ color: colors.muted }}>Keine Rapporte gefunden.</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {reports.map((report) => (
                <div key={report.id} style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: "10px 12px", display: "grid", gap: 4 }}>
                  <strong>R-{report.id} · {report.customer || "-"}</strong>
                  <div style={{ color: colors.muted }}>{report.description || "-"}</div>
                  <div style={{ color: colors.muted, fontSize: 13 }}>
                    {report.date || "-"} · {(report.status || "").toLowerCase() === "done" ? "Erledigt" : "Offen"}
                  </div>
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
          <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
            <input
              type="text"
              placeholder="Kundenname"
              value={customerForm.name}
              onChange={(e) => setCustomerForm((prev) => ({ ...prev, name: e.target.value }))}
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="Adresse"
              value={customerForm.address}
              onChange={(e) => setCustomerForm((prev) => ({ ...prev, address: e.target.value }))}
              style={inputStyle}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input
                type="text"
                placeholder="Telefon"
                value={customerForm.phone}
                onChange={(e) => setCustomerForm((prev) => ({ ...prev, phone: e.target.value }))}
                style={inputStyle}
              />
              <input
                type="email"
                placeholder="E-Mail"
                value={customerForm.email}
                onChange={(e) => setCustomerForm((prev) => ({ ...prev, email: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <button type="button" onClick={handleSaveCustomer} disabled={savingCustomer} style={{ ...buttonPrimary, opacity: savingCustomer ? 0.7 : 1 }}>
              {savingCustomer ? "Speichert..." : "Kunde speichern"}
            </button>
          </div>
          {loadingCustomers ? (
            <p style={{ color: colors.muted }}>Lade Kunden...</p>
          ) : customers.length === 0 ? (
            <p style={{ color: colors.muted }}>Keine Kunden gefunden.</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {customers.map((customer) => (
                <div key={customer.id} style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: "10px 12px", display: "grid", gap: 4 }}>
                  <strong>{customer.name || "-"}</strong>
                  <div style={{ color: colors.muted }}>{customer.address || "-"}</div>
                  <div style={{ color: colors.muted }}>{customer.phone || "-"} | {customer.email || "-"}</div>
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
          <p style={{ color: colors.muted, marginTop: 0 }}>
            Benutzer: <strong style={{ color: colors.text }}>{userEmail || "-"}</strong>
          </p>
          <button type="button" onClick={handlePasswordReset} style={buttonPrimary}>
            Passwort andern
          </button>
        </section>
      );
    }

    return (
      <section style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 18 }}>
        <h2 style={{ marginTop: 0 }}>Start</h2>
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

          {notice ? (
            <div style={{ marginBottom: 12, border: `1px solid ${colors.border}`, borderRadius: 10, padding: "10px 12px", color: colors.muted }}>
              {notice}
            </div>
          ) : null}

          {renderView()}
        </main>
      </div>
    </div>
  );
}
