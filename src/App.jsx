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
return<Dashboard onNavigate={go} onLogout={async()=>{await supabase.auth.signOut();go("/");}} session={s}/>;
}
