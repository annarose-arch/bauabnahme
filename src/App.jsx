import { useEffect, useState } from "react";
import { supabase } from "./supabase.js";
import Dashboard from "./pages/Dashboard.jsx";
import Login from "./pages/Login.jsx";

function normalizePath(path) {
  const p = path || "/";
  if (p === "/login" || p === "/dashboard") return p;
  return "/login";
}

export default function App() {
  const [lang, setLang] = useState("de");
  const [route, setRoute] = useState(() => normalizePath(window.location.pathname));
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const navigate = (path) => {
    const next = normalizePath(path);
    if (next !== window.location.pathname) {
      window.history.pushState({}, "", next);
    }
    setRoute(next);
  };

  useEffect(() => {
    const onPopState = () => setRoute(normalizePath(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;
      setSession(error ? null : (data.session ?? null));
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
    navigate("/login");
  };

  if (!authReady) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0a0a0a",
          color: "#f4efe6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter, system-ui, sans-serif"
        }}
      >
        Lade Sitzung...
      </div>
    );
  }

  if (route === "/dashboard") {
    if (!session) {
      return <Login lang={lang} setLang={setLang} onNavigate={navigate} />;
    }
    return <Dashboard session={session} onNavigate={navigate} onLogout={handleLogout} />;
  }

  if (session) {
    return <Dashboard session={session} onNavigate={navigate} onLogout={handleLogout} />;
  }

  return <Login lang={lang} setLang={setLang} onNavigate={navigate} />;
}
