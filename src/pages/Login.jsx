import { useState } from "react";
import { Mail, Lock, Phone, Globe, Chrome } from "lucide-react";
import { supabase } from "../supabase";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const colors = {
    bg: "#0a0a0a",
    card: "#151515",
    text: "#f4efe6",
    muted: "#b9b0a3",
    gold: "#d4a853",
    border: "rgba(212,168,83,0.25)"
  };

  const mapErrorToGerman = (message) => {
    const text = (message || "").toLowerCase();
    if (text.includes("invalid login credentials")) return "Ungultige Anmeldedaten. Bitte pruefe E-Mail und Passwort.";
    if (text.includes("email not confirmed")) return "Bitte bestaetige zuerst deine E-Mail-Adresse.";
    if (text.includes("user already registered")) return "Dieses Konto existiert bereits.";
    if (text.includes("password")) return "Das Passwort erfuellt die Anforderungen nicht.";
    if (text.includes("network")) return "Netzwerkfehler. Bitte versuche es erneut.";
    return "Anmeldung fehlgeschlagen. Bitte versuche es erneut.";
  };

  const clearMessages = () => {
    setErrorMsg("");
    setInfoMsg("");
  };

  const handleLogin = async () => {
    clearMessages();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    setLoading(false);

    if (error) {
      setErrorMsg(mapErrorToGerman(error.message));
      return;
    }

    onNavigate("/dashboard");
  };

  const handleRegister = async () => {
    clearMessages();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password
    });
    setLoading(false);

    if (error) {
      setErrorMsg(mapErrorToGerman(error.message));
      return;
    }

    if (data?.session) {
      onNavigate("/dashboard");
      return;
    }

    setInfoMsg("Registrierung erfolgreich. Bitte bestaetige deine E-Mail.");
  };

  const handleGoogleLogin = async () => {
    clearMessages();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` }
    });

    if (error) {
      setErrorMsg(mapErrorToGerman(error.message));
    }
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
              <input
                type="email"
                placeholder="name@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                style={{ width: "100%", border: "none", outline: "none", background: "transparent", color: colors.text, fontSize: 16 }}
              />
            </div>
          </label>

          <label style={{ display: "block", marginBottom: 14 }}>
            <span style={{ display: "block", marginBottom: 8, color: colors.muted }}>{t.password}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${colors.border}`, borderRadius: 10, padding: "0 12px", minHeight: 48 }}>
              <Lock size={16} color={colors.gold} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                style={{ width: "100%", border: "none", outline: "none", background: "transparent", color: colors.text, fontSize: 16 }}
              />
            </div>
          </label>

          {errorMsg && (
            <p style={{ marginTop: 0, marginBottom: 12, color: "#ff9c9c", fontSize: 14 }}>
              {errorMsg}
            </p>
          )}

          {infoMsg && (
            <p style={{ marginTop: 0, marginBottom: 12, color: "#9fdc9f", fontSize: 14 }}>
              {infoMsg}
            </p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{ width: "100%", minHeight: 48, borderRadius: 10, border: "none", background: colors.gold, color: "#111", fontWeight: 700, fontSize: 16, cursor: loading ? "not-allowed" : "pointer", marginBottom: 10, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Bitte warten..." : t.login}
          </button>

          <button onClick={handleGoogleLogin} style={{ width: "100%", minHeight: 48, borderRadius: 10, border: `1px solid ${colors.border}`, background: "transparent", color: colors.text, fontWeight: 600, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10 }}>
            <Chrome size={16} color={colors.gold} />
            {t.google}
          </button>

          <button style={{ width: "100%", minHeight: 48, borderRadius: 10, border: `1px solid ${colors.border}`, background: "transparent", color: colors.text, fontWeight: 600, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Phone size={16} color={colors.gold} />
            {t.phone}
          </button>

          <p style={{ textAlign: "center", marginTop: 16, marginBottom: 0, color: colors.muted }}>
            {t.noAccount}{" "}
            <button onClick={handleRegister} style={{ border: "none", background: "transparent", color: colors.gold, cursor: "pointer", fontWeight: 700 }}>
              {t.register}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
