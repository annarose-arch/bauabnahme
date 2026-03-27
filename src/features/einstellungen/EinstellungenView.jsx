import { useState } from "react";
import { GOLD, BORDER, MUTED, TEXT, iStyle, pBtn, gBtn } from "../../lib/constants.js";
import { SectionCard } from "../../components/UI.jsx";
import { supabase } from "../../supabase.js";

export function EinstellungenView({
  session, userEmail, showNotice, onLogout, onNavigate,
  nextRapportNr, setNextRapportNrState,
  nextInvoiceNr, setNextInvoiceNrState,
}) {
  const meta = session?.user?.user_metadata || {};
  const currentPlan = localStorage.getItem("bauabnahme_plan") || "starter";
  const [showLegal, setShowLegal] = useState(null);

  const saveMeta = async (patch) => {
    await supabase.auth.updateUser({ data: { ...meta, ...patch } });
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
            <button type="button" style={pBtn} onClick={async () => {
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
              <button type="button" style={{ ...pBtn, padding: "0 10px", fontSize: 12 }} onClick={() => {
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
              <button type="button" style={{ ...pBtn, padding: "0 10px", fontSize: 12 }} onClick={() => {
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
            { n: "Starter", p: "CHF 0", link: null },
            { n: "Pro", p: "CHF 29/Mt", link: "https://buy.stripe.com/28EaEX3gK7M6fgNgiV9AA03" },
            { n: "Team", p: "CHF 79/Mt", link: "https://buy.stripe.com/8x2bJ14kO6I22u11o19AA05" },
          ].map(pl => (
            <div key={pl.n} style={{ border: `2px solid ${pl.n.toLowerCase() === currentPlan ? GOLD : BORDER}`, borderRadius: 8, padding: 10, background: pl.n.toLowerCase() === currentPlan ? "rgba(212,168,83,0.1)" : "transparent" }}>
              <div style={{ fontWeight: 700, color: pl.n.toLowerCase() === currentPlan ? GOLD : TEXT }}>{pl.n}</div>
              <div style={{ color: MUTED, fontSize: 13 }}>{pl.p}</div>
              {pl.link && <a href={pl.link} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginTop: 6, color: GOLD, fontSize: 12, textDecoration: "none" }}>Abonnieren →</a>}
            </div>
          ))}
        </div>
        <button type="button" onClick={() => { localStorage.setItem("bauabnahme_plan", "pro"); showNotice("✅ Pro Plan aktiviert!"); }}
          style={{ ...gBtn, fontSize: 12, color: GOLD, borderColor: GOLD, minHeight: 30 }}>
          ✓ Pro Plan aktivieren (nach Zahlung)
        </button>
      </div>

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
          <button type="button" onClick={() => { if (window.confirm("Konto wirklich pausieren?")) showNotice("Konto pausiert. Bitte kontaktiere den Support."); }} style={{ ...gBtn, fontSize: 12, minHeight: 32, padding: "0 10px" }}>⏸ Pausieren</button>
          <button type="button"
            onClick={() => { if (window.confirm("Konto wirklich löschen? Alle Daten gehen verloren!")) if (window.confirm("Letzte Bestätigung — wirklich löschen?")) showNotice("Löschung angefragt. Support wird dich kontaktieren."); }}
            style={{ ...gBtn, fontSize: 12, minHeight: 32, padding: "0 10px", color: "#e05c5c", borderColor: "#e05c5c" }}>🗑 Löschen</button>
        </div>
      </div>

      {/* ── Sprache ── */}
      <LanguageSwitcher />

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

function LanguageSwitcher() {
  const [lang, setLang] = useState(() => localStorage.getItem("bauabnahme_language_pref") || "DE");
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ color: MUTED, fontSize: 11 }}>Sprache:</span>
      {["DE", "FR", "IT", "EN"].map(code => (
        <button key={code} type="button" onClick={() => { setLang(code); localStorage.setItem("bauabnahme_language_pref", code); }}
          style={{ padding: "3px 9px", borderRadius: 6, cursor: "pointer", border: `1px solid ${lang === code ? GOLD : BORDER}`, background: lang === code ? "rgba(212,168,83,0.15)" : "transparent", color: lang === code ? GOLD : MUTED, fontSize: 12, fontWeight: lang === code ? 700 : 400 }}>
          {code}
        </button>
      ))}
    </div>
  );
}
