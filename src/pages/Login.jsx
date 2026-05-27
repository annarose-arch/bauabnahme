import { useState } from "react";
import { VideoPlayer } from "../components/VideoPlayer.jsx";
import { Mail, Lock, Globe, Building2, User, MapPin, Phone, Eye, EyeOff } from "lucide-react";
import { supabase } from "../supabase.js";

const COLORS = {
  bg: "#0a0a0a",
  card: "#151515",
  text: "#f4efe6",
  muted: "#b9b0a3",
  gold: "#d4a853",
  border: "rgba(212,168,83,0.25)",
  error: "#ff9c9c",
  success: "#9fdc9f"
};

const inputRow = (icon, children) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "0 12px", minHeight: 48, background: "#0f0f0f" }}>
    {icon}
    {children}
  </div>
);

const fieldStyle = {
  width: "100%", border: "none", outline: "none",
  background: "transparent", color: COLORS.text, fontSize: 16
};

const mapError = (msg, lang) => {
  const t = (msg || "").toLowerCase();
  const errors = {
    de: { credentials: "Ungültige Anmeldedaten.", confirm: "Bitte E-Mail bestätigen.", exists: "Konto existiert bereits. Bitte einloggen.", password: "Passwort min. 6 Zeichen.", network: "Netzwerkfehler.", unknown: "Fehler: " },
    fr: { credentials: "Identifiants invalides.", confirm: "Veuillez confirmer votre e-mail.", exists: "Ce compte existe déjà.", password: "Min. 6 caractères.", network: "Erreur réseau.", unknown: "Erreur: " },
    it: { credentials: "Credenziali non valide.", confirm: "Confermare l'e-mail.", exists: "Account già esistente.", password: "Min. 6 caratteri.", network: "Errore di rete.", unknown: "Errore: " },
    en: { credentials: "Invalid login credentials.", confirm: "Please confirm your email.", exists: "Account already exists.", password: "Password min. 6 characters.", network: "Network error.", unknown: "Error: " },
  };
  const e = errors[lang] || errors.de;
  if (t.includes("invalid login credentials")) return e.credentials;
  if (t.includes("email not confirmed")) return e.confirm;
  if (t.includes("user already registered")) return e.exists;
  if (t.includes("password")) return e.password;
  if (t.includes("network")) return e.network;
  return e.unknown + (msg || "");
};

