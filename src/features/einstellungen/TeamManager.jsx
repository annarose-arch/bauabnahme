import { useState, useEffect } from "react";
import { supabase } from "../../supabase.js";
import { GOLD, BORDER, MUTED, iStyle, pBtn, gBtn } from "../../lib/constants.js";
import { useTranslation } from "../../lib/translations.js";

export function TeamManager({ session, showNotice, currentPlan = null, language = "DE", isDemo = false }) {
  const [email, setEmail] = useState("");
  const [members, setMembers] = useState([]);
  const [role, setRole] = useState("member");
  const userId = session?.user?.id;
  const plan = (currentPlan || localStorage.getItem("bauabnahme_plan") || "starter").toLowerCase();
  const tr = useTranslation(language);
  useEffect(() => { const demoTeam = localStorage.getItem("demo_team"); if(isDemo && demoTeam){ setMembers(JSON.parse(demoTeam)); return; } if (!userId) return; supabase.from("team_invitations").select("*").eq("admin_id", userId).then(({ data }) => setMembers(data || [])); }, [userId]);
  const inviteMember = async () => { if(members.some(m => m.member_email === email.trim())){showNotice("Diese Email wurde bereits eingeladen."); return;}
    if (!email.trim()) return;
    if (plan === "starter") { showNotice("Team nur ab Pro Plan."); return; }
    if (plan === "pro" && members.length >= 5) { showNotice("Max 5 " + (tr.common?.member || "Mitarbeiter") + " erreicht."); return; }
    const token = crypto.randomUUID();
    const { error } = await supabase.from("team_invitations").insert({ admin_id: userId, member_email: email.trim(), token, role: plan === "team" ? role : "member", status: "pending" });
    if (error) { showNotice("Fehler: " + error.message); return; }
    showNotice("Einladung gesendet an " + email.trim()); const adminEmail = session?.user?.email || ""; fetch("https://tgtyuxtrrafxalajxenw.supabase.co/functions/v1/invite-member", { method: "POST", headers: { "Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRndHl1eHRycmFmeGFsYWp4ZW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjMzOTYsImV4cCI6MjA4OTIzOTM5Nn0.ePbGVxCbj_mr_RMLtf4uphnvxdx267QmTfTuMknPhK8", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRndHl1eHRycmFmeGFsYWp4ZW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjMzOTYsImV4cCI6MjA4OTIzOTM5Nn0.ePbGVxCbj_mr_RMLtf4uphnvxdx267QmTfTuMknPhK8" }, body: JSON.stringify({ member_email: email.trim(), token: token, admin_email: adminEmail }) });
    setEmail("");
    supabase.from("team_invitations").select("*").eq("admin_id", userId).then(({ data }) => setMembers(data || []));
  };
  const removeMember = async (member) => { if (!window.confirm(tr.common?.remove || "Entfernen?")) return; await supabase.from("team_invitations").delete().eq("member_email", member.member_email).eq("admin_id", userId); setMembers(p => p.filter(m => m.member_email !== member.member_email)); showNotice(tr.common?.remove || "Entfernt."); };
  if (plan === "starter") return <div style={{ color: MUTED, fontSize: 13 }}>Team ab <a href="https://buy.stripe.com/bJefZhbNg0jEb0xc2F9AA08" target="_blank" rel="noopener noreferrer" style={{ color: GOLD }}>Pro Plan</a>.</div>;
  return <div><div style={{ color: MUTED, fontSize: 13, marginBottom: 10 }}>{plan === "pro" ? (tr.common?.member || "Mitarbeiter") + ": " + members.length + "/5" : (tr.common?.member || "Mitarbeiter") + ": " + members.length}</div><div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}><input placeholder="E-Mail" value={email} onChange={e => setEmail(e.target.value)} style={{ ...iStyle, flex: 1 }} />{plan === "team" && <select value={role} onChange={e => setRole(e.target.value)} style={{ ...iStyle, width: 130 }}><option value="member">{tr.common?.member || "Mitarbeiter"}</option><option value="admin">Admin</option></select>}<button type="button" onClick={inviteMember} style={pBtn}>{tr.common?.invite || "Einladen"}</button></div>{members.map((m, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid " + BORDER }}><div style={{ color: MUTED, fontSize: 13 }}>{m.member_email} <span style={{ fontSize: 11, color: GOLD }}>{m.role === "admin" ? "Admin" : (tr.common?.member || "Mitarbeiter")} · {m.status}</span></div><button type="button" onClick={() => removeMember(m)} style={{ ...gBtn, fontSize: 12, color: "#e05c5c", borderColor: "#e05c5c" }}>{tr.common?.remove || "Entfernen"}</button></div>)}</div>;
}
