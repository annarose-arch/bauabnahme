import { useEffect, useState } from "react";
import { Camera, PenTool, FileText, Clock3, Globe, ChevronRight, CheckCircle2, Menu, X } from "lucide-react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { supabase } from "./supabase";

const copy = {
  de: {
    navFeatures: "Funktionen",
    navPricing: "Preise",
    navLogin: "Login",
    navStart: "Jetzt starten",
    heroTitle: "BauAbnahme fur moderne Schweizer Betriebe",
    heroSubtitle: "Fotos, Unterschriften, PDF-Rapporte und Arbeitsstunden in einer einzigen App.",
    heroCta: "Kostenlos testen",
    featuresTitle: "Alles in einer App",
    pricingTitle: "Einfache Preise",
    month: "/Monat",
    footer: "Swiss Made",
    featureCards: [
      { key: "photos", title: "Fotos", text: "Vorher- und Nachher-Fotos direkt auf der Baustelle erfassen." },
      { key: "signature", title: "Digitale Unterschrift", text: "Kundensignaturen sofort auf Mobilgeraten einholen." },
      { key: "pdf", title: "PDF", text: "Saubere Abnahmeberichte mit einem Klick als PDF erstellen." },
      { key: "hours", title: "Arbeitsstunden", text: "Arbeitszeiten transparent dokumentieren und abrechnen." }
    ]
  },
  fr: {
    navFeatures: "Fonctions",
    navPricing: "Tarifs",
    navLogin: "Login",
    navStart: "Commencer",
    heroTitle: "BauAbnahme pour les entreprises suisses modernes",
    heroSubtitle: "Photos, signatures, rapports PDF et heures de travail dans une seule application.",
    heroCta: "Essayer gratuitement",
    featuresTitle: "Tout dans une seule app",
    pricingTitle: "Tarifs simples",
    month: "/mois",
    footer: "Swiss Made",
    featureCards: [
      { key: "photos", title: "Photos", text: "Capturez les photos avant et apres directement sur le chantier." },
      { key: "signature", title: "Signature numerique", text: "Recueillez instantanement la signature client sur mobile." },
      { key: "pdf", title: "PDF", text: "Generez des rapports de remise propres en un seul clic." },
      { key: "hours", title: "Heures de travail", text: "Suivez les heures de travail pour une facturation transparente." }
    ]
  },
  it: {
    navFeatures: "Funzioni",
    navPricing: "Prezzi",
    navLogin: "Login",
    navStart: "Inizia ora",
    heroTitle: "BauAbnahme per imprese svizzere moderne",
    heroSubtitle: "Foto, firme digitali, rapporti PDF e ore di lavoro in un'unica app.",
    heroCta: "Prova gratis",
    featuresTitle: "Tutto in una sola app",
    pricingTitle: "Prezzi semplici",
    month: "/mese",
    footer: "Swiss Made",
    featureCards: [
      { key: "photos", title: "Foto", text: "Cattura foto prima/dopo direttamente in cantiere." },
      { key: "signature", title: "Firma digitale", text: "Raccogli subito la firma del cliente da mobile." },
      { key: "pdf", title: "PDF", text: "Genera rapporti di consegna puliti con un solo clic." },
      { key: "hours", title: "Ore di lavoro", text: "Traccia le ore lavorative per una fatturazione chiara." }
    ]
  },
  en: {
    navFeatures: "Features",
    navPricing: "Pricing",
    navLogin: "Login",
    navStart: "Get Started",
    heroTitle: "BauAbnahme for modern Swiss businesses",
    heroSubtitle: "Photos, signatures, PDF reports, and work hours in one app.",
    heroCta: "Try for Free",
    featuresTitle: "Everything in one app",
    pricingTitle: "Simple pricing",
    month: "/month",
    footer: "Swiss Made",
    featureCards: [
      { key: "photos", title: "Photos", text: "Capture before and after photos directly on site." },
      { key: "signature", title: "Digital Signature", text: "Collect customer signatures instantly on mobile." },
      { key: "pdf", title: "PDF", text: "Generate clean handover reports with one click." },
      { key: "hours", title: "Work Hours", text: "Track labor hours clearly for transparent billing." }
    ]
  }
};

