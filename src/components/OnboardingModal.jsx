import { useState } from "react";
import { GOLD, BORDER, MUTED, TEXT } from "../lib/constants.js";

const slides = {
      DE: [
    { icon: "🏗️", title: "Willkommen bei BauAbnahme", text: "So funktioniert die App: Einstellungen → Katalog → Kunden → Offerte → Rapport → Rechnung. Alles läuft über die Kundendatei." },
    { icon: "⚙️", title: "1. Firma einrichten", text: "Geh zuerst zu Einstellungen und trage Logo, Adresse und IBAN ein. Das erscheint auf allen PDFs und Rechnungen." },
    { icon: "🔧", title: "2. Katalog anlegen", text: "Trage deine Mitarbeiter mit Stundenansatz und dein Material mit Preis im Katalog ein — so kannst du sie beim Rapport schnell auswählen." },
    { icon: "👥", title: "3. Kundendatei", text: "Die Kundendatei ist dein Hub. Alle Offerten, Rapporte und Rechnungen sind direkt beim Kunden gespeichert und jederzeit abrufbar." },
    { icon: "📝", title: "4. Offerte erstellen", text: "Erstelle eine Offerte direkt beim Kunden. Status: Offen → Gesendet → Angenommen. Mit einem Klick wird die Offerte zum Rapport." },
    { icon: "📋", title: "5. Rapport & Status", text: "Erfasse Stunden und Material auf der Baustelle. Kunde unterschreibt digital. Status: Offen → Bearbeitet → Gesendet → Archiviert." },
    { icon: "📄", title: "6. Rechnung & Archiv", text: "Aus jedem Rapport wird mit einem Klick eine QR-Rechnung. Status: Entwurf → Versendet → Bezahlt → ins Archiv. Bei Verzug: Mahnung direkt aus der App." },
  ],
      FR: [
    { icon: "🏗️", title: "Bienvenue sur BauAbnahme", text: "Voici le flux: Paramètres → Catalogue → Clients → Offre → Rapport → Facture. Tout passe par la fiche client." },
    { icon: "⚙️", title: "1. Configurer votre entreprise", text: "Allez dans Paramètres et entrez logo, adresse et IBAN. Ils apparaîtront sur tous les PDFs." },
    { icon: "🔧", title: "2. Créer le catalogue", text: "Entrez vos employés avec taux horaire et vos matériaux avec prix — pour les sélectionner rapidement dans chaque rapport." },
    { icon: "👥", title: "3. Fiche client", text: "La fiche client est votre hub. Toutes les offres, rapports et factures sont sauvegardés directement chez le client." },
    { icon: "📝", title: "4. Créer une offre", text: "Créez une offre directement chez le client. Statut: Ouvert → Envoyé → Accepté. En un clic, l'offre devient un rapport." },
    { icon: "📋", title: "5. Rapport & Statut", text: "Saisissez heures et matériaux sur le chantier. Le client signe numériquement. Statut: Ouvert → Traité → Envoyé → Archivé." },
    { icon: "📄", title: "6. Facture & Archive", text: "Chaque rapport devient une facture QR en un clic. Statut: Brouillon → Envoyé → Payé → Archive. En cas de retard: rappel depuis l'app." },
  ],
      IT: [
    { icon: "🏗️", title: "Benvenuto su BauAbnahme", text: "Il flusso: Impostazioni → Catalogo → Clienti → Offerta → Rapporto → Fattura. Tutto passa dalla scheda cliente." },
    { icon: "⚙️", title: "1. Configura la tua azienda", text: "Vai nelle Impostazioni e inserisci logo, indirizzo e IBAN. Appariranno su tutti i PDF." },
    { icon: "🔧", title: "2. Crea il catalogo", text: "Inserisci dipendenti con tariffa oraria e materiali con prezzo — per selezionarli rapidamente in ogni rapporto." },
    { icon: "👥", title: "3. Scheda cliente", text: "La scheda cliente è il tuo hub. Tutte le offerte, rapporti e fatture sono salvati direttamente nel cliente." },
    { icon: "📝", title: "4. Crea un'offerta", text: "Crea un'offerta direttamente nel cliente. Stato: Aperto → Inviato → Accettato. Con un clic l'offerta diventa un rapporto." },
    { icon: "📋", title: "5. Rapporto & Stato", text: "Registra ore e materiali in cantiere. Il cliente firma digitalmente. Stato: Aperto → Elaborato → Inviato → Archiviato." },
    { icon: "📄", title: "6. Fattura & Archivio", text: "Ogni rapporto diventa una fattura QR con un clic. Stato: Bozza → Inviato → Pagato → Archivio. In ritardo: sollecito dall'app." },
  ],
      EN: [
    { icon: "🏗️", title: "Welcome to BauAbnahme", text: "The workflow: Settings → Catalogue → Customers → Quote → Report → Invoice. Everything runs through the customer file." },
    { icon: "⚙️", title: "1. Set up your company", text: "Go to Settings and enter your logo, address and IBAN. They will appear on all PDFs." },
    { icon: "🔧", title: "2. Set up the catalogue", text: "Add your employees with hourly rate and materials with price — to select them quickly in each report." },
    { icon: "👥", title: "3. Customer file", text: "The customer file is your hub. All quotes, reports and invoices are saved directly with the customer." },
    { icon: "📝", title: "4. Create a quote", text: "Create a quote directly in the customer file. Status: Open → Sent → Accepted. One click turns the quote into a report." },
    { icon: "📋", title: "5. Report & Status", text: "Record hours and materials on site. Customer signs digitally. Status: Open → Edited → Sent → Archived." },
    { icon: "📄", title: "6. Invoice & Archive", text: "Every report becomes a QR invoice with one click. Status: Draft → Sent → Paid → Archive. Overdue: send reminder from the app." },
  ],
};

