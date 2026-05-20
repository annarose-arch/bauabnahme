import { useState, useEffect } from "react";

const VIDEOS = {
DE: "mLQly-5_GuA",
FR: "7wytc7ho2Kg",
IT: "5sBpbdoOQmw",
EN: "Pq2k6KQTPDw",
};

const STRIPE = {
pro_monthly: "https://buy.stripe.com/bJefZhbNg0jEb0xc2F9AA08",
pro_yearly: "https://buy.stripe.com/3cI3cv18C8QafgNaYB9AA0c",
team_monthly: "https://buy.stripe.com/6oU28r18C8Qad8FfeR9AA09",
team_yearly: "https://buy.stripe.com/bJe3cv6sW9Ue1pX7Mp9AA0d",
};

const T = {
DE: {
nav_login: "Einloggen", nav_demo: "Demo testen",
hero_title: "Der Schweizer Handwerker denkt voraus.",
hero_sub: "Schluss mit Papier — mache deinen Betrieb digital.",
hero_desc: "Rapporte, Offerten und Rechnungen digital erstellen — auf dem Handy oder PC.",
hero_cta: "Kostenlos starten", hero_demo: "Demo ansehen",
video_title: "Sieh wie es funktioniert",
features_title: "Alles was du brauchst",
features: [
{ icon: "📋", title: "Rapporte", desc: "Arbeitsrapporte digital erstellen, mit Fotos und Unterschrift. In Sekunden fertig." },
{ icon: "📝", title: "Offerten", desc: "Offerten erstellen und mit einem Klick in Rapport oder Rechnung umwandeln." },
{ icon: "📄", title: "Rechnungen", desc: "Professionelle Rechnungen mit Schweizer QR-Code. Direkt aus dem Rapport." },
{ icon: "👥", title: "Kunden", desc: "Alle Kundendaten, Rapporte und Rechnungen an einem Ort." },
{ icon: "📱", title: "Mobile First", desc: "Optimiert für iPhone und Android. Auch als App installierbar." },
{ icon: "🌍", title: "4 Sprachen", desc: "Deutsch, Français, Italiano, English — für die ganze Schweiz." },
],
pricing_title: "Einfache Preise", monthly: "Monatlich", yearly: "Jährlich", yearly_badge: "2 Mt gratis",
plans: [
{ name: "Starter", price_m: "CHF 0", price_y: "CHF 0", desc: "Für den Einstieg", features: ["1 Benutzer", "15 Rapporte/Mt", "15 Offerten/Mt", "15 Rechnungen/Mt", "QR-Rechnung"], cta: "Kostenlos starten", link_m: null, link_y: null, highlight: false },
{ name: "Pro", price_m: "CHF 49/Mt", price_y: "CHF 490/Jahr", desc: "Für Einzelbetriebe", features: ["1 Admin + 5 Mitarbeiter", "Unlimitierte Rapporte", "Unlimitierte Offerten", "Unlimitierte Rechnungen", "QR-Rechnung"], cta: "Pro wählen", link_m: STRIPE.pro_monthly, link_y: STRIPE.pro_yearly, highlight: true },
{ name: "Team", price_m: "CHF 99/Mt", price_y: "CHF 990/Jahr", desc: "Für grössere Betriebe", features: ["Unlimitierte Mitarbeiter", "Alles unlimitiert", "QR-Rechnung", "Prioritäts-Support"], cta: "Team wählen", link_m: STRIPE.team_monthly, link_y: STRIPE.team_yearly, highlight: false },
],
footer_copy: "© 2026 BauAbnahme · ", footer_legal: "Impressum & Datenschutz",
},
FR: {
nav_login: "Se connecter", nav_demo: "Essayer la démo",
hero_title: "L’artisan suisse pense en avance.",
hero_sub: "Fini le papier — numérisez votre entreprise.",
hero_desc: "Créez des rapports, offres et factures numériques — sur mobile ou PC.",
hero_cta: "Commencer gratuitement", hero_demo: "Voir la démo",
video_title: "Voir comment ça marche",
features_title: "Tout ce dont vous avez besoin",
features: [
{ icon: "📋", title: "Rapports", desc: "Créez des rapports numériques avec photos et signature. Prêt en quelques secondes." },
{ icon: "📝", title: "Offres", desc: "Créez des offres et convertissez-les en rapport ou facture en un clic." },
{ icon: "📄", title: "Factures", desc: "Factures professionnelles avec QR suisse. Directement depuis le rapport." },
{ icon: "👥", title: "Clients", desc: "Toutes les données clients, rapports et factures au même endroit." },
{ icon: "📱", title: "Mobile First", desc: "Optimisé pour iPhone et Android. Installable comme application." },
{ icon: "🌍", title: "4 Langues", desc: "Deutsch, Français, Italiano, English — pour toute la Suisse." },
],
pricing_title: "Prix simples", monthly: "Mensuel", yearly: "Annuel", yearly_badge: "2 mois offerts",
plans: [
{ name: "Starter", price_m: "CHF 0", price_y: "CHF 0", desc: "Pour débuter", features: ["1 utilisateur", "15 rapports/mois", "15 offres/mois", "15 factures/mois", "Facture QR"], cta: "Commencer gratuitement", link_m: null, link_y: null, highlight: false },
{ name: "Pro", price_m: "CHF 49/mois", price_y: "CHF 490/an", desc: "Pour indépendants", features: ["1 Admin + 5 employés", "Rapports illimités", "Offres illimitées", "Factures illimitées", "Facture QR"], cta: "Choisir Pro", link_m: STRIPE.pro_monthly, link_y: STRIPE.pro_yearly, highlight: true },
{ name: "Team", price_m: "CHF 99/mois", price_y: "CHF 990/an", desc: "Pour grandes équipes", features: ["Employés illimités", "Tout illimité", "Facture QR", "Support prioritaire"], cta: "Choisir Team", link_m: STRIPE.team_monthly, link_y: STRIPE.team_yearly, highlight: false },
],
footer_copy: "© 2026 BauAbnahme · ", footer_legal: "Mentions légales",
},
IT: {
nav_login: "Accedi", nav_demo: "Prova la demo",
hero_title: "L’artigiano svizzero pensa avanti.",
hero_sub: "Basta carta — digitalizza la tua azienda.",
hero_desc: "Crea rapporti, offerte e fatture digitali — su telefono o PC.",
hero_cta: "Inizia gratuitamente", hero_demo: "Guarda la demo",
video_title: "Guarda come funziona",
features_title: "Tutto ciò di cui hai bisogno",
features: [
{ icon: "📋", title: "Rapporti", desc: "Crea rapporti digitali con foto e firma. Pronto in pochi secondi." },
{ icon: "📝", title: "Offerte", desc: "Crea offerte e convertile in rapporto o fattura con un clic." },
{ icon: "📄", title: "Fatture", desc: "Fatture professionali con QR svizzero. Direttamente dal rapporto." },
{ icon: "👥", title: "Clienti", desc: "Tutti i dati clienti, rapporti e fatture in un unico posto." },
{ icon: "📱", title: "Mobile First", desc: "Ottimizzato per iPhone e Android. Installabile come app." },
{ icon: "🌍", title: "4 Lingue", desc: "Deutsch, Français, Italiano, English — per tutta la Svizzera." },
],
pricing_title: "Prezzi semplici", monthly: "Mensile", yearly: "Annuale", yearly_badge: "2 mesi gratis",
plans: [
{ name: "Starter", price_m: "CHF 0", price_y: "CHF 0", desc: "Per iniziare", features: ["1 utente", "15 rapporti/mese", "15 offerte/mese", "15 fatture/mese", "Fattura QR"], cta: "Inizia gratuitamente", link_m: null, link_y: null, highlight: false },
{ name: "Pro", price_m: "CHF 49/mese", price_y: "CHF 490/anno", desc: "Per ditte individuali", features: ["1 Admin + 5 dipendenti", "Rapporti illimitati", "Offerte illimitate", "Fatture illimitate", "Fattura QR"], cta: "Scegli Pro", link_m: STRIPE.pro_monthly, link_y: STRIPE.pro_yearly, highlight: true },
{ name: "Team", price_m: "CHF 99/mese", price_y: "CHF 990/anno", desc: "Per grandi team", features: ["Dipendenti illimitati", "Tutto illimitato", "Fattura QR", "Supporto prioritario"], cta: "Scegli Team", link_m: STRIPE.team_monthly, link_y: STRIPE.team_yearly, highlight: false },
],
footer_copy: "© 2026 BauAbnahme · ", footer_legal: "Note legali",
},
EN: {
nav_login: "Log in", nav_demo: "Try demo",
hero_title: "The Swiss tradesperson thinks ahead.",
hero_sub: "No more paper — digitalise your business.",
hero_desc: "Create reports, quotes and invoices digitally — on mobile or PC.",
hero_cta: "Start for free", hero_demo: "Watch demo",
video_title: "See how it works",
features_title: "Everything you need",
features: [
{ icon: "📋", title: "Reports", desc: "Create digital work reports with photos and signature. Done in seconds." },
{ icon: "📝", title: "Quotes", desc: "Create quotes and convert to report or invoice with one click." },
{ icon: "📄", title: "Invoices", desc: "Professional invoices with Swiss QR code. Directly from the report." },
{ icon: "👥", title: "Customers", desc: "All customer data, reports and invoices in one place." },
{ icon: "📱", title: "Mobile First", desc: "Optimized for iPhone and Android. Installable as an app." },
{ icon: "🌍", title: "4 Languages", desc: "Deutsch, Français, Italiano, English — for all of Switzerland." },
],
pricing_title: "Simple pricing", monthly: "Monthly", yearly: "Yearly", yearly_badge: "2 months free",
plans: [
{ name: "Starter", price_m: "CHF 0", price_y: "CHF 0", desc: "To get started", features: ["1 user", "15 reports/month", "15 quotes/month", "15 invoices/month", "QR invoice"], cta: "Start for free", link_m: null, link_y: null, highlight: false },
{ name: "Pro", price_m: "CHF 49/month", price_y: "CHF 490/year", desc: "For sole traders", features: ["1 Admin + 5 employees", "Unlimited reports", "Unlimited quotes", "Unlimited invoices", "QR invoice"], cta: "Choose Pro", link_m: STRIPE.pro_monthly, link_y: STRIPE.pro_yearly, highlight: true },
{ name: "Team", price_m: "CHF 99/month", price_y: "CHF 990/year", desc: "For larger teams", features: ["Unlimited employees", "Everything unlimited", "QR invoice", "Priority support"], cta: "Choose Team", link_m: STRIPE.team_monthly, link_y: STRIPE.team_yearly, highlight: false },
],
footer_copy: "© 2026 BauAbnahme · ", footer_legal: "Legal & Privacy",
},
};

