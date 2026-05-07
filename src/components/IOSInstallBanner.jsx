import { useState } from "react";

export function IOSInstallBanner() {
  const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
  const isStandalone = window.navigator.standalone === true;
  const [show, setShow] = useState(true);
  const [showModal, setShowModal] = useState(false);

  if (!isIOS || isStandalone || !show) return null;

  const lang = (localStorage.getItem("bauabnahme_language_pref") || "DE").toUpperCase();
  const t = {
    DE: { title: "App installieren für beste Erfahrung", sub: 'Tippe auf ⬆️ Teilen → "Zum Home-Bildschirm"', how: "Wie?", modalTitle: "📲 App installieren", step1: "Tippe auf ⬆️ Teilen unten in Safari", step2: 'Scrolle und tippe "Zum Home-Bildschirm"', step3: 'Tippe "Hinzufügen" — fertig!', note: "Nach der Installation funktioniert die App besser auf iOS", ok: "Verstanden ✓" },
    FR: { title: "Installer l'app", sub: 'Appuie sur ⬆️ Partager → "Sur l\'écran d\'accueil"', how: "Comment?", modalTitle: "📲 Installer l'app", step1: "Appuie sur ⬆️ Partager en bas de Safari", step2: 'Appuie sur "Sur l\'écran d\'accueil"', step3: 'Appuie sur "Ajouter" — c\'est fait!', note: "Après installation, l'app fonctionne mieux sur iOS", ok: "Compris ✓" },
    IT: { title: "Installa l'app", sub: 'Tocca ⬆️ Condividi → "Aggiungi a Home"', how: "Come?", modalTitle: "📲 Installa l'app", step1: "Tocca ⬆️ Condividi in basso in Safari", step2: 'Tocca "Aggiungi alla schermata Home"', step3: 'Tocca "Aggiungi" — fatto!', note: "Dopo l'installazione, l'app funziona meglio su iOS", ok: "Capito ✓" },
    EN: { title: "Install app for best experience", sub: 'Tap ⬆️ Share → "Add to Home Screen"', how: "How?", modalTitle: "📲 Install App", step1: "Tap ⬆️ Share at the bottom of Safari", step2: 'Tap "Add to Home Screen"', step3: 'Tap "Add" — done!', note: "After installation, the app works better on iOS", ok: "Got it ✓" },
  }[lang] || { title: "App installieren für beste Erfahrung", sub: 'Tippe auf ⬆️ Teilen → "Zum Home-Bildschirm"', how: "Wie?", modalTitle: "📲 App installieren", step1: "Tippe auf ⬆️ Teilen unten in Safari", step2: 'Scrolle und tippe "Zum Home-Bildschirm"', step3: 'Tippe "Hinzufügen" — fertig!', note: "Nach der Installation funktioniert die App besser auf iOS", ok: "Verstanden ✓" };

  return (
    <>
      {showModal && (
        <div onPointerDown={() => setShowModal(false)} style={{position:"fixed",inset:0,zIndex:10000,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",padding:"0 16px 80px"}}>
          <div onPointerDown={e => e.stopPropagation()} style={{background:"#1a1a1a",border:"1px solid #d4a853",borderRadius:16,padding:24,width:"100%",maxWidth:400}}>
            <div style={{color:"#d4a853",fontWeight:700,fontSize:18,marginBottom:16,textAlign:"center"}}>{t.modalTitle}</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"flex",alignItems:"center",gap:12,background:"#111",borderRadius:10,padding:"10px 14px"}}><span style={{fontSize:24}}>1️⃣</span><span style={{color:"#f0ece4",fontSize:14}}>{t.step1}</span></div>
              <div style={{display:"flex",alignItems:"center",gap:12,background:"#111",borderRadius:10,padding:"10px 14px"}}><span style={{fontSize:24}}>2️⃣</span><span style={{color:"#f0ece4",fontSize:14}}>{t.step2}</span></div>
              <div style={{display:"flex",alignItems:"center",gap:12,background:"#111",borderRadius:10,padding:"10px 14px"}}><span style={{fontSize:24}}>3️⃣</span><span style={{color:"#f0ece4",fontSize:14}}>{t.step3}</span></div>
            </div>
            <div style={{color:"#888",fontSize:12,textAlign:"center",marginTop:12}}>{t.note}</div>
            <div onPointerDown={() => setShowModal(false)} style={{width:"100%",marginTop:16,background:"#d4a853",color:"#111",border:"none",borderRadius:10,padding:"12px",fontWeight:700,fontSize:15,cursor:"pointer",textAlign:"center"}}>{t.ok}</div>
          </div>
        </div>
      )}
      <div style={{position:"fixed",bottom:60,left:0,right:0,zIndex:9999,background:"#1a1a1a",borderTop:"2px solid #d4a853",padding:"10px 16px",display:"flex",alignItems:"center",gap:12}}>
        <img src="/icon-192.png" style={{width:40,height:40,borderRadius:9}} alt="BauAbnahme"/>
        <div style={{flex:1}}>
          <div style={{color:"#d4a853",fontWeight:700,fontSize:13}}>{t.title}</div>
          <div style={{color:"#888",fontSize:11}}>{t.sub}</div>
        </div>
        <div onPointerDown={() => setShowModal(true)} style={{background:"#d4a853",color:"#111",border:"none",borderRadius:8,padding:"6px 12px",fontWeight:700,fontSize:13,cursor:"pointer",whiteSpace:"nowrap"}}>{t.how}</div>
        <div onPointerDown={() => setShow(false)} style={{background:"transparent",border:"1px solid #555",borderRadius:6,color:"#aaa",padding:"8px 12px",cursor:"pointer",fontSize:20,minWidth:44,minHeight:44,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</div>
      </div>
    </>
  );
}
