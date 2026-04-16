import { useEffect, useState } from "react";
import { supabase } from "./supabase.js";
import Dashboard from "./pages/Dashboard.jsx";
import Login from "./pages/Login.jsx";

function normalizeRoute(path) {
  if (path === "/dashboard") return "/dashboard";
  return "/login";
}

export default function App() {
  const [lang, setLang] = useState("de");
  const [route, setRoute] = useState(() => {
    const p = window.location.pathname || "/";
    const n = normalizeRoute(p);
    if (p !== n) {
      window.history.replaceState({}, "", n);
    }
    return n;
  });
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const navigate = (path) => {
    const next = path === "/" ? "/login" : path;
    const normalized = normalizeRoute(next);
    if (normalized !== route) {
      window.history.pushState({}, "", normalized);
      setRoute(normalized);
    }
  };

  useEffect(() => {
    const onPopState = () => {
      setRoute(normalizeRoute(window.location.pathname || "/"));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

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
      const normalized = normalizeRoute(currentPath);

      if (currentSession && normalized === "/login") {
        window.history.pushState({}, "", "/dashboard");
        setRoute("/dashboard");
      }

      if (!currentSession && normalized === "/dashboard") {
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
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        Lade Sitzung...
      </div>
    );
  }

  if (route === "/login") {
    if (session) {
      return <Dashboard session={session} onNavigate={navigate} onLogout={handleLogout} />;
    }
    return <Login lang={lang} setLang={setLang} onNavigate={navigate} />;
  }

  if (route === "/dashboard") {
    if (!session) {
      return <Login lang={lang} setLang={setLang} onNavigate={navigate} />;
    }
    return <Dashboard session={session} onNavigate={navigate} onLogout={handleLogout} />;
  }

  return <Login lang={lang} setLang={setLang} onNavigate={navigate} />;
}