export default function Login({ lang: initialLang, setLang, onNavigate }) {
  const [lang, setLocalLang] = useState(initialLang || localStorage.getItem("bauabnahme_language_pref")?.toLowerCase() || localStorage.getItem("bauabnahme_lang") || "de");
  const [selectedPlan, setSelectedPlan] = useState("starter");
  const [billing, setBilling] = useState("monthly");
  const handleLang = (code) => {
    setLocalLang(code);
    localStorage.setItem("bauabnahme_lang", code); localStorage.setItem("bauabnahme_language_pref", code.toUpperCase());
    if (setLang) setLang(code);
  };
  // mode: "login" | "register-step1" | "register-step2"
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  // Step 1 fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [companyLogo, setCompanyLogo] = useState("");

  // Step 2 fields
  const [companyName, setCompanyName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");

  const clear = () => { setErrorMsg(""); setInfoMsg(""); };

  const handleLogin = async () => {
    clear();
    if (!email.trim() || !password) { setErrorMsg(tr.errEmailPass||"Bitte E-Mail und Passwort eingeben."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) { setErrorMsg(mapError(error.message, lang)); return; }
    onNavigate("/dashboard");
  };
const handleForgotPassword = async () => {
    if (!email.trim()) { setErrorMsg(tr.errEmail||"Bitte E-Mail eingeben."); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: "https://www.bauabnahme.app/#type=recovery" });
    if (error) { setErrorMsg("Fehler: " + error.message); return; }
    setErrorMsg("");
    alert("Reset-Link wurde an " + email.trim() + " gesendet.");
  };
  const handleStep1 = async () => {
    clear();
    if (!email.trim()) { setErrorMsg(tr.errEmail||"Bitte E-Mail eingeben."); return; }
    if (password.length < 6) { setErrorMsg(tr.errPassword||"Passwort muss mindestens 6 Zeichen."); return; }
    if (password !== passwordConfirm) { setErrorMsg("Passwörter stimmen nicht überein."); return; }
    setLoading(true);
    try {
      const res = await fetch("https://tgtyuxtrrafxalajxenw.supabase.co/functions/v1/check-email", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRndHl1eHRycmFmeGFsYWp4ZW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjMzOTYsImV4cCI6MjA4OTIzOTM5Nn0.ePbGVxCbj_mr_RMLtf4uphnvxdx267QmTfTuMknPhK8" }, body: JSON.stringify({ email: email.trim() }) });
      const d = await res.json();
      if (d.exists) { setLoading(false); setErrorMsg(mapError("user already registered", lang)); return; }
    } catch(e) { console.log("check-email error:", e); }

    setLoading(false);
    setMode("register-step2");
  };

  const handleRegister = async () => {
    clear();
    if (!document.getElementById("agb-check")?.checked) {
  setErrorMsg(lang === "FR" ? "Veuillez accepter les CGV." : lang === "IT" ? "Accettare i termini." : lang === "EN" ? "Please accept the Terms." : "Bitte AGB akzeptieren.");
  return;
}

    if (!companyName.trim()) { setErrorMsg("Firmenname ist erforderlich."); return; }
    if (!firstName.trim() || !lastName.trim()) { setErrorMsg("Vor- und Nachname sind erforderlich."); return; }
if (selectedPlan === "pro") { window.location.href = billing === "yearly" ? "https://buy.stripe.com/3cI3cv18C8QafgNaYB9AA0c" : "https://buy.stripe.com/5kQeVdeZs6I20lTd6J9AA06"; }
if (selectedPlan === "team") { window.location.href = billing === "yearly" ? "https://buy.stripe.com/bJe3cv6sW9Ue1pX7Mp9AA0d" : "https://buy.stripe.com/bJecN5cRk7M60lTd6J9AA07"; }
    setLoading(true);
    const { data: signInCheck } = await supabase.auth.signInWithPassword({ email: email.trim(), password: "check_only_xyz_123" });
    if (signInCheck?.user || (await supabase.auth.signInWithPassword({ email: email.trim(), password })).data?.user) {
      setLoading(false);
      setErrorMsg(mapError("user already registered", lang));
      return;
    }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          company_name: companyName.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          address: address.trim(),
          zip: zip.trim(),
          city: city.trim(),
          phone: phone.trim(),
          company_logo: companyLogo,
          full_address: `${address.trim()}, ${zip.trim()} ${city.trim()}`.trim()
        }
      }
    });
    setLoading(false);

    if (error) { setErrorMsg(mapError(error.message, lang)); return; }

    if (data?.session) {
      onNavigate("/dashboard");
      return;
    }

  const stripeUrl = selectedPlan === "pro" ? (billing === "yearly" ? "https://buy.stripe.com/3cI3cv18C8QafgNaYB9AA0c" : "https://buy.stripe.com/5kQeVdeZs6I20lTd6J9AA06") : selectedPlan === "team" ? (billing === "yearly" ? "https://buy.stripe.com/bJe3cv6sW9Ue1pX7Mp9AA0d" : "https://buy.stripe.com/bJecN5cRk7M60lTd6J9AA07") : null;
