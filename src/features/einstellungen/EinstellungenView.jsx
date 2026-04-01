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
