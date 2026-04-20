import { useState, useEffect, useCallback } from "react";
import { GOLD, BORDER, MUTED, TEXT, iStyle, pBtn, gBtn } from "../../lib/constants.js";
import { SectionCard } from "../../components/UI.jsx";
import { supabase } from "../../supabase.js";

const STRIPE_PRO = "https://buy.stripe.com/28EaEX3gK7M6fgNgiV9AA03";
const STRIPE_TEAM = "https://buy.stripe.com/8x2bJ14kO6I22u11o19AA05";

const LANG_CODES = ["DE", "FR", "IT", "EN"];

export function EinstellungenView({
  session, userEmail, showNotice, onLogout, onNavigate,
  nextRapportNr, setNextRapportNrState,
  nextInvoiceNr, setNextInvoiceNrState,
  language,
  onPickLanguage,
  isAdmin = true,
}) {
  const adminGuard = (e) => {
    if (isAdmin) return true;
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    showNotice("Keine Berechtigung (nur Admin).");
    return false;
  };

  const meta = session?.user?.user_metadata || {};
  const [currentPlan, setCurrentPlan] = useState(() => (localStorage.getItem("bauabnahme_plan") || "starter").toLowerCase());
  const [showLegal, setShowLegal] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamInvites, setTeamInvites] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [teamLoading, setTeamLoading] = useState(false);
  const [inviteSending, setInviteSending] = useState(false);

  const userId = session?.user?.id;

  const loadTeam = useCallback(async () => {
    if (!userId) return;
    const plan = (typeof localStorage !== "undefined" ? localStorage.getItem("bauabnahme_plan") : null) || "starter";
    const tier = String(plan).toLowerCase();
    if (tier !== "pro" && tier !== "team") {
      setTeamMembers([]);
      setTeamInvites([]);
      setTeamLoading(false);
      return;
    }
    setTeamLoading(true);
    const [memRes, invRes] = await Promise.all([
      supabase
        .from("team_members")
        .select("id, email, status, member_user_id, created_at")
        .eq("admin_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("team_invitations")
        .select("id, member_email, token, role, status, created_at, accepted_at")
        .eq("admin_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);
    if (!memRes.error) setTeamMembers(memRes.data ?? []);
    else showNotice("Team (Mitglieder): " + memRes.error.message);
    if (!invRes.error) setTeamInvites(invRes.data ?? []);
    else showNotice("Team (Einladungen): " + invRes.error.message);
    setTeamLoading(false);
  }, [userId, showNotice]);

  useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

  const sendInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !userId) {
      showNotice("Bitte eine gültige E-Mail eingeben.");
      return;
    }
    const plan = (typeof localStorage !== "undefined" ? localStorage.getItem("bauabnahme_plan") : null) || "starter";
    const tier = String(plan).toLowerCase();
    if (tier === "starter") {
      showNotice("Team-Einladungen sind im Starter-Plan nicht verfügbar.");
      return;
    }
    if (tier === "pro") {
      const seats = teamMembers.length + teamInvites.length;
      if (seats >= 5) {
        showNotice("Pro-Plan: maximal 5 Teammitglieder (inkl. ausstehende Einladungen).");
        return;
      }
    }
    setInviteSending(true);
    const token = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const { data: row, error: insErr } = await supabase
      .from("team_invitations")
      .insert({
        admin_id: userId,
        member_email: email,
        token,
        role: "member",
        status: "pending",
      })
      .select("id")
      .single();
    if (insErr) {
      showNotice("Einladung: " + insErr.message);
      setInviteSending(false);
      return;
    }
    const { error: fnErr } = await supabase.functions.invoke("send-team-invitation", {
      body: {
        invitation_id: row.id,
        app_origin: typeof window !== "undefined" ? window.location.origin : "",
      },
    });
    await loadTeam();
    setInviteEmail("");
    if (fnErr) {
      showNotice("Einladung gespeichert. E-Mail-Versand fehlgeschlagen: " + fnErr.message);
    } else {
      showNotice("Einladung erfolgreich erstellt und E-Mail gesendet.");
    }
    setInviteSending(false);
  };

  const activeLang = language && LANG_CODES.includes(language) ? language : "DE";

  const saveMeta = async (patch) => {
    await supabase.auth.updateUser({ data: { ...meta, ...patch } });
  };

  const planFromStorage = (typeof localStorage !== "undefined" ? localStorage.getItem("bauabnahme_plan") : null) || "starter";
  const planTier = String(planFromStorage).toLowerCase();
  const showTeamSection = planTier === "pro" || planTier === "team";
  const TEAM_PRO_MAX = 5;
  const teamSeatCount = teamMembers.length + teamInvites.length;
  const proTeamLimitReached = planTier === "pro" && teamSeatCount >= TEAM_PRO_MAX;

  const deleteAccount = async () => {
    if (!window.confirm("Konto wirklich löschen? Alle Daten gehen verloren!")) return;
    if (!window.confirm("Letzte Bestätigung — wirklich löschen?")) return;
    const uid = session?.user?.id;
    if (!uid) {
      showNotice("Nicht angemeldet.");
      return;
    }
    const { error: profileErr } = await supabase.from("profiles").upsert({
      id: uid,
      scheduled_for_deletion: true,
      deletion_requested_at: new Date().toISOString(),
    });
    if (profileErr) {
      showNotice("Fehler: " + profileErr.message);
      return;
    }
    const { error: reportsErr } = await supabase.from("reports").delete().eq("user_id", uid);
    if (reportsErr) showNotice("Rapporte: " + reportsErr.message);
    const { error: customersErr } = await supabase.from("customers").delete().eq("user_id", uid);
    if (customersErr) showNotice("Kunden: " + customersErr.message);
    showNotice("Konto zur Löschung vorgemerkt.");
    if (onLogout) onLogout();
    else if (onNavigate) onNavigate("/");
  };

  return (
    <SectionCard>
      <h2 style={{ marginTop: 0 }}>Einstellungen</h2>

      {/* ── Firmenprofil ── */}
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14, marginBottom: 16, background: "rgba(212,168,83,0.05)" }}>
        <div style={{ color: GOLD, fontWeight: 700, marginBottom: 8 }}>🏢 Firmenprofil</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
          {meta.company_logo
            ? <img src={meta.company_logo} alt="Logo" style={{ height: 60, maxWidth: 160, objectFit: "contain", borderRadius: 8, border: `1px solid ${BORDER}`, padding: 4, background: "#fff" }} />
            : <div style={{ width: 80, height: 60, border: `1px dashed ${BORDER}`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontSize: 11 }}>Kein Logo</div>
          }
          <div>
            <div><strong>{meta.company_name || "-"}</strong></div>
            <div style={{ color: MUTED }}>{[meta.first_name, meta.last_name].filter(Boolean).join(" ")}</div>
            {meta.address && <div style={{ color: MUTED, fontSize: 13 }}>{meta.address}, {meta.zip} {meta.city}</div>}
            {meta.phone && <div style={{ color: MUTED, fontSize: 13 }}>📞 {meta.phone}</div>}
            <div style={{ color: MUTED, fontSize: 13 }}>✉️ {userEmail}</div>
          </div>
        </div>

        {/* Logo Upload */}
        <div style={{ marginTop: 8 }}>
          <div style={{ color: MUTED, fontSize: 12, marginBottom: 6 }}>Logo ändern:</div>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", border: `1px solid ${BORDER}`, borderRadius: 8, cursor: "pointer", color: MUTED, fontSize: 13 }}>
            📁 Logo hochladen
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
              if (!adminGuard(e)) return;
              const f = e.target.files?.[0]; if (!f) return;
              const reader = new FileReader();
              reader.onload = async (ev) => {
                await saveMeta({ company_logo: ev.target.result });
                showNotice("✅ Logo gespeichert! Bitte neu einloggen um es zu sehen.");
              };
              reader.readAsDataURL(f);
            }} />
          </label>
        </div>

        {/* IBAN */}
        <div style={{ marginTop: 12 }}>
          <div style={{ color: MUTED, fontSize: 12, marginBottom: 6 }}>🏦 IBAN (für Swiss QR-Rechnung):</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input placeholder="CH56 0483 5012 3456 7800 9" defaultValue={meta.iban || ""} id="iban-input"
              style={{ ...iStyle, flex: 1, fontFamily: "monospace", fontSize: 13, letterSpacing: "0.5px" }} />
            <button type="button" style={pBtn} onClick={async (e) => {
              if (!adminGuard(e)) return;
              const val = document.getElementById("iban-input").value.trim();
              await saveMeta({ iban: val });
              showNotice("✅ IBAN gespeichert!");
            }}>Speichern</button>
          </div>
          {meta.iban && <div style={{ color: GOLD, fontSize: 12, marginTop: 4 }}>✓ {meta.iban}</div>}
        </div>

        {/* Fortlaufende Nummern */}
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <div style={{ color: MUTED, fontSize: 12, marginBottom: 6 }}>📋 Nächste Rapport-Nr:</div>
            <div style={{ display: "flex", gap: 6 }}>
              <input type="number" defaultValue={nextRapportNr} id="next-rapport-nr" style={{ ...iStyle, flex: 1, fontFamily: "monospace", fontSize: 13 }} />
              <button type="button" style={{ ...pBtn, padding: "0 10px", fontSize: 12 }} onClick={(e) => {
                if (!adminGuard(e)) return;
                const val = parseInt(document.getElementById("next-rapport-nr").value) || 1001;
                setNextRapportNrState(val);
                localStorage.setItem("bauabnahme_next_rapport_nr", String(val));
                showNotice("✅ Rapport-Nr gespeichert!");
              }}>OK</button>
            </div>
            <div style={{ color: MUTED, fontSize: 11, marginTop: 3 }}>Nächster Rapport: {nextRapportNr}</div>
          </div>
          <div>
            <div style={{ color: MUTED, fontSize: 12, marginBottom: 6 }}>🧾 Nächste Rechnungs-Nr:</div>
            <div style={{ display: "flex", gap: 6 }}>
              <input type="number" defaultValue={nextInvoiceNr} id="next-invoice-nr" style={{ ...iStyle, flex: 1, fontFamily: "monospace", fontSize: 13 }} />
              <button type="button" style={{ ...pBtn, padding: "0 10px", fontSize: 12 }} onClick={(e) => {
                if (!adminGuard(e)) return;
                const val = parseInt(document.getElementById("next-invoice-nr").value) || 1001;
                setNextInvoiceNrState(val);
                localStorage.setItem("bauabnahme_next_invoice_nr", String(val));
                showNotice("✅ Rechnungs-Nr gespeichert!");
              }}>OK</button>
            </div>
            <div style={{ color: MUTED, fontSize: 11, marginTop: 3 }}>Nächste Rechnung: RE-{nextInvoiceNr}</div>
          </div>
        </div>
      </div>

      {/* ── Plan ── */}
      <div style={{ marginBottom: 20, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14 }}>
        <div style={{ color: MUTED, fontSize: 13, marginBottom: 10 }}>💳 Aktueller Plan</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: GOLD }}>
            {currentPlan === "pro" ? "⭐ Pro" : currentPlan === "team" ? "🏆 Team" : "🆓 Starter"}
          </span>
          {(!currentPlan || currentPlan === "starter") && <span style={{ color: MUTED, fontSize: 13 }}>Upgrade für mehr Funktionen</span>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 12 }}>
          {[
            { id: "starter", n: "Starter", p: "CHF 0", link: null },
            { id: "pro", n: "Pro", p: "CHF 29/Mt", link: STRIPE_PRO },
            { id: "team", n: "Team", p: "CHF 79/Mt", link: STRIPE_TEAM },
          ].map((pl) => (
            <div
              key={pl.id}
              style={{
                border: `2px solid ${pl.id === currentPlan ? GOLD : BORDER}`,
                borderRadius: 8,
                padding: 10,
                background: pl.id === currentPlan ? "rgba(212,168,83,0.1)" : "transparent"
              }}
            >
              <div style={{ fontWeight: 700, color: pl.id === currentPlan ? GOLD : TEXT }}>{pl.n}</div>
              <div style={{ color: MUTED, fontSize: 13 }}>{pl.p}</div>
              {pl.link ? (
                <a
                  href={pl.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (!adminGuard(e)) return;
                  }}
                  style={{
                    ...pBtn,
                    display: "block",
                    marginTop: 8,
                    textAlign: "center",
                    textDecoration: "none",
                    fontSize: 12,
                    minHeight: 34,
                    lineHeight: "34px",
                    padding: 0
                  }}
                >
                  Mit Stripe wählen →
                </a>
              ) : (
                <div style={{ color: MUTED, fontSize: 12, marginTop: 8 }}>Standard inklusive</div>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={(e) => {
              if (!adminGuard(e)) return;
              localStorage.setItem("bauabnahme_plan", "pro");
              setCurrentPlan("pro");
              showNotice("✅ Pro Plan aktiviert!");
            }}
            style={{ ...gBtn, fontSize: 12, color: GOLD, borderColor: GOLD, minHeight: 30 }}
          >
            Pro Plan aktivieren
          </button>
          <button
            type="button"
            onClick={(e) => {
              if (!adminGuard(e)) return;
              localStorage.setItem("bauabnahme_plan", "team");
              setCurrentPlan("team");
              showNotice("✅ Team Plan aktiviert!");
            }}
            style={{ ...gBtn, fontSize: 12, color: GOLD, borderColor: GOLD, minHeight: 30 }}
          >
            Team Plan aktivieren
          </button>
        </div>
      </div>

      {/* ── Team (Starter: ausgeblendet | Pro: max. 5 | Team: unbegrenzt) — Plan: localStorage bauabnahme_plan ── */}
      {showTeamSection && (
      <div style={{ marginBottom: 20, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14, background: "rgba(212,168,83,0.04)" }}>
          <div style={{ color: GOLD, fontWeight: 700, marginBottom: 8 }}>👥 Team-Verwaltung</div>
          <p style={{ color: MUTED, fontSize: 13, marginTop: 0, marginBottom: 12 }}>
            {planTier === "team"
              ? "Team-Plan: unbegrenzt viele Mitglieder und Einladungen."
              : `Pro-Plan: bis zu ${TEAM_PRO_MAX} Mitglieder inkl. ausstehender Einladungen.`}
          </p>
          {proTeamLimitReached && (
            <div
              role="status"
              style={{
                marginBottom: 12,
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #c9a227",
                background: "rgba(201,162,39,0.12)",
                color: "#e8d4a0",
                fontSize: 13,
              }}
            >
              Hinweis: Du hast das Pro-Limit von {TEAM_PRO_MAX} Plätzen erreicht (Mitglieder + offene Einladungen). Für mehr Plätze wechsle zum Team-Plan.
            </div>
          )}
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: MUTED, fontSize: 12, marginBottom: 6 }}>Neue Einladung</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="kollegin@firma.ch"
                disabled={proTeamLimitReached}
                style={{ ...iStyle, flex: 1, minWidth: 200, fontSize: 13, opacity: proTeamLimitReached ? 0.55 : 1 }}
              />
              <button
                type="button"
                disabled={inviteSending || proTeamLimitReached}
                onClick={(e) => {
                  if (!adminGuard(e)) return;
                  void sendInvite();
                }}
                style={{ ...pBtn, opacity: inviteSending || proTeamLimitReached ? 0.6 : 1 }}
              >
                {inviteSending ? "Sende…" : "Einladen"}
              </button>
            </div>
          </div>
          <div style={{ color: MUTED, fontSize: 12, marginBottom: 6 }}>Mitglieder und Einladungen</div>
          {teamLoading ? (
            <div style={{ color: MUTED, fontSize: 13 }}>Lade…</div>
          ) : (
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "rgba(0,0,0,0.25)", color: MUTED, textAlign: "left" }}>
                    <th style={{ padding: "8px 10px", fontWeight: 600 }}>E-Mail</th>
                    <th style={{ padding: "8px 10px", fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((m) => (
                    <tr key={`m-${m.id}`} style={{ borderTop: `1px solid ${BORDER}` }}>
                      <td style={{ padding: "8px 10px", color: TEXT }}>{m.email}</td>
                      <td style={{ padding: "8px 10px", color: m.status === "active" ? GOLD : MUTED }}>
                        {m.status === "active" ? "aktiv" : "ausstehend"}
                      </td>
                    </tr>
                  ))}
                  {teamInvites.map((inv) => (
                    <tr key={`i-${inv.id}`} style={{ borderTop: `1px solid ${BORDER}` }}>
                      <td style={{ padding: "8px 10px", color: TEXT }}>{inv.member_email || "—"}</td>
                      <td style={{ padding: "8px 10px", color: MUTED }}>{inv.status === "pending" ? "Einladung ausstehend" : String(inv.status || "")}</td>
                    </tr>
                  ))}
                  {teamMembers.length === 0 && teamInvites.length === 0 && (
                    <tr>
                      <td colSpan={2} style={{ padding: "12px 10px", color: MUTED }}>
                        Noch keine Teammitglieder oder offenen Einladungen.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Support ── */}
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14, marginBottom: 16, background: "rgba(212,168,83,0.03)" }}>
        <div style={{ color: GOLD, fontWeight: 700, marginBottom: 8 }}>💬 Support</div>
        <p style={{ color: MUTED, fontSize: 14, marginTop: 0, marginBottom: 12 }}>Bei Fragen oder Problemen stehen wir dir gerne zur Verfügung.</p>
        <a href="mailto:support@bauabnahme.app" style={{ ...pBtn, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
          ✉️ support@bauabnahme.app
        </a>
      </div>

      {/* ── Konto-Aktionen & Rechtliches ── */}
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 12, marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" onClick={() => setShowLegal("impressum")} style={{ ...gBtn, fontSize: 12, minHeight: 32, padding: "0 10px" }}>Impressum</button>
          <button type="button" onClick={() => setShowLegal("datenschutz")} style={{ ...gBtn, fontSize: 12, minHeight: 32, padding: "0 10px" }}>Datenschutz</button>
          <div style={{ width: 1, height: 20, background: BORDER, margin: "0 4px" }} />
          <button type="button" onClick={() => { if (onLogout) onLogout(); else if (onNavigate) onNavigate("/"); }} style={{ ...gBtn, fontSize: 12, minHeight: 32, padding: "0 10px" }}>🚪 Logout</button>
          <button type="button" onClick={(e) => {
            if (!adminGuard(e)) return;
            if (window.confirm("Konto wirklich pausieren?")) showNotice("Konto pausiert. Bitte kontaktiere den Support.");
          }} style={{ ...gBtn, fontSize: 12, minHeight: 32, padding: "0 10px" }}>⏸ Pausieren</button>
          <button type="button" onClick={(e) => {
            if (!adminGuard(e)) return;
            void deleteAccount();
          }} style={{ ...gBtn, fontSize: 12, minHeight: 32, padding: "0 10px", color: "#e05c5c", borderColor: "#e05c5c" }}>🗑 Löschen</button>
        </div>
      </div>

      {/* ── Sprache ── */}
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 12, marginTop: 12 }}>
        <div style={{ color: MUTED, fontSize: 12, marginBottom: 8 }}>Sprache / Langue</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {LANG_CODES.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => onPickLanguage?.(code)}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                cursor: "pointer",
                border: `1px solid ${activeLang === code ? GOLD : BORDER}`,
                background: activeLang === code ? "rgba(212,168,83,0.15)" : "transparent",
                color: activeLang === code ? GOLD : MUTED,
                fontSize: 13,
                fontWeight: activeLang === code ? 700 : 400
              }}
            >
              {code}
            </button>
          ))}
        </div>
        <div style={{ color: MUTED, fontSize: 11, marginTop: 8 }}>Aktiv: {activeLang}</div>
      </div>

      {/* ── Legal Modals ── */}
      {showLegal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setShowLegal(null)}>
          <div style={{ background: "#1a1a1a", border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24, maxWidth: 600, width: "100%", maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0, color: GOLD }}>{showLegal === "impressum" ? "Impressum" : "Datenschutzerklärung"}</h2>
              <button onClick={() => setShowLegal(null)} style={gBtn}>✕</button>
            </div>
            <div style={{ color: MUTED, lineHeight: 1.7 }}>
              {showLegal === "impressum" ? (
                <>
                  <p><strong style={{ color: TEXT }}>BauAbnahme</strong><br />Eine Schweizer Softwarelösung für die Baubranche.</p>
                  <p><strong style={{ color: TEXT }}>Kontakt</strong><br />E-Mail: <a href="mailto:support@bauabnahme.app" style={{ color: GOLD }}>support@bauabnahme.app</a></p>
                  <p><strong style={{ color: TEXT }}>Haftungsausschluss</strong><br />Die Inhalte wurden mit grösster Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität können wir keine Gewähr übernehmen.</p>
                  <p><strong style={{ color: TEXT }}>Urheberrecht</strong><br />Alle Inhalte unterliegen dem schweizerischen Urheberrecht.</p>
                </>
              ) : (
                <>
                  <p><strong style={{ color: TEXT }}>1. Datenschutz</strong><br />Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst und verarbeiten diese gemäss DSG / DSGVO.</p>
                  <p><strong style={{ color: TEXT }}>2. Erhobene Daten</strong><br />E-Mail, Firmendaten, Kundendaten und Rapporte die Sie selbst erfassen, sowie Fotos und Unterschriften.</p>
                  <p><strong style={{ color: TEXT }}>3. Datenspeicherung</strong><br />Alle Daten werden verschlüsselt auf Servern von Supabase (EU) gespeichert. Keine Weitergabe an Dritte.</p>
                  <p><strong style={{ color: TEXT }}>4. Ihre Rechte</strong><br />Sie haben das Recht auf Auskunft, Berichtigung und Löschung Ihrer Daten. Kontakt: <a href="mailto:support@bauabnahme.app" style={{ color: GOLD }}>support@bauabnahme.app</a></p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