const iconByKey = {
  photos: Camera,
  signature: PenTool,
  pdf: FileText,
  hours: Clock3
};

const STRIPE_PK = "pk_test_51TC4I6Rg5oD5OtbehD1hQOouVhgAqKkK1eyf7c1gzZwvXXCmj8v7gPzGdH24iQHPQNx4YNrCjDSoxkNHR6GZYw0J006HUm8vQS";

// Replace these with your real Stripe Payment Link URLs once created in Stripe Dashboard
// Go to: Stripe Dashboard → Payment Links → Create link
const plans = [
  {
    name: "Starter",
    price: "CHF 0",
    priceAmount: 0,
    perks: ["5 Rapporte", "1 Benutzer", "PDF Export", "Fotos & Unterschrift"],
    paymentLink: null,
    demoLink: "/demo",
    featured: false
  },
  {
    name: "Pro",
    price: "CHF 29",
    priceAmount: 29,
    perks: ["Unbegrenzte Rapporte", "10 Benutzer", "Prioritäts-Support", "TWINT & Kreditkarte"],
    paymentLink: "https://buy.stripe.com/bJe5kD18Cc2m3y59Ux9AA02",
    featured: true
  },
  {
    name: "Team",
    price: "CHF 79",
    priceAmount: 79,
    perks: ["Unbegrenzte Benutzer", "API Zugang", "Dedizierter Support", "TWINT & Kreditkarte"],
    paymentLink: "https://buy.stripe.com/14A5kDbNgfey4C92s59AA01",
    featured: false
  }
];

