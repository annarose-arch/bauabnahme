import { useState, useEffect } from "react";
import { supabase } from "../supabase.js";

export default function Join({ onNavigate }) {
  const [status, setStatus] = useState("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    if (!t) { setStatus("invalid"); return; }
    setToken(t);
    supabase.from("team_invitations").select("*").eq("token", t).eq("status", "pending").single()
      .then(({ data, error }) => {
        if (error || !data) { setStatus("invalid"); return; }
        setEmail(data.member_email);
        setStatus("ready");
      });
  }, []);

  const handleJoin = async () => {
    setStatus("saving");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) { alert("Fehler: " + error.message); setStatus("ready"); return; }
    await supabase.from("team_invitations").update({ status: "accepted" }).eq("token", token);
    const { data: inv } = await supabase.from("team_invitations").select("admin_id").eq("token", token).single();
    if (inv) { const uid = (await supabase.auth.getUser()).data.user.id; await supabase.from("user_roles").insert({ user_id: uid, team_id: inv.admin_id, role: inv.role || "member" }); }
    setStatus("done");
  };

  if (status === "loading") return <div style={center}>Lade...</div>;
  if (status === "invalid") return <div style={center}>❌ Ungültiger oder abgelaufener Link.</div>;
  if (status === "done") return <div style={center}>✅ Konto erstellt! Du kannst dich jetzt anmelden.<br/><button onClick={() =>onNavigate("/")} style={btn}>Zur Anmeldung</button></div>;

  return (
    <div style={center}>
      <h2 style={{color:"#d4a853",marginBottom:24}}>BauAbnahme beitreten</h2>
      <input value={email} readOnly style={input}/>
      <input type="password" placeholder="Passwort wählen" value={password} onChange={e=>setPassword(e.target.value)} style={input}/>
      <button onClick={handleJoin} style={btn}>Konto erstellen</button>
    </div>
  );
}

const center = {minHeight:"100vh",background:"#0a0a0a",color:"#f0ece4",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"Inter,sans-serif",gap:12};
const input = {background:"#1a1a1a",border:"1px solid #333",color:"#f0ece4",padding:"10px 14px",borderRadius:8,width:300,fontSize:14};
const btn = {background:"#d4a853",border:"none",color:"#111",padding:"12px 24px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:15,marginTop:8};
