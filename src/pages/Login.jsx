import { Mail, Lock, Phone, Globe, Chrome } from "lucide-react";

const labels = {
  de: {
    title: "Willkommen zuruck",
    subtitle: "Melde dich bei BauAbnahme an",
    email: "E-Mail",
    password: "Passwort",
    login: "Einloggen",
    google: "Mit Google anmelden",
    phone: "Mit Telefonnummer fortfahren",
    register: "Registrieren",
    noAccount: "Noch kein Konto?"
  },
  fr: {
    title: "Bon retour",
    subtitle: "Connectez-vous a BauAbnahme",
    email: "E-mail",
    password: "Mot de passe",
    login: "Se connecter",
    google: "Se connecter avec Google",
    phone: "Continuer avec le numero de telephone",
    register: "S'inscrire",
    noAccount: "Pas encore de compte ?"
  },
  it: {
    title: "Bentornato",
    subtitle: "Accedi a BauAbnahme",
    email: "E-mail",
    password: "Password",
    login: "Accedi",
    google: "Accedi con Google",
    phone: "Continua con numero di telefono",
    register: "Registrati",
    noAccount: "Non hai ancora un account?"
  },
  en: {
    title: "Welcome back",
    subtitle: "Sign in to BauAbnahme",
    email: "Email",
    password: "Password",
    login: "Log in",
    google: "Continue with Google",
    phone: "Continue with phone number",
    register: "Register",
    noAccount: "No account yet?"
  }
};

export default function Login({ lang, setLang, onNavigate }) {
  const t = labels[lang];

  const colors = {
    bg: "#0a0a0a",
    card: "#151515",
    text: "#f4efe6",
    muted: "#b9b0a3",
    gold: "#d4a853",
    border: "rgba(212,168,83,0.25)"
  };

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text, fontFamily: "Inter, system-ui, sans-serif", padding: "24px 16px" }}>
      <div style={{ maxWidth: 460, margin: "0 auto", paddingTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <button
            onClick={() => onNavigate("/")}
            style={{ border: "none", background: "transparent", color: colors.text, fontSize: 20, fontWeight: 700, cursor: "pointer" }}
          >
            Bau<span style={{ color: colors.gold }}>Abnahme</span>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Globe size={14} color={colors.gold} />
            {["de", "fr", "it", "en"].map((code) => (
              <button
                key={code}
                onClick={() => setLang(code)}
                style={{ border: "none", background: "transparent", color: code === lang ? colors.gold : colors.muted, minHeight: 40, cursor: "pointer", fontWeight: code === lang ? 700 : 500 }}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div style={{ border: `1px solid ${colors.border}`, borderRadius: 16, background: colors.card, padding: 22 }}>
          <h1 style={{ marginTop: 0, marginBottom: 8, fontSize: "clamp(1.7rem, 5vw, 2rem)" }}>{t.title}</h1>
          <p style={{ marginTop: 0, marginBottom: 18, color: colors.muted }}>{t.subtitle}</p>

          <label style={{ display: "block", marginBottom: 12 }}>
            <span style={{ display: "block", marginBottom: 8, color: colors.muted }}>{t.email}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${colors.border}`, borderRadius: 10, padding: "0 12px", minHeight: 48 }}>
              <Mail size={16} color={colors.gold} />
              <input type="email" placeholder="name@email.com" style={{ width: "100%", border: "none", outline: "none", background: "transparent", color: colors.text, fontSize: 16 }} />
            </div>
          </label>

          <label style={{ display: "block", marginBottom: 14 }}>
            <span style={{ display: "block", marginBottom: 8, color: colors.muted }}>{t.password}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${colors.border}`, borderRadius: 10, padding: "0 12px", minHeight: 48 }}>
              <Lock size={16} color={colors.gold} />
              <input type="password" placeholder="••••••••" style={{ width: "100%", border: "none", outline: "none", background: "transparent", color: colors.text, fontSize: 16 }} />
            </div>
          </label>

          <button
            onClick={() => onNavigate("/dashboard")}
            style={{ width: "100%", minHeight: 48, borderRadius: 10, border: "none", background: colors.gold, color: "#111", fontWeight: 700, fontSize: 16, cursor: "pointer", marginBottom: 10 }}
          >
            {t.login}
          </button>

          <button style={{ width: "100%", minHeight: 48, borderRadius: 10, border: `1px solid ${colors.border}`, background: "transparent", color: colors.text, fontWeight: 600, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10 }}>
            <Chrome size={16} color={colors.gold} />
            {t.google}
          </button>

          <button style={{ width: "100%", minHeight: 48, borderRadius: 10, border: `1px solid ${colors.border}`, background: "transparent", color: colors.text, fontWeight: 600, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Phone size={16} color={colors.gold} />
            {t.phone}
          </button>

          <p style={{ textAlign: "center", marginTop: 16, marginBottom: 0, color: colors.muted }}>
            {t.noAccount}{" "}
            <button style={{ border: "none", background: "transparent", color: colors.gold, cursor: "pointer", fontWeight: 700 }}>
              {t.register}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
