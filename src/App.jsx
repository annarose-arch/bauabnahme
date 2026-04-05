import{useEffect,useState}from"react";
import{supabase}from"./supabase.js";
import Dashboard from"./pages/Dashboard.jsx";
import Login from"./pages/Login.jsx";
export default function App(){
const[s,setS]=useState(null);
const[r,setR]=useState(false);
const[p,setP]=useState(window.location.pathname);
const go=x=>{window.history.pushState({},"",x);setP(x);};
useEffect(()=>{
supabase.auth.getSession().then(({data})=>{setS(data.session);setR(true);});
const{data:l}=supabase.auth.onAuthStateChange((_,x)=>setS(x));
return()=>l.subscription.unsubscribe();
},[]);
if(!r)return<div style={{minHeight:"100vh",background:"#0a0a0a",color:"#f0ece4",display:"flex",alignItems:"center",justifyContent:"center"}}>Lade...</div>;
if(p==="/demo")return<Dashboard onNavigate={go} onLogout={()=>go("/")} session={{user:{id:"demo-user",email:"demo@bauabnahme.ch"}}} isDemo={true}/>;
if(!s)return<Login onNavigate={go}/>;
if(s?.user?.user_metadata?.account_status==="deactivated")return(
  <div style={{minHeight:"100vh",background:"#0a0a0a",color:"#f0ece4",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,padding:24}}>
    <div style={{fontSize:22,fontWeight:700,color:"#d4a853"}}>BauAbnahme</div>
    <div style={{fontSize:16}}>Dein Konto ist deaktiviert.</div>
    <div style={{color:"#888",fontSize:13,textAlign:"center"}}>Du kannst es innerhalb von 30 Tagen reaktivieren.</div>
    <button onClick={async()=>{await supabase.auth.updateUser({data:{account_status:"active",deactivated_at:null}});window.location.reload();}} style={{background:"#d4a853",color:"#111",border:"none",borderRadius:8,padding:"10px 24px",fontWeight:700,cursor:"pointer",fontSize:15}}>Konto reaktivieren</button>
    <button onClick={async()=>{await supabase.auth.signOut();go("/");}} style={{background:"transparent",color:"#888",border:"1px solid #333",borderRadius:8,padding:"8px 20px",cursor:"pointer",fontSize:13}}>Logout</button>
  </div>
);
return<Dashboard onNavigate={go} onLogout={async()=>{await supabase.auth.signOut();go("/");}} session={s}/>;
}
