import { useState } from "react";
import { GOLD, BORDER, MUTED, TEXT, iStyle, pBtn, gBtn } from "../../lib/constants.js";
import { SectionCard } from "../../components/UI.jsx";
import { supabase } from "../../supabase.js";
export function EinstellungenView({ session, userEmail, showNotice, onLogout, nextRapportNr, setNextRapportNrState, nextInvoiceNr, setNextInvoiceNrState }) {
  const meta = session?.user?.user_metadata || {};
  const currentPlan = localStorage.getItem("bauabnahme_plan") || "starter";
  const [showLegal, setShowLegal] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const saveMeta = async (patch) => { await supabase.auth.updateUser({ data: { ...meta, ...patch } }); };
  const handleDeactivate = async () => {
    if (!window.confirm("Konto deaktivieren? Daten bleiben 30 Tage erhalten.")) return;
    await supabase.auth.updateUser({ data: { ...meta, account_status: "deactivated", deactivated_at: new Date().toISOString() } });
    showNotice("Konto deaktiviert. Reaktivierung innerhalb 30 Tage moeglich.");
    setTimeout(() => { if (onLogout) onLogout(); }, 2000);
  };
  const handleDelete = async () => {
    if (deleteConfirmText !== "LOESCHEN") return;
    try {
      const uid = session?.user?.id;
      if (uid) {
        await supabase.from("reports").delete().eq("user_id", uid);
        await supabase.from("customers").delete().eq("user_id", uid);
      }
      showNotice("Konto geloescht.");
      setTimeout(() => { if (onLogout) onLogout(); }, 2000);
    } catch (e) { showNotice("Fehler. Kontakt: support@bauabnahme.app"); }
    setShowDeleteModal(false);
  };
return (
    <SectionCard>
      <h2 style={{ marginTop: 0 }}>Einstellungen</h2>

      <div style={{ border: "1px solid " + BORDER, borderRadius: 10, padding: 14, marginBottom: 16, background: "rgba(212,168,83,0.05)" }}>
        <div style={{ color: GOLD, fontWeight: 700, marginBottom: 8 }}>Firmenprofil</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
          {meta.company_logo ? <img src={meta.company_logo} alt="Logo" style={{ height: 60, maxWidth: 160, objectFit: "contain", borderRadius: 8, border: "1px solid " + BORDER, padding: 4, background: "#fff" }} /> : <div style={{ width: 80, height: 60, border: "1px dashed " + BORDER, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontSize: 11 }}>Kein Logo</div>}
          <div>
            <div><strong>{meta.company_name || "-"}</strong></div>
            <div style={{ color: MUTED }}>{[meta.first_name, meta.last_name].filter(Boolean).join(" ")}</div>
            {meta.address && <div style={{ color: MUTED, fontSize: 13 }}>{meta.address}, {meta.zip} {meta.city}</div>}
            {meta.phone && <div style={{ color: MUTED, fontSize: 13 }}>Tel: {meta.phone}</div>}
            <div style={{ color: MUTED, fontSize: 13 }}>{userEmail}</div>
          </div>
        </div>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", border: "1px solid " + BORDER, borderRadius: 8, cursor: "pointer", color: MUTED, fontSize: 13 }}>
          Logo hochladen
          <input type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = async (ev) => { await saveMeta({ company_logo: ev.target.result }); showNotice("Logo gespeichert!"); }; r.readAsDataURL(f); }} />
        </label>
        <div style={{ marginTop: 12 }}>
          <div style={{ color: MUTED, fontSize: 12, marginBottom: 6 }}>IBAN:</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input placeholder="CH56 0483 5012 3456 7800 9" defaultValue={meta.iban || ""} id="iban-input" style={{ ...iStyle, flex: 1, fontFamily: "monospace", fontSize: 13 }} />
            <button type="button" style={pBtn} onClick={async () => { const v = document.getElementById("iban-input").value.trim(); await saveMeta({ iban: v }); showNotice("IBAN gespeichert!"); }}>Speichern</button>
          </div>
          {meta.iban && <div style={{ color: GOLD, fontSize: 12, marginTop: 4 }}>{meta.iban}</div>}
        </div>
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <div style={{ color: MUTED, fontSize: 12, marginBottom: 6 }}>Naechste Rapport-Nr:</div>
            <div style={{ display: "flex", gap: 6 }}>
              <input type="number" defaultValue={nextRapportNr} id="next-rapport-nr" style={{ ...iStyle, flex: 1, fontFamily: "monospace", fontSize: 13 }} />
              <button type="button" style={{ ...pBtn, padding: "0 10px", fontSize: 12 }} onClick={() => { const v = parseInt(document.getElementById("next-rapport-nr").value) || 1001; setNextRapportNrState(v); localStorage.setItem("bauabnahme_next_rapport_nr", String(v)); showNotice("Rapport-Nr gespeichert!"); }}>OK</button>
            </div>
          </div>
          <div>
            <div style={{ color: MUTED, fontSize: 12, marginBottom: 6 }}>Naechste Rechnungs-Nr:</div>
            <div style={{ display: "flex", gap: 6 }}>
              <input type="number" defaultValue={nextInvoiceNr} id="next-invoice-nr" style={{ ...iStyle, flex: 1, fontFamily: "monospace", fontSize: 13 }} />
              <button type="button" style={{ ...pBtn, padding: "0 10px", fontSize: 12 }} onClick={() => { const v = parseInt(document.getElementById("next-invoice-nr").value) || 1001; setNextInvoiceNrState(v); localStorage.setItem("bauabnahme_next_invoice_nr", String(v)); showNotice("Rechnungs-Nr gespeichert!"); }}>OK</button>
            </div>
          </div>
        </div>
      </div>
