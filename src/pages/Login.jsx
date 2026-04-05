import { useState } from "react";
import { Mail, Lock, Globe, Building2, User, MapPin, Phone } from "lucide-react";
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

const mapError = (msg) => {
  const t = (msg || "").toLowerCase();
  if (t.includes("invalid login credentials")) return "Ungültige Anmeldedaten. Bitte E-Mail und Passwort prüfen.";
  if (t.includes("email not confirmed")) return "Bitte bestätige zuerst deine E-Mail-Adresse.";
  if (t.includes("user already registered")) return "Dieses Konto existiert bereits. Bitte einloggen.";
  if (t.includes("password")) return "Das Passwort muss mindestens 6 Zeichen lang sein.";
  if (t.includes("network")) return "Netzwerkfehler. Bitte erneut versuchen.";
  return "Fehler: " + (msg || "Unbekannter Fehler");
};

export default function Login({ lang: initialLang, setLang, onNavigate }) {
  const [lang, setLocalLang] = useState(initialLang || localStorage.getItem("bauabnahme_lang") || "de");
  const handleLang = (code) => {
    setLocalLang(code);
    localStorage.setItem("bauabnahme_lang", code);
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
    if (!email.trim() || !password) { setErrorMsg("Bitte E-Mail und Passwort eingeben."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) { setErrorMsg(mapError(error.message)); return; }
    onNavigate("/dashboard");
  };
const handleForgotPassword = async () => {
    if (!email.trim()) { setErrorMsg("Bitte E-Mail eingeben."); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: "https://www.bauabnahme.app" });
    if (error) { setErrorMsg("Fehler: " + error.message); return; }
    setErrorMsg("");
    alert("Reset-Link wurde an " + email.trim() + " gesendet.");
  };
  const handleStep1 = () => {
    clear();
    if (!email.trim()) { setErrorMsg("Bitte E-Mail eingeben."); return; }
    if (password.length < 6) { setErrorMsg("Passwort muss mindestens 6 Zeichen lang sein."); return; }
    if (password !== passwordConfirm) { setErrorMsg("Passwörter stimmen nicht überein."); return; }
    setMode("register-step2");
  };

  const handleRegister = async () => {
    clear();
    if (!companyName.trim()) { setErrorMsg("Firmenname ist erforderlich."); return; }
    if (!firstName.trim() || !lastName.trim()) { setErrorMsg("Vor- und Nachname sind erforderlich."); return; }

    setLoading(true);
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

    if (error) { setErrorMsg(mapError(error.message)); return; }

    if (data?.session) {
      onNavigate("/dashboard");
      return;
    }

    setInfoMsg("Registrierung erfolgreich! Bitte bestätige deine E-Mail-Adresse und melde dich dann an.");
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
      zip: "PLZ", city: "Ort", phone: "Telefonnummer", passConfirm: "Passwort bestätigen *"
    },
    fr: {
      title: { login: "Bon retour", "register-step1": "Créer un compte", "register-step2": "Données entreprise" },
      subtitle: { login: "Connectez-vous à BauAbnahme", "register-step1": "Étape 1 sur 2 — Accès", "register-step2": "Étape 2 sur 2 — Votre entreprise" },
      email: "E-mail", password: "Mot de passe", login: "Se connecter", register: "S'inscrire",
      noAccount: "Pas encore de compte?", next: "Suivant →", back: "← Retour", create: "Créer le compte ✓",
      demo: "🎯 Essayer — sans inscription!", demoSub: "Aucune inscription requise · Données non sauvegardées",
      company: "Nom entreprise *", firstName: "Prénom *", lastName: "Nom *", address: "Rue & numéro",
      zip: "NPA", city: "Ville", phone: "Téléphone", passConfirm: "Confirmer le mot de passe *"
    },
    it: {
      title: { login: "Bentornato", "register-step1": "Crea account", "register-step2": "Dati azienda" },
      subtitle: { login: "Accedi a BauAbnahme", "register-step1": "Passo 1 di 2 — Accesso", "register-step2": "Passo 2 di 2 — La tua azienda" },
      email: "E-mail", password: "Password", login: "Accedi", register: "Registrati",
      noAccount: "Non hai un account?", next: "Avanti →", back: "← Indietro", create: "Crea account ✓",
      demo: "🎯 Prova — senza registrazione!", demoSub: "Nessuna registrazione · Dati non salvati",
      company: "Nome azienda *", firstName: "Nome *", lastName: "Cognome *", address: "Via e numero",
      zip: "CAP", city: "Città", phone: "Telefono", passConfirm: "Conferma password *"
    },
    en: {
      title: { login: "Welcome back", "register-step1": "Create account", "register-step2": "Company details" },
      subtitle: { login: "Sign in to BauAbnahme", "register-step1": "Step 1 of 2 — Credentials", "register-step2": "Step 2 of 2 — Your company" },
      email: "Email", password: "Password", login: "Log in", register: "Register now",
      noAccount: "No account yet?", next: "Next →", back: "← Back", create: "Create account ✓",
      demo: "🎯 Try now — no sign up!", demoSub: "No registration needed · Data not saved",
      company: "Company name *", firstName: "First name *", lastName: "Last name *", address: "Street & number",
      zip: "ZIP", city: "City", phone: "Phone", passConfirm: "Confirm password *"
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
                <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 6 }}>E-Mail</div>
                {inputRow(<Mail size={16} color={COLORS.gold} />,
                  <input type="email" placeholder="firma@email.com" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} style={fieldStyle} />
                )}
              </div>
              <div style={{ marginBottom: 18 }}>
                <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 6 }}>Passwort</div>
                {inputRow(<Lock size={16} color={COLORS.gold} />,
                  <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} style={fieldStyle} />
                )}
              </div>

              {errorMsg && <p style={{ color: COLORS.error, fontSize: 14, marginBottom: 12, marginTop: 0 }}>{errorMsg}</p>}
              {infoMsg && <p style={{ color: COLORS.success, fontSize: 14, marginBottom: 12, marginTop: 0 }}>{infoMsg}</p>}

              <button onClick={handleLogin} disabled={loading} style={{ width: "100%", minHeight: 48, borderRadius: 10, border: "none", background: COLORS.gold, color: "#111", fontWeight: 700, fontSize: 16, cursor: loading ? "not-allowed" : "pointer", marginBottom: 10, opacity: loading ? 0.7 : 1 }}>
                {loading ? "Bitte warten..." : "Einloggen"}
              </button>