if (stripeUrl) { setInfoMsg("__STRIPE__" + stripeUrl); } else { setInfoMsg("Registrierung erfolgreich! Bitte bestätige deine E-Mail-Adresse."); }
setMode("login");
  };



  const translations = {
    de: {
      title: { login: "Willkommen zurück", "register-step1": "Konto erstellen", "register-step2": "Firmendaten erfassen" },
      subtitle: { login: "Melde dich bei BauAbnahme an", "register-step1": "Schritt 1 von 2 — Zugangsdaten", "register-step2": "Schritt 2 von 2 — Deine Firmendaten" },
      email: "E-Mail", password: "Passwort", login: "Einloggen", register: "Jetzt registrieren",
      noAccount: "Noch kein Konto?", next: "Weiter →", back: "← Zurück", create: "Konto erstellen ✓",
      demo: "🎯 Jetzt testen — ohne Anmeldung!", demoSub: "Keine Registrierung nötig · Daten werden nicht gespeichert",
      company: "Firmenname *", firstName: "Vorname *", lastName: "Nachname *", address: "Strasse & Hausnummer",
      zip: "PLZ", city: "Ort", phone: "Telefonnummer", passConfirm: "Passwort bestätigen *", forgotPassword: "Passwort vergessen?", user: "Benutzer", reports: "Rapporte", invoices: "Rechnungen", employee: "Mitarbeiter", unlimited: "Unlimitiert", prioritySupport: "Prioritäts-Support", qr: "QR-Rechnung", errEmail: "Bitte E-Mail eingeben.", errEmailPass: "Bitte E-Mail und Passwort eingeben.", errPassword: "Passwort min. 6 Zeichen.", hasAccount: "Bereits ein Konto?", logoOptional: "Firmenlogo (optional)", remove: "Entfernen", uploadLogo: "Logo hochladen", ourPlans: "Unsere Pläne"
    },
    fr: {
      title: { login: "Bon retour", "register-step1": "Créer un compte", "register-step2": "Données entreprise" },
      subtitle: { login: "Connectez-vous à BauAbnahme", "register-step1": "Étape 1 sur 2 — Accès", "register-step2": "Étape 2 sur 2 — Votre entreprise" },
      email: "E-mail", password: "Mot de passe", login: "Se connecter", register: "S'inscrire",
      noAccount: "Pas encore de compte?", next: "Suivant →", back: "← Retour", create: "Créer le compte ✓",
      demo: "🎯 Essayer — sans inscription!", demoSub: "Aucune inscription requise · Données non sauvegardées",
      company: "Nom entreprise *", firstName: "Prénom *", lastName: "Nom *", address: "Rue & numéro",
      zip: "NPA", city: "Ville", phone: "Téléphone", passConfirm: "Confirmer le mot de passe *", forgotPassword: "Mot de passe oublié?", user: "Utilisateur", reports: "Rapports", invoices: "Factures", employee: "Employe", unlimited: "Illimite", prioritySupport: "Support prioritaire", qr: "Facture QR", errEmail: "Veuillez saisir votre e-mail.", errEmailPass: "Veuillez saisir e-mail et mot de passe.", errPassword: "Mot de passe min. 6 caracteres.", hasAccount: "Deja un compte?", logoOptional: "Logo entreprise (optionnel)", remove: "Supprimer", uploadLogo: "Telecharger logo", ourPlans: "Nos forfaits"
    },
    it: {
      title: { login: "Bentornato", "register-step1": "Crea account", "register-step2": "Dati azienda" },
      subtitle: { login: "Accedi a BauAbnahme", "register-step1": "Passo 1 di 2 — Accesso", "register-step2": "Passo 2 di 2 — La tua azienda" },
      email: "E-mail", password: "Password", login: "Accedi", register: "Registrati",
      noAccount: "Non hai un account?", next: "Avanti →", back: "← Indietro", create: "Crea account ✓",
      demo: "🎯 Prova — senza registrazione!", demoSub: "Nessuna registrazione · Dati non salvati",
      company: "Nome azienda *", firstName: "Nome *", lastName: "Cognome *", address: "Via e numero",
      zip: "CAP", city: "Città", phone: "Telefono", passConfirm: "Conferma password *", forgotPassword: "Password dimenticata?", user: "Utente", reports: "Rapporti", invoices: "Fatture", employee: "Dipendente", unlimited: "Illimitato", prioritySupport: "Supporto prioritario", qr: "Fattura QR", errEmail: "Inserire e-mail.", errEmailPass: "Inserire e-mail e password.", errPassword: "Password min. 6 caratteri.", hasAccount: "Hai gia un account?", logoOptional: "Logo aziendale (opzionale)", remove: "Rimuovi", uploadLogo: "Carica logo", ourPlans: "I nostri piani"
    },
    en: {
      title: { login: "Welcome back", "register-step1": "Create account", "register-step2": "Company details" },
      subtitle: { login: "Sign in to BauAbnahme", "register-step1": "Step 1 of 2 — Credentials", "register-step2": "Step 2 of 2 — Your company" },
      email: "Email", password: "Password", login: "Log in", register: "Register now",
      noAccount: "No account yet?", next: "Next →", back: "← Back", create: "Create account ✓",
      demo: "🎯 Try now — no sign up!", demoSub: "No registration needed · Data not saved",
      company: "Company name *", firstName: "First name *", lastName: "Last name *", address: "Street & number",
      zip: "ZIP", city: "City", phone: "Phone", passConfirm: "Confirm password *", forgotPassword: "Forgot password?", user: "User", reports: "Reports", invoices: "Invoices", employee: "Employee", unlimited: "Unlimited", prioritySupport: "Priority Support", qr: "QR Invoice", errEmail: "Please enter your email.", errEmailPass: "Please enter email and password.", errPassword: "Password min. 6 characters.", hasAccount: "Already have an account?", logoOptional: "Company logo (optional)", remove: "Remove", uploadLogo: "Upload logo", ourPlans: "Our plans"
    }
  };
  const tr = translations[lang] || translations.de;
  const titleMap = tr.title;
  const subtitleMap = tr.subtitle;

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "Inter, system-ui, sans-serif", padding: "24px 16px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", paddingTop: 24 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <button onClick={() => onNavigate("/")} style={{ border: "none", background: "transparent", color: COLORS.text, fontSize: 20, fontWeight: 700, cursor: "pointer" }}>
            Bau<span style={{ color: COLORS.gold }}>Abnahme</span>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Globe size={14} color={COLORS.gold} />
            {["de", "fr", "it", "en"].map((code) => (
              <button key={code} onClick={() => handleLang(code)} style={{ border: "none", background: "transparent", color: code === lang ? COLORS.gold : COLORS.muted, minHeight: 40, cursor: "pointer", fontWeight: code === lang ? 700 : 500, padding: "0 6px" }}>
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Step indicator for register */}
        {mode !== "login" && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {[1, 2].map((step) => (
              <div key={step} style={{ flex: 1, height: 4, borderRadius: 2, background: (mode === "register-step1" && step === 1) || mode === "register-step2" ? COLORS.gold : COLORS.border }} />
            ))}
          </div>
        )}

        <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 16, background: COLORS.card, padding: "24px 22px" }}>
          <h1 style={{ marginTop: 0, marginBottom: 6, fontSize: "clamp(1.5rem, 5vw, 1.9rem)" }}>{titleMap[mode]}</h1>
          <p style={{ marginTop: 0, marginBottom: 20, color: COLORS.muted, fontSize: 14 }}>{subtitleMap[mode]}</p>

          {/* ── LOGIN ── */}
          {mode === "login" && (
            <>
              <div style={{ marginBottom: 14 }}>
                <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 6 }}>{tr.email}</div>
                {inputRow(<Mail size={16} color={COLORS.gold} />,
                  <input type="email" placeholder="firma@email.com" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} style={fieldStyle} />
                )}
              </div>
              <div style={{ marginBottom: 18 }}>
                <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 6 }}>{tr.password}</div>
                {inputRow(<Lock size={16} color={COLORS.gold} />,
                  <><input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} style={fieldStyle} /><button type="button" onClick={() => setShowPassword(p=>!p)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:16,color:"#888"}}>{showPassword ? <EyeOff size={16} color="#888"/> : <Eye size={16} color="#888"/>}</button></>
                )}
              </div>

              {errorMsg && <p style={{ color: COLORS.error, fontSize: 14, marginBottom: 12, marginTop: 0 }}>{errorMsg}</p>}
              {infoMsg && !infoMsg.startsWith("__STRIPE__") && <p style={{ color: COLORS.success, fontSize: 14, marginBottom: 12, marginTop: 0 }}>{infoMsg}</p>}
              {infoMsg && infoMsg.startsWith("__STRIPE__") && <div style={{ marginBottom: 12 }}><p style={{ color: COLORS.success, fontSize: 14, marginTop: 0 }}>Registrierung erfolgreich! Bitte E-Mail bestätigen und dann bezahlen:</p><a href={infoMsg.replace("__STRIPE__","")} style={{ display: "block", width: "100%", minHeight: 44, borderRadius: 10, background: COLORS.gold, color: "#111", fontWeight: 700, fontSize: 15, textAlign: "center", lineHeight: "44px", textDecoration: "none" }}>Jetzt bezahlen</a></div>}

              <button onClick={handleLogin} disabled={loading} style={{ width: "100%", minHeight: 48, borderRadius: 10, border: "none", background: COLORS.gold, color: "#111", fontWeight: 700, fontSize: 16, cursor: loading ? "not-allowed" : "pointer", marginBottom: 10, opacity: loading ? 0.7 : 1 }}>
                {loading ? "..." : tr.login}
              </button>
