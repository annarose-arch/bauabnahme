import{useEffect,useState}from"react";
import{IOSInstallBanner}from"./components/IOSInstallBanner.jsx";
import{supabase}from"./supabase.js";
import Dashboard from"./pages/Dashboard.jsx";
import Login from"./pages/Login.jsx";
import Join from"./pages/Join.jsx";
export default function App(){
const[s,setS]=useState(null);
const[r,setR]=useState(false);
const[p,setP]=useState(window.location.pathname);
const go=x=>{window.history.pushState({},"",x);setP(x);};
useEffect(()=>{
const{data:l}=supabase.auth.onAuthStateChange((_,session)=>{ setS(session); setR(true); });
supabase.auth.getSession().then(({data})=>{ if(data.session) setS(data.session); setR(true); });
return()=>l.subscription.unsubscribe();
},[]);
if(window.location.hash.includes("type=recovery")||window.location.search.includes("type=recovery"))return<div style={{minHeight:"100vh",background:"#0a0a0a",color:"#f4efe6",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}><div style={{background:"#151515",border:"1px solid rgba(212,168,83,0.25)",borderRadius:14,padding:32,maxWidth:400,width:"100%"}}><div style={{fontWeight:700,fontSize:20,color:"#d4a853",marginBottom:20}}>Neues Passwort</div><input id="new-pw" type="password" placeholder="Neues Passwort" style={{width:"100%",background:"#0f0f0f",border:"1px solid rgba(212,168,83,0.25)",borderRadius:8,padding:"10px 14px",color:"#f4efe6",fontSize:15,marginBottom:12,boxSizing:"border-box"}} /><button onClick={async()=>{const pw=document.getElementById("new-pw").value;if(pw.length<6){alert("Mind. 6 Zeichen");return;}const hash=window.location.hash;const cleanHash=hash.replace(/^#type=recovery#/,"").replace(/^#/,"");const params=new URLSearchParams(cleanHash);const accessToken=params.get("access_token");const refreshToken=params.get("refresh_token");if(accessToken){await supabase.auth.setSession({access_token:accessToken,refresh_token:refreshToken||""});}const{error}=await supabase.auth.updateUser({password:pw});if(error){alert("Fehler: "+error.message);}else{alert("Passwort gesetzt! Bitte einloggen.");window.location.href="/";}}} style={{width:"100%",background:"#d4a853",color:"#111",border:"none",borderRadius:8,padding:"12px",fontWeight:700,fontSize:15,cursor:"pointer"}}>Passwort speichern</button></div></div>;
if(!r)return<div style={{minHeight:"100vh",background:"#0a0a0a",color:"#f0ece4",display:"flex",alignItems:"center",justifyContent:"center"}}>Lade...</div>;
if(p==="/demo")return<Dashboard onNavigate={go} onLogout={()=>go("/")} session={{user:{id:"demo-user",email:"demo@bauabnahme.ch"}}} isDemo={true}/>;
if(p.startsWith("/join"))return<Join onNavigate={go}/>;if(!s)return<><IOSInstallBanner/><Login onNavigate={go}/></>;
if(s?.user?.user_metadata?.account_status==="deactivated")return(
  <div style={{minHeight:"100vh",background:"#0a0a0a",color:"#f0ece4",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,padding:24}}>
    <div style={{fontSize:22,fontWeight:700,color:"#d4a853"}}>BauAbnahme</div>
        <div style={{fontSize:16}}>{{"de":"Dein Konto ist deaktiviert.","fr":"Votre compte est désactivé.","it":"Il tuo account è disattivato.","en":"Your account is deactivated."}[(localStorage.getItem("bauabnahme_language_pref")||localStorage.getItem("bauabnahme_lang")||"de").toLowerCase()]}</div>
    <div style={{color:"#888",fontSize:13,textAlign:"center"}}>{{"de":"Du kannst es innerhalb von 30 Tagen reaktivieren.","fr":"Vous pouvez le réactiver dans les 30 jours.","it":"Puoi riattivarlo entro 30 giorni.","en":"You can reactivate it within 30 days."}[(localStorage.getItem("bauabnahme_language_pref")||localStorage.getItem("bauabnahme_lang")||"de").toLowerCase()]}</div>
    <button onClick={async()=>{await supabase.auth.updateUser({data:{account_status:"active"}});window.location.reload();}} style={{marginTop:16,background:"#d4a853",color:"#111",border:"none",borderRadius:8,padding:"12px 24px",fontWeight:700,fontSize:15,cursor:"pointer"}}>{{"de":"Konto reaktivieren","fr":"Réactiver le compte","it":"Riattiva account","en":"Reactivate account"}[(localStorage.getItem("bauabnahme_language_pref")||localStorage.getItem("bauabnahme_lang")||"de").toLowerCase()]}</button>

    onClick={async()=>{
  const pw=document.getElementById("new-pw").value;
  if(pw.length<6){alert("Mind. 6 Zeichen");return;}
  const hash = window.location.hash;
  const params = new URLSearchParams(hash.replace("#",""));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if(accessToken) {
    await supabase.auth.setSession({access_token: accessToken, refresh_token: refreshToken || ""});
  }
  const{error}=await supabase.auth.updateUser({password:pw});
  if(error){alert("Fehler: "+error.message);}
  else{alert("Passwort gesetzt! Bitte einloggen.");window.location.href="/";}
}}

  </div>
);
return<><IOSInstallBanner/><Dashboard onNavigate={go} onLogout={()=>{ const key=Object.keys(localStorage).find(k=>k.includes("auth-token")); if(key) localStorage.removeItem(key); window.location.href="/"; }} session={s}/></>;
}