<button onClick={handleForgotPassword} style={{ width: "100%", minHeight: 36, borderRadius: 10, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.muted, cursor: "pointer", fontSize: 13, marginBottom: 10 }}>
  Passwort vergessen?
</button>



              <div style={{ textAlign: "center", color: COLORS.muted, fontSize: 14 }}>
                {tr.noAccount}{" "}
                <button onClick={() => { clear(); setMode("register-step1"); }} style={{ border: "none", background: "transparent", color: COLORS.gold, cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
                  Jetzt registrieren
                </button>
              </div>
              <div style={{ borderTop: "1px solid rgba(212,168,83,0.2)", marginTop: 16, paddingTop: 16, textAlign: "center" }}>
                <button onClick={() => onNavigate("/demo")} style={{ width: "100%", minHeight: 46, borderRadius: 10, border: "2px solid #d4a853", background: "rgba(212,168,83,0.1)", color: "#d4a853", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                  🎯 Jetzt testen — ohne Anmeldung
                </button>
                <div style={{ color: "#b9b0a3", fontSize: 12, marginTop: 6 }}>{tr.demoSub}</div>
              </div>
            </>
          )}

          {/* ── REGISTER STEP 1 ── */}
          {mode === "register-step1" && (
            <>
              <div style={{ marginBottom: 14 }}>
                <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 6 }}>E-Mail *</div>
                {inputRow(<Mail size={16} color={COLORS.gold} />,
                  <input type="email" placeholder="firma@email.com" value={email} onChange={(e) => setEmail(e.target.value)} style={fieldStyle} />
                )}
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 6 }}>Passwort * (min. 6 Zeichen)</div>
                {inputRow(<Lock size={16} color={COLORS.gold} />,
                  <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} style={fieldStyle} />
                )}
              </div>
              <div style={{ marginBottom: 18 }}>
                <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 6 }}>Passwort bestätigen *</div>
                {inputRow(<Lock size={16} color={COLORS.gold} />,
                  <input type="password" placeholder="••••••••" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} style={fieldStyle} />
                )}
              </div>

              {errorMsg && <p style={{ color: COLORS.error, fontSize: 14, marginBottom: 12, marginTop: 0 }}>{errorMsg}</p>}

              <button onClick={handleStep1} style={{ width: "100%", minHeight: 48, borderRadius: 10, border: "none", background: COLORS.gold, color: "#111", fontWeight: 700, fontSize: 16, cursor: "pointer", marginBottom: 12 }}>
                Weiter →
              </button>
              <div style={{ textAlign: "center", color: COLORS.muted, fontSize: 14 }}>
                Bereits ein Konto?{" "}
                <button onClick={() => { clear(); setMode("login"); }} style={{ border: "none", background: "transparent", color: COLORS.gold, cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
                  Einloggen
                </button>
              </div>
            </>
          )}

          {/* ── REGISTER STEP 2 ── */}
          {mode === "register-step2" && (
            <>
              <div style={{ marginBottom: 14 }}>
                <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 6 }}>Firmenname *</div>
                {/* Logo Upload */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 8 }}>🏢 Firmenlogo (optional)</div>
                {companyLogo ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <img src={companyLogo} alt="Logo" style={{ height: 60, maxWidth: 200, objectFit: "contain", borderRadius: 8, border: `1px solid ${COLORS.border}`, padding: 4, background: "#fff" }} />
                    <button type="button" onClick={() => setCompanyLogo("")} style={{ border: "none", background: "transparent", color: COLORS.danger, cursor: "pointer", fontSize: 13 }}>✕ Entfernen</button>
                  </div>
                ) : (
                  <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", border: `1px dashed ${COLORS.border}`, borderRadius: 10, cursor: "pointer", color: COLORS.muted, fontSize: 13 }}>
                    <span style={{ fontSize: 20 }}>📁</span>
                    <span>Logo hochladen (PNG, JPG)</span>
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
                  <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 6 }}>Vorname *</div>
                  {inputRow(<User size={14} color={COLORS.gold} />,
                    <input type="text" placeholder="Max" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={fieldStyle} />
                  )}
                </div>
                <div>
                  <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 6 }}>Nachname *</div>
                  {inputRow(<User size={14} color={COLORS.gold} />,
                    <input type="text" placeholder="Muster" value={lastName} onChange={(e) => setLastName(e.target.value)} style={fieldStyle} />
                  )}
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 6 }}>Strasse & Hausnummer</div>
                {inputRow(<MapPin size={16} color={COLORS.gold} />,
                  <input type="text" placeholder="Musterstrasse 1" value={address} onChange={(e) => setAddress(e.target.value)} style={fieldStyle} />
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginBottom: 14 }}>
                <div>
                  <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 6 }}>PLZ</div>
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
                <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 6 }}>Telefonnummer</div>
                {inputRow(<Phone size={16} color={COLORS.gold} />,
                  <input type="tel" placeholder="+41 79 123 45 67" value={phone} onChange={(e) => setPhone(e.target.value)} style={fieldStyle} />
                )}
              </div>

              {errorMsg && <p style={{ color: COLORS.error, fontSize: 14, marginBottom: 12, marginTop: 0 }}>{errorMsg}</p>}

              <button onClick={handleRegister} disabled={loading} style={{ width: "100%", minHeight: 48, borderRadius: 10, border: "none", background: COLORS.gold, color: "#111", fontWeight: 700, fontSize: 16, cursor: loading ? "not-allowed" : "pointer", marginBottom: 12, opacity: loading ? 0.7 : 1 }}>
                {loading ? "Registrierung läuft..." : "Konto erstellen ✓"}
              </button>

              <button onClick={() => { clear(); setMode("register-step1"); }} style={{ width: "100%", minHeight: 44, borderRadius: 10, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.muted, cursor: "pointer", fontSize: 14 }}>
                ← Zurück
              </button>
            </>
          )}
        </div>

        <p style={{ textAlign: "center", color: COLORS.muted, fontSize: 12, marginTop: 16 }}>
          🇨🇭 Swiss Made · Sicher & DSGVO-konform
        </p>
    </div>

      <div style={{ maxWidth: 860, margin: "32px auto 0", padding: "0 16px 40px" }}>
        <div style={{ textAlign: "center", color: COLORS.muted, fontSize: 13, marginBottom: 20 }}>Unsere Pläne</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {[
            { name: "Starter", price: "CHF 0", color: COLORS.muted, features: ["1 Benutzer", "15 Rapporte/Monat", "15 Rechnungen/Monat", "QR-Rechnung"] },
            { name: "Pro", price: "CHF 29/Mt", color: COLORS.gold, features: ["1 Admin + 5 Mitarbeiter", "Unlimitierte Rapporte", "Unlimitierte Rechnungen", "QR-Rechnung"] },
            { name: "Team", price: "CHF 79/Mt", color: COLORS.gold, features: ["Unlimitierte Mitarbeiter", "Unlimitierte Rapporte & Rechnungen", "QR-Rechnung", "Prioritäts-Support"] }
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