<button onClick={handleForgotPassword} style={{ width: "100%", minHeight: 36, borderRadius: 10, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.muted, cursor: "pointer", fontSize: 13, marginBottom: 10 }}>
  {tr.forgotPassword}
</button>



              <div style={{ textAlign: "center", color: COLORS.muted, fontSize: 14 }}>
                {tr.noAccount}{" "}
                <button onClick={() => { clear(); setMode("register-step1"); }} style={{ border: "none", background: "transparent", color: COLORS.gold, cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
                  {tr.register}
                </button>
              </div>
              <div style={{ borderTop: "1px solid rgba(212,168,83,0.2)", marginTop: 16, paddingTop: 16, textAlign: "center" }}><VideoPlayer lang={lang} />
                <button onClick={() => onNavigate("/demo")} style={{ width: "100%", minHeight: 46, borderRadius: 10, border: "2px solid #d4a853", background: "rgba(212,168,83,0.1)", color: "#d4a853", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                  {tr.demo}
                </button>
                <div style={{ color: "#b9b0a3", fontSize: 12, marginTop: 6 }}>{tr.demoSub}</div>
              </div>
            </>
          )}

          {/* ── REGISTER STEP 1 ── */}
          {mode === "register-step1" && (
            <>
<div style={{ marginBottom: 16 }}>
                <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 8 }}>{tr.ourPlans||"Plan wählen"}</div>
                <div style={{ display: "flex", justifyContent: "center", gap: 0, marginBottom: 8, border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: "hidden" }}>
  <button type="button" onClick={() => setBilling("monthly")} style={{ flex: 1, padding: "8px", border: "none", background: billing === "monthly" ? COLORS.gold : "transparent", color: billing === "monthly" ? "#111" : COLORS.muted, cursor: "pointer", fontWeight: billing === "monthly" ? 700 : 400, fontSize: 13 }}>Monatlich</button>
  <button type="button" onClick={() => setBilling("yearly")} style={{ flex: 1, padding: "8px", border: "none", background: billing === "yearly" ? COLORS.gold : "transparent", color: billing === "yearly" ? "#111" : COLORS.muted, cursor: "pointer", fontWeight: billing === "yearly" ? 700 : 400, fontSize: 13 }}>Jährlich 🎉 2 Mt gratis</button>
</div>
<div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>

                  {["starter","pro","team"].map(p => (
                    <div key={p} onClick={() => setSelectedPlan(p)}
                      style={{ border: "2px solid " + (selectedPlan === p ? COLORS.gold : COLORS.border), borderRadius: 8, padding: 10, background: selectedPlan === p ? "rgba(212,168,83,0.1)" : "transparent", color: selectedPlan === p ? COLORS.gold : COLORS.muted, cursor: "pointer", fontSize: 12, fontWeight: selectedPlan === p ? 700 : 400, textAlign: "center" }}>
                     {p === "starter" ? "Starter / CHF 0" : p === "pro" ? (billing === "yearly" ? "Pro / CHF 490/Jahr" : "Pro / CHF 49/Mt") : (billing === "yearly" ? "Team / CHF 990/Jahr" : "Team / CHF 99/Mt")}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 6 }}>{tr.email} *</div>
                {inputRow(<Mail size={16} color={COLORS.gold} />,
                  <input type="email" placeholder="firma@email.com" value={email} onChange={(e) => setEmail(e.target.value)} style={fieldStyle} />
                )}
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 6 }}>{tr.password} * (min. 6)</div>
                {inputRow(<Lock size={16} color={COLORS.gold} />,
                  <><input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} style={fieldStyle} /><button type="button" onClick={() => setShowPassword(p=>!p)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:16,color:"#888"}}>{showPassword ? <EyeOff size={16} color="#888"/> : <Eye size={16} color="#888"/>}</button></>
                )}
              </div>
              <div style={{ marginBottom: 18 }}>
                <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 6 }}>{tr.passConfirm}</div>
                {inputRow(<Lock size={16} color={COLORS.gold} />,
                  <><input type={showPassword ? "text" : "password"} placeholder="••••••••" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} style={fieldStyle} /><button type="button" onClick={() => setShowPassword(p=>!p)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:16,color:"#888"}}>{showPassword ? <EyeOff size={16} color="#888"/> : <Eye size={16} color="#888"/>}</button></>
                )}
              </div>

              {errorMsg && <p style={{ color: COLORS.error, fontSize: 14, marginBottom: 12, marginTop: 0 }}>{errorMsg}</p>}

              <button onClick={handleStep1} style={{ width: "100%", minHeight: 48, borderRadius: 10, border: "none", background: COLORS.gold, color: "#111", fontWeight: 700, fontSize: 16, cursor: "pointer", marginBottom: 12 }}>
                {tr.next}
              </button>
              <button onClick={() => { clear(); setMode("login"); }} style={{ width: "100%", minHeight: 36, borderRadius: 10, border: "1px solid " + COLORS.border, background: "transparent", color: COLORS.muted, cursor: "pointer", fontSize: 13 }}>
                {tr.back}
              </button>
              <div style={{ textAlign: "center", color: COLORS.muted, fontSize: 14 }}>
                {tr.hasAccount||"Bereits ein Konto?"}{" "}
                <button onClick={() => { clear(); setMode("login"); }} style={{ border: "none", background: "transparent", color: COLORS.gold, cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
                  {tr.login}
                </button>
              </div>
            </>
          )}

          {/* ── REGISTER STEP 2 ── */}
          {mode === "register-step2" && (
            <>
              <div style={{ marginBottom: 14 }}>
                <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 6 }}>{tr.company}</div>
                {/* Logo Upload */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 8 }}>{"🏢 " + (tr.logoOptional||"Firmenlogo (optional)")}</div>
                {companyLogo ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <img src={companyLogo} alt="Logo" style={{ height: 60, maxWidth: 200, objectFit: "contain", borderRadius: 8, border: `1px solid ${COLORS.border}`, padding: 4, background: "#fff" }} />
                    <button type="button" onClick={() => setCompanyLogo("")} style={{ border: "none", background: "transparent", color: COLORS.danger, cursor: "pointer", fontSize: 13 }}>{"✕ " + (tr.remove||"Entfernen")}</button>
                  </div>
                ) : (
                  <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", border: `1px dashed ${COLORS.border}`, borderRadius: 10, cursor: "pointer", color: COLORS.muted, fontSize: 13 }}>
                    <span style={{ fontSize: 20 }}>📁</span>
                    <span>{tr.uploadLogo||"Logo hochladen"}</span>
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const r = new FileReader();
                      r.onload = (ev) => setCompanyLogo(ev.target.result);
                      r.readAsDataURL(f);
                    }} />
                  </label>
                )}
              </div>
        {inputRow(<Building2 size={16} color={COLORS.gold} />,
                  <input type="text" placeholder="Muster GmbH" value={companyName} onChange={(e) => setCompanyName(e.target.value)} style={fieldStyle} />
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div>
                  <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 6 }}>{tr.firstName}</div>
                  {inputRow(<User size={14} color={COLORS.gold} />,
                    <input type="text" placeholder="Max" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={fieldStyle} />
                  )}
                </div>
                <div>
                  <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 6 }}>{tr.lastName}</div>
                  {inputRow(<User size={14} color={COLORS.gold} />,
                    <input type="text" placeholder="Muster" value={lastName} onChange={(e) => setLastName(e.target.value)} style={fieldStyle} />
                  )}
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 6 }}>{tr.address}</div>
                {inputRow(<MapPin size={16} color={COLORS.gold} />,
                  <input type="text" placeholder="Musterstrasse 1" value={address} onChange={(e) => setAddress(e.target.value)} style={fieldStyle} />
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginBottom: 14 }}>
                <div>
                  <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 6 }}>{tr.zip}</div>
                  {inputRow(null,
                    <input type="text" placeholder="6000" value={zip} onChange={(e) => setZip(e.target.value)} style={fieldStyle} />
                  )}
                </div>
                <div>
                  <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 6 }}>Ort</div>
                  {inputRow(null,
                    <input type="text" placeholder="Luzern" value={city} onChange={(e) => setCity(e.target.value)} style={fieldStyle} />
                  )}
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 6 }}>{tr.phone}</div>
                {inputRow(<Phone size={16} color={COLORS.gold} />,
                  <input type="tel" placeholder="+41 79 123 45 67" value={phone} onChange={(e) => setPhone(e.target.value)} style={fieldStyle} />
                )}
              </div>

              {errorMsg && <p style={{ color: COLORS.error, fontSize: 14, marginBottom: 12, marginTop: 0 }}>{errorMsg}</p>}

              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12, padding: "10px 12px", background: "rgba(212,168,83,0.08)", borderRadius: 8, border: "1px solid rgba(212,168,83,0.2)" }}>
  <input type="checkbox" id="agb-check" style={{ marginTop: 3, accentColor: "#d4a853", width: 16, height: 16, flexShrink: 0 }} />
  <label htmlFor="agb-check" style={{ fontSize: 12, color: "#888", lineHeight: 1.5, cursor: "pointer" }}>
    {lang === "FR" ? "J'accepte les" : lang === "IT" ? "Accetto i" : lang === "EN" ? "I accept the" : "Ich akzeptiere die"} <a href="https://www.bauabnahme.app/AGB_BauAbnahme.pdf" target="_blank" style={{ color: "#d4a853" }}>{lang === "FR" ? "CGV" : lang === "IT" ? "Termini" : lang === "EN" ? "Terms & Conditions" : "AGB"}</a> {lang === "FR" ? "et la" : lang === "IT" ? "e la" : lang === "EN" ? "and" : "und die"} <a href="https://www.bauabnahme.app/Datenschutz_BauAbnahme.pdf" target="_blank" style={{ color: "#d4a853" }}>{lang === "FR" ? "Politique de confidentialité" : lang === "IT" ? "Privacy Policy" : lang === "EN" ? "Privacy Policy" : "Datenschutzerklärung"}</a>
  </label>
