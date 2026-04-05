import { useState, useEffect } from "react";
import { supabase } from "../../supabase.js";
import { GOLD, BORDER, MUTED, iStyle, pBtn, gBtn } from "../../lib/constants.js";

export function TeamManager({ session, showNotice }) {
  const [email, setEmail] = useState("");
  const [members, setMembers] = useState([]);
  const userId = session?.user?.id;
  const plan = localStorage.getItem("bauabnahme_plan") || "starter";
  useEffect(() => { if (!userId) return; supabase.from("user_roles").select("user_id, role").eq("team_id", userId).then(({ data }) => setMembers(data || [])); }, [userId]);
  const inviteMember = async () => { if (!email.trim()) return; if (plan === "starter") { showNotice("Team nur ab Pro Plan."); return; } if (plan === "pro" && members.length >= 5) { showNotice("Max 10 Mitarbeiter."); return; } showNotice("Einladung: " + email.trim()); setEmail(""); };
  const removeMember = async (id) => { if (!window.confirm("Entfernen?")) return; await supabase.from("user_roles").delete().eq("user_id", id); setMembers(p => p.filter(m => m.user_id !== id)); showNotice("Entrnt."); };
  if (plan === "starter") return <div style={{ color: MUTED, fontSize: 13 }}>Team ab <a href="https://buy.stripe.com/5kQeVdeZs6I20lTd6J9AA06" target="_blank" rel="noopener noreferrer" style={{ color: GOLD }}>Pro Plan</a>.</div>;
  return <div><div style={{ color: MUTED, fontSize: 13, marginBottom: 10 }}>{plan === "pro" ? "Mitarbeiter: " + members.length + "/5" : "Mitarbeiter: " + members.length}</div><div style={{ display: "flex", gap: 8, marginBottom: 12 }}><input placeholder="E-Mail" value={email} onChange={e => setEmail(e.target.value)} style={{ ...iStyle, flex: 1 }} /><button type="button" onClick={inviteMember} style={pBtn}>Einladen</button></div>{members.map((m, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid " + BORDER }}><div style={{ color: MUTED, fontSize: 13 }}>{m.user_id}</div><button type="button" onClick={() => removeMember(m.user_id)} style={{ ...gBtn, fontSize: 12, color: "#e05c5c", borderColor: "#e05c5c" }}>Entfernen</button></div>)}</div>;
}
