import { useEffect, useState } from "react";
import { supabase } from "./supabase.js";
import Dashboard from "./pages/Dashboard.jsx";
import Login from "./pages/Login.jsx";

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [route, setRoute] = useState(window.location.pathname);

  const navigate = (path) => {
    window.history.pushState({}, "", path);
    setRoute(path);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_e, nextSession) => setSession(nextSession));
    return () => authListener.subscription.unsubscribe();
  }, []);

  if (!authReady) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0a0a0a",
          color: "#f0ece4",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        Lade Sitzung...
      </div>
    );
  }

  const dashboardProps = {
    onNavigate: navigate,
    onLogout: async () => {
      await supabase.auth.signOut();
      navigate("/");
    },
    session
  };

  if (route === "/login") {
    return session ? <Dashboard {...dashboardProps} /> : <Login onNavigate={navigate} />;
  }
  if (route === "/dashboard") {
    return session ? <Dashboard {...dashboardProps} /> : <Login onNavigate={navigate} />;
  }
  if (route === "/demo") {
    return (
      <Dashboard
        onNavigate={navigate}
        onLogout={() => navigate("/")}
        session={{ user: { id: "demo-user", email: "demo@bauabnahme.ch" } }}
        isDemo
      />
    );
  }

  return session ? <Dashboard {...dashboardProps} /> : <Login onNavigate={navigate} />;
}
