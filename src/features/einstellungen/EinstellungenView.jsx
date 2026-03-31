Inhalte sind nutzergeneriert und ungeprüft.




Loading is taking longer than expected
There may be an issue with the content you’re trying to load.
The code itself may still be valid and functional.

import os

path = os.path.expanduser('~/Desktop/bauabnahme/src/features/einstellungen/EinstellungenView.jsx')

code = r"""import { useState } from "react";
import { GOLD, BORDER, MUTED, TEXT, iStyle, pBtn, gBtn, dBtn } from "../../lib/constants.js";
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const saveMeta = async (patch) => {
    await supabase.auth.updateUser({ data: { ...meta, ...patch } });
  };

  const handleDeactivate = async () => {
    if (!window.confirm("Konto deaktivieren? Deine Daten bleiben 30 Tage gespeichert und du kannst dich erneut anmelden.")) return;
    await supabase.auth.updateUser({ data: { ...meta, account_status: "deactivated", deactivated_at: new Date().toISOString() } });
    showNotice("Konto deaktiviert. Du kannst dich innerhalb von 30 Tagen erneut anmelden um es zu reaktivieren.");
    setTimeout(() => { if (onLogout) onLogout(); }, 2000);
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== "LOESCHEN") return;
    try {
      const userId = session?.user?.id;
      if (userId) {
        await supabase.from("reports").delete().eq("user_id", userId);
        await supabase.from("customers").delete().eq("user_id", userId);
      }
      await supabase.auth.updateUser({ data: { ...meta, account_status: "deleted", deleted_at: new Date().toISOString() } });
      showNotice("Dein Konto wurde endgueltig geloescht.");
      setTimeout(() => { if (onLogout) onLogout(); }, 2000);
    } catch (e) {
      showNotice("Fehler beim Loeschen. Bitte kontaktiere support@bauabnahme.app");
    }
    setShowDeleteModal(false);
  };

  return (
    <SectionCard>
      <h2 style={{ marginTop: 0 }}>Einstellungen</h2>

      {/* Firmenprofil */}
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14, marginBottom: 16, background: "rgba(212,168,83,0.05)" }}>
        <div style={{ color: GOLD, fontWeight: 700, marginBottom: 8 }}>Firmenprofil</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
          {meta.company_logo
            ? <img src={meta.company_logo} alt="Logo" style={{ height: 60, maxWidth: 160, objectFit: "contain", borderRadius: 8, border: `1px solid ${BORDER}`, padding: 4, background: "#fff" }} />
            : <div style={{ width: 80, height: 60, border: `1px dashed ${BORDER}`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontSize: 11 }}>Kein Logo</div>
          }
          <div>
            <div><strong>{meta.company_name || "-"}</strong></div>
            <div style={{ color: MUTED }}>{[meta.first_name, meta.last_name].filter(Boolean).join(" ")}</div>
            {meta.address && <div style={{ color: MUTED, fontSize: 13 }}>{meta.address}, {meta.zip} {meta.city}</div>}
            {meta.phone && <div style={{ color: MUTED, fontSize: 13 }}>Tel: {meta.phone}</div>}
            <div style={{ color: MUTED, fontSize: 13 }}>{userEmail}</div>
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          <div style={{ color: MUTED, fontSize: 12, marginBottom: 6 }}>Logo aendern:</div>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", border: `1px solid ${BORDER}`, borderRadius: 8, cursor: "pointer", color: MUTED, fontSize: 13 }}>
            Logo hochladen
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return;
              const reader = new FileReader();
              reader.onload = async (ev) => {
                await saveMeta({ company_logo: ev.target.result });
                showNotice("Logo gespeichert!");
              };
              reader.readAsDataURL(f);
            }} />
          </label>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ color: MUTED, fontSize: 12, marginBottom: 6 }}>IBAN (fuer Swiss QR-Rechnung):</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input placeholder="CH56 0483 5012 3456 7800 9" defaultValue={meta.iban || ""} id="iban-input"
              style={{ ...iStyle, flex: 1, fontFamily: "monospace", fontSize: 13 }} />
            <button type="button" style={pBtn} onClick={async () => {
              const val = document.getElementById("iban-input").value.trim();
              await saveMeta({ iban: val });
              showNotice("IBAN gespeichert!");
            }}>Speichern</button>
          </div>
          {meta.iban && <div style={{ color: GOLD, fontSize: 12, marginTop: 4 }}>{meta.iban}</div>}
        </div>
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <div style={{ color: MUTED, fontSize: 12, marginBottom: 6 }}>Naechste Rapport-Nr:</div>
            <div style={{ display: "flex", gap: 6 }}>
              <input type="number" defaultValue={nextRapportNr} id="next-rapport-nr" style={{ ...iStyle, flex: 1, fontFamily: "monospace", fontSize: 13 }} />
              <button type="button" style={{ ...pBtn, padding: "0 10px", fontSize: 12 }} onClick={() => {
                const val = parseInt(document.getElementById("next-rapport-nr").value) || 1001;
                setNextRapportNrState(val);
                localStorage.setItem("bauabnahme_next_rapport_nr", String(val));
                showNotice("Rapport-Nr gespeichert!");
              }}>OK</button>
            </div>
            <div style={{ color: MUTED, fontSize: 11, marginTop: 3 }}>Naechster Rapport: {nextRapportNr}</div>
          </div>
          <div>
            <div style={{ color: MUTED, fontSize: 12, marginBottom: 6 }}>Naechste Rechnungs-Nr:</div>
            <div style={{ display: "flex", gap: 6 }}>
              <input type="number" defaultValue={nextInvoiceNr} id="next-invoice-nr" style={{ ...iStyle, flex: 1, fontFamily: "monospace", fontSize: 13 }} />
              <button type="button" style={{ ...pBtn, padding: "0 10px", fontSize: 12 }} onClick={() => {
                const val = parseInt(document.getElementById("next-invoice-nr").value) || 1001;
                setNextInvoiceNrState(val);
                localStorage.setItem("bauabnahme_next_invoice_nr", String(val));
                showNotice("Rechnungs-Nr gespeichert!");
              }}>OK</button>
            </div>
            <div style={{ color: MUTED, fontSize: 11, marginTop: 3 }}>Naechste Rechnung: RE-{nextInvoiceNr}</div>
          </div>
        </div>
      </div>

      {/* Plan */}
      <div style={{ marginBottom: 20, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14 }}>
        <div style={{ color: MUTED, fontSize: 13, marginBottom: 10 }}>Aktueller Plan</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: GOLD }}>
            {currentPlan === "pro" ? "Pro" : currentPlan === "team" ? "Team" : "Starter"}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 12 }}>
          {[
            { n: "Starter", p: "CHF 0", link: null },
            { n: "Pro", p: "CHF 29/Mt", link: "https://buy.stripe.com/5kQeVdeZs6I20lTd6J9AA06" },
            { n: "Team", p: "CHF 79/Mt", link: "https://buy.stripe.com/bJecN5cRk7M60lTd6J9AA07" },
          ].map(pl => (
            <div key={pl.n} style={{ border: `2px solid ${pl.n.toLowerCase() === currentPlan ? GOLD : BORDER}`, borderRadius: 8, padding: 10, background: pl.n.toLowerCase() === currentPlan ? "rgba(212,168,83,0.1)" : "transparent" }}>
              <div style={{ fontWeight: 700, color: pl.n.toLowerCase() === currentPlan ? GOLD : TEXT }}>{pl.n}</div>
              <div style={{ color: MUTED, fontSize: 13 }}>{pl.p}</div>
              {pl.link && <a href={pl.link} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginTop: 6, color: GOLD, fontSize: 12, textDecoration: "none" }}>Abonnieren</a>}
            </div>
          ))}
        </div>
        <button type="button" onClick={() => { localStorage.setItem("bauabnahme_plan", "pro"); showNotice("Pro Plan aktiviert!"); }}
          style={{ ...gBtn, fontSize: 12, color: GOLD, borderColor: GOLD, minHeight: 30 }}>
          Pro Plan aktivieren (nach Zahlung)
        </button>
      </div>

      {/* Support */}
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <div style={{ color: GOLD, fontWeight: 700, marginBottom: 8 }}>Support</div>
        <p style={{ color: MUTED, fontSize: 14, marginTop: 0, marginBottom: 12 }}>Bei Fragen oder Problemen stehen wir dir gerne zur Verfuegung.</p>
        <a href="mailto:support@bauabnahme.app" style={{ ...pBtn, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
          support@bauabnahme.app
        </a>
      </div>

      {/* Rechtliches */}
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <div style={{ color: GOLD, fontWeight: 700, marginBottom: 10 }}>Rechtliches</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => setShowLegal("impressum")} style={{ ...gBtn, fontSize: 12, minHeight: 32 }}>Impressum</button>
          <button type="button" onClick={() => setShowLegal("datenschutz")} style={{ ...gBtn, fontSize: 12, minHeight: 32 }}>Datenschutzerklaerung</button>
          <button type="button" onClick={() => setShowLegal("agb")} style={{ ...gBtn, fontSize: 12, minHeight: 32 }}>AGB</button>
        </div>
      </div>

      {/* Konto-Aktionen */}
      <div style={{ border: `1px solid #7f1d1d`, borderRadius: 10, padding: 14, marginBottom: 16, background: "rgba(127,29,29,0.05)" }}>
        <div style={{ color: "#e05c5c", fontWeight: 700, marginBottom: 8 }}>Konto-Verwaltung</div>
        <div style={{ color: MUTED, fontSize: 13, marginBottom: 12, lineHeight: 1.6 }}>
          <strong style={{ color: TEXT }}>Konto deaktivieren:</strong> Deine Daten bleiben 30 Tage erhalten. Du kannst dich erneut anmelden und alles ist wieder da.<br />
          <strong style={{ color: TEXT }}>Konto loeschen:</strong> Alle Daten werden sofort und unwiederruflich geloescht.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => { if (onLogout) onLogout(); }} style={{ ...gBtn, fontSize: 12, minHeight: 32 }}>Logout</button>
          <button type="button" onClick={handleDeactivate} style={{ ...gBtn, fontSize: 12, minHeight: 32, color: "#f59e0b", borderColor: "#f59e0b" }}>Konto deaktivieren</button>
          <button type="button" onClick={() => setShowDeleteModal(true)} style={{ ...gBtn, fontSize: 12, minHeight: 32, color: "#e05c5c", borderColor: "#e05c5c" }}>Konto endgueltig loeschen</button>
        </div>
      </div>

      <LanguageSwitcher />

      {/* Delete Modal */}
      {showDeleteModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#1a1a1a", border: `1px solid #e05c5c`, borderRadius: 14, padding: 24, maxWidth: 480, width: "100%" }}>
            <h3 style={{ color: "#e05c5c", marginTop: 0 }}>Konto endgueltig loeschen</h3>
            <p style={{ color: MUTED, lineHeight: 1.6 }}>Diese Aktion ist <strong style={{ color: TEXT }}>unwiderruflich</strong>. Alle deine Daten werden sofort geloescht:</p>
            <ul style={{ color: MUTED, lineHeight: 2, paddingLeft: 20 }}>
              <li>Alle Kunden</li>
              <li>Alle Rapporte</li>
              <li>Alle Rechnungen</li>
              <li>Dein Konto</li>
            </ul>
            <p style={{ color: MUTED }}>Tippe <strong style={{ color: "#e05c5c" }}>LOESCHEN</strong> zur Bestaetigung:</p>
            <input
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="LOESCHEN"
              style={{ ...iStyle, width: "100%", marginBottom: 16, borderColor: "#e05c5c" }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(""); }} style={{ ...gBtn, flex: 1 }}>Abbrechen</button>
              <button type="button" onClick={handleDelete}
                disabled={deleteConfirmText !== "LOESCHEN"}
                style={{ ...gBtn, flex: 1, color: "#e05c5c", borderColor: "#e05c5c", opacity: deleteConfirmText === "LOESCHEN" ? 1 : 0.4 }}>
                Endgueltig loeschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legal Modals */}
      {showLegal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setShowLegal(null)}>
          <div style={{ background: "#1a1a1a", border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24, maxWidth: 640, width: "100%", maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0, color: GOLD }}>
                {showLegal === "impressum" ? "Impressum" : showLegal === "agb" ? "AGB" : "Datenschutzerklaerung"}
              </h2>
              <button onClick={() => setShowLegal(null)} style={gBtn}>X</button>
            </div>
            <div style={{ color: MUTED, lineHeight: 1.8, fontSize: 13 }}>
              {showLegal === "impressum" && (
                <>
                  <p><strong style={{ color: TEXT }}>Anbieterin</strong><br />Anna Rose<br />Anna Rose Office Services<br />Seilerhof 9<br />6344 Meierskappel<br />Schweiz</p>
                  <p><strong style={{ color: TEXT }}>Kontakt</strong><br />E-Mail: <a href="mailto:anna.rose@gmx.ch" style={{ color: GOLD }}>anna.rose@gmx.ch</a><br />Website: www.bauabnahme.app</p>
                  <p><strong style={{ color: TEXT }}>Haftungshinweis</strong><br />Trotz sorgfaeltiger inhaltlicher Kontrolle uebernehmen wir keine Haftung fuer die Inhalte externer Links.</p>
                  <p><strong style={{ color: TEXT }}>Urheberrecht</strong><br />Alle Inhalte und Werke sind urheberrechtlich geschuetzt. Alle Rechte vorbehalten.</p>
                  <p><strong style={{ color: TEXT }}>Datenschutzbehoerde</strong><br />Eidgenoessischer Datenschutz- und Oeffentlichkeitsbeauftragter (EDOEB): www.edoeb.admin.ch</p>
                  <p style={{ color: MUTED, fontSize: 12 }}>Stand: Maerz 2026</p>
                </>
              )}
              {showLegal === "datenschutz" && (
                <>
                  <p><strong style={{ color: TEXT }}>1. Verantwortliche Person</strong><br />Anna Rose, Anna Rose Office Services, Seilerhof 9, 6344 Meierskappel<br />E-Mail: anna.rose@gmx.ch</p>
                  <p><strong style={{ color: TEXT }}>2. Bearbeitete Daten</strong><br />Accountdaten (E-Mail, Passwort), Firmendaten, Kundendaten (Name, Adresse, Kontakt), Rapporte, Rechnungen.</p>
                  <p><strong style={{ color: TEXT }}>3. Zweck</strong><br />Bereitstellung der App-Funktionen, Authentifizierung, technischer Betrieb, Zahlungsabwicklung.</p>
                  <p><strong style={{ color: TEXT }}>4. Datenspeicherung</strong><br />Supabase (EU/Frankfurt, DSGVO-konform), Vercel (Hosting), Stripe (Zahlungen), Sentry (Fehlermonitoring). Keine Weitergabe an Dritte ohne Einwilligung.</p>
                  <p><strong style={{ color: TEXT }}>5. Speicherdauer</strong><br />Daten werden gespeichert solange das Konto aktiv ist. Nach Kontoloeschung werden alle Daten innerhalb von 30 Tagen entfernt.</p>
                  <p><strong style={{ color: TEXT }}>6. Ihre Rechte (Art. 25 DSG)</strong><br />Auskunft, Berichtigung, Loeschung, Datenuebertragbarkeit. Anfragen an: anna.rose@gmx.ch (Antwort innert 30 Tagen kostenlos).</p>
                  <p><strong style={{ color: TEXT }}>7. Datensicherheit</strong><br />SSL/TLS-Verschluesselung, Passwoerter gehasht, Zugriff nur nach Authentifizierung.</p>
                  <p><strong style={{ color: TEXT }}>8. Beschwerden</strong><br />EDOEB: <a href="https://www.edoeb.admin.ch" target="_blank" rel="noopener noreferrer" style={{ color: GOLD }}>www.edoeb.admin.ch</a></p>
                  <p style={{ color: MUTED, fontSize: 12 }}>Stand: Maerz 2026 | Gemaess Schweizer DSG (seit 01.09.2023)</p>
                </>
              )}
              {showLegal === "agb" && (
                <>
                  <p><strong style={{ color: TEXT }}>1. Geltungsbereich</strong><br />Diese AGB gelten fuer die Nutzung von BauAbnahme (www.bauabnahme.app) der Anna Rose Office Services, Seilerhof 9, 6344 Meierskappel.</p>
                  <p><strong style={{ color: TEXT }}>2. Leistung</strong><br />BauAbnahme ist eine cloudbasierte App fuer Rapporte, Rechnungen und Kundenverwaltung im Handwerk (SaaS).</p>
                  <p><strong style={{ color: TEXT }}>3. Abonnements</strong><br />Starter: CHF 0 | Pro: CHF 29/Mt | Team: CHF 79/Mt. Preise exkl. MwSt. Abrechnung monatlich via Stripe. Kuendigung jederzeit zum Ende des Abrechnungszeitraums.</p>
                  <p><strong style={{ color: TEXT }}>4. Nutzungsrecht</strong><br />Nicht-exklusives, nicht-uebertragbares Nutzungsrecht waehrend der Vertragslaufzeit. Weitergabe von Zugangsdaten untersagt.</p>
                  <p><strong style={{ color: TEXT }}>5. Pflichten des Nutzers</strong><br />Korrekte Angaben, sichere Aufbewahrung der Zugangsdaten, keine rechtswidrige Nutzung, eigene Datensicherung.</p>
                  <p><strong style={{ color: TEXT }}>6. Haftung</strong><br />Haftung fuer leichte Fahrlaessigkeit ausgeschlossen. Bei grober Fahrlaessigkeit gilt Schweizer Recht. Keine Haftung fuer Datenverlust durch unterlassene Nutzersicherung.</p>
                  <p><strong style={{ color: TEXT }}>7. Datenschutz</strong><br />Nutzung gemaess Datenschutzerklaerung und DSG. Nutzer bleibt Verantwortlicher fuer eingegebene Kundendaten.</p>
                  <p><strong style={{ color: TEXT }}>8. Kontoloeschung</strong><br />Nach Kuendigung koennen Daten 30 Tage exportiert werden. Danach unwiderrufliche Loeschung.</p>
                  <p><strong style={{ color: TEXT }}>9. Anwendbares Recht</strong><br />Schweizer Recht. Gerichtsstand: Luzern.</p>
                  <p style={{ color: MUTED, fontSize: 12 }}>Stand: Maerz 2026</p>
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
"""

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)
print("Done")
