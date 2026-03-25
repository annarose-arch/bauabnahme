import { useEffect, useState } from "react";
import { supabase } from "./supabase.js";
import Dashboard from "./pages/Dashboard.jsx";
import Login from "./pages/Login.jsx";

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [route, setRoute] = useState(window.location.pathname);
  const navigate = (path) => { window.history.pushState({}, "", path); setRoute(path); };
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); });
    const { data: l } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => l.subscription.unsubscribe();
  }, []);
  if (!authReady) return <div style={{minHeight:"100vh",background:"#0a0a0a",color:"#f0ece4",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Inter,sans-serif"}}>Lade...</div>;
  const logout = aauth.signOut(); navigate("/"); };
  if (route === "/demo") return <Dashboard onNavigate={navigate} onLogout={() => navigate("/")} session={{user:{id:"demo-user",email:"demo@bauabnahme.ch"}}} isDemo={true}/>;
  if (!session) return <Login onNavigate={navigate}/>;
   <Dashboard onNavigate={navigate} onLogout={logout} session={session}/>;
}