</div>
              <button onClick={handleRegister} disabled={loading} style={{ width: "100%", minHeight: 48, borderRadius: 10, border: "none", background: COLORS.gold, color: "#111", fontWeight: 700, fontSize: 16, cursor: loading ? "not-allowed" : "pointer", marginBottom: 12, opacity: loading ? 0.7 : 1 }}>
                {loading ? "..." : tr.create}
              </button>

              <button onClick={() => { clear(); setMode("register-step1"); }} style={{ width: "100%", minHeight: 44, borderRadius: 10, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.muted, cursor: "pointer", fontSize: 14 }}>
                {tr.back}
              </button>
            </>
          )}
        </div>

        <p style={{ textAlign: "center", color: COLORS.muted, fontSize: 12, marginTop: 16 }}>
          🇨🇭 Swiss Made · Sicher & DSGVO-konform
        </p>
    </div>

      <div style={{ maxWidth: 860, margin: "32px auto 0", padding: "0 16px 40px" }}>
        <div style={{ textAlign: "center", color: COLORS.muted, fontSize: 13, marginBottom: 20 }}><div style={{ display: "flex", justifyContent: "center", gap: 0, marginBottom: 16, border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: "hidden", maxWidth: 300, margin: "0 auto 16px" }}>
  <button type="button" onClick={() => setBilling("monthly")} style={{ flex: 1, padding: "8px", border: "none", background: billing === "monthly" ? COLORS.gold : "transparent", color: billing === "monthly" ? "#111" : COLORS.muted, cursor: "pointer", fontWeight: billing === "monthly" ? 700 : 400, fontSize: 13 }}>Monatlich</button>
  <button type="button" onClick={() => setBilling("yearly")} style={{ flex: 1, padding: "8px", border: "none", background: billing === "yearly" ? COLORS.gold : "transparent", color: billing === "yearly" ? "#111" : COLORS.muted, cursor: "pointer", fontWeight: billing === "yearly" ? 700 : 400, fontSize: 13 }}>Jährlich 🎉</button>