<div style={{ marginBottom: 16, border: "1px solid " + BORDER, borderRadius: 10, padding: 14 }}>
        <div style={{ color: MUTED, fontSize: 13, marginBottom: 10 }}>Aktueller Plan</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 12 }}>
          {[{ n: "Starter", p: "CHF 0", link: null }, { n: "Pro", p: "CHF 29/Mt", link: "https://buy.stripe.com/5kQeVdeZs6I20lTd6J9AA06" }, { n: "Team", p: "CHF 79/Mt", link: "https://buy.stripe.com/bJecN5cRk7M60lTd6J9AA07" }].map(pl => (
            <div key={pl.n} style={{ border: "2px solid " + (pl.n.toLowerCase() === currentPlan ? GOLD : BORDER), borderRadius: 8, padding: 10, background: pl.n.toLowerCase() === currentPlan ? "rgba(212,168,83,0.1)" : "transparent" }}>
              <div style={{ fontWeight: 700, color: pl.n.toLowerCase() === currentPlan ? GOLD : TEXT }}>{pl.n}</div>
              <div style={{ color: MUTED, fontSize: 13 }}>{pl.p}</div>
              {pl.link && <a href={pl.link} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginTop: 6, color: GOLD, fontSize: 12, textDecoration: "none" }}>Abonnieren</a>}
            </div>
          ))}
        </div>
        <button type="button" onClick={() => { localStorage.setItem("bauabnahme_plan", "pro"); showNotice("Pro Plan aktiviert!"); }} style={{ ...gBtn, fontSize: 12, color: GOLD, borderColor: GOLD, minHeight: 30 }}>Pro Plan aktivieren (nach Zahlung)</button>
      </div>

      <div style={{ border: "1px solid " + BORDER, borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <div style={{ color: GOLD, fontWeight: 700, marginBottom: 8 }}>Support</div>
        <a href="mailto:support@bauabnahme.app" style={{ ...pBtn, textDecoration: "none", display: "inline-flex" }}>support@bauabnahme.app</a>
      </div>