function Landing({ lang, setLang, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const t = copy[lang];
  const colors = {
    bg: "#0a0a0a",
    card: "#151515",
    text: "#f4efe6",
    muted: "#b9b0a3",
    gold: "#d4a853",
    border: "rgba(212, 168, 83, 0.25)"
  };

  const handleNavigate = (path, source) => {
    console.log(`[Landing] ${source} -> navigate(${path})`);
    onNavigate(path);
  };

  const handleLanguageChange = (code, source) => {
    console.log(`[Landing] ${source} -> setLang(${code})`);
    setLang(code);
  };

  const handleToggleMenu = () => {
    console.log(`[Landing] toggle mobile menu -> ${!menuOpen}`);
    setMenuOpen((prev) => !prev);
  };

  return (
    <div style={{ background: colors.bg, color: colors.text, minHeight: "100vh", fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{`
        .desktop-only { display: flex; }
        .mobile-only { display: none; }
        .features-grid { grid-template-columns: repeat(2, minmax(220px, 1fr)); }
        .pricing-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        @media (max-width: 768px) {
          .desktop-only { display: none !important; }
          .mobile-only { display: inline-flex !important; }
          .features-grid, .pricing-grid { grid-template-columns: 1fr !important; }
          .hero-title { font-size: 2.1rem !important; line-height: 1.15 !important; }
          .hero-subtitle { font-size: 1rem !important; line-height: 1.55 !important; }
          .touch-button { min-height: 46px; font-size: 16px; padding: 12px 16px !important; }
        }
      `}</style>

      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(10,10,10,0.92)", borderBottom: `1px solid ${colors.border}`, backdropFilter: "blur(8px)", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>Bau<span style={{ color: colors.gold }}>Abnahme</span></div>
        <div className="desktop-only" style={{ alignItems: "center", gap: 16 }}>
          <a href="#features" style={{ color: colors.muted, textDecoration: "none" }}>{t.navFeatures}</a>
          <a href="#pricing" style={{ color: colors.muted, textDecoration: "none" }}>{t.navPricing}</a>
          <button onClick={() => handleNavigate("/login", "desktop login")} style={{ border: `1px solid ${colors.border}`, background: "transparent", color: colors.text, borderRadius: 8, padding: "9px 12px", cursor: "pointer", fontWeight: 600 }}>
            {t.navLogin}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Globe size={14} color={colors.gold} />
            {["de", "fr", "it", "en"].map((code) => (
              <button key={code} onClick={() => handleLanguageChange(code, "desktop language button")} style={{ border: "none", background: "transparent", color: code === lang ? colors.gold : colors.muted, cursor: "pointer", fontWeight: code === lang ? 700 : 500, minHeight: 40, padding: "0 6px" }}>
                {code.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            className="touch-button"
            onClick={() => handleNavigate("/login", "desktop start")}
            style={{ border: "none", background: colors.gold, color: "#111", borderRadius: 8, padding: "10px 14px", cursor: "pointer", fontWeight: 700 }}
          >
            {t.navStart}
          </button>
        </div>
        <button className="mobile-only touch-button" onClick={handleToggleMenu} style={{ border: `1px solid ${colors.border}`, background: "transparent", color: colors.text, borderRadius: 8, padding: "8px 10px", cursor: "pointer", alignItems: "center", justifyContent: "center" }} aria-label="Toggle menu">
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {menuOpen && (
        <div style={{ position: "fixed", top: 62, left: 0, right: 0, zIndex: 99, background: "#111", borderBottom: `1px solid ${colors.border}`, padding: "12px 16px" }}>
          <div style={{ display: "grid", gap: 10 }}>
            <a href="#features" onClick={() => { console.log("[Landing] mobile nav -> features"); setMenuOpen(false); }} style={{ color: colors.muted, textDecoration: "none", padding: "6px 0" }}>{t.navFeatures}</a>
            <a href="#pricing" onClick={() => { console.log("[Landing] mobile nav -> pricing"); setMenuOpen(false); }} style={{ color: colors.muted, textDecoration: "none", padding: "6px 0" }}>{t.navPricing}</a>
            <button onClick={() => { console.log("[Landing] mobile login button"); setMenuOpen(false); handleNavigate("/login", "mobile login"); }} style={{ border: `1px solid ${colors.border}`, background: "transparent", color: colors.text, borderRadius: 8, minHeight: 44, cursor: "pointer", fontWeight: 600 }}>
              {t.navLogin}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 4 }}>
              <Globe size={14} color={colors.gold} />
              {["de", "fr", "it", "en"].map((code) => (
                <button key={code} onClick={() => handleLanguageChange(code, "mobile language button")} style={{ border: "none", background: "transparent", color: code === lang ? colors.gold : colors.muted, cursor: "pointer", fontWeight: code === lang ? 700 : 500, minHeight: 40, padding: "0 8px" }}>
                  {code.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <main style={{ maxWidth: 1120, margin: "0 auto", padding: "104px 16px 72px" }}>
        <section style={{ textAlign: "center", padding: "56px 16px", marginBottom: 56, border: `1px solid ${colors.border}`, borderRadius: 18, background: "linear-gradient(180deg, rgba(212,168,83,0.12) 0%, rgba(21,21,21,0.92) 45%, rgba(10,10,10,1) 100%)" }}>
          <h1 className="hero-title" style={{ fontSize: "clamp(2.4rem, 6vw, 4.1rem)", lineHeight: 1.08, marginBottom: 16, fontWeight: 800, color: colors.text }}>
            {t.heroTitle}
          </h1>
          <p className="hero-subtitle" style={{ color: colors.muted, maxWidth: 760, margin: "0 auto 28px", lineHeight: 1.6, fontSize: 18 }}>
            {t.heroSubtitle}
          </p>
          <button
            className="touch-button"
            onClick={() => handleNavigate("/login", "hero cta")}
            style={{ border: "none", background: colors.gold, color: "#111", borderRadius: 10, padding: "12px 18px", cursor: "pointer", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            {t.heroCta}
            <ChevronRight size={16} />
          </button>
        </section>

        <section id="features" style={{ paddingBottom: 56 }}>
          <h2 style={{ marginBottom: 18 }}>{t.featuresTitle}</h2>
          <div className="features-grid" style={{ display: "grid", gap: 14 }}>
            {t.featureCards.map((feature) => {
              const Icon = iconByKey[feature.key];
              return (
                <article key={feature.key} style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 18 }}>
                  <Icon size={20} color={colors.gold} />
                  <h3 style={{ marginTop: 10, marginBottom: 8 }}>{feature.title}</h3>
                  <p style={{ margin: 0, color: colors.muted, lineHeight: 1.55 }}>{feature.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="pricing">
          <h2 style={{ marginBottom: 18 }}>{t.pricingTitle}</h2>
          <div className="pricing-grid" style={{ display: "grid", gap: 14 }}>
            {plans.map((plan) => (
              <article key={plan.name} style={{ background: colors.card, border: `2px solid ${plan.featured ? colors.gold : colors.border}`, borderRadius: 14, padding: 20, display: "flex", flexDirection: "column" }}>
                {plan.featured && (
                  <div style={{ background: colors.gold, color: "#111", fontWeight: 700, fontSize: 11, borderRadius: 6, padding: "3px 10px", alignSelf: "flex-start", marginBottom: 10 }}>⭐ EMPFOHLEN</div>
                )}
                <h3 style={{ marginTop: 0, marginBottom: 4 }}>{plan.name}</h3>
                <div style={{ fontSize: 32, fontWeight: 800, color: plan.featured ? colors.gold : colors.text, marginBottom: 2 }}>
                  {plan.price}
                  <span style={{ fontSize: 14, color: colors.muted, marginLeft: 4 }}>{t.month}</span>
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: "14px 0 16px", flex: 1 }}>
                  {plan.perks.map((perk) => (
                    <li key={perk} style={{ display: "flex", alignItems: "center", gap: 8, color: colors.muted, marginBottom: 8, fontSize: 14 }}>
                      <CheckCircle2 size={15} color={colors.gold} />
                      {perk}
                    </li>
                  ))}
                </ul>
                {plan.paymentLink ? (
                  <a
                    href={plan.paymentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "block", textAlign: "center", background: plan.featured ? colors.gold : "transparent", color: plan.featured ? "#111" : colors.gold, border: `1px solid ${colors.gold}`, borderRadius: 10, padding: "11px 0", fontWeight: 700, fontSize: 15, textDecoration: "none", cursor: "pointer" }}
                  >
                    Jetzt abonnieren →
                  </a>
                ) : (
                  <button
                    onClick={() => onNavigate("/login")}
                    style={{ background: "transparent", color: colors.gold, border: `1px solid ${colors.gold}`, borderRadius: 10, padding: "11px 0", fontWeight: 600, fontSize: 15, cursor: "pointer" }}
                  >
                    Jetzt abonnieren →
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer style={{ borderTop: `1px solid ${colors.border}`, padding: "22px 24px", textAlign: "center", color: colors.muted }}>
        {t.footer}
      </footer>
    </div>
  );
}

export default function App() {
  const [lang, setLang] = useState("de");
  const [route, setRoute] = useState(window.location.pathname || "/");
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const navigate = (path) => {
    console.log(`[App] navigate requested: ${route} -> ${path}`);
    if (path !== route) {
      window.history.pushState({}, "", path);
      setRoute(path);
      return;
    }
    console.log("[App] route unchanged, no state update");
  };

  useEffect(() => {
    const onPopState = () => setRoute(window.location.pathname || "/");
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    console.log(`[App] route state changed to: ${route}`);
  }, [route]);

  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (error) {
        setSession(null);
      } else {
        setSession(data.session ?? null);
      }
      setAuthReady(true);
    };

    bootstrapAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession ?? null);
      const currentPath = window.location.pathname || "/";

      if (currentSession && currentPath === "/login") {
        window.history.pushState({}, "", "/dashboard");
        setRoute("/dashboard");
      }

      if (!currentSession && currentPath === "/dashboard") {
        window.history.pushState({}, "", "/login");
        setRoute("/login");
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (!authReady) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#f4efe6", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, system-ui, sans-serif" }}>
        Lade Sitzung...
      </div>
    );
  }

  if (route === "/login") {
    if (session) {
      return <Dashboard lang={lang} onNavigate={navigate} onLogout={handleLogout} session={session} />;
    }
    return <Login lang={lang} setLang={setLang} onNavigate={navigate} />;
  }

  if (route === "/dashboard") {
    if (!session) {
      return <Login lang={lang} setLang={setLang} onNavigate={navigate} />;
    }
    return <Dashboard lang={lang} onNavigate={navigate} onLogout={handleLogout} session={session} />;
  }

  if (route === "/demo") {
    // Demo mode - fake session, no login needed
    const demoSession = { user: { id: "demo-user", email: "demo@bauabnahme.ch" } };
    return <Dashboard lang={lang} onNavigate={navigate} onLogout={() => navigate("/")} session={demoSession} isDemo={true} />;
  }

  return <Landing lang={lang} setLang={setLang} onNavigate={navigate} />;
}