export default function LandingPage({ onNavigate }) {
const [lang, setLang] = useState(() => {
const saved = localStorage.getItem("bauabnahme_language_pref") || localStorage.getItem("bauabnahme_lang") || "DE";
return saved.toUpperCase();
});
const [billing, setBilling] = useState("monthly");
const [videoPlaying, setVideoPlaying] = useState(false);
const [scrolled, setScrolled] = useState(false);
const t = T[lang] || T.DE;
const GOLD = "#d4a853", DARK = "#0a0a0a", PANEL = "#111", BORDER = "rgba(212,168,83,0.2)", TEXT = "#f4efe6", MUTED = "#888";

useEffect(() => {
const onScroll = () => setScrolled(window.scrollY > 40);
window.addEventListener("scroll", onScroll);
return () => window.removeEventListener("scroll", onScroll);
}, []);

return (
<div style={{ background: DARK, color: TEXT, fontFamily: "system-ui, sans-serif", minHeight: "100vh", overflowX: "hidden" }}>


  {/* Nav */}
  <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: scrolled ? "rgba(10,10,10,0.95)" : "transparent", backdropFilter: scrolled ? "blur(12px)" : "none", borderBottom: scrolled ? `1px solid ${BORDER}` : "none", transition: "all 0.3s", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
    <div style={{ fontWeight: 800, fontSize: 20 }}>Bau<span style={{ color: GOLD }}>Abnahme</span></div>
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      {["DE", "FR", "IT", "EN"].map(l => (
        <button key={l} onClick={() => setLang(l)} style={{ border: "none", background: "transparent", color: lang === l ? GOLD : MUTED, fontWeight: lang === l ? 700 : 400, fontSize: 13, cursor: "pointer", padding: "4px 6px" }}>{l}</button>
      ))}
      <button onClick={() => onNavigate("/demo")} style={{ background: "transparent", border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", marginLeft: 4 }}>{t.nav_demo}</button>
      <button onClick={() => onNavigate("/login")} style={{ background: GOLD, border: "none", color: "#111", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{t.nav_login}</button>
    </div>
  </nav>

  {/* Hero */}
  <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "120px 24px 80px", textAlign: "center", background: `radial-gradient(ellipse at 50% 0%, rgba(212,168,83,0.12) 0%, transparent 70%)` }}>
    <h1 style={{ fontSize: "clamp(2rem, 6vw, 4.5rem)", fontWeight: 900, lineHeight: 1.1, marginBottom: 16, maxWidth: 800, letterSpacing: "-0.02em", color: "#ffffff" }}>{t.hero_title}</h1>
    <h2 style={{ fontSize: "clamp(1.2rem, 3vw, 2rem)", fontWeight: 700, color: GOLD, marginBottom: 20, maxWidth: 600 }}>{t.hero_sub}</h2>
    <p style={{ fontSize: "clamp(0.9rem, 2vw, 1.1rem)", color: MUTED, maxWidth: 500, marginBottom: 40, lineHeight: 1.6 }}>{t.hero_desc}</p>
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
      <button onClick={() => onNavigate("/login")} style={{ background: GOLD, border: "none", color: "#111", borderRadius: 10, padding: "14px 28px", fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: `0 0 40px rgba(212,168,83,0.3)` }}>{t.hero_cta} →</button>
      <button onClick={() => onNavigate("/demo")} style={{ background: "transparent", border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 10, padding: "14px 28px", fontSize: 16, cursor: "pointer" }}>{t.hero_demo}</button>
    </div>
    <div style={{ display: "flex", gap: 32, marginTop: 60, flexWrap: "wrap", justifyContent: "center" }}>
      {[["⚡", "In 2 Min startklar"], ["🔒", "DSGVO-konform"], ["📱", "iOS & Android"]].map(([icon, label]) => (
        <div key={label} style={{ textAlign: "center" }}><div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div><div style={{ fontSize: 12, color: MUTED }}>{label}</div></div>
      ))}
    </div>
  </section>

  {/* Video */}
  <section style={{ padding: "80px 24px", textAlign: "center", background: PANEL }}>
    <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)", fontWeight: 800, marginBottom: 40 }}>{t.video_title}</h2>
    <div style={{ maxWidth: 380, margin: "0 auto" }}>
      {!videoPlaying ? (
        <div onClick={() => setVideoPlaying(true)} style={{ position: "relative", cursor: "pointer", borderRadius: 20, overflow: "hidden", border: `2px solid ${BORDER}`, aspectRatio: "9/16", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={`https://img.youtube.com/vi/${VIDEOS[lang]}/hqdefault.jpg`} alt="Video" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }} />
          <div style={{ position: "absolute", width: 64, height: 64, background: GOLD, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, boxShadow: `0 0 30px rgba(212,168,83,0.5)` }}>▶</div>
        </div>
      ) : (
        <div style={{ borderRadius: 20, overflow: "hidden", border: `2px solid ${BORDER}`, aspectRatio: "9/16" }}>
          <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${VIDEOS[lang]}?autoplay=1`} allow="autoplay; encrypted-media" allowFullScreen style={{ border: "none", display: "block" }} />
        </div>
      )}
    </div>
  </section>

  {/* Features */}
  <section style={{ padding: "80px 24px", maxWidth: 1100, margin: "0 auto" }}>
    <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)", fontWeight: 800, textAlign: "center", marginBottom: 48 }}>{t.features_title}</h2>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
      {t.features.map((f, i) => (
        <div key={i} style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, transition: "border-color 0.2s, transform 0.2s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.transform = "translateY(-2px)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.transform = "translateY(0)"; }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8, color: GOLD }}>{f.title}</div>
          <div style={{ color: MUTED, fontSize: 14, lineHeight: 1.6 }}>{f.desc}</div>
        </div>
      ))}
    </div>
  </section>

  {/* Pricing */}
  <section style={{ padding: "80px 24px", background: PANEL }}>
    <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)", fontWeight: 800, textAlign: "center", marginBottom: 24 }}>{t.pricing_title}</h2>
    <div style={{ display: "flex", justifyContent: "center", marginBottom: 40 }}>
      <div style={{ display: "flex", border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden" }}>
        <button onClick={() => setBilling("monthly")} style={{ padding: "10px 20px", border: "none", cursor: "pointer", fontSize: 14, background: billing === "monthly" ? GOLD : "transparent", color: billing === "monthly" ? "#111" : MUTED, fontWeight: billing === "monthly" ? 700 : 400 }}>{t.monthly}</button>
        <button onClick={() => setBilling("yearly")} style={{ padding: "10px 20px", border: "none", cursor: "pointer", fontSize: 14, background: billing === "yearly" ? GOLD : "transparent", color: billing === "yearly" ? "#111" : MUTED, fontWeight: billing === "yearly" ? 700 : 400 }}>{t.yearly} 🎉 {t.yearly_badge}</button>
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, maxWidth: 900, margin: "0 auto" }}>
      {t.plans.map((plan, i) => (
        <div key={i} style={{ background: plan.highlight ? "rgba(212,168,83,0.08)" : DARK, border: `2px solid ${plan.highlight ? GOLD : BORDER}`, borderRadius: 16, padding: 28, position: "relative" }}>
          {plan.highlight && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: GOLD, color: "#111", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700 }}>Popular</div>}
          <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>{plan.name}</div>
          <div style={{ color: MUTED, fontSize: 13, marginBottom: 16 }}>{plan.desc}</div>
          <div style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 900, color: GOLD, marginBottom: 20 }}>{billing === "yearly" ? plan.price_y : plan.price_m}</div>
          {plan.features.map((f, j) => <div key={j} style={{ color: MUTED, fontSize: 13, marginBottom: 8, display: "flex", gap: 8 }}><span style={{ color: GOLD }}>✓</span> {f}</div>)}
          <button onClick={() => { const link = billing === "yearly" ? plan.link_y : plan.link_m; if (link) window.location.href = link; else onNavigate("/login"); }} style={{ marginTop: 24, width: "100%", padding: "12px", background: plan.highlight ? GOLD : "transparent", border: `1px solid ${plan.highlight ? GOLD : BORDER}`, color: plan.highlight ? "#111" : TEXT, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{plan.cta}</button>
        </div>
      ))}
    </div>
  </section>

  {/* CTA */}
  <section style={{ padding: "80px 24px", textAlign: "center", background: `linear-gradient(135deg, rgba(212,168,83,0.12) 0%, transparent 100%)` }}>
    <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)", fontWeight: 800, marginBottom: 12 }}>{t.hero_title}</h2>
    <p style={{ color: GOLD, fontWeight: 700, fontSize: 18, marginBottom: 8 }}>{t.hero_sub}</p>
    <p style={{ color: MUTED, marginBottom: 32, fontSize: 15 }}>{t.hero_desc}</p>
    <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
      <button onClick={() => onNavigate("/login")} style={{ background: GOLD, border: "none", color: "#111", borderRadius: 10, padding: "14px 32px", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>{t.hero_cta} →</button>
      <button onClick={() => onNavigate("/demo")} style={{ background: "transparent", border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 10, padding: "14px 28px", fontSize: 16, cursor: "pointer" }}>{t.nav_demo}</button>
    </div>
  </section>

  {/* Footer */}
  <footer style={{ padding: "32px 24px", borderTop: `1px solid ${BORDER}`, textAlign: "center", color: MUTED, fontSize: 13 }}>
    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Bau<span style={{ color: GOLD }}>Abnahme</span></div>
    <div>{t.footer_copy}<button onClick={() => {}} style={{ background: "none", border: "none", color: GOLD, cursor: "pointer", fontSize: 13 }}>{t.footer_legal}</button></div>
  </footer>
</div>


);
}
