import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `Du bist ein freundlicher Verkaufsassistent für BauAbnahme — eine Schweizer App für Handwerksbetriebe. Du sprichst Deutsch, Französisch, Italienisch oder Englisch je nach Sprache des Benutzers.

BauAbnahme ermöglicht Handwerkern:
- Arbeitsrapporte digital erstellen (mit Fotos, Unterschrift, Materialien, Arbeitsstunden)
- Offerten erstellen und in Rapporte/Rechnungen umwandeln
- Professionelle Rechnungen mit Schweizer QR-Code generieren
- Kunden und Projekte verwalten
- In 4 Sprachen arbeiten (DE/FR/IT/EN)
- Auf Handy und PC — auch als PWA installierbar

Preise:
- Starter: CHF 0 (1 Benutzer, 15 Rapporte/Rechnungen/Offerten)
- Pro: CHF 49/Monat oder CHF 490/Jahr (1 Admin + 5 Mitarbeiter, alles unlimitiert)
- Team: CHF 99/Monat oder CHF 990/Jahr (unlimitierte Mitarbeiter, alles unlimitiert)

Website: www.bauabnahme.app
Demo: www.bauabnahme.app/demo
Support: support@bauabnahme.app

Deine Aufgabe:
- Beantworte Fragen zur App freundlich und kompetent
- Erkläre den Nutzen für Handwerksbetriebe
- Empfehle den passenden Plan
- Führe den Besucher zum "Kostenlos starten" oder Demo
- Halte Antworten kurz (2-4 Sätze)
- Sei enthusiastisch aber nicht aufdringlich
- Erwähne bei Gelegenheit die 3 Monate kostenlos testen Möglichkeit`;

const SUGGESTED = [
  "Was kostet die App?",
  "Funktioniert sie auf dem iPhone?",
  "Was ist der Unterschied zu Papier?",
  "Wie lange dauert die Einrichtung?",
];

export default function SalesChat({ lang = "DE" }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: lang === "FR" ? "Bonjour! Je suis l'assistant BauAbnahme. Comment puis-je vous aider?" : lang === "IT" ? "Ciao! Sono l'assistente BauAbnahme. Come posso aiutarti?" : lang === "EN" ? "Hi! I'm the BauAbnahme assistant. How can I help you?" : "Hallo! Ich bin der BauAbnahme Assistent. Wie kann ich dir helfen? 👋" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(1);
  const bottomRef = useRef(null);

  const GOLD = "#d4a853";
  const DARK = "#0a0a0a";
  const PANEL = "#111";
  const BORDER = "rgba(212,168,83,0.2)";
  const TEXT = "#f4efe6";
  const MUTED = "#888";

  useEffect(() => {
    if (open) { setUnread(0); bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }
  }, [open, messages]);

  const send = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("https://tgtyuxtrrafxalajxenw.supabase.co/functions/v1/chat-proxy", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    messages: newMessages.map(m => ({ role: m.role, content: m.content })),
  }),
});
const data = await response.json();
const reply = data.reply || "Entschuldigung, ich konnte keine Antwort generieren.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Entschuldigung, es gab einen Fehler. Bitte versuche es nochmal oder schreib uns auf support@bauabnahme.app" }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", bottom: 40, right: 40, zIndex: 999 }}>

      {/* Chat Window */}
      {open && (
        <div style={{
          position: "absolute", bottom: 72, right: 0,
          width: 340, height: 480,
          background: DARK, border: `1px solid ${BORDER}`,
          borderRadius: 16, display: "flex", flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{ background: PANEL, padding: "14px 16px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, background: GOLD, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🏠</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: TEXT }}>BauAbnahme Assistant</div>
              <div style={{ fontSize: 11, color: "#4ade80" }}>● Online</div>
            </div>
            <button onClick={() => setOpen(false)} style={{ marginLeft: "auto", background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 18 }}>✕</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "80%", padding: "8px 12px", borderRadius: m.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                  background: m.role === "user" ? GOLD : PANEL,
                  color: m.role === "user" ? "#111" : TEXT,
                  fontSize: 13, lineHeight: 1.5,
                  border: m.role === "assistant" ? `1px solid ${BORDER}` : "none",
                }}>{m.content}</div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: "12px 12px 12px 4px", padding: "8px 14px", color: MUTED, fontSize: 13 }}>
                  ●●●
                </div>
              </div>
            )}

            {/* Suggested questions */}
            {messages.length === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                {SUGGESTED.map((q, i) => (
                  <button key={i} onClick={() => send(q)} style={{
                    background: "transparent", border: `1px solid ${BORDER}`,
                    borderRadius: 8, padding: "6px 10px", color: GOLD,
                    fontSize: 12, cursor: "pointer", textAlign: "left",
                    transition: "background 0.2s",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(212,168,83,0.1)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >{q}</button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* CTA Button */}
          <div style={{ padding: "8px 12px", borderTop: `1px solid ${BORDER}` }}>
            <a href="https://www.bauabnahme.app/login" style={{
              display: "block", textAlign: "center", background: GOLD,
              color: "#111", borderRadius: 8, padding: "8px",
              fontSize: 13, fontWeight: 700, textDecoration: "none", marginBottom: 8,
            }}>🚀 Kostenlos starten</a>

            {/* Input */}
            <div style={{ display: "flex", gap: 6 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && send(input)}
                placeholder="Schreib eine Frage..."
                style={{
                  flex: 1, background: PANEL, border: `1px solid ${BORDER}`,
                  borderRadius: 8, padding: "8px 10px", color: TEXT,
                  fontSize: 13, outline: "none",
                }}
              />
              <button onClick={() => send(input)} disabled={loading} style={{
                background: GOLD, border: "none", borderRadius: 8,
                padding: "8px 12px", color: "#111", cursor: "pointer",
                fontWeight: 700, fontSize: 14,
              }}>→</button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button onClick={() => setOpen(o => !o)} style={{
        width: 56, height: 56, borderRadius: "50%",
        background: GOLD, border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 24, boxShadow: "0 4px 20px rgba(212,168,83,0.4)",
        position: "relative", transition: "transform 0.2s",
      }}
        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
      >
        {open ? "✕" : "💬"}
        {!open && unread > 0 && (
          <div style={{
            position: "absolute", top: -2, right: -2,
            width: 18, height: 18, background: "#ef4444",
            borderRadius: "50%", fontSize: 11, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700,
          }}>{unread}</div>
        )}
      </button>
    </div>
  );
}