</div>
 {tr.ourPlans||"Unsere Pläne"}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {[
            { name: "Starter", price: "CHF 0", color: COLORS.muted, features: ["1 " + (tr.user||"Benutzer"), "15 " + (tr.reports||"Rapporte"), "15 " + (tr.invoices||"Rechnungen"), "15 " + (tr.offerten||"Offerten"), tr.qr||"QR-Rechnung"] },
            { name: "Pro", price: billing === "yearly" ? "CHF 490/Jahr" : "CHF 49/Mt", color: COLORS.gold, features: ["1 Admin + 5 " + (tr.employee||"Mitarbeiter"), (tr.unlimited||"Unlimitiert") + " " + (tr.reports||"Rapporte"), (tr.unlimited||"Unlimitiert") + " " + (tr.invoices||"Rechnungen"), (tr.unlimited||"Unlimitiert") + " " + (tr.offerten||"Offerten"), tr.qr||"QR-Rechnung"] },
            { name: "Team", price: billing === "yearly" ? "CHF 990/Jahr" : "CHF 99/Mt", color: COLORS.gold, features: [(tr.unlimited||"Unlimitiert") + " " + (tr.employee||"Mitarbeiter"), (tr.unlimited||"Unlimitiert") + " " + (tr.reports||"Rapporte") + " & " + (tr.invoices||"Rechnungen") + " & " + (tr.offerten||"Offerten"), tr.qr||"QR-Rechnung", (tr.prioritySupport||"Prioritäts-Support")] }
          ].map(plan => (
            <div key={plan.name} style={{ border: `1px solid ${plan.name === "Pro" ? COLORS.gold : COLORS.border}`, borderRadius: 12, padding: 20, background: plan.name === "Pro" ? "rgba(212,168,83,0.05)" : "#111" }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: plan.color, marginBottom: 4 }}>{plan.name}</div>
              <div style={{ fontSize: 15, color: COLORS.text, marginBottom: 12 }}>{plan.price}</div>
              {plan.features.map((f, i) => (
                <div key={i} style={{ color: COLORS.muted, fontSize: 13, marginBottom: 4 }}>✓ {f}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