const btn = {
  DE: { next: "Weiter", finish: "Loslegen", finishDemo: "Jetzt registrieren →", skip: "Überspringen" },
  FR: { next: "Suivant", finish: "Commencer", finishDemo: "S'inscrire →", skip: "Passer" },
  IT: { next: "Avanti", finish: "Inizia", finishDemo: "Registrati →", skip: "Salta" },
  EN: { next: "Next", finish: "Get started", finishDemo: "Register now →", skip: "Skip" },
};

export function OnboardingModal({ language = "DE", isDemo = false, onFinish, onNavigate }) {
  const [step, setStep] = useState(0);
  const lang = slides[language] ? language : "DE";
  const s = slides[lang];
  const b = btn[lang];
  const isLast = step === s.length - 1;

  const finish = () => {
    if (!isDemo) localStorage.setItem("bauabnahme_onboarding_done", "1");
    onFinish();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#111", border: "2px solid " + GOLD, borderRadius: 20, padding: 32, maxWidth: 440, width: "100%", boxSizing: "border-box" }}>
        <div style={{ textAlign: "center", color: GOLD, fontWeight: 800, fontSize: 18, marginBottom: 20 }}>BauAbnahme</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 28 }}>
          {s.map((_, i) => (
            <div key={i} style={{ width: i === step ? 24 : 8, height: 8, borderRadius: 4, background: i === step ? GOLD : "rgba(212,168,83,0.3)", transition: "all 0.3s" }} />
          ))}
        </div>
        <div style={{ textAlign: "center", fontSize: 52, marginBottom: 16 }}>{s[step].icon}</div>
        <div style={{ color: GOLD, fontWeight: 800, fontSize: 20, textAlign: "center", marginBottom: 12 }}>{s[step].title}</div>
        <div style={{ color: TEXT, fontSize: 15, textAlign: "center", lineHeight: 1.6, marginBottom: 32, minHeight: 72 }}>{s[step].text}</div>
        <div style={{ display: "grid", gap: 10 }}>
          <button type="button" onClick={() => isLast ? (isDemo ? (onFinish(), onNavigate && onNavigate("/login")) : finish()) : setStep(p => p + 1)}
            style={{ background: GOLD, color: "#111", border: "none", borderRadius: 12, padding: "14px", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>
            {isLast ? (isDemo ? b.finishDemo : b.finish) : b.next}
          </button>
          {isDemo && isLast && (
            <button type="button" onClick={finish}
              style={{ background: "transparent", color: MUTED, border: "1px solid " + BORDER, borderRadius: 12, padding: "12px", fontSize: 14, cursor: "pointer" }}>
              {b.skip}
            </button>
          )}
          {!isLast && (
            <button type="button" onClick={finish}
              style={{ background: "transparent", color: MUTED, border: "none", fontSize: 13, cursor: "pointer", padding: "6px" }}>
              {b.skip}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
