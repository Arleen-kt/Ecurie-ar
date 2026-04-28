import { useState, useEffect, useCallback, useRef } from "react";

// ─── Constantes ───────────────────────────────────────────────────────────────
const ROLES = {
  cavalier:    { label:"Cavalier",        color:"#0F6E56", bg:"#E1F5EE", desc:"Suivi de vos chevaux, planning, exercices, santé" },
  ecurie:      { label:"Écurie",          color:"#3C3489", bg:"#EEEDFE", desc:"Suivi de tous les chevaux, planning global, RDV" },
  gestionnaire:{ label:"Gestionnaire",    color:"#854F0B", bg:"#FAEEDA", desc:"Vue 360, gestion complète, accès clients" },
  centre:      { label:"Centre équestre", color:"#712B13", bg:"#FAECE7", desc:"Planning cours, inscriptions, événements" },
  client:      { label:"Client",          color:"#0C447C", bg:"#E6F1FB", desc:"Cours, dépenses, demi-pension, demandes" },
};
const DEMO_ACCOUNTS = [
  { id:"u1", email:"manon@ecuries-ar.fr",    password:"demo1234", nom:"Manon",     role:"cavalier",     avatar:"MA" },
  { id:"u2", email:"aline@ecuries-ar.fr",    password:"demo1234", nom:"Aline",     role:"gestionnaire", avatar:"AL" },
  { id:"u3", email:"christine@ecuries-ar.fr",password:"demo1234", nom:"Christine", role:"gestionnaire", avatar:"CH" },
  { id:"u4", email:"ecurie@ecuries-ar.fr",   password:"demo1234", nom:"Écuries AR",role:"ecurie",       avatar:"EA" },
  { id:"u5", email:"centre@ecuries-ar.fr",   password:"demo1234", nom:"Centre",    role:"centre",       avatar:"CE" },
  { id:"u6", email:"claire@ecuries-ar.fr",   password:"demo1234", nom:"Claire",    role:"client",       avatar:"CL" },
];
const SESS_KEY = "ecurie_ar_session";
const DATA_KEY = "ecurie_ar_data_v2";

const SUPABASE_URL = "https://vkcsrcpfuiajyilnmemo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_4n5Bf_n759YzVxz5wZQgtA_hoBA2kFg";

// Client Supabase léger sans dépendance externe
const supabase = {
  auth: {
    signUp: async({email,password})=>{
      const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`,{method:"POST",headers:{"Content-Type":"application/json","apikey":SUPABASE_ANON_KEY},body:JSON.stringify({email,password})});
      return r.json();
    },
    signInWithPassword: async({email,password})=>{
      const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,{method:"POST",headers:{"Content-Type":"application/json","apikey":SUPABASE_ANON_KEY},body:JSON.stringify({email,password})});
      const data = await r.json();
      if(data.access_token) localStorage.setItem("sb_token", data.access_token);
      if(data.user) localStorage.setItem("sb_user", JSON.stringify(data.user));
      return {data, error: data.error_description||data.error||null};
    },
    signOut: async()=>{
      const token = localStorage.getItem("sb_token");
      await fetch(`${SUPABASE_URL}/auth/v1/logout`,{method:"POST",headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${token}`}});
      localStorage.removeItem("sb_token");
      localStorage.removeItem("sb_user");
      localStorage.removeItem("sb_profile");
    },
    getUser: ()=>{
      const u = localStorage.getItem("sb_user");
      return u ? JSON.parse(u) : null;
    }
  },
  from: (table)=>({
    select: async(cols="*")=>{
      const token = localStorage.getItem("sb_token");
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${cols}`,{headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${token}`,"Content-Type":"application/json"}});
      return {data: await r.json(), error: r.ok?null:"Erreur"};
    },
    insert: async(rows)=>{
      const token = localStorage.getItem("sb_token");
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`,{method:"POST",headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${token}`,"Content-Type":"application/json","Prefer":"return=representation"},body:JSON.stringify(rows)});
      return {data: await r.json(), error: r.ok?null:"Erreur"};
    },
    update: async(data)=>({
      eq: async(col,val)=>{
        const token = localStorage.getItem("sb_token");
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${col}=eq.${val}`,{method:"PATCH",headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${token}`,"Content-Type":"application/json","Prefer":"return=representation"},body:JSON.stringify(data)});
        return {data: await r.json(), error: r.ok?null:"Erreur"};
      }
    }),
    eq: (col,val)=>({
      single: async()=>{
        const token = localStorage.getItem("sb_token");
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${col}=eq.${val}&limit=1`,{headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${token}`,"Content-Type":"application/json"}});
        const data = await r.json();
        return {data: Array.isArray(data)?data[0]:data, error: r.ok?null:"Erreur"};
      }
    })
  })
};
const COLORS = {
  teal:  {bg:"#E1F5EE",text:"#0F6E56",border:"#5DCAA5"},
  purple:{bg:"#EEEDFE",text:"#3C3489",border:"#AFA9EC"},
  amber: {bg:"#FAEEDA",text:"#854F0B",border:"#EF9F27"},
  coral: {bg:"#FAECE7",text:"#712B13",border:"#F0997B"},
  blue:  {bg:"#E6F1FB",text:"#0C447C",border:"#85B7EB"},
  green: {bg:"#EAF3DE",text:"#3B6D11",border:"#97C459"},
  gray:  {bg:"#F1EFE8",text:"#444441",border:"#B4B2A9"},
};
const STAT_C={"En travail":{bg:"#EAF3DE",text:"#3B6D11"},"Repos":{bg:"#FAEEDA",text:"#854F0B"},"Débourrage":{bg:"#E6F1FB",text:"#0C447C"},"À vendre":{bg:"#FAECE7",text:"#712B13"}};
const RDV_C={"Santé":{bg:"#FAEEDA",text:"#854F0B"},"Séance":{bg:"#EAF3DE",text:"#3B6D11"},"Coaching":{bg:"#EEEDFE",text:"#3C3489"},"Compétition":{bg:"#FAECE7",text:"#712B13"}};
const NIV_C={"Débutant":{bg:"#EAF3DE",text:"#3B6D11"},"Intermédiaire":{bg:"#E6F1FB",text:"#0C447C"},"Avancé":{bg:"#EEEDFE",text:"#3C3489"},"Tous niveaux":{bg:"#F1EFE8",text:"#444441"}};
const DISC_C={"CSO":{bg:"#FAECE7",text:"#712B13"},"Dressage":{bg:"#EEEDFE",text:"#3C3489"},"Plat":{bg:"#E6F1FB",text:"#0C447C"},"CSO / Plat":{bg:"#FAECE7",text:"#712B13"},"Tous":{bg:"#F1EFE8",text:"#444441"}};
const EX_BG={chevaux:["#E1F5EE","#EEEDFE","#E6F1FB","#EAF3DE"],cavaliers:["#FAEEDA","#FAECE7","#EEEDFE","#EAF3DE"]};
const EX_TX={chevaux:["#0F6E56","#3C3489","#0C447C","#3B6D11"],cavaliers:["#854F0B","#712B13","#3C3489","#3B6D11"]};
const JOURS=["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
const MOIS=["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const HOURS=Array.from({length:13},(_,i)=>i+7);
const COL_OPTS=["teal","purple","amber","blue","coral","green"];
const SEANCE_TYPES=["Cross","Dressage","Plat","Obstacle","Liberté","Marcheur","Longe","Paddock","Repos","Trotting","Balade","Autre"];
const EX_CH=[
  {id:1,titre:"Serpentines en trot",niveau:"Intermédiaire",discipline:"Dressage",duree:"15 min",objectif:"Souplesse & engagement",description:"Tracez 3 à 5 serpentines sur la longueur de la carrière.",etapes:["Échauffement 5 min","Serpentine 3 boucles — 2x","Idem trot assis","5 boucles si acquis","Retour au calme"]},
  {id:2,titre:"Grilles de cavaletti",niveau:"Débutant",discipline:"CSO / Plat",duree:"20 min",objectif:"Rythme & équilibre",description:"4 à 6 cavaletti espacés de 1,30 m au trot.",etapes:["4 barres 1,30 m","Trot — 3x","Observer la régularité","Ajouter 2 barres","Terminer au pas"]},
  {id:3,titre:"Transitions galop–trot",niveau:"Intermédiaire",discipline:"Dressage",duree:"10 min",objectif:"Réactivité & équilibre",description:"Cercle 20 m, transitions toutes les demi-voltes.",etapes:["Galop cercle 20 m","Trot chaque demi-cercle","Reprendre galop","3 rép. par côté","Trot décontracté"]},
  {id:4,titre:"Ligne de barres au sol",niveau:"Débutant",discipline:"CSO",duree:"15 min",objectif:"Franchise & regard",description:"3 barres au sol, foulées 3,50 m.",etapes:["3 barres 3,50 m","Trot — 3x","Vérifier alignement","Galop si maîtrisé","Varier l'abord"]},
];
const EX_CAV=[
  {id:1,titre:"Équilibre en deux points",niveau:"Intermédiaire",discipline:"Tous",duree:"10 min",objectif:"Assiette & équilibre",description:"Tenir deux points 2 min sans s'appuyer sur les rênes.",etapes:["Trot enlevé","Deux points : poids talons","1 min sans rênes","Alterner 30 sec","Reproduire au galop"]},
  {id:2,titre:"Travail sans étriers",niveau:"Intermédiaire",discipline:"Tous",duree:"15 min",objectif:"Profondeur d'assiette",description:"Étriers croisés, trot enlevé puis assis.",etapes:["Croiser étriers","Trot assis 3 min","Trot enlevé 2 min","Reprendre, comparer","Reproduire"]},
  {id:3,titre:"Transitions sans mains",niveau:"Avancé",discipline:"Tous",duree:"10 min",objectif:"Indépendance des aides",description:"Rênes croisées, transitions par l'assiette.",etapes:["Rênes croisées","Trot par assiette","Retour au pas","5 transitions","Reprendre rênes"]},
  {id:4,titre:"Stretching post-montée",niveau:"Tous niveaux",discipline:"Tous",duree:"5 min",objectif:"Récupération & prévention",description:"Étirements hanches, ischio, épaules. 30 sec chaque.",etapes:["Hanches 30 sec","Ischio 30 sec","Épaules 30 sec","Rotation cou","Respiration 1 min"]},
];
const INIT_DATA = {
  chevaux:[
    {id:1,nom:"Ténéré",race:"Selle Français",age:9,robe:"Bai",statut:"En travail",discipline:"CSO",proprietaire:"Manon",color:"teal",favori:true,photo:null,sante:{vaccin:"À jour",dernier:"12/02/2025",rdvs:[{date:"15/04/2025",type:"Ostéo",detail:"Cabinet Roland"}]},palmares:[{date:"05/04/2025",epreuve:"CSO 1,10m — Metz",classement:"2e / 18"},{date:"22/03/2025",epreuve:"CSO 1,05m — Nancy",classement:"1er / 12"}],seances:[{date:"13/04/2025",duree:"55 min",type:"Plat, Obstacle",note:"Très attentif, bonne impulsion.",score:4},{date:"11/04/2025",duree:"45 min",type:"Obstacle",note:"Bon engagement.",score:3}],medias:[]},
    {id:2,nom:"Lumière",race:"KWPN",age:6,robe:"Gris",statut:"En travail",discipline:"Dressage",proprietaire:"Manon",color:"purple",favori:true,photo:null,sante:{vaccin:"À jour",dernier:"03/01/2025",rdvs:[{date:"18/04/2025",type:"Véto",detail:"Dr. Martin"}]},palmares:[{date:"01/04/2025",epreuve:"Dressage Amateur A — Metz",classement:"3e / 10"}],seances:[{date:"12/04/2025",duree:"50 min",type:"Dressage",note:"Progrès sur les transitions.",score:4}],medias:[]},
    {id:3,nom:"Horizon",race:"Anglo-Arabe",age:12,robe:"Alezan",statut:"Repos",discipline:"CCE",proprietaire:"Christine",color:"amber",favori:false,photo:null,sante:{vaccin:"À renouveler",dernier:"10/10/2024",rdvs:[{date:"16/04/2025",type:"Maréchal",detail:"Parage complet"}]},palmares:[],seances:[{date:"08/04/2025",duree:"30 min",type:"Longe",note:"Récupération.",score:3}],medias:[]},
    {id:4,nom:"Salsa",race:"Lusitanien",age:4,robe:"Isabelle",statut:"Débourrage",discipline:"Plat",proprietaire:"Claire",color:"blue",favori:false,photo:null,sante:{vaccin:"À jour",dernier:"20/03/2025",rdvs:[{date:"20/04/2025",type:"Coaching",detail:"Coach Julie"}]},palmares:[],seances:[{date:"13/04/2025",duree:"25 min",type:"Longe",note:"Première mise en selle.",score:5}],medias:[]},
  ],
  events:{
    "2025-04-13":[{id:1,heure:"10:00",fin:"11:00",label:"CSO — Ténéré",type:"Séance",color:"teal"},{id:2,heure:"11:30",fin:"12:00",label:"Débourrage — Salsa",type:"Séance",color:"blue"},{id:3,heure:"14:00",fin:"15:00",label:"Coaching — Lumière",type:"Coaching",color:"purple"},{id:4,heure:"16:00",fin:"16:30",label:"Détente — Ténéré",type:"Séance",color:"teal"}],
    "2025-04-14":[{id:5,heure:"08:30",fin:"09:30",label:"Maréchal — Horizon",type:"Santé",color:"amber"},{id:6,heure:"11:00",fin:"12:00",label:"Plat — Salsa",type:"Séance",color:"blue"}],
    "2025-04-15":[{id:7,heure:"09:00",fin:"10:00",label:"Dressage — Lumière",type:"Séance",color:"purple"},{id:8,heure:"14:00",fin:"15:00",label:"Ostéo — Ténéré",type:"Santé",color:"amber"}],
    "2025-04-16":[{id:9,heure:"10:30",fin:"11:30",label:"CSO — Ténéré",type:"Séance",color:"teal"},{id:10,heure:"15:00",fin:"16:00",label:"Véto — Lumière",type:"Santé",color:"amber"}],
    "2025-04-17":[{id:11,heure:"08:00",fin:"08:45",label:"Longe — Horizon",type:"Séance",color:"amber"},{id:12,heure:"14:30",fin:"15:30",label:"Débourrage — Salsa",type:"Séance",color:"blue"}],
    "2025-04-19":[{id:13,heure:"09:30",fin:"12:00",label:"Compétition — Ténéré",type:"Compétition",color:"coral"}],
    "2025-04-22":[{id:14,heure:"09:00",fin:"10:00",label:"CSO — Ténéré",type:"Séance",color:"teal"}],
    "2025-04-26":[{id:15,heure:"09:00",fin:"11:00",label:"Compétition — Lumière",type:"Compétition",color:"coral"}],
  },
  extraExCh:[],
  extraExCav:[],
  convs:[
    {id:"conv-christine",type:"libre",with:"u2",unread:1,messages:[{id:1,from:"u2",text:"Tu peux monter Horizon demain matin ?",time:"09:12",cheval:null},{id:2,from:"u1",text:"Oui, à quelle heure ?",time:"09:20",cheval:null},{id:3,from:"u2",text:"Vers 8h30. Merci !",time:"09:22",cheval:null}]},
    {id:"cheval-1",type:"cheval",chevalId:1,unread:0,messages:[{id:1,from:"u2",text:"Ténéré boite légèrement de l'antérieur droit.",time:"07:30",cheval:{id:1,nom:"Ténéré",color:"teal"}},{id:2,from:"u1",text:"Je l'ai vu, séance annulée.",time:"08:00",cheval:{id:1,nom:"Ténéré",color:"teal"}}]},
  ],
  notifs:[
    {id:1,type:"message",text:"Christine t'a envoyé un message",detail:"Tu peux monter Horizon demain ?",time:"09:22",read:false,action:"conv-christine"},
    {id:2,type:"sante",text:"Alerte santé — Horizon",detail:"Vaccin à renouveler avant le 10/11/2025",time:"Hier",read:false,action:null},
  ],
};

function dKey(y,m,d){return`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;}
function getDIM(y,m){return new Date(y,m+1,0).getDate();}
function getFDom(y,m){let d=new Date(y,m,1).getDay();return d===0?6:d-1;}
function pH(t){const[h,m]=t.split(':').map(Number);return h*60+m;}

const roleIcons={
  cavalier:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 16s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="20" x2="4" y2="16"/></svg>,
  ecurie:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  gestionnaire:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  centre:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  client:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
};

// ─── Composant principal ──────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [form, setForm]       = useState({email:"",password:"",error:""});

  useEffect(()=>{
    const sbUser = supabase.auth.getUser();
    if(sbUser){
      const profile = localStorage.getItem("sb_profile");
      if(profile){
        const p = JSON.parse(profile);
        setSession({user:{id:sbUser.id,email:sbUser.email,nom:p.prenom+" "+p.nom,role:p.role,avatar:(p.prenom||"?").slice(0,1)+(p.nom||"?").slice(0,1)},role:p.role});
      }
    }
    const d = localStorage.getItem(DATA_KEY);
    setData(d?JSON.parse(d):INIT_DATA);
    if(!d) localStorage.setItem(DATA_KEY,JSON.stringify(INIT_DATA));
    setLoading(false);
  },[]);

  const save=useCallback((newData)=>{
    setData(newData);
    setSaving(true);
    try{ localStorage.setItem(DATA_KEY,JSON.stringify(newData)); }catch(e){}
    setTimeout(()=>setSaving(false),600);
  },[]);

  const login=(account)=>{
    const sess={user:account,role:account.role};
    setSession(sess);
    try{ localStorage.setItem(SESS_KEY,JSON.stringify(sess)); }catch(e){}
  };
  const logout=()=>{
    supabase.auth.signOut();
    setSession(null);
  };
  const tryLogin=async()=>{
    if(!form.email||!form.password)return setForm(p=>({...p,error:"Email et mot de passe requis."}));
    setForm(p=>({...p,error:""}));
    // Vérifier si c'est un compte démo
    const demoUser=DEMO_ACCOUNTS.find(a=>a.email===form.email&&a.password===form.password);
    if(demoUser){login(demoUser);return;}
    // Sinon connexion Supabase
    const {data,error}=await supabase.auth.signInWithPassword({email:form.email,password:form.password});
    if(error)return setForm(p=>({...p,error:"Email ou mot de passe incorrect."}));
    const userId=data?.user?.id;
    // Récupérer le profil
    const {data:profile}=await supabase.from("profiles").eq("id",userId).single();
    if(profile){
      localStorage.setItem("sb_profile",JSON.stringify(profile));
      login({id:userId,email:form.email,nom:profile.prenom+" "+profile.nom,role:profile.role,avatar:profile.avatar||"?"});
    } else {
      setForm(p=>({...p,error:"Profil introuvable. Contactez l'administrateur."}));
    }
  };

  if(loading) return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"var(--font-sans)"}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:36,height:36,borderRadius:"50%",border:"2px solid var(--color-border-tertiary)",borderTopColor:"var(--color-text-primary)",animation:"spin 0.8s linear infinite",margin:"0 auto 12px"}}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{margin:0,fontSize:13,color:"var(--color-text-secondary)"}}>Chargement…</p>
      </div>
    </div>
  );

  if(!session) return <LoginScreen authMode={authMode} setAuthMode={setAuthMode} form={form} setForm={setForm} tryLogin={tryLogin} login={login}/>;

  if(session.role==="cavalier") return <CavalierApp session={session} data={data} save={save} saving={saving} logout={logout}/>;
  if(session.role==="gestionnaire") return <GestionnaireApp session={session} data={data} save={save} saving={saving} logout={logout}/>;
  if(session.role==="centre") return <CentreApp session={session} logout={logout}/>;

  return <ComingSoonView session={session} logout={logout} save={save} data={data}/>;
}

// ─── Écran connexion ──────────────────────────────────────────────────────────
function LoginScreen({authMode,setAuthMode,form,setForm,tryLogin,login}){
  const [signupStep,setSignupStep]=useState(1); // 1=compte, 2=profil
  const [signup,setSignup]=useState({prenom:"",nom:"",email:"",password:"",password2:"",tel:"",ecurie:"",role:"cavalier",photo:null,error:""});
  const [signupDone,setSignupDone]=useState(false);

  const handlePhotoSU=(e)=>{
    const f=e.target.files[0];if(!f)return;
    const r=new FileReader();r.onload=(ev)=>setSignup(p=>({...p,photo:ev.target.result}));r.readAsDataURL(f);
  };

  const submitStep1=()=>{
    if(!signup.email||!signup.password)return setSignup(p=>({...p,error:"Email et mot de passe requis."}));
    if(signup.password!==signup.password2)return setSignup(p=>({...p,error:"Les mots de passe ne correspondent pas."}));
    if(signup.password.length<6)return setSignup(p=>({...p,error:"Mot de passe trop court (6 caractères min)."}));
    setSignup(p=>({...p,error:""}));setSignupStep(2);
  };

  const submitStep2=async()=>{
    if(!signup.prenom||!signup.nom)return setSignup(p=>({...p,error:"Prénom et nom requis."}));
    setSignup(p=>({...p,error:""}));
    // Inscription Supabase
    const {data,error} = await supabase.auth.signUp({email:signup.email,password:signup.password});
    if(error)return setSignup(p=>({...p,error:"Erreur : "+error}));
    const userId = data?.user?.id || data?.id;
    // Sauvegarder le profil
    const profile = {id:userId,prenom:signup.prenom,nom:signup.nom,email:signup.email,tel:signup.tel,ecurie:signup.ecurie,role:signup.role,avatar:signup.prenom.slice(0,1)+signup.nom.slice(0,1),photo:signup.photo||null,statut:signup.role==="gestionnaire"||signup.role==="centre"?"en_attente":"actif"};
    await supabase.from("profiles").insert([profile]);
    localStorage.setItem("sb_profile",JSON.stringify(profile));
    const needsValidation=signup.role==="gestionnaire"||signup.role==="centre";
    if(needsValidation){
      setSignupDone("pending");
    } else {
      login({id:userId,email:signup.email,nom:signup.prenom+" "+signup.nom,role:signup.role,avatar:signup.prenom.slice(0,1)+signup.nom.slice(0,1)});
    }
  };

  const s={
    input:{border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",padding:"10px 14px",fontSize:14,width:"100%",background:"var(--color-background-primary)",color:"var(--color-text-primary)",boxSizing:"border-box"},
    btn:(v)=>({border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",padding:"11px 20px",fontSize:13,fontWeight:500,cursor:"pointer",width:"100%",background:v==="primary"?"var(--color-text-primary)":"transparent",color:v==="primary"?"var(--color-background-primary)":"var(--color-text-primary)"}),
    label:{fontSize:12,color:"var(--color-text-secondary)",display:"block",marginBottom:6,marginTop:12},
  };

  const ROLE_OPTIONS=[
    {key:"cavalier",label:"Cavalier",desc:"Suivi de mes chevaux, planning, exercices",icon:"🐴",free:true},
    {key:"gestionnaire",label:"Gestionnaire d'écurie",desc:"Gestion complète, clients, planning",icon:"🏠",free:false},
    {key:"centre",label:"Centre équestre",desc:"Planning des cours, inscriptions, événements",icon:"📅",free:false},
    {key:"client",label:"Client / Pension",desc:"Suivi de mon cheval en pension, cours",icon:"👤",free:true},
  ];

  return(
    <div style={{fontFamily:"var(--font-sans)",display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:"2rem 1rem"}}>
      <div style={{width:"100%",maxWidth:420}}>

        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:56,height:56,borderRadius:16,background:"var(--color-text-primary)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-background-primary)" strokeWidth="1.8"><path d="M4 16s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="20" x2="4" y2="16"/></svg>
          </div>
          <h1 style={{margin:"0 0 4px",fontSize:20,fontWeight:500}}>Écuries AR</h1>
          <p style={{margin:0,fontSize:13,color:"var(--color-text-secondary)"}}>Votre espace équestre</p>
        </div>

        <div style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",padding:"1.75rem"}}>

          {/* Onglets */}
          <div style={{display:"flex",borderBottom:"0.5px solid var(--color-border-tertiary)",marginBottom:20}}>
            {[["login","Connexion"],["signup","Inscription"],["selector","Démo"]].map(([k,l])=>(
              <button key={k} onClick={()=>{setAuthMode(k);setSignupStep(1);setSignupDone(false);}} style={{flex:1,background:"transparent",border:"none",borderBottom:authMode===k?"2px solid var(--color-text-primary)":"2px solid transparent",padding:"8px 0",fontSize:13,fontWeight:authMode===k?500:400,color:authMode===k?"var(--color-text-primary)":"var(--color-text-secondary)",cursor:"pointer"}}>{l}</button>
            ))}
          </div>

          {/* CONNEXION */}
          {authMode==="login"&&(
            <div style={{display:"flex",flexDirection:"column",gap:0}}>
              <label style={s.label}>Email</label>
              <input placeholder="votre@email.fr" style={s.input} value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value,error:""}))}/>
              <label style={s.label}>Mot de passe</label>
              <input type="password" placeholder="••••••••" style={{...s.input,marginBottom:16}} value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value,error:""}))} onKeyDown={e=>{if(e.key==="Enter")tryLogin();}}/>
              {form.error&&<p style={{margin:"0 0 12px",fontSize:12,color:"#A32D2D",background:"#FCEBEB",padding:"8px 12px",borderRadius:"var(--border-radius-md)"}}>{form.error}</p>}
              <button onClick={tryLogin} style={s.btn("primary")}>Se connecter</button>
              <button onClick={()=>setAuthMode("signup")} style={{...s.btn(),marginTop:8,fontSize:12,color:"var(--color-text-secondary)"}}>Pas encore de compte ? S'inscrire</button>
            </div>
          )}

          {/* INSCRIPTION */}
          {authMode==="signup"&&!signupDone&&(
            <div>
              {/* Indicateur étapes */}
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:20}}>
                {[1,2].map(i=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,flex:1}}>
                    <div style={{width:28,height:28,borderRadius:"50%",background:signupStep>=i?"var(--color-text-primary)":"var(--color-background-secondary)",color:signupStep>=i?"var(--color-background-primary)":"var(--color-text-secondary)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:500,flexShrink:0}}>{i}</div>
                    <span style={{fontSize:12,color:signupStep===i?"var(--color-text-primary)":"var(--color-text-secondary)",fontWeight:signupStep===i?500:400}}>{i===1?"Compte":"Profil"}</span>
                    {i<2&&<div style={{flex:1,height:1,background:"var(--color-border-tertiary)"}}/>}
                  </div>
                ))}
              </div>

              {/* Étape 1 — Compte */}
              {signupStep===1&&(
                <div>
                  <label style={s.label}>Email *</label>
                  <input placeholder="votre@email.fr" style={s.input} value={signup.email} onChange={e=>setSignup(p=>({...p,email:e.target.value,error:""}))}/>
                  <label style={s.label}>Mot de passe *</label>
                  <input type="password" placeholder="6 caractères minimum" style={s.input} value={signup.password} onChange={e=>setSignup(p=>({...p,password:e.target.value,error:""}))}/>
                  <label style={s.label}>Confirmer le mot de passe *</label>
                  <input type="password" placeholder="Répétez le mot de passe" style={{...s.input,marginBottom:16}} value={signup.password2} onChange={e=>setSignup(p=>({...p,password2:e.target.value,error:""}))}/>
                  {signup.error&&<p style={{margin:"0 0 12px",fontSize:12,color:"#A32D2D",background:"#FCEBEB",padding:"8px 12px",borderRadius:"var(--border-radius-md)"}}>{signup.error}</p>}
                  <button onClick={submitStep1} style={s.btn("primary")}>Continuer →</button>
                  <button onClick={()=>setAuthMode("login")} style={{...s.btn(),marginTop:8,fontSize:12,color:"var(--color-text-secondary)"}}>Déjà un compte ? Se connecter</button>
                </div>
              )}

              {/* Étape 2 — Profil */}
              {signupStep===2&&(
                <div>
                  {/* Photo de profil */}
                  <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16,padding:"12px",background:"var(--color-background-secondary)",borderRadius:"var(--border-radius-md)"}}>
                    <div style={{flexShrink:0}}>
                      {signup.photo
                        ?<img src={signup.photo} style={{width:56,height:56,borderRadius:"50%",objectFit:"cover",border:"2px solid var(--color-border-secondary)"}}/>
                        :<div style={{width:56,height:56,borderRadius:"50%",background:"var(--color-border-tertiary)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>👤</div>
                      }
                    </div>
                    <div>
                      <p style={{margin:"0 0 6px",fontSize:12,fontWeight:500}}>Photo de profil</p>
                      <label style={{border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",padding:"5px 12px",fontSize:12,cursor:"pointer",display:"inline-block"}}>
                        {signup.photo?"Changer":"Ajouter une photo"}
                        <input type="file" accept="image/*" style={{display:"none"}} onChange={handlePhotoSU}/>
                      </label>
                    </div>
                  </div>

                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    <div>
                      <label style={s.label}>Prénom *</label>
                      <input placeholder="Manon" style={s.input} value={signup.prenom} onChange={e=>setSignup(p=>({...p,prenom:e.target.value,error:""}))}/>
                    </div>
                    <div>
                      <label style={s.label}>Nom *</label>
                      <input placeholder="Dupont" style={s.input} value={signup.nom} onChange={e=>setSignup(p=>({...p,nom:e.target.value,error:""}))}/>
                    </div>
                  </div>
                  <label style={s.label}>Téléphone</label>
                  <input placeholder="06 xx xx xx xx" style={s.input} value={signup.tel} onChange={e=>setSignup(p=>({...p,tel:e.target.value}))}/>
                  <label style={s.label}>Nom de l'écurie</label>
                  <input placeholder="Écuries AR" style={s.input} value={signup.ecurie} onChange={e=>setSignup(p=>({...p,ecurie:e.target.value}))}/>

                  <label style={s.label}>Votre rôle *</label>
                  <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
                    {ROLE_OPTIONS.map(r=>(
                      <button key={r.key} onClick={()=>setSignup(p=>({...p,role:r.key}))}
                        style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:"var(--border-radius-md)",background:signup.role===r.key?ROLES[r.key].bg:"transparent",border:`2px solid ${signup.role===r.key?ROLES[r.key].color:"var(--color-border-tertiary)"}`,cursor:"pointer",textAlign:"left",width:"100%",transition:"all 0.15s"}}>
                        <span style={{fontSize:20,flexShrink:0}}>{r.icon}</span>
                        <div style={{flex:1}}>
                          <p style={{margin:"0 0 2px",fontSize:13,fontWeight:signup.role===r.key?600:500,color:signup.role===r.key?ROLES[r.key].color:"var(--color-text-primary)"}}>{r.label}</p>
                          <p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)"}}>{r.desc}</p>
                        </div>
                        {!r.free&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:"var(--border-radius-md)",background:"#FAEEDA",color:"#854F0B",flexShrink:0,fontWeight:500}}>Validation requise</span>}
                        <div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${signup.role===r.key?ROLES[r.key].color:"var(--color-border-secondary)"}`,background:signup.role===r.key?ROLES[r.key].color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          {signup.role===r.key&&<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                        </div>
                      </button>
                    ))}
                  </div>

                  {signup.error&&<p style={{margin:"0 0 12px",fontSize:12,color:"#A32D2D",background:"#FCEBEB",padding:"8px 12px",borderRadius:"var(--border-radius-md)"}}>{signup.error}</p>}

                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>setSignupStep(1)} style={{...s.btn(),flex:"0 0 auto",padding:"11px 16px",fontSize:13}}>←</button>
                    <button onClick={submitStep2} style={{...s.btn("primary"),flex:1}}>Créer mon compte</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* INSCRIPTION TERMINÉE — en attente validation */}
          {authMode==="signup"&&signupDone==="pending"&&(
            <div style={{textAlign:"center",padding:"1rem 0"}}>
              <div style={{fontSize:40,marginBottom:16}}>⏳</div>
              <p style={{fontSize:15,fontWeight:500,marginBottom:8}}>Demande envoyée !</p>
              <p style={{fontSize:13,color:"var(--color-text-secondary)",lineHeight:1.6,marginBottom:20}}>Ton compte <strong>{signup.role==="gestionnaire"?"Gestionnaire":"Centre équestre"}</strong> doit être validé par un administrateur. Tu recevras un email à <strong>{signup.email}</strong> dès que c'est approuvé.</p>
              <button onClick={()=>setAuthMode("login")} style={s.btn("primary")}>Retour à la connexion</button>
            </div>
          )}

          {/* DÉMO */}
          {authMode==="selector"&&(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <p style={{margin:"0 0 8px",fontSize:12,color:"var(--color-text-secondary)"}}>Explore chaque vue en un clic · mot de passe démo : <strong>demo1234</strong></p>
              {DEMO_ACCOUNTS.map(a=>{
                const r=ROLES[a.role];
                return(
                  <button key={a.id} onClick={()=>login(a)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:"var(--border-radius-md)",background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",cursor:"pointer",textAlign:"left",width:"100%"}}>
                    <div style={{width:38,height:38,borderRadius:"50%",background:r.bg,color:r.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:500,flexShrink:0}}>{a.avatar}</div>
                    <div style={{flex:1}}>
                      <p style={{margin:"0 0 2px",fontSize:13,fontWeight:500}}>{a.nom}</p>
                      <p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)"}}>{r.label} · {r.desc.split(",")[0]}</p>
                    </div>
                    <span style={{fontSize:11,padding:"3px 10px",borderRadius:"var(--border-radius-md)",background:r.bg,color:r.color,fontWeight:500,flexShrink:0}}>{r.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Vue "à venir" pour les autres rôles ─────────────────────────────────────
function ComingSoonView({session,logout,data,save}){
  const r=ROLES[session.role];
  const features={
    ecurie:     ["Suivi de tous les chevaux","Planning global de l'écurie","Gestion des RDV","Tableau de bord multi-chevaux"],
    gestionnaire:["Vue 360 de l'écurie","Gestion des fiches clients","Validation des paiements","Accès centre équestre","Planning global & RDV"],
    centre:     ["Planning global des cours","Gestion des horaires","Inscriptions collectif & individuel","Liste des événements"],
    client:     ["Inscription aux cours","Suivi des dépenses","Achat en ligne","Demandes de cours","Gestion demi-pension"],
  };
  return(
    <div style={{fontFamily:"var(--font-sans)",minHeight:"100vh",display:"flex",flexDirection:"column"}}>
      <div style={{background:"var(--color-background-primary)",borderBottom:"0.5px solid var(--color-border-tertiary)",padding:"1rem 1.5rem",display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:36,height:36,borderRadius:"50%",background:r.bg,color:r.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:500}}>{session.user.avatar}</div>
        <div style={{flex:1}}><p style={{margin:0,fontSize:14,fontWeight:500}}>{session.user.nom}</p><p style={{margin:0,fontSize:12,color:"var(--color-text-secondary)"}}>{r.label}</p></div>
        <button onClick={logout} style={{background:"transparent",border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",padding:"5px 12px",fontSize:12,cursor:"pointer",color:"var(--color-text-secondary)"}}>Déconnexion</button>
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",flex:1,padding:"2rem 1.5rem"}}>
        <div style={{maxWidth:480,width:"100%",textAlign:"center"}}>
          <div style={{width:64,height:64,borderRadius:16,background:r.bg,color:r.color,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px"}}>
            {roleIcons[session.role]}
          </div>
          <h2 style={{margin:"0 0 8px",fontSize:18,fontWeight:500}}>Vue {r.label}</h2>
          <p style={{margin:"0 0 24px",fontSize:13,color:"var(--color-text-secondary)",lineHeight:1.6}}>Cette interface est en cours de construction. Voici ce qui sera disponible :</p>
          <div style={{textAlign:"left",background:"var(--color-background-secondary)",borderRadius:"var(--border-radius-lg)",padding:"1.25rem",marginBottom:24}}>
            {(features[session.role]||[]).map((f,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<features[session.role].length-1?"0.5px solid var(--color-border-tertiary)":"none"}}>
                <div style={{width:20,height:20,borderRadius:"50%",background:r.bg,color:r.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:500,flexShrink:0}}>{i+1}</div>
                <span style={{fontSize:13}}>{f}</span>
              </div>
            ))}
          </div>
          <p style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:16}}>Pour tester la vue complète, utilise le profil <strong>Manon (Cavalier)</strong></p>
          <button onClick={logout} style={{background:"var(--color-text-primary)",color:"var(--color-background-primary)",border:"none",borderRadius:"var(--border-radius-md)",padding:"10px 24px",fontSize:13,fontWeight:500,cursor:"pointer"}}>Changer de profil</button>
        </div>
      </div>
    </div>
  );
}

// ─── App Centre équestre ──────────────────────────────────────────────────────
function CentreApp({session,logout}){
  const [calWOff,setCalWOff]=useState(0);
  const [selLecon,setSelLecon]=useState(null);
  const [inscriptions,setInscriptions]=useState({}); // {leconId: [{clientId, commentaire}]}
  const [inscForm,setInscForm]=useState({client:"",commentaire:""});

  const LECONS=[
    {id:"l1",date:"2025-04-13",heure:"09:00",fin:"10:00",titre:"Reprise débutants",niveau:"Débutant",places:8,inscrits:5,moniteur:"Julie R.",color:"teal"},
    {id:"l2",date:"2025-04-13",heure:"10:30",fin:"11:30",titre:"Reprise confirmés",niveau:"Confirmé",places:6,inscrits:6,moniteur:"Aline M.",color:"purple"},
    {id:"l3",date:"2025-04-13",heure:"14:00",fin:"15:00",titre:"CSO initiation",niveau:"Intermédiaire",places:5,inscrits:3,moniteur:"Julie R.",color:"blue"},
    {id:"l4",date:"2025-04-14",heure:"09:00",fin:"10:00",titre:"Reprise débutants",niveau:"Débutant",places:8,inscrits:4,moniteur:"Julie R.",color:"teal"},
    {id:"l5",date:"2025-04-14",heure:"17:00",fin:"18:00",titre:"Dressage débutants",niveau:"Débutant",places:6,inscrits:2,moniteur:"Aline M.",color:"purple"},
    {id:"l6",date:"2025-04-15",heure:"10:00",fin:"11:00",titre:"Reprise confirmés",niveau:"Confirmé",places:6,inscrits:5,moniteur:"Julie R.",color:"blue"},
    {id:"l7",date:"2025-04-15",heure:"15:00",fin:"16:00",titre:"Poney club",niveau:"Enfants",places:10,inscrits:7,moniteur:"Aline M.",color:"amber"},
    {id:"l8",date:"2025-04-16",heure:"18:00",fin:"19:00",titre:"Cours adultes loisir",niveau:"Tous niveaux",places:8,inscrits:3,moniteur:"Julie R.",color:"green"},
    {id:"l9",date:"2025-04-17",heure:"09:00",fin:"10:00",titre:"Reprise débutants",niveau:"Débutant",places:8,inscrits:6,moniteur:"Aline M.",color:"teal"},
    {id:"l10",date:"2025-04-17",heure:"14:00",fin:"15:00",titre:"CSO niveau 2",niveau:"Confirmé",places:5,inscrits:5,moniteur:"Julie R.",color:"coral"},
    {id:"l11",date:"2025-04-19",heure:"10:00",fin:"12:00",titre:"Stage week-end",niveau:"Tous niveaux",places:12,inscrits:8,moniteur:"Aline M.",color:"amber"},
  ];

  const EVENTS=[
    {id:"e1",date:"2025-05-10",titre:"Compétition CSO interne",type:"Compétition",detail:"Concours interne toutes catégories. Inscription obligatoire avant le 1er mai.",color:"coral",icone:"🏆"},
    {id:"e2",date:"2025-05-24",titre:"Stage week-end dressage",type:"Stage",detail:"Stage intensif de 2 jours avec coach extérieure. Places limitées à 8.",color:"purple",icone:"📋"},
    {id:"e3",date:"2025-06-07",titre:"Journée portes ouvertes",type:"Animation",detail:"Présentation du club, initiations gratuites, démonstrations. Tout public.",color:"teal",icone:"🎪"},
    {id:"e4",date:"2025-06-21",titre:"Concours de saut régional",type:"Compétition",detail:"Compétition officielle FFE. Inscription via le site fédéral.",color:"coral",icone:"🏆"},
    {id:"e5",date:"2025-07-05",titre:"Stage été juniors",type:"Stage",detail:"Stage 5 jours pour cavaliers 8–16 ans. Hébergement possible.",color:"blue",icone:"📋"},
  ];

  const typeC={
    Compétition:{bg:"#FAECE7",text:"#712B13",border:"#F0997B"},
    Stage:{bg:"#EEEDFE",text:"#3C3489",border:"#AFA9EC"},
    Animation:{bg:"#E1F5EE",text:"#0F6E56",border:"#5DCAA5"},
  };
  const niveauC={
    Débutant:{bg:"#EAF3DE",text:"#3B6D11"},
    Confirmé:{bg:"#E6F1FB",text:"#0C447C"},
    Intermédiaire:{bg:"#EEEDFE",text:"#3C3489"},
    Enfants:{bg:"#FAEEDA",text:"#854F0B"},
    "Tous niveaux":{bg:"#F1EFE8",text:"#444441"},
  };

  function dKey(y,m,d){return`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;}
  function pH(t){const[h,m]=t.split(':').map(Number);return h*60+m;}
  const JOURS=["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
  const MOIS=["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  const HOURS=Array.from({length:14},(_,i)=>i+7);

  const getWD=(off=0)=>{const b=new Date(2025,3,13);b.setDate(b.getDate()+off*7);return Array.from({length:7},(_,i)=>{const d=new Date(b);d.setDate(b.getDate()+i);return d;});};
  const wd=getWD(calWOff);
  const wLabel=()=>{const f=wd[0],l=wd[6];if(f.getMonth()===l.getMonth())return`${f.getDate()} — ${l.getDate()} ${MOIS[f.getMonth()]} ${f.getFullYear()}`;return`${f.getDate()} ${MOIS[f.getMonth()]} — ${l.getDate()} ${MOIS[l.getMonth()]} ${f.getFullYear()}`;};
  const tod=new Date(2025,3,13);
  const isToday=(d)=>d.getFullYear()===tod.getFullYear()&&d.getMonth()===tod.getMonth()&&d.getDate()===tod.getDate();
  const dk=(d)=>dKey(d.getFullYear(),d.getMonth(),d.getDate());

  const CLIENTS_CENTRE=[
    {id:"c1",nom:"Claire Dupont",avatar:"CL"},
    {id:"c2",nom:"Thomas Martin",avatar:"TM"},
    {id:"c3",nom:"Sophie Bernard",avatar:"SB"},
    {id:"c4",nom:"Lucas Petit",avatar:"LP"},
    {id:"c5",nom:"Emma Rousseau",avatar:"ER"},
    {id:"c6",nom:"Manon",avatar:"MA"},
  ];

  const isInscrit=(id)=>!!(inscriptions[id]?.length);
  const getInscritsByLecon=(id)=>inscriptions[id]||[];
  const inscrireClient=(leconId,clientId,commentaire)=>{
    setInscriptions(p=>{
      const existing=p[leconId]||[];
      if(existing.find(x=>x.clientId===clientId))return p;
      return {...p,[leconId]:[...existing,{clientId,commentaire,date:new Date().toLocaleDateString("fr-FR")}]};
    });
    setInscForm({client:"",commentaire:""});
  };
  const desinscrire=(leconId,clientId)=>{
    setInscriptions(p=>({...p,[leconId]:(p[leconId]||[]).filter(x=>x.clientId!==clientId)}));
  };

  const s={
    wrap:{fontFamily:"var(--font-sans)",padding:"0 0 2rem"},
    card:{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",padding:"1rem 1.25rem"},
    bdg:(bg,tx)=>({background:bg,color:tx,borderRadius:"var(--border-radius-md)",padding:"3px 10px",fontSize:12,fontWeight:500,display:"inline-block"}),
    btn:(v)=>({border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",padding:"7px 16px",fontSize:13,fontWeight:500,cursor:"pointer",background:v==="primary"?"var(--color-text-primary)":"transparent",color:v==="primary"?"var(--color-background-primary)":"var(--color-text-primary)"}),
    nb:(a)=>({background:a?"var(--color-background-secondary)":"transparent",border:"0.5px solid "+(a?"var(--color-border-secondary)":"transparent"),borderRadius:"var(--border-radius-md)",padding:"5px 12px",fontSize:12,cursor:"pointer",color:"var(--color-text-primary)"}),
  };

  // Popup inscription
  const LeconPopup=()=>{
    if(!selLecon)return null;
    const l=selLecon;const cl=COLORS[l.color]||COLORS.teal;const nv=niveauC[l.niveau]||niveauC["Tous niveaux"];
    const inscrits=getInscritsByLecon(l.id);
    const totalInscrits=l.inscrits+inscrits.length;
    const plein=totalInscrits>=l.places;
    const clientSelDejaInscrit=inscForm.client&&inscrits.find(x=>x.clientId===inscForm.client);
    return(
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}} onClick={()=>{setSelLecon(null);setInscForm({client:"",commentaire:""});}}>
        <div style={{background:"#ffffff",borderRadius:"var(--border-radius-lg)",padding:"1.5rem",width:360,maxHeight:"85vh",overflowY:"auto",border:"0.5px solid var(--color-border-tertiary)",boxShadow:"0 8px 32px rgba(0,0,0,0.12)"}} onClick={e=>e.stopPropagation()}>

          {/* En-tête */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
            <div>
              <p style={{margin:"0 0 6px",fontSize:16,fontWeight:500,color:"#111"}}>{l.titre}</p>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                <span style={s.bdg(nv.bg,nv.text)}>{l.niveau}</span>
                <span style={s.bdg(cl.bg,cl.text)}>{l.heure} — {l.fin}</span>
              </div>
            </div>
            <button onClick={()=>{setSelLecon(null);setInscForm({client:"",commentaire:""});}} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:18,color:"#888"}}>✕</button>
          </div>

          {/* Infos */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
            {[["Moniteur",l.moniteur],["Places",`${totalInscrits}/${l.places} inscrits`],["Date",new Date(l.date+'T12:00').toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})],["Durée",`${pH(l.fin)-pH(l.heure)} min`]].map(([k,v])=>(
              <div key={k} style={{background:"#f5f5f5",borderRadius:"var(--border-radius-md)",padding:"0.6rem 0.9rem"}}>
                <div style={{fontSize:11,color:"#888",marginBottom:3}}>{k}</div>
                <div style={{fontSize:13,fontWeight:500,color:"#111"}}>{v}</div>
              </div>
            ))}
          </div>

          {/* Barre places */}
          <div style={{marginBottom:20}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{fontSize:12,color:"#888"}}>Places disponibles</span>
              <span style={{fontSize:12,fontWeight:500,color:plein?"#A32D2D":"#3B6D11"}}>{plein?"Complet":`${l.places-totalInscrits} place${l.places-totalInscrits>1?"s":""}`}</span>
            </div>
            <div style={{height:6,borderRadius:3,background:"#eee",overflow:"hidden"}}>
              <div style={{height:"100%",width:`${Math.min((totalInscrits/l.places)*100,100)}%`,background:plein?"#E24B4A":cl.border,borderRadius:3,transition:"width 0.3s"}}/>
            </div>
          </div>

          {/* Inscrits actuels */}
          {inscrits.length>0&&(
            <div style={{marginBottom:16}}>
              <p style={{margin:"0 0 8px",fontSize:12,fontWeight:500,color:"#666"}}>Inscriptions enregistrées</p>
              {inscrits.map((insc,i)=>{
                const cli=CLIENTS_CENTRE.find(c=>c.clientId===insc.clientId)||CLIENTS_CENTRE.find(c=>c.id===insc.clientId);
                return(<div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:"#f9f9f9",borderRadius:"var(--border-radius-md)",marginBottom:6}}>
                  <div style={{width:28,height:28,borderRadius:"50%",background:cl.bg,color:cl.text,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:500,flexShrink:0}}>{cli?.avatar||"?"}</div>
                  <div style={{flex:1}}>
                    <p style={{margin:0,fontSize:13,fontWeight:500,color:"#111"}}>{cli?.nom||"Inconnu"}</p>
                    {insc.commentaire&&<p style={{margin:"2px 0 0",fontSize:11,color:"#888",fontStyle:"italic"}}>"{insc.commentaire}"</p>}
                  </div>
                  <button onClick={()=>desinscrire(l.id,insc.clientId)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:12,color:"#A32D2D",padding:"2px 6px"}}>✕</button>
                </div>);
              })}
            </div>
          )}

          {/* Formulaire inscription */}
          {!plein&&(
            <div style={{borderTop:"0.5px solid #eee",paddingTop:16}}>
              <p style={{margin:"0 0 10px",fontSize:12,fontWeight:500,color:"#666"}}>Inscrire un client</p>
              <select style={{border:"0.5px solid #ddd",borderRadius:"var(--border-radius-md)",padding:"9px 12px",fontSize:13,width:"100%",background:"#fff",color:"#111",boxSizing:"border-box",marginBottom:8}}
                value={inscForm.client} onChange={e=>setInscForm(p=>({...p,client:e.target.value}))}>
                <option value="">Sélectionner un client…</option>
                {CLIENTS_CENTRE.map(c=><option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
              {clientSelDejaInscrit&&<p style={{margin:"0 0 8px",fontSize:12,color:"#A32D2D"}}>Ce client est déjà inscrit à ce cours.</p>}
              <textarea placeholder="Commentaire (optionnel) — niveau, besoin particulier…" rows={3}
                style={{border:"0.5px solid #ddd",borderRadius:"var(--border-radius-md)",padding:"9px 12px",fontSize:13,width:"100%",background:"#fff",color:"#111",boxSizing:"border-box",resize:"vertical",marginBottom:12}}
                value={inscForm.commentaire} onChange={e=>setInscForm(p=>({...p,commentaire:e.target.value}))}/>
              <button onClick={()=>{if(!inscForm.client||clientSelDejaInscrit)return;inscrireClient(l.id,inscForm.client,inscForm.commentaire);}}
                style={{...s.btn("primary"),width:"100%",opacity:(!inscForm.client||clientSelDejaInscrit)?0.5:1,cursor:(!inscForm.client||clientSelDejaInscrit)?"not-allowed":"pointer"}}>
                Confirmer l'inscription
              </button>
            </div>
          )}
          {plein&&<p style={{textAlign:"center",fontSize:13,color:"#A32D2D",fontWeight:500,padding:"12px 0 0"}}>Ce cours est complet.</p>}
        </div>
      </div>
    );
  };

  return(
    <div style={s.wrap}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"1rem 0 1.25rem",borderBottom:"0.5px solid var(--color-border-tertiary)",marginBottom:"1.25rem"}}>
        <div style={{width:36,height:36,borderRadius:"50%",background:ROLES.centre.bg,color:ROLES.centre.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:500,flexShrink:0}}>{session.user.avatar}</div>
        <div style={{flex:1}}>
          <p style={{margin:0,fontSize:15,fontWeight:500}}>Centre équestre · Écuries AR</p>
          <p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)"}}>Planning des cours & événements</p>
        </div>
        <button onClick={logout} style={{background:"transparent",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)",padding:"6px 10px",cursor:"pointer",fontSize:12,color:"var(--color-text-secondary)"}}>↩</button>
      </div>

      {/* Légende niveaux */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
        {Object.entries(niveauC).map(([k,v])=><span key={k} style={s.bdg(v.bg,v.text)}>{k}</span>)}
      </div>

      {/* Planning semaine */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <p style={{margin:0,fontSize:13,fontWeight:500,color:"var(--color-text-secondary)"}}>{wLabel()}</p>
        <div style={{display:"flex",gap:6}}>
          <button style={s.nb(false)} onClick={()=>setCalWOff(p=>p-1)}>←</button>
          <button style={s.nb(false)} onClick={()=>setCalWOff(0)}>Aujourd'hui</button>
          <button style={s.nb(false)} onClick={()=>setCalWOff(p=>p+1)}>→</button>
        </div>
      </div>

      <div style={{border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",overflow:"hidden",marginBottom:32}}>
        {/* En-têtes */}
        <div style={{display:"grid",gridTemplateColumns:"40px repeat(7,1fr)"}}>
          <div style={{borderBottom:"0.5px solid var(--color-border-tertiary)",borderRight:"0.5px solid var(--color-border-tertiary)"}}/>
          {wd.map((d,i)=>{const it=isToday(d);return(
            <div key={i} style={{textAlign:"center",padding:"8px 4px",borderBottom:"0.5px solid var(--color-border-tertiary)",borderRight:i<6?"0.5px solid var(--color-border-tertiary)":"none"}}>
              <div style={{fontSize:10,color:"var(--color-text-secondary)",marginBottom:2}}>{JOURS[i]}</div>
              <div style={{width:26,height:26,borderRadius:"50%",background:it?"var(--color-text-primary)":"transparent",color:it?"var(--color-background-primary)":"var(--color-text-primary)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:it?500:400,margin:"0 auto"}}>{d.getDate()}</div>
            </div>
          );})}
        </div>
        {/* Grille horaire */}
        <div style={{overflowY:"auto",maxHeight:480}}>
          {HOURS.map(h=>(
            <div key={h} style={{display:"grid",gridTemplateColumns:"40px repeat(7,1fr)",minHeight:52}}>
              <div style={{fontSize:9,color:"var(--color-text-secondary)",padding:"3px 4px 0",textAlign:"right",borderRight:"0.5px solid var(--color-border-tertiary)",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>{String(h).padStart(2,'0')}h</div>
              {wd.map((d,di)=>{
                const k=dk(d);
                const lecons=LECONS.filter(l=>l.date===k&&pH(l.heure)>=h*60&&pH(l.heure)<(h+1)*60);
                return(
                  <div key={di} style={{borderRight:di<6?"0.5px solid var(--color-border-tertiary)":"none",borderBottom:"0.5px solid var(--color-border-tertiary)",padding:"2px 3px",minHeight:52}}>
                    {lecons.map(l=>{
                      const cl=COLORS[l.color]||COLORS.teal;const dur=Math.max(pH(l.fin)-pH(l.heure),30);const inscrit=isInscrit(l.id);const plein=l.inscrits>=l.places&&!inscrit;
                      return(
        <div key={l.id} onClick={()=>setSelLecon(l)}
                          style={{background:inscrit?cl.bg:cl.bg,borderLeft:`3px solid ${cl.border}`,borderRadius:4,padding:"3px 6px",marginBottom:2,cursor:"pointer",height:Math.max(dur/60*52-4,20),overflow:"hidden",boxSizing:"border-box",position:"relative"}}>
                          <div style={{fontSize:10,fontWeight:500,color:cl.text,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.titre}</div>
                          <div style={{fontSize:9,color:cl.text,opacity:0.8}}>{l.heure}</div>
                          {inscrit&&<div style={{position:"absolute",top:2,right:4,fontSize:10,color:cl.text,fontWeight:700}}>✓</div>}
                          {plein&&!inscrit&&<div style={{position:"absolute",top:2,right:4,fontSize:9,color:cl.text,opacity:0.6}}>complet</div>}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Mes inscriptions */}
      {Object.keys(inscriptions).filter(id=>inscriptions[id]?.length>0).length>0&&(
        <div style={{marginBottom:28}}>
          <p style={{margin:"0 0 10px",fontSize:13,fontWeight:500,color:"var(--color-text-secondary)"}}>Mes inscriptions</p>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {LECONS.filter(l=>inscriptions[l.id]?.length>0).map(l=>{
              const cl=COLORS[l.color]||COLORS.teal;const nv=niveauC[l.niveau]||niveauC["Tous niveaux"];
              return(
                <div key={l.id} style={{...s.card,display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>setSelLecon(l)}>
                  <div style={{width:4,alignSelf:"stretch",borderRadius:2,background:cl.border,flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:3,flexWrap:"wrap"}}>
                      <span style={{fontSize:13,fontWeight:500}}>{l.titre}</span>
                      <span style={s.bdg(nv.bg,nv.text)}>{l.niveau}</span>
                      <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>{inscriptions[l.id]?.length} inscrit{inscriptions[l.id]?.length>1?"s":""}</span>
                    </div>
                    <p style={{margin:0,fontSize:12,color:"var(--color-text-secondary)"}}>{new Date(l.date+'T12:00').toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})} · {l.heure}–{l.fin} · {l.moniteur}</p>
                  </div>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Événements à venir */}
      <p style={{margin:"0 0 12px",fontSize:13,fontWeight:500,color:"var(--color-text-secondary)"}}>Événements à venir</p>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {EVENTS.map(ev=>{
          const tc=typeC[ev.type]||typeC.Animation;const d=new Date(ev.date+'T12:00');
          return(
            <div key={ev.id} style={{...s.card,borderLeft:`3px solid ${tc.border}`}}>
              <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                <div style={{width:44,height:44,borderRadius:"var(--border-radius-md)",background:tc.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{ev.icone}</div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4,flexWrap:"wrap"}}>
                    <span style={{fontSize:14,fontWeight:500}}>{ev.titre}</span>
                    <span style={s.bdg(tc.bg,tc.text)}>{ev.type}</span>
                  </div>
                  <p style={{margin:"0 0 4px",fontSize:12,color:"var(--color-text-secondary)",fontWeight:500}}>{d.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p>
                  <p style={{margin:0,fontSize:12,color:"var(--color-text-secondary)",lineHeight:1.5}}>{ev.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <LeconPopup/>
    </div>
  );
}
function GestionnaireApp({session,data,save,saving,logout}){
  const [mainTab,setMainTab]=useState("ecurie");
  const [view,setView]=useState("dashboard"); // "dashboard" | "chevalFiche" | "clientFiche" | "metriqueDetail" | "clientMetriqueDetail" | "calMois" | "chevauxAll"
  const [selClient,setSelClient]=useState(null);
  const [selCheval,setSelCheval]=useState(null);
  const [ficheTab,setFicheTab]=useState("chevaux");
  const [clientFicheTab,setClientFicheTab]=useState("chevaux");
  const [showNewTache,setShowNewTache]=useState(false);
  const [newTache,setNewTache]=useState({titre:"",priorite:"Normale",echeance:""});
  const [showNewRdv,setShowNewRdv]=useState(false);
  const [newRdv,setNewRdv]=useState({type:"",client:"",detail:"",date:"",heure:"09:00"});
  const [calWOff,setCalWOff]=useState(0);
  const [selEvent,setSelEvent]=useState(null);
  const [showCreateEv,setShowCreateEv]=useState(false);
  const [newEv,setNewEv]=useState({label:"",type:"Séance",heure:"09:00",fin:"10:00",date:"",cheval:""});
  const [metriqueDetail,setMetriqueDetail]=useState(null);
  const [clientMetriqueDetail,setClientMetriqueDetail]=useState(null);
  const [calMoisY,setCalMoisY]=useState(2025);
  const [calMoisM,setCalMoisM]=useState(3);
  const [gestFavoris,setGestFavoris]=useState([]);
  const [clientsFavoris,setClientsFavoris]=useState([]); // favoris propres au gestionnaire
  const [editTache,setEditTache]=useState(null);
  const [leconCalWOff,setLeconCalWOff]=useState(0);
  const [selLeconGest,setSelLeconGest]=useState(null);
  const [showNewLecon,setShowNewLecon]=useState(false);
  const [newLecon,setNewLecon]=useState({date:"",heure:"09:00",fin:"10:00",titre:"",niveau:"Débutant",places:"8",moniteur:"",color:"teal"});
  const [gestLecons,setGestLecons]=useState([
    {id:"l1",date:"2025-04-13",heure:"09:00",fin:"10:00",titre:"Reprise débutants",niveau:"Débutant",places:8,moniteur:"Julie R.",color:"teal"},
    {id:"l2",date:"2025-04-13",heure:"10:30",fin:"11:30",titre:"Reprise confirmés",niveau:"Confirmé",places:6,moniteur:"Aline M.",color:"purple"},
    {id:"l3",date:"2025-04-13",heure:"14:00",fin:"15:00",titre:"CSO initiation",niveau:"Intermédiaire",places:5,moniteur:"Julie R.",color:"blue"},
    {id:"l4",date:"2025-04-14",heure:"09:00",fin:"10:00",titre:"Reprise débutants",niveau:"Débutant",places:8,moniteur:"Julie R.",color:"teal"},
    {id:"l5",date:"2025-04-14",heure:"17:00",fin:"18:00",titre:"Dressage débutants",niveau:"Débutant",places:6,moniteur:"Aline M.",color:"purple"},
    {id:"l6",date:"2025-04-15",heure:"10:00",fin:"11:00",titre:"Reprise confirmés",niveau:"Confirmé",places:6,moniteur:"Julie R.",color:"blue"},
    {id:"l7",date:"2025-04-15",heure:"15:00",fin:"16:00",titre:"Poney club",niveau:"Enfants",places:10,moniteur:"Aline M.",color:"amber"},
    {id:"l8",date:"2025-04-16",heure:"18:00",fin:"19:00",titre:"Cours adultes loisir",niveau:"Tous niveaux",places:8,moniteur:"Julie R.",color:"green"},
    {id:"l9",date:"2025-04-17",heure:"09:00",fin:"10:00",titre:"Reprise débutants",niveau:"Débutant",places:8,moniteur:"Aline M.",color:"teal"},
    {id:"l10",date:"2025-04-17",heure:"14:00",fin:"15:00",titre:"CSO niveau 2",niveau:"Confirmé",places:5,moniteur:"Julie R.",color:"coral"},
    {id:"l11",date:"2025-04-19",heure:"10:00",fin:"12:00",titre:"Stage week-end",niveau:"Tous niveaux",places:12,moniteur:"Aline M.",color:"amber"},
  ]);
  const [gestInscriptions,setGestInscriptions]=useState({}); // id de la tâche en cours d'édition
  const [newCheval,setNewCheval]=useState({nom:"",race:"",age:"",robe:"",statut:"En travail",discipline:"",proprietaire:"",color:"teal"});
  const [showMsg,setShowMsg]=useState(false);
  const [showNotifs,setShowNotifs]=useState(false);
  const [msgTab,setMsgTab]=useState("libre");
  const [activeConv,setActiveConv]=useState(null);
  const [msgInput,setMsgInput]=useState("");
  const [gestNotifs]=useState([
    {id:1,type:"demande",text:"Nouvelle demande — Claire Dupont",detail:"Bilan mensuel Salsa",time:"10:06",read:false,action:null},
    {id:2,type:"paiement",text:"Paiement en retard — Sophie Bernard",detail:"Demi-pension mars non réglée",time:"Hier",read:false,action:null},
    {id:3,type:"sante",text:"Alerte santé — Horizon",detail:"Vaccin à renouveler",time:"Hier",read:true,action:null},
  ]);
  const [gestNotifState,setGestNotifState]=useState(gestNotifs);
  const [gestConvs,setGestConvs]=useState([
    {id:"gc1",type:"libre",with:"u1",unread:1,messages:[{id:1,from:"u1",text:"Bonjour Aline, est-ce que Ténéré peut avoir une séance supplémentaire cette semaine ?",time:"09:15",cheval:null},{id:2,from:"u2",text:"Bien sûr, je vais regarder le planning.",time:"09:30",cheval:null}]},
    {id:"gc2",type:"libre",with:"u6",unread:2,messages:[{id:1,from:"u6",text:"Bonjour, j'aimerais avoir un bilan mensuel pour Salsa.",time:"10:00",cheval:null},{id:2,from:"u6",text:"Et aussi savoir si je peux venir la voir samedi ?",time:"10:06",cheval:null}]},
    {id:"gc3",type:"cheval",chevalId:4,unread:0,messages:[{id:1,from:"u2",text:"Salsa a bien progressé cette semaine, première mise en selle réussie.",time:"Hier",cheval:{id:4,nom:"Salsa",color:"blue"}}]},
  ]);

  const chevaux=data.chevaux||[];
  const events=data.events||{};

  const upd=(patch)=>save({...data,...patch});
  const updCh=(id,fn)=>upd({chevaux:chevaux.map(c=>c.id===id?fn(c):c)});

  const CLIENTS=[
    {id:"c1",nom:"Claire Dupont",email:"claire@ecuries-ar.fr",tel:"06 12 34 56 78",avatar:"CL",color:"blue",statut:"Actif",
      chevaux:[4],pension:"Pension complète",depuis:"Mars 2024",
      paiements:[{date:"01/04/2025",montant:"450 €",statut:"Payé",desc:"Pension avril — Salsa"},{date:"01/03/2025",montant:"450 €",statut:"Payé",desc:"Pension mars — Salsa"},{date:"01/05/2025",montant:"450 €",statut:"En attente",desc:"Pension mai — Salsa"}],
      demandes:[{date:"13/04/2025",type:"Visite",detail:"Samedi à partir de 10h",statut:"En attente"},{date:"13/04/2025",type:"Bilan mensuel",detail:"Bilan de progression avril",statut:"En attente"}],
      historique:[{date:"13/04/2025",type:"Message",note:"Demande de visite reçue"},{date:"12/04/2025",type:"Séance",note:"Débourrage Salsa — Longe 25 min"},{date:"20/03/2025",type:"Paiement",note:"Règlement mars confirmé"}],
    },
    {id:"c2",nom:"Thomas Martin",email:"thomas@mail.fr",tel:"06 98 76 54 32",avatar:"TM",color:"purple",statut:"Actif",
      chevaux:[],pension:"Cours collectifs",depuis:"Janvier 2025",
      paiements:[{date:"01/04/2025",montant:"120 €",statut:"Payé",desc:"Cours collectifs avril"},{date:"01/05/2025",montant:"120 €",statut:"En attente",desc:"Cours collectifs mai"}],
      demandes:[{date:"10/04/2025",type:"Cours particulier",detail:"Souhait cours particulier CSO",statut:"Traité"}],
      historique:[{date:"10/04/2025",type:"Demande",note:"Demande cours particulier"},{date:"02/04/2025",type:"Paiement",note:"Règlement avril confirmé"}],
    },
    {id:"c3",nom:"Sophie Bernard",email:"sophie@mail.fr",tel:"07 11 22 33 44",avatar:"SB",color:"teal",statut:"Inactif",
      chevaux:[],pension:"Demi-pension",depuis:"Juin 2023",
      paiements:[{date:"01/03/2025",montant:"220 €",statut:"Retard",desc:"Demi-pension mars"},{date:"01/04/2025",montant:"220 €",statut:"En attente",desc:"Demi-pension avril"}],
      demandes:[],
      historique:[{date:"01/04/2025",type:"Alerte",note:"Paiement mars en retard"},{date:"15/03/2025",type:"Contact",note:"Relance envoyée par email"}],
    },
  ];

  const TACHES_INIT=[
    {id:1,titre:"Valider paiement mai — Claire Dupont",priorite:"Haute",echeance:"15/05/2025",fait:false,tag:"Paiement"},
    {id:2,titre:"Répondre demande bilan Salsa",priorite:"Normale",echeance:"14/04/2025",fait:false,tag:"Client"},
    {id:3,titre:"Vaccin Horizon à renouveler",priorite:"Haute",echeance:"10/05/2025",fait:false,tag:"Santé"},
    {id:4,titre:"Préparer planning semaine 17",priorite:"Normale",echeance:"20/04/2025",fait:false,tag:"Planning"},
    {id:5,titre:"Contacter Thomas pour cours particulier",priorite:"Normale",echeance:"15/04/2025",fait:false,tag:"Client"},
    {id:6,titre:"Renouveler contrat pension Salsa",priorite:"Haute",echeance:"01/05/2025",fait:false,tag:"Admin"},
    {id:7,titre:"Contrôle ferrure Ténéré",priorite:"Normale",echeance:"20/04/2025",fait:false,tag:"Cheval"},
  ];
  const [taches,setTaches]=useState(TACHES_INIT);

  const RDV_JOUR=[
    {heure:"08:30",type:"Soins",client:"Écurie",detail:"Parage Horizon — Maréchal",color:"amber"},
    {heure:"10:00",type:"Cours particulier",client:"Thomas Martin",detail:"CSO 45 min",color:"purple"},
    {heure:"11:30",type:"Débourrage",client:"Claire Dupont",detail:"Salsa — longe",color:"blue"},
    {heure:"14:00",type:"Coaching",client:"Manon",detail:"Lumière — Coach Julie",color:"teal"},
    {heure:"16:30",type:"Visite",client:"Claire Dupont",detail:"Passage à l'écurie",color:"blue"},
  ];

  const alertes=[
    {type:"paiement",text:"Paiement en retard — Sophie Bernard",detail:"Demi-pension mars non réglée",color:"coral",action:()=>{setSelClient("c3");setView("clientFiche");setClientFicheTab("paiements");}},
    {type:"paiement",text:"Paiement à valider — Claire Dupont",detail:"Pension mai — 450 €",color:"amber",action:()=>{setSelClient("c1");setView("clientFiche");setClientFicheTab("paiements");}},
    {type:"demande",text:"2 demandes clients en attente",detail:"Claire Dupont · Bilan + Visite",color:"purple",action:()=>{setMainTab("client");setView("dashboard");}},
    {type:"sante",text:"Vaccin à renouveler — Horizon",detail:"Dernier rappel : 10/10/2024",color:"red",action:()=>{setMainTab("ecurie");setView("dashboard");}},
  ];

  const colorMap={blue:COLORS.blue,purple:COLORS.purple,teal:COLORS.teal,amber:COLORS.amber,coral:COLORS.coral,red:{bg:"#FCEBEB",text:"#A32D2D",border:"#F09595"}};

  const cheval=selCheval?chevaux.find(c=>c.id===selCheval):null;
  const colCh=cheval?COLORS[cheval.color]||COLORS.teal:COLORS.teal;
  const client=selClient?CLIENTS.find(c=>c.id===selClient):null;

  const SaveBadge=()=>saving?<div style={{position:"fixed",top:12,right:12,zIndex:200,background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)",padding:"4px 10px",fontSize:11,color:"var(--color-text-secondary)",display:"flex",alignItems:"center",gap:6}}><div style={{width:6,height:6,borderRadius:"50%",background:"#3B6D11",animation:"pulse 1s infinite"}}/>Sauvegarde…<style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style></div>:null;

  const s={
    wrap:{fontFamily:"var(--font-sans)",padding:"0 0 2rem"},
    hdr:{display:"flex",alignItems:"center",gap:10,padding:"1rem 0",borderBottom:"0.5px solid var(--color-border-tertiary)",marginBottom:"1.25rem"},
    nb:(a)=>({background:a?"var(--color-background-secondary)":"transparent",border:"0.5px solid "+(a?"var(--color-border-secondary)":"transparent"),borderRadius:"var(--border-radius-md)",padding:"6px 14px",fontSize:13,fontWeight:a?500:400,color:"var(--color-text-primary)",cursor:"pointer"}),
    card:{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",padding:"1rem 1.25rem",cursor:"pointer"},
    bdg:(bg,tx)=>({background:bg,color:tx,borderRadius:"var(--border-radius-md)",padding:"3px 10px",fontSize:12,fontWeight:500,display:"inline-block"}),
    av:(bg,tx,sz=40)=>({width:sz,height:sz,borderRadius:"50%",background:bg,color:tx,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:500,fontSize:sz>36?14:12,flexShrink:0}),
    tab:(a)=>({background:"transparent",border:"none",borderBottom:a?"2px solid var(--color-text-primary)":"2px solid transparent",padding:"8px 16px",fontSize:13,fontWeight:a?500:400,color:a?"var(--color-text-primary)":"var(--color-text-secondary)",cursor:"pointer",whiteSpace:"nowrap"}),
    row:{display:"flex",gap:10,alignItems:"flex-start",padding:"10px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"},
    btn:(v)=>({border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",padding:"7px 16px",fontSize:13,fontWeight:500,cursor:"pointer",background:v==="primary"?"var(--color-text-primary)":"transparent",color:v==="primary"?"var(--color-background-primary)":"var(--color-text-primary)"}),
    inp:{border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",padding:"8px 12px",fontSize:13,width:"100%",background:"var(--color-background-primary)",color:"var(--color-text-primary)",boxSizing:"border-box"},
    lnk:{background:"transparent",border:"none",fontSize:12,color:"var(--color-text-secondary)",cursor:"pointer",textDecoration:"underline",padding:0},
  };

  const FC=({title,onClose,children})=>(
    <div style={{...s.card,cursor:"default",marginBottom:16,border:"0.5px solid var(--color-border-secondary)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <p style={{margin:0,fontSize:14,fontWeight:500}}>{title}</p>
        {onClose&&<button onClick={onClose} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:16,color:"var(--color-text-secondary)"}}>✕</button>}
      </div>
      {children}
    </div>
  );

  // Header principal avec onglets Écurie / Client
  const MainHeader=({showBack,backFn,backLabel,title})=>{
    const unreadNotifs=gestNotifState.filter(n=>!n.read).length;
    const unreadMsgs=gestConvs.reduce((a,c)=>a+c.unread,0);
    return(<div>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"1rem 0 0.5rem"}}>
        {showBack
          ?<button onClick={backFn} style={{...s.nb(false),padding:"6px 10px"}}>← {backLabel}</button>
          :<div style={{display:"flex",alignItems:"center",gap:8,flex:1}}>
              <div style={s.av(ROLES.gestionnaire.bg,ROLES.gestionnaire.color,34)}>{session.user.avatar}</div>
              <div><p style={{margin:0,fontSize:15,fontWeight:500}}>Bonjour {session.user.nom}</p><p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)"}}>Gestionnaire · Écuries AR</p></div>
            </div>
        }
        {title&&<span style={{fontSize:15,fontWeight:500}}>{title}</span>}
        <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
          <button onClick={logout} style={{background:"transparent",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)",padding:"6px 10px",cursor:"pointer",fontSize:12,color:"var(--color-text-secondary)"}}>↩</button>
        </div>
      </div>
      {!showBack&&(
        <div style={{display:"flex",borderBottom:"0.5px solid var(--color-border-tertiary)",marginBottom:"1.25rem"}}>
          <button style={s.tab(mainTab==="ecurie")} onClick={()=>{setMainTab("ecurie");setView("dashboard");}}>
            <span style={{display:"flex",alignItems:"center",gap:6}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 16s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="20" x2="4" y2="16"/></svg>Vue Écurie</span>
          </button>
          <button style={s.tab(mainTab==="client")} onClick={()=>{setMainTab("client");setView("dashboard");}}>
            <span style={{display:"flex",alignItems:"center",gap:6}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>Vue Client</span>
          </button>
          <button style={s.tab(mainTab==="lecons")} onClick={()=>{setMainTab("lecons");setView("dashboard");}}>
            <span style={{display:"flex",alignItems:"center",gap:6}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Gestion leçons</span>
          </button>
        </div>
      )}
    </div>);
  };

  // ── Fiche cheval (gestionnaire) ──────────────────────────────────────────────
  if(view==="chevalFiche"&&cheval){
    const ownerAcc=DEMO_ACCOUNTS.find(a=>a.nom.toLowerCase()===cheval.proprietaire.toLowerCase());
    const ownerR=ownerAcc?ROLES[ownerAcc.role]:null;
    const ownerBg=ownerR?ownerR.bg:COLORS.gray.bg;const ownerTx=ownerR?ownerR.color:COLORS.gray.text;
    return(<div style={s.wrap}><SaveBadge/>
      <MainHeader showBack backFn={()=>setView("dashboard")} backLabel="Écurie"/>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        {cheval.photo?<img src={cheval.photo} alt={cheval.nom} style={{width:44,height:44,borderRadius:"50%",objectFit:"cover",border:`2px solid ${colCh.border}`,flexShrink:0}}/>:<div style={s.av(colCh.bg,colCh.text,44)}>{cheval.nom.slice(0,2).toUpperCase()}</div>}
        <div><p style={{margin:0,fontSize:16,fontWeight:500}}>{cheval.nom}</p><p style={{margin:0,fontSize:12,color:"var(--color-text-secondary)"}}>{cheval.race} · {cheval.discipline||"—"}</p></div>
        <span style={{...s.bdg((STAT_C[cheval.statut]||{}).bg||"#eee",(STAT_C[cheval.statut]||{}).text||"#333"),marginLeft:"auto"}}>{cheval.statut}</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:"var(--border-radius-md)",background:ownerBg,border:`0.5px solid ${ownerTx}30`,marginBottom:16}}>
        <div style={{width:30,height:30,borderRadius:"50%",background:"rgba(255,255,255,0.5)",color:ownerTx,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:500}}>{cheval.proprietaire.slice(0,2).toUpperCase()}</div>
        <div><div style={{fontSize:11,color:ownerTx,opacity:0.8}}>Propriétaire</div><div style={{fontSize:13,fontWeight:500,color:ownerTx}}>{cheval.proprietaire}</div></div>
        {ownerR&&<span style={{...s.bdg(ownerBg,ownerTx),marginLeft:"auto",fontSize:11}}>{ownerR.label}</span>}
      </div>
      <div style={{borderBottom:"0.5px solid var(--color-border-tertiary)",marginBottom:16,display:"flex"}}>
        {[["seances","Séances"],["sante","Santé"],["palmares","Palmarès"]].map(([k,l])=><button key={k} style={s.tab(ficheTab===k)} onClick={()=>setFicheTab(k)}>{l}</button>)}
      </div>
      {ficheTab==="seances"&&(
        <div>{(cheval.seances||[]).length===0?<p style={{fontSize:13,color:"var(--color-text-secondary)"}}>Aucune séance enregistrée.</p>:(cheval.seances||[]).map((s2,i)=>(
          <div key={i} style={s.row}>
            <div style={{flexShrink:0,width:80,fontSize:12,color:"var(--color-text-secondary)",paddingTop:2}}>{s2.date}</div>
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:3}}><span style={{fontSize:13,fontWeight:500}}>{s2.type}</span>{s2.duree&&s2.duree!=="—"&&<span style={{fontSize:12,color:"var(--color-text-secondary)"}}>{s2.duree}</span>}{s2.score>0&&<span style={{display:"flex",gap:1}}>{[1,2,3,4,5].map(n=><span key={n} style={{fontSize:12,color:n<=s2.score?"#EF9F27":"var(--color-border-secondary)"}}>★</span>)}</span>}</div>
              {s2.note&&<p style={{margin:0,fontSize:12,color:"var(--color-text-secondary)",lineHeight:1.5}}>{s2.note}</p>}
            </div>
          </div>
        ))}</div>
      )}
      {ficheTab==="sante"&&(
        <div>
          <div style={{...s.card,cursor:"default",marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,fontWeight:500}}>Vaccinations</span><span style={s.bdg(cheval.sante.vaccin==="À jour"?"#EAF3DE":"#FAEEDA",cheval.sante.vaccin==="À jour"?"#3B6D11":"#854F0B")}>{cheval.sante.vaccin}</span></div>
            <p style={{margin:"8px 0 0",fontSize:12,color:"var(--color-text-secondary)"}}>Dernier rappel : {cheval.sante.dernier}</p>
          </div>
          {(cheval.sante.rdvs||[]).map((r,i)=>(
            <div key={i} style={s.row}><div style={{flexShrink:0,width:80,fontSize:12,color:"var(--color-text-secondary)",paddingTop:2}}>{r.date}</div><div><p style={{margin:0,fontSize:13,fontWeight:500}}>{r.type}</p>{r.detail&&<p style={{margin:"2px 0 0",fontSize:12,color:"var(--color-text-secondary)"}}>{r.detail}</p>}</div></div>
          ))}
        </div>
      )}
      {ficheTab==="palmares"&&(
        <div>{(cheval.palmares||[]).length===0?<p style={{fontSize:13,color:"var(--color-text-secondary)"}}>Aucun résultat.</p>:(cheval.palmares||[]).map((p,i)=>(
          <div key={i} style={s.row}><div style={{flexShrink:0,width:90,fontSize:12,color:"var(--color-text-secondary)",paddingTop:2}}>{p.date}</div><div><p style={{margin:0,fontSize:13,fontWeight:500}}>{p.epreuve}</p><p style={{margin:"2px 0 0",fontSize:12,color:"var(--color-text-secondary)"}}>{p.classement}</p></div></div>
        ))}</div>
      )}
    </div>);
  }

  // ── Fiche client ─────────────────────────────────────────────────────────────
  if(view==="clientFiche"&&client){
    const cl=colorMap[client.color]||COLORS.blue;
    const chxClient=chevaux.filter(c=>client.chevaux.includes(c.id));
    const statusBdg=(st)=>({Payé:{bg:"#EAF3DE",text:"#3B6D11"},EnAttente:{bg:"#FAEEDA",text:"#854F0B"},"En attente":{bg:"#FAEEDA",text:"#854F0B"},Retard:{bg:"#FCEBEB",text:"#A32D2D"},Traité:{bg:"#EAF3DE",text:"#3B6D11"}}[st]||{bg:"#F1EFE8",text:"#444441"});
    return(<div style={s.wrap}><SaveBadge/>
      <MainHeader showBack backFn={()=>setView("dashboard")} backLabel="Clients"/>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <div style={s.av(cl.bg,cl.text,48)}>{client.avatar}</div>
        <div style={{flex:1}}>
          <p style={{margin:"0 0 2px",fontSize:16,fontWeight:500}}>{client.nom}</p>
          <p style={{margin:0,fontSize:12,color:"var(--color-text-secondary)"}}>{client.email} · {client.tel}</p>
        </div>
        <button onClick={()=>setClientsFavoris(p=>p.includes(client.id)?p.filter(x=>x!==client.id):[...p,client.id])}
          style={{background:"transparent",border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",padding:"5px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontSize:12,color:clientsFavoris.includes(client.id)?"#854F0B":"var(--color-text-secondary)"}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill={clientsFavoris.includes(client.id)?"#EF9F27":"none"} stroke={clientsFavoris.includes(client.id)?"#854F0B":"currentColor"} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          {clientsFavoris.includes(client.id)?"Favori":"Ajouter favori"}
        </button>
        <span style={s.bdg(client.statut==="Actif"?"#EAF3DE":"#F1EFE8",client.statut==="Actif"?"#3B6D11":"#444441")}>{client.statut}</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
        {[["Pension",client.pension],["Depuis",client.depuis],["Chevaux",client.chevaux.length+" en pension"]].map(([k,v])=>(
          <div key={k} style={{background:"var(--color-background-secondary)",borderRadius:"var(--border-radius-md)",padding:"0.6rem 0.9rem"}}>
            <div style={{fontSize:11,color:"var(--color-text-secondary)",marginBottom:3}}>{k}</div>
            <div style={{fontSize:12,fontWeight:500}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{borderBottom:"0.5px solid var(--color-border-tertiary)",marginBottom:16,display:"flex",overflowX:"auto"}}>
        {[["chevaux","Chevaux"],["paiements","Paiements"],["demandes","Demandes"],["historique","Historique"]].map(([k,l])=><button key={k} style={s.tab(clientFicheTab===k)} onClick={()=>setClientFicheTab(k)}>{l}</button>)}
      </div>
      {clientFicheTab==="chevaux"&&(
        <div>{chxClient.length===0?<p style={{fontSize:13,color:"var(--color-text-secondary)"}}>Aucun cheval en pension.</p>:chxClient.map(c=>{
          const cc=COLORS[c.color];const sc=STAT_C[c.statut]||{bg:"#eee",text:"#333"};
          return(<div key={c.id} style={s.card} onClick={()=>{setSelCheval(c.id);setView("chevalFiche");setFicheTab("seances");}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>{c.photo?<img src={c.photo} alt={c.nom} style={{width:36,height:36,borderRadius:"50%",objectFit:"cover",border:`2px solid ${cc.border}`,flexShrink:0}}/>:<div style={s.av(cc.bg,cc.text,36)}>{c.nom.slice(0,2).toUpperCase()}</div>}
              <div style={{flex:1}}><p style={{margin:0,fontWeight:500,fontSize:14}}>{c.nom}</p><p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)"}}>{c.race}</p></div>
              <span style={s.bdg(sc.bg,sc.text)}>{c.statut}</span>
            </div>
          </div>);
        })}</div>
      )}
      {clientFicheTab==="paiements"&&(
        <div>
          {client.paiements.map((p,i)=>{const sb=statusBdg(p.statut);return(
            <div key={i} style={s.row}>
              <div style={{flexShrink:0,width:80,fontSize:12,color:"var(--color-text-secondary)",paddingTop:2}}>{p.date}</div>
              <div style={{flex:1}}><p style={{margin:0,fontSize:13,fontWeight:500}}>{p.desc}</p><div style={{display:"flex",gap:8,alignItems:"center",marginTop:4}}><span style={{fontSize:14,fontWeight:500}}>{p.montant}</span><span style={s.bdg(sb.bg,sb.text)}>{p.statut}</span></div></div>
              {p.statut==="En attente"&&<button style={{...s.btn("primary"),fontSize:12,padding:"4px 12px",flexShrink:0}}>Valider</button>}
            </div>
          );})}
        </div>
      )}
      {clientFicheTab==="demandes"&&(
        <div>{client.demandes.length===0?<p style={{fontSize:13,color:"var(--color-text-secondary)"}}>Aucune demande.</p>:client.demandes.map((d,i)=>{
          const sb=statusBdg(d.statut);return(
            <div key={i} style={{...s.card,cursor:"default",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                <div style={{flex:1}}><div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}><span style={{fontSize:13,fontWeight:500}}>{d.type}</span><span style={s.bdg(sb.bg,sb.text)}>{d.statut}</span></div><p style={{margin:0,fontSize:12,color:"var(--color-text-secondary)"}}>{d.detail} · {d.date}</p></div>
                {d.statut==="En attente"&&<div style={{display:"flex",gap:6,flexShrink:0}}><button style={{...s.btn("primary"),fontSize:12,padding:"4px 10px"}}>Accepter</button><button style={{...s.btn(),fontSize:12,padding:"4px 10px"}}>Refuser</button></div>}
              </div>
            </div>
          );
        })}</div>
      )}
      {clientFicheTab==="historique"&&(
        <div>{client.historique.map((h,i)=>{
          const typeC={Message:{bg:"#E6F1FB",text:"#0C447C"},Séance:{bg:"#EAF3DE",text:"#3B6D11"},Paiement:{bg:"#EEEDFE",text:"#3C3489"},Alerte:{bg:"#FCEBEB",text:"#A32D2D"},Contact:{bg:"#FAEEDA",text:"#854F0B"},Demande:{bg:"#F1EFE8",text:"#444441"}}[h.type]||{bg:"#F1EFE8",text:"#444441"};
          return(<div key={i} style={s.row}><div style={{flexShrink:0,width:80,fontSize:12,color:"var(--color-text-secondary)",paddingTop:2}}>{h.date}</div><div style={{flex:1}}><span style={s.bdg(typeC.bg,typeC.text)}>{h.type}</span><p style={{margin:"4px 0 0",fontSize:13}}>{h.note}</p></div></div>);
        })}</div>
      )}
    </div>);
  }

  // ── Page détail métrique écurie ───────────────────────────────────────────────
  if(view==="metriqueDetail"&&metriqueDetail!==null){
    const defs=[
      {label:"Chevaux à l'écurie"},
      {label:"RDV aujourd'hui",items:RDV_JOUR.map(r=>`${r.heure} — ${r.client} · ${r.type} · ${r.detail}`)},
      {label:"Tâches en cours",items:taches.filter(t=>!t.fait).map(t=>`[${t.priorite}] ${t.titre}${t.echeance?" → "+t.echeance:""}`)},
      {label:"Alertes santé",items:chevaux.filter(c=>c.sante.vaccin==="À renouveler").map(c=>`${c.nom} — Vaccin à renouveler (dernier : ${c.sante.dernier})`)},
    ];
    const d=defs[metriqueDetail];
    return(<div style={s.wrap}><SaveBadge/>
      <MainHeader showBack backFn={()=>setView("dashboard")} backLabel="Tableau de bord"/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{fontSize:17,fontWeight:500,margin:0}}>{d.label}</h2>
        {metriqueDetail===0&&<button style={{...s.btn("primary"),fontSize:12,padding:"5px 14px"}} onClick={()=>setShowCreateCheval(p=>!p)}>{showCreateCheval?"Annuler":"+ Nouveau cheval"}</button>}
      </div>

      {/* Formulaire création cheval */}
      {metriqueDetail===0&&showCreateCheval&&<FC title="Nouveau profil cheval" onClose={()=>setShowCreateCheval(false)}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
          <input placeholder="Nom *" style={s.inp} value={newCheval.nom} onChange={e=>setNewCheval(p=>({...p,nom:e.target.value}))}/>
          <input placeholder="Propriétaire *" style={s.inp} value={newCheval.proprietaire} onChange={e=>setNewCheval(p=>({...p,proprietaire:e.target.value}))}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
          <input placeholder="Race" style={s.inp} value={newCheval.race} onChange={e=>setNewCheval(p=>({...p,race:e.target.value}))}/>
          <input placeholder="Robe" style={s.inp} value={newCheval.robe} onChange={e=>setNewCheval(p=>({...p,robe:e.target.value}))}/>
          <input type="number" placeholder="Âge" style={s.inp} value={newCheval.age} onChange={e=>setNewCheval(p=>({...p,age:e.target.value}))}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
          <input placeholder="Discipline" style={s.inp} value={newCheval.discipline} onChange={e=>setNewCheval(p=>({...p,discipline:e.target.value}))}/>
          <select style={s.inp} value={newCheval.statut} onChange={e=>setNewCheval(p=>({...p,statut:e.target.value}))}>{Object.keys(STAT_C).map(st=><option key={st}>{st}</option>)}</select>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:14}}>
          <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>Couleur :</span>
          {["teal","purple","amber","blue","coral","green"].map(c=><div key={c} onClick={()=>setNewCheval(p=>({...p,color:c}))} style={{width:22,height:22,borderRadius:"50%",background:COLORS[c].bg,border:`2px solid ${newCheval.color===c?COLORS[c].border:"transparent"}`,cursor:"pointer"}}/>)}
        </div>
        <button style={s.btn("primary")} onClick={()=>{
          if(!newCheval.nom||!newCheval.proprietaire)return;
          upd({chevaux:[...chevaux,{...newCheval,id:Date.now(),age:parseInt(newCheval.age)||0,favori:false,photo:null,sante:{vaccin:"À jour",dernier:"—",rdvs:[]},palmares:[],seances:[],medias:[]}]});
          setNewCheval({nom:"",race:"",age:"",robe:"",statut:"En travail",discipline:"",proprietaire:"",color:"teal"});setShowCreateCheval(false);
        }}>Créer le profil</button>
      </FC>}

      {/* Liste chevaux en cartes */}
      {metriqueDetail===0&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10}}>
          {chevaux.map(c=>{
            const cl=COLORS[c.color];const sc=STAT_C[c.statut]||{bg:"#eee",text:"#333"};const isFav=gestFavoris.includes(c.id);
            return(<div key={c.id} style={s.card} onClick={()=>{setSelCheval(c.id);setView("chevalFiche");setFicheTab("seances");}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                {c.photo?<img src={c.photo} alt={c.nom} style={{width:34,height:34,borderRadius:"50%",objectFit:"cover",border:`2px solid ${cl.border}`,flexShrink:0}}/>:<div style={s.av(cl.bg,cl.text,34)}>{c.nom.slice(0,2).toUpperCase()}</div>}
                <div style={{flex:1}}><p style={{margin:0,fontWeight:500,fontSize:13}}>{c.nom}</p><p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)"}}>{c.proprietaire}</p></div>
                <button onClick={e=>{e.stopPropagation();setGestFavoris(p=>isFav?p.filter(id=>id!==c.id):[...p,c.id]);}} style={{background:"transparent",border:"none",cursor:"pointer",padding:4,flexShrink:0}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={isFav?"#EF9F27":"none"} stroke={isFav?"#854F0B":"var(--color-border-secondary)"} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </button>
              </div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}><span style={s.bdg(sc.bg,sc.text)}>{c.statut}</span><span style={s.bdg("var(--color-background-secondary)","var(--color-text-secondary)")}>{c.discipline||"—"}</span></div>
            </div>);
          })}
        </div>
      )}

      {/* Autres métriques en liste texte */}
      {metriqueDetail!==0&&(
        d.items.length===0?<p style={{fontSize:13,color:"var(--color-text-secondary)"}}>Aucun élément.</p>:d.items.map((item,i)=>(
          <div key={i} style={{display:"flex",gap:12,padding:"12px 0",borderBottom:"0.5px solid var(--color-border-tertiary)",alignItems:"center",cursor:"default"}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:"var(--color-background-secondary)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:500,flexShrink:0,color:"var(--color-text-secondary)"}}>{i+1}</div>
            <p style={{margin:0,fontSize:13,lineHeight:1.5,flex:1}}>{item}</p>
          </div>
        ))
      )}
    </div>);
  }

  // ── Page détail métrique client ───────────────────────────────────────────────
  if(view==="clientMetriqueDetail"&&clientMetriqueDetail!==null){
    const defsClient=[
      {label:"Tous les clients",content:()=>(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {CLIENTS.map(c=>{const cl=colorMap[c.color]||COLORS.blue;const pp=c.paiements.filter(p=>p.statut==="En attente"||p.statut==="Retard").length;const pd=c.demandes.filter(d=>d.statut==="En attente").length;return(
            <div key={c.id} style={s.card} onClick={()=>{setSelClient(c.id);setView("clientFiche");setClientFicheTab("chevaux");}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={s.av(cl.bg,cl.text,40)}>{c.avatar}</div>
                <div style={{flex:1}}><p style={{margin:"0 0 2px",fontWeight:500,fontSize:14}}>{c.nom}</p><p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)"}}>{c.pension} · depuis {c.depuis}</p></div>
                <div style={{display:"flex",gap:5,flexShrink:0,flexWrap:"wrap",justifyContent:"flex-end"}}>
                  {pp>0&&<span style={s.bdg("#FAEEDA","#854F0B")}>{pp} paiement{pp>1?"s":""}</span>}
                  {pd>0&&<span style={s.bdg("#EEEDFE","#3C3489")}>{pd} demande{pd>1?"s":""}</span>}
                  <span style={s.bdg(c.statut==="Actif"?"#EAF3DE":"#F1EFE8",c.statut==="Actif"?"#3B6D11":"#444441")}>{c.statut}</span>
                </div>
              </div>
            </div>
          );})}
        </div>
      )},
      {label:"Demandes en attente",content:()=>(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {CLIENTS.flatMap(c=>c.demandes.filter(d=>d.statut==="En attente").map(d=>({...d,clientNom:c.nom,clientId:c.id,clientColor:c.color}))).map((d,i)=>{
            const cl=colorMap[d.clientColor]||COLORS.blue;
            return(<div key={i} style={{...s.card,cursor:"default"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                    <div style={s.av(cl.bg,cl.text,28)}>{d.clientNom.slice(0,2).toUpperCase()}</div>
                    <span style={{fontSize:13,fontWeight:500}}>{d.clientNom}</span>
                    <span style={s.bdg("#FAEEDA","#854F0B")}>{d.type}</span>
                  </div>
                  <p style={{margin:"0 0 10px",fontSize:12,color:"var(--color-text-secondary)",paddingLeft:36}}>{d.detail} · {d.date}</p>
                  <div style={{display:"flex",gap:8,paddingLeft:36}}>
                    <button style={{...s.btn("primary"),fontSize:12,padding:"5px 14px"}}>Accepter</button>
                    <button style={{...s.btn(),fontSize:12,padding:"5px 14px"}}>Refuser</button>
                    <button style={{...s.lnk,fontSize:12}} onClick={()=>{setSelClient(d.clientId);setView("clientFiche");setClientFicheTab("demandes");}}>Voir la fiche →</button>
                  </div>
                </div>
              </div>
            </div>);
          })}
          {CLIENTS.flatMap(c=>c.demandes.filter(d=>d.statut==="En attente")).length===0&&<p style={{fontSize:13,color:"var(--color-text-secondary)"}}>Aucune demande en attente.</p>}
        </div>
      )},
      {label:"Paiements à valider",content:()=>(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {CLIENTS.flatMap(c=>c.paiements.filter(p=>p.statut==="En attente"||p.statut==="Retard").map(p=>({...p,clientNom:c.nom,clientId:c.id,clientColor:c.color}))).map((p,i)=>{
            const cl=colorMap[p.clientColor]||COLORS.blue;const sc=p.statut==="Retard"?{bg:"#FCEBEB",text:"#A32D2D"}:{bg:"#FAEEDA",text:"#854F0B"};
            return(<div key={i} style={{...s.card,cursor:"default"}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={s.av(cl.bg,cl.text,36)}>{p.clientNom.slice(0,2).toUpperCase()}</div>
                <div style={{flex:1}}>
                  <p style={{margin:"0 0 3px",fontSize:13,fontWeight:500}}>{p.clientNom}</p>
                  <p style={{margin:0,fontSize:12,color:"var(--color-text-secondary)"}}>{p.desc} · {p.date}</p>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
                  <span style={{fontSize:15,fontWeight:500}}>{p.montant}</span>
                  <span style={s.bdg(sc.bg,sc.text)}>{p.statut}</span>
                  <button style={{...s.btn("primary"),fontSize:12,padding:"5px 14px"}}>Valider</button>
                </div>
              </div>
            </div>);
          })}
          {CLIENTS.flatMap(c=>c.paiements.filter(p=>p.statut==="En attente"||p.statut==="Retard")).length===0&&<p style={{fontSize:13,color:"var(--color-text-secondary)"}}>Aucun paiement en attente.</p>}
        </div>
      )},
      {label:"Tâches clients",content:()=>(
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {taches.filter(t=>t.tag==="Client"||t.tag==="Paiement").map(t=>{
            const pC={Haute:{bg:"#FCEBEB",text:"#A32D2D"},Normale:{bg:"#E6F1FB",text:"#0C447C"},Basse:{bg:"#F1EFE8",text:"#444441"}}[t.priorite]||{bg:"#E6F1FB",text:"#0C447C"};
            return(<div key={t.id} style={{...s.card,cursor:"default",display:"flex",alignItems:"center",gap:10}}>
              <button onClick={()=>setTaches(p=>p.map(x=>x.id===t.id?{...x,fait:!x.fait}:x))} style={{width:22,height:22,borderRadius:"50%",border:"1.5px solid var(--color-border-secondary)",background:t.fait?"var(--color-text-primary)":"transparent",cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                {t.fait&&<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-background-primary)" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
              </button>
              <div style={{flex:1,textDecoration:t.fait?"line-through":"none",opacity:t.fait?0.5:1}}>
                <p style={{margin:"0 0 3px",fontSize:13}}>{t.titre}</p>
                <div style={{display:"flex",gap:6}}><span style={s.bdg(pC.bg,pC.text)}>{t.priorite}</span>{t.echeance&&<span style={{fontSize:11,color:"var(--color-text-secondary)"}}>→ {t.echeance}</span>}</div>
              </div>
            </div>);
          })}
        </div>
      )},
    ];
    const d=defsClient[clientMetriqueDetail];
    return(<div style={s.wrap}><SaveBadge/>
      <MainHeader showBack backFn={()=>{setView("dashboard");setMainTab("client");}} backLabel="Vue client"/>
      <h2 style={{fontSize:17,fontWeight:500,margin:"0 0 20px"}}>{d.label}</h2>
      {d.content()}
    </div>);
  }

  // ── Vue mois calendrier ───────────────────────────────────────────────────────
  if(view==="calMois"){
    const dim=getDIM(calMoisY,calMoisM);const first=getFDom(calMoisY,calMoisM);
    const cells=[];for(let i=0;i<first;i++)cells.push(null);for(let d=1;d<=dim;d++)cells.push(d);while(cells.length%7!==0)cells.push(null);
    const tod=new Date(2025,3,13);const isToday=(d)=>d===tod.getDate()&&calMoisM===tod.getMonth()&&calMoisY===tod.getFullYear();
    return(<div style={s.wrap}><SaveBadge/>
      <MainHeader showBack backFn={()=>setView("dashboard")} backLabel="Tableau de bord"/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <h2 style={{fontSize:17,fontWeight:500,margin:0}}>{MOIS[calMoisM]} {calMoisY}</h2>
        <div style={{display:"flex",gap:6}}>
          <button style={{background:"transparent",border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",padding:"5px 12px",fontSize:12,cursor:"pointer",color:"var(--color-text-primary)"}} onClick={()=>{if(calMoisM===0){setCalMoisM(11);setCalMoisY(y=>y-1);}else setCalMoisM(m=>m-1);}}>←</button>
          <button style={{background:"transparent",border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",padding:"5px 12px",fontSize:12,cursor:"pointer",color:"var(--color-text-primary)"}} onClick={()=>{setCalMoisM(3);setCalMoisY(2025);}}>Aujourd'hui</button>
          <button style={{background:"transparent",border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",padding:"5px 12px",fontSize:12,cursor:"pointer",color:"var(--color-text-primary)"}} onClick={()=>{if(calMoisM===11){setCalMoisM(0);setCalMoisY(y=>y+1);}else setCalMoisM(m=>m+1);}}>→</button>
        </div>
      </div>
      <div style={{border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
          {JOURS.map((j,i)=><div key={j} style={{textAlign:"center",fontSize:11,fontWeight:500,color:"var(--color-text-secondary)",padding:"10px 0",borderRight:i<6?"0.5px solid var(--color-border-tertiary)":"none"}}>{j}</div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
          {cells.map((d,i)=>{
            const k=d?dKey(calMoisY,calMoisM,d):null;const evts=k?(events[k]||[]):[];const it=d&&isToday(d);
            return(<div key={i} style={{minHeight:90,borderRight:(i+1)%7!==0?"0.5px solid var(--color-border-tertiary)":"none",borderBottom:i<cells.length-7?"0.5px solid var(--color-border-tertiary)":"none",padding:"6px",background:it?"var(--color-background-secondary)":"transparent"}}>
              {d&&<>
                <div style={{width:24,height:24,borderRadius:"50%",background:it?"var(--color-text-primary)":"transparent",color:it?"var(--color-background-primary)":"var(--color-text-primary)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:it?500:400,marginBottom:4}}>{d}</div>
                {evts.slice(0,3).map(ev=>{const cl=COLORS[ev.color]||COLORS.teal;return(<div key={ev.id} style={{background:cl.bg,borderRadius:3,padding:"1px 5px",marginBottom:2}}><div style={{fontSize:10,color:cl.text,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.label}</div></div>);})}
                {evts.length>3&&<div style={{fontSize:10,color:"var(--color-text-secondary)"}}>+{evts.length-3}</div>}
              </>}
            </div>);
          })}
        </div>
      </div>
    </div>);
  }
  const alertsPay=CLIENTS.filter(c=>c.paiements.some(p=>p.statut==="En attente"||p.statut==="Retard")).length;
  const demandesCount=CLIENTS.reduce((a,c)=>a+c.demandes.filter(d=>d.statut==="En attente").length,0);

  return(<div style={s.wrap}><SaveBadge/>
    <MainHeader showBack={false}/>

    {/* VUE ÉCURIE */}
    {mainTab==="ecurie"&&(<>

      {/* Métriques écurie cliquables */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginBottom:24}}>
        {[
          {n:String(chevaux.length),label:"Chevaux à l'écurie",bg:"#E1F5EE",text:"#0F6E56",border:"#5DCAA5",icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 16s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="20" x2="4" y2="16"/></svg>},
          {n:String(RDV_JOUR.length),label:"RDV aujourd'hui",bg:"#EEEDFE",text:"#3C3489",border:"#AFA9EC",icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>},
          {n:String(taches.filter(t=>!t.fait).length),label:"Tâches en cours",bg:"#FAEEDA",text:"#854F0B",border:"#EF9F27",icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>},
          {n:String(chevaux.filter(c=>c.sante.vaccin==="À renouveler").length),label:"Alertes santé",bg:"#FAECE7",text:"#712B13",border:"#F0997B",icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>},
        ].map((m,i)=>(
          <div key={i} onClick={()=>{setMetriqueDetail(i);setView("metriqueDetail");}}
            style={{background:m.bg,borderRadius:"var(--border-radius-lg)",padding:"1rem 1.25rem",border:`0.5px solid ${m.border}`,cursor:"pointer",transition:"opacity 0.15s"}}
            onMouseEnter={e=>e.currentTarget.style.opacity="0.8"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
              <div style={{width:34,height:34,borderRadius:"var(--border-radius-md)",background:"rgba(255,255,255,0.45)",display:"flex",alignItems:"center",justifyContent:"center",color:m.text}}>{m.icon}</div>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={m.text} strokeWidth="2" style={{opacity:0.5,marginTop:4}}><polyline points="9 18 15 12 9 6"/></svg>
            </div>
            <div style={{fontSize:30,fontWeight:500,color:m.text,lineHeight:1,marginBottom:6}}>{m.n}</div>
            <div style={{fontSize:12,color:m.text,opacity:0.75,fontWeight:500}}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Calendrier semaine */}
      {(()=>{
        const tod=new Date(2025,3,13);
        const getWD=(off=0)=>{const b=new Date(2025,3,13);b.setDate(b.getDate()+off*7);return Array.from({length:7},(_,i)=>{const d=new Date(b);d.setDate(b.getDate()+i);return d;});};
        const wd=getWD(calWOff);
        const wLabel=()=>{const f=wd[0],l=wd[6];if(f.getMonth()===l.getMonth())return`${f.getDate()} — ${l.getDate()} ${MOIS[f.getMonth()]} ${f.getFullYear()}`;return`${f.getDate()} ${MOIS[f.getMonth()]} — ${l.getDate()} ${MOIS[l.getMonth()]} ${f.getFullYear()}`;};
        const isToday=(d)=>d.getFullYear()===tod.getFullYear()&&d.getMonth()===tod.getMonth()&&d.getDate()===tod.getDate();
        const dk=(d)=>dKey(d.getFullYear(),d.getMonth(),d.getDate());
        const hours=Array.from({length:13},(_,i)=>i+7);

        // Popup événement
        const EP=()=>{
          if(!selEvent)return null;
          const cl=COLORS[selEvent.color||"teal"]||COLORS.teal;
          const tc={Santé:{bg:"#FAEEDA",text:"#854F0B"},Séance:{bg:"#EAF3DE",text:"#3B6D11"},Coaching:{bg:"#EEEDFE",text:"#3C3489"},Compétition:{bg:"#FAECE7",text:"#712B13"}}[selEvent.type||"Séance"]||{bg:"#EAF3DE",text:"#3B6D11"};
          return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.2)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}} onClick={()=>setSelEvent(null)}>
            <div style={{background:"var(--color-background-primary)",borderRadius:"var(--border-radius-lg)",padding:"1.25rem",width:300,border:"0.5px solid var(--color-border-tertiary)"}} onClick={e=>e.stopPropagation()}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><div><p style={{margin:"0 0 6px",fontSize:15,fontWeight:500}}>{selEvent.label}</p><span style={{background:tc.bg,color:tc.text,borderRadius:"var(--border-radius-md)",padding:"3px 10px",fontSize:12,fontWeight:500}}>{selEvent.type}</span></div><button onClick={()=>setSelEvent(null)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:16,color:"var(--color-text-secondary)"}}>✕</button></div>
              <div style={{display:"flex",gap:8,padding:"8px 0",borderTop:"0.5px solid var(--color-border-tertiary)"}}><div style={{width:3,borderRadius:2,background:cl.border,flexShrink:0}}/><div><p style={{margin:0,fontSize:13,fontWeight:500}}>{selEvent.heure} — {selEvent.fin}</p><p style={{margin:"2px 0 0",fontSize:12,color:"var(--color-text-secondary)"}}>Durée : {pH(selEvent.fin)-pH(selEvent.heure)} min</p></div></div>
            </div>
          </div>);
        };

        return(<>
          <EP/>
          <div style={{marginBottom:24}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <p style={{margin:0,fontSize:13,fontWeight:500,color:"var(--color-text-secondary)"}}>{wLabel()}</p>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <button style={{background:"transparent",border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",padding:"4px 10px",fontSize:12,cursor:"pointer",color:"var(--color-text-primary)"}} onClick={()=>setCalWOff(p=>p-1)}>←</button>
                <button style={{background:"transparent",border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",padding:"4px 10px",fontSize:12,cursor:"pointer",color:"var(--color-text-primary)"}} onClick={()=>setCalWOff(0)}>Auj.</button>
                <button style={{background:"transparent",border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",padding:"4px 10px",fontSize:12,cursor:"pointer",color:"var(--color-text-primary)"}} onClick={()=>setCalWOff(p=>p+1)}>→</button>
                <button style={{background:"transparent",border:"none",fontSize:12,color:"var(--color-text-secondary)",cursor:"pointer",textDecoration:"underline",padding:0}} onClick={()=>setView("calMois")}>Voir tout →</button>
                <button style={{...s.btn("primary"),fontSize:12,padding:"4px 12px"}} onClick={()=>setShowCreateEv(p=>!p)}>{showCreateEv?"Annuler":"+ Événement"}</button>
              </div>
            </div>
            {showCreateEv&&<FC title="Nouvel événement" onClose={()=>setShowCreateEv(false)}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                <input placeholder="Titre *" style={s.inp} value={newEv.label} onChange={e=>setNewEv(p=>({...p,label:e.target.value}))}/>
                <select style={s.inp} value={newEv.type} onChange={e=>setNewEv(p=>({...p,type:e.target.value}))}>{["Séance","Santé","Coaching","Compétition"].map(t=><option key={t}>{t}</option>)}</select>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
                <input type="date" style={s.inp} value={newEv.date} onChange={e=>setNewEv(p=>({...p,date:e.target.value}))}/>
                <input type="time" style={s.inp} value={newEv.heure} onChange={e=>setNewEv(p=>({...p,heure:e.target.value}))}/>
                <input type="time" style={s.inp} value={newEv.fin} onChange={e=>setNewEv(p=>({...p,fin:e.target.value}))}/>
              </div>
              <select style={{...s.inp,marginBottom:12}} value={newEv.cheval} onChange={e=>setNewEv(p=>({...p,cheval:e.target.value}))}><option value="">Associer un cheval (optionnel)</option>{chevaux.map(c=><option key={c.id} value={c.id}>{c.nom}</option>)}</select>
              <button style={s.btn("primary")} onClick={()=>{
                if(!newEv.label||!newEv.date)return;
                const ch=newEv.cheval?chevaux.find(c=>c.id===parseInt(newEv.cheval)):null;
                const label=ch?`${newEv.label} — ${ch.nom}`:newEv.label;
                const eid=Date.now();
                upd({events:{...events,[newEv.date]:[...(events[newEv.date]||[]),{id:eid,heure:newEv.heure,fin:newEv.fin,label,type:newEv.type,color:ch?ch.color:"teal"}]}});
                setNewEv({label:"",type:"Séance",heure:"09:00",fin:"10:00",date:"",cheval:""});setShowCreateEv(false);
              }}>Ajouter au calendrier</button>
            </FC>}
            <div style={{border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",overflow:"hidden"}}>
              {/* En-têtes jours */}
              <div style={{display:"grid",gridTemplateColumns:"40px repeat(7,1fr)"}}>
                <div style={{borderBottom:"0.5px solid var(--color-border-tertiary)",borderRight:"0.5px solid var(--color-border-tertiary)"}}/>
                {wd.map((d,i)=>{const it=isToday(d);return(
                  <div key={i} style={{textAlign:"center",padding:"7px 2px",borderBottom:"0.5px solid var(--color-border-tertiary)",borderRight:i<6?"0.5px solid var(--color-border-tertiary)":"none"}}>
                    <div style={{fontSize:10,color:"var(--color-text-secondary)",marginBottom:2}}>{JOURS[i]}</div>
                    <div style={{width:26,height:26,borderRadius:"50%",background:it?"var(--color-text-primary)":"transparent",color:it?"var(--color-background-primary)":"var(--color-text-primary)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:it?500:400,margin:"0 auto"}}>{d.getDate()}</div>
                  </div>
                );})}
              </div>
              {/* Grille horaire */}
              <div style={{overflowY:"auto",maxHeight:400}}>
                {hours.map(h=>(
                  <div key={h} style={{display:"grid",gridTemplateColumns:"40px repeat(7,1fr)",minHeight:48}}>
                    <div style={{fontSize:9,color:"var(--color-text-secondary)",padding:"3px 4px 0 0",textAlign:"right",borderRight:"0.5px solid var(--color-border-tertiary)",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>{String(h).padStart(2,'0')}h</div>
                    {wd.map((d,di)=>{
                      const k=dk(d);const evts=(events[k]||[]).filter(e=>pH(e.heure)>=h*60&&pH(e.heure)<(h+1)*60);
                      return(<div key={di} style={{borderRight:di<6?"0.5px solid var(--color-border-tertiary)":"none",borderBottom:"0.5px solid var(--color-border-tertiary)",padding:"2px 2px",minHeight:48}}>
                        {evts.map(ev=>{const cl=COLORS[ev.color]||COLORS.teal;const dur=Math.max(pH(ev.fin||"10:00")-pH(ev.heure),30);return(
                          <div key={ev.id} onClick={()=>setSelEvent(ev)} style={{background:cl.bg,borderLeft:`2px solid ${cl.border}`,borderRadius:3,padding:"2px 4px",marginBottom:2,cursor:"pointer",height:Math.max(dur/60*48-4,16),overflow:"hidden",boxSizing:"border-box"}}>
                            <div style={{fontSize:9,fontWeight:500,color:cl.text,lineHeight:1.2}}>{ev.heure}</div>
                            <div style={{fontSize:9,color:cl.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.label}</div>
                          </div>
                        );})}
                      </div>);
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>);
      })()}

      {/* Chevaux favoris gestionnaire — indépendants */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <p style={{margin:0,fontSize:13,fontWeight:500,color:"var(--color-text-secondary)"}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#EF9F27" stroke="#854F0B" strokeWidth="2" style={{marginRight:5,verticalAlign:"middle"}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          Mes chevaux favoris
        </p>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <button style={s.lnk} onClick={()=>{setMetriqueDetail(0);setView("metriqueDetail");}}>Gérer / voir tous →</button>
        </div>
      </div>
      {gestFavoris.length===0
        ?<p style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:16}}>Aucun favori. Clique sur "Gérer / voir tous" et marque une étoile.</p>
        :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10,marginBottom:24}}>
          {chevaux.filter(c=>gestFavoris.includes(c.id)).map(c=>{const cl=COLORS[c.color];const sc=STAT_C[c.statut]||{bg:"#eee",text:"#333"};return(
            <div key={c.id} style={s.card} onClick={()=>{setSelCheval(c.id);setView("chevalFiche");setFicheTab("seances");}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                {c.photo?<img src={c.photo} alt={c.nom} style={{width:36,height:36,borderRadius:"50%",objectFit:"cover",border:`2px solid ${cl.border}`,flexShrink:0}}/>:<div style={s.av(cl.bg,cl.text,36)}>{c.nom.slice(0,2).toUpperCase()}</div>}
                <div style={{flex:1}}><p style={{margin:0,fontWeight:500,fontSize:13}}>{c.nom}</p><p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)"}}>{c.proprietaire}</p></div>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="#EF9F27" stroke="#854F0B" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:6}}><span style={s.bdg(sc.bg,sc.text)}>{c.statut}</span><span style={s.bdg("var(--color-background-secondary)","var(--color-text-secondary)")}>{c.discipline||"—"}</span></div>
              <p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)"}}>RDV : {c.sante.rdvs?.[0]?.date||"—"}</p>
            </div>
          );})}
        </div>
      }

      {/* Liste tous les chevaux avec gestion favoris + création */}
      {view==="chevauxAll"&&(
        <div style={{marginBottom:24}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <p style={{margin:0,fontSize:13,fontWeight:500,color:"var(--color-text-secondary)"}}>Tous les chevaux ({chevaux.length})</p>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button style={s.lnk} onClick={()=>setView("dashboard")}>← Réduire</button>
              <button style={{...s.btn("primary"),fontSize:12,padding:"4px 12px"}} onClick={()=>setShowCreateCheval(p=>!p)}>{showCreateCheval?"Annuler":"+ Nouveau cheval"}</button>
            </div>
          </div>
          {showCreateCheval&&<FC title="Nouveau profil cheval" onClose={()=>setShowCreateCheval(false)}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              <input placeholder="Nom *" style={s.inp} value={newCheval.nom} onChange={e=>setNewCheval(p=>({...p,nom:e.target.value}))}/>
              <input placeholder="Propriétaire *" style={s.inp} value={newCheval.proprietaire} onChange={e=>setNewCheval(p=>({...p,proprietaire:e.target.value}))}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
              <input placeholder="Race" style={s.inp} value={newCheval.race} onChange={e=>setNewCheval(p=>({...p,race:e.target.value}))}/>
              <input placeholder="Robe" style={s.inp} value={newCheval.robe} onChange={e=>setNewCheval(p=>({...p,robe:e.target.value}))}/>
              <input type="number" placeholder="Âge" style={s.inp} value={newCheval.age} onChange={e=>setNewCheval(p=>({...p,age:e.target.value}))}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              <input placeholder="Discipline" style={s.inp} value={newCheval.discipline} onChange={e=>setNewCheval(p=>({...p,discipline:e.target.value}))}/>
              <select style={s.inp} value={newCheval.statut} onChange={e=>setNewCheval(p=>({...p,statut:e.target.value}))}>{Object.keys(STAT_C).map(st=><option key={st}>{st}</option>)}</select>
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:14}}>
              <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>Couleur :</span>
              {["teal","purple","amber","blue","coral","green"].map(c=><div key={c} onClick={()=>setNewCheval(p=>({...p,color:c}))} style={{width:22,height:22,borderRadius:"50%",background:COLORS[c].bg,border:`2px solid ${newCheval.color===c?COLORS[c].border:"transparent"}`,cursor:"pointer"}}/>)}
            </div>
            <button style={s.btn("primary")} onClick={()=>{
              if(!newCheval.nom||!newCheval.proprietaire)return;
              upd({chevaux:[...chevaux,{...newCheval,id:Date.now(),age:parseInt(newCheval.age)||0,favori:false,photo:null,sante:{vaccin:"À jour",dernier:"—",rdvs:[]},palmares:[],seances:[],medias:[]}]});
              setNewCheval({nom:"",race:"",age:"",robe:"",statut:"En travail",discipline:"",proprietaire:"",color:"teal"});setShowCreateCheval(false);
            }}>Créer le profil</button>
          </FC>}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10}}>
            {chevaux.map(c=>{const cl=COLORS[c.color];const sc=STAT_C[c.statut]||{bg:"#eee",text:"#333"};const isFav=gestFavoris.includes(c.id);return(
              <div key={c.id} style={s.card} onClick={()=>{setSelCheval(c.id);setView("chevalFiche");setFicheTab("seances");}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  {c.photo?<img src={c.photo} alt={c.nom} style={{width:34,height:34,borderRadius:"50%",objectFit:"cover",border:`2px solid ${cl.border}`,flexShrink:0}}/>:<div style={s.av(cl.bg,cl.text,34)}>{c.nom.slice(0,2).toUpperCase()}</div>}
                  <div style={{flex:1}}><p style={{margin:0,fontWeight:500,fontSize:13}}>{c.nom}</p><p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)"}}>{c.proprietaire}</p></div>
                  <button onClick={e=>{e.stopPropagation();setGestFavoris(p=>isFav?p.filter(id=>id!==c.id):[...p,c.id]);}} style={{background:"transparent",border:"none",cursor:"pointer",padding:4}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={isFav?"#EF9F27":"none"} stroke={isFav?"#854F0B":"var(--color-border-secondary)"} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  </button>
                </div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}><span style={s.bdg(sc.bg,sc.text)}>{c.statut}</span><span style={s.bdg("var(--color-background-secondary)","var(--color-text-secondary)")}>{c.discipline||"—"}</span></div>
              </div>
            );})}
          </div>
        </div>
      )}

      {/* Tâches */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <p style={{margin:0,fontSize:13,fontWeight:500,color:"var(--color-text-secondary)"}}>Tâches</p>
        <button style={{...s.btn(),fontSize:12,padding:"4px 12px"}} onClick={()=>setShowNewTache(p=>!p)}>+ Tâche</button>
      </div>
      {showNewTache&&<FC title="Nouvelle tâche" onClose={()=>setShowNewTache(false)}>
        <input placeholder="Titre de la tâche *" style={{...s.inp,marginBottom:8}} value={newTache.titre} onChange={e=>setNewTache(p=>({...p,titre:e.target.value}))}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
          <select style={s.inp} value={newTache.priorite} onChange={e=>setNewTache(p=>({...p,priorite:e.target.value}))}><option>Normale</option><option>Haute</option><option>Basse</option></select>
          <input type="date" style={s.inp} value={newTache.echeance} onChange={e=>setNewTache(p=>({...p,echeance:e.target.value}))}/>
        </div>
        <button style={s.btn("primary")} onClick={()=>{if(!newTache.titre)return;setTaches(p=>[...p,{id:Date.now(),titre:newTache.titre,priorite:newTache.priorite,echeance:newTache.echeance,fait:false,tag:"Autre"}]);setNewTache({titre:"",priorite:"Normale",echeance:""});setShowNewTache(false);}}>Créer</button>
      </FC>}
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {taches.filter(t=>!t.fait).map(t=>{
          const pC={Haute:{bg:"#FCEBEB",text:"#A32D2D"},Normale:{bg:"#E6F1FB",text:"#0C447C"},Basse:{bg:"#F1EFE8",text:"#444441"}}[t.priorite]||{bg:"#E6F1FB",text:"#0C447C"};
          return(<div key={t.id} style={{...s.card,cursor:"default",display:"flex",alignItems:"center",gap:10}}>
            <button onClick={()=>setTaches(p=>p.map(x=>x.id===t.id?{...x,fait:true}:x))} style={{width:20,height:20,borderRadius:"50%",border:"1.5px solid var(--color-border-secondary)",background:"transparent",cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}/>
            <div style={{flex:1}}><p style={{margin:"0 0 3px",fontSize:13}}>{t.titre}</p><div style={{display:"flex",gap:6,alignItems:"center"}}><span style={s.bdg(pC.bg,pC.text)}>{t.priorite}</span>{t.echeance&&<span style={{fontSize:11,color:"var(--color-text-secondary)"}}>→ {t.echeance}</span>}</div></div>
          </div>);
        })}
      </div>
    </>)}

    {/* VUE GESTION LEÇONS */}
    {mainTab==="lecons"&&(()=>{
      const niveauC={Débutant:{bg:"#EAF3DE",text:"#3B6D11"},Confirmé:{bg:"#E6F1FB",text:"#0C447C"},Intermédiaire:{bg:"#EEEDFE",text:"#3C3489"},Enfants:{bg:"#FAEEDA",text:"#854F0B"},"Tous niveaux":{bg:"#F1EFE8",text:"#444441"}};
      function pH2(t){const[h,m]=t.split(':').map(Number);return h*60+m;}
      const HOURS=Array.from({length:14},(_,i)=>i+7);
      const getWD=(off=0)=>{const b=new Date(2025,3,13);b.setDate(b.getDate()+off*7);return Array.from({length:7},(_,i)=>{const d=new Date(b);d.setDate(b.getDate()+i);return d;});};
      const wd=getWD(leconCalWOff);
      const tod=new Date(2025,3,13);
      const isToday=(d)=>d.getFullYear()===tod.getFullYear()&&d.getMonth()===tod.getMonth()&&d.getDate()===tod.getDate();
      const dk=(d)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const wLabel=()=>{const f=wd[0],l=wd[6];if(f.getMonth()===l.getMonth())return`${f.getDate()} — ${l.getDate()} ${MOIS[f.getMonth()]} ${f.getFullYear()}`;return`${f.getDate()} ${MOIS[f.getMonth()]} — ${l.getDate()} ${MOIS[l.getMonth()]} ${f.getFullYear()}`;};
      const JOURS2=["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

      // Popup détail leçon gestionnaire
      const LeconDetailGest=()=>{
        if(!selLeconGest)return null;
        const l=selLeconGest;const cl=COLORS[l.color]||COLORS.teal;const nv=niveauC[l.niveau]||niveauC["Tous niveaux"];
        const inscrits=gestInscriptions[l.id]||[];
        const [editMode,setEditMode]=useState(false);
        const [editL,setEditL]=useState({...l});
        return(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}} onClick={()=>setSelLeconGest(null)}>
            <div style={{background:"#ffffff",borderRadius:"var(--border-radius-lg)",padding:"1.5rem",width:380,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.12)"}} onClick={e=>e.stopPropagation()}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
                <div>
                  <p style={{margin:"0 0 6px",fontSize:16,fontWeight:500,color:"#111"}}>{l.titre}</p>
                  <div style={{display:"flex",gap:6}}><span style={s.bdg(nv.bg,nv.text)}>{l.niveau}</span><span style={s.bdg(cl.bg,cl.text)}>{l.heure}–{l.fin}</span></div>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <button onClick={()=>setEditMode(p=>!p)} style={{background:"transparent",border:"0.5px solid #ddd",borderRadius:"var(--border-radius-md)",padding:"4px 10px",fontSize:12,cursor:"pointer",color:editMode?"#A32D2D":"#444"}}>{editMode?"Annuler":"Modifier"}</button>
                  <button onClick={()=>setSelLeconGest(null)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:18,color:"#888"}}>✕</button>
                </div>
              </div>

              {editMode?(
                <div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                    <input style={{border:"0.5px solid #ddd",borderRadius:"var(--border-radius-md)",padding:"8px 10px",fontSize:13,color:"#111",background:"#fff",boxSizing:"border-box"}} value={editL.titre} onChange={e=>setEditL(p=>({...p,titre:e.target.value}))} placeholder="Titre"/>
                    <input style={{border:"0.5px solid #ddd",borderRadius:"var(--border-radius-md)",padding:"8px 10px",fontSize:13,color:"#111",background:"#fff",boxSizing:"border-box"}} value={editL.moniteur} onChange={e=>setEditL(p=>({...p,moniteur:e.target.value}))} placeholder="Moniteur"/>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
                    <input type="date" style={{border:"0.5px solid #ddd",borderRadius:"var(--border-radius-md)",padding:"8px 10px",fontSize:13,color:"#111",background:"#fff",boxSizing:"border-box"}} value={editL.date} onChange={e=>setEditL(p=>({...p,date:e.target.value}))}/>
                    <input type="time" style={{border:"0.5px solid #ddd",borderRadius:"var(--border-radius-md)",padding:"8px 10px",fontSize:13,color:"#111",background:"#fff",boxSizing:"border-box"}} value={editL.heure} onChange={e=>setEditL(p=>({...p,heure:e.target.value}))}/>
                    <input type="time" style={{border:"0.5px solid #ddd",borderRadius:"var(--border-radius-md)",padding:"8px 10px",fontSize:13,color:"#111",background:"#fff",boxSizing:"border-box"}} value={editL.fin} onChange={e=>setEditL(p=>({...p,fin:e.target.value}))}/>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                    <select style={{border:"0.5px solid #ddd",borderRadius:"var(--border-radius-md)",padding:"8px 10px",fontSize:13,color:"#111",background:"#fff",boxSizing:"border-box"}} value={editL.niveau} onChange={e=>setEditL(p=>({...p,niveau:e.target.value}))}>
                      {Object.keys(niveauC).map(n=><option key={n}>{n}</option>)}
                    </select>
                    <input type="number" placeholder="Nb places" style={{border:"0.5px solid #ddd",borderRadius:"var(--border-radius-md)",padding:"8px 10px",fontSize:13,color:"#111",background:"#fff",boxSizing:"border-box"}} value={editL.places} onChange={e=>setEditL(p=>({...p,places:parseInt(e.target.value)||p.places}))}/>
                  </div>
                  <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:14}}>
                    <span style={{fontSize:12,color:"#888"}}>Couleur :</span>
                    {["teal","purple","amber","blue","coral","green"].map(c=><div key={c} onClick={()=>setEditL(p=>({...p,color:c}))} style={{width:20,height:20,borderRadius:"50%",background:COLORS[c].bg,border:`2px solid ${editL.color===c?COLORS[c].border:"transparent"}`,cursor:"pointer"}}/>)}
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button style={{...s.btn("primary"),flex:1,fontSize:12}} onClick={()=>{setGestLecons(p=>p.map(x=>x.id===l.id?{...editL}:x));setSelLeconGest(null);}}>Enregistrer</button>
                    <button style={{...s.btn(),fontSize:12,color:"#A32D2D",borderColor:"#F09595"}} onClick={()=>{setGestLecons(p=>p.filter(x=>x.id!==l.id));setSelLeconGest(null);}}>Supprimer</button>
                  </div>
                </div>
              ):(
                <div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
                    {[["Moniteur",l.moniteur],["Places",`${l.places} places`],["Date",new Date(l.date+'T12:00').toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})],["Durée",`${pH2(l.fin)-pH2(l.heure)} min`]].map(([k,v])=>(
                      <div key={k} style={{background:"#f5f5f5",borderRadius:"var(--border-radius-md)",padding:"0.6rem 0.9rem"}}>
                        <div style={{fontSize:11,color:"#888",marginBottom:3}}>{k}</div>
                        <div style={{fontSize:13,fontWeight:500,color:"#111"}}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {inscrits.length>0?(
                    <div>
                      <p style={{margin:"0 0 8px",fontSize:12,fontWeight:500,color:"#666"}}>Inscrits ({inscrits.length}/{l.places})</p>
                      {inscrits.map((insc,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",background:"#f9f9f9",borderRadius:"var(--border-radius-md)",marginBottom:6}}>
                          <div style={{width:26,height:26,borderRadius:"50%",background:cl.bg,color:cl.text,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:500,flexShrink:0}}>{insc.clientId?.slice(0,2).toUpperCase()||"?"}</div>
                          <div style={{flex:1}}><p style={{margin:0,fontSize:13,fontWeight:500,color:"#111"}}>{insc.clientId}</p>{insc.commentaire&&<p style={{margin:"2px 0 0",fontSize:11,color:"#888",fontStyle:"italic"}}>"{insc.commentaire}"</p>}</div>
                        </div>
                      ))}
                    </div>
                  ):<p style={{fontSize:13,color:"#888"}}>Aucune inscription pour le moment.</p>}
                </div>
              )}
            </div>
          </div>
        );
      };

      return(<>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <p style={{margin:0,fontSize:13,fontWeight:500,color:"var(--color-text-secondary)"}}>{wLabel()}</p>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <button style={{...s.nb(false),fontSize:12,padding:"4px 10px"}} onClick={()=>setLeconCalWOff(p=>p-1)}>←</button>
            <button style={{...s.nb(false),fontSize:12,padding:"4px 10px"}} onClick={()=>setLeconCalWOff(0)}>Auj.</button>
            <button style={{...s.nb(false),fontSize:12,padding:"4px 10px"}} onClick={()=>setLeconCalWOff(p=>p+1)}>→</button>
            <button style={{...s.btn("primary"),fontSize:12,padding:"5px 14px"}} onClick={()=>setShowNewLecon(p=>!p)}>{showNewLecon?"Annuler":"+ Nouvelle leçon"}</button>
          </div>
        </div>

        {showNewLecon&&<FC title="Nouvelle leçon" onClose={()=>setShowNewLecon(false)}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
            <input placeholder="Titre *" style={s.inp} value={newLecon.titre} onChange={e=>setNewLecon(p=>({...p,titre:e.target.value}))}/>
            <input placeholder="Moniteur" style={s.inp} value={newLecon.moniteur} onChange={e=>setNewLecon(p=>({...p,moniteur:e.target.value}))}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
            <input type="date" style={s.inp} value={newLecon.date} onChange={e=>setNewLecon(p=>({...p,date:e.target.value}))}/>
            <input type="time" style={s.inp} value={newLecon.heure} onChange={e=>setNewLecon(p=>({...p,heure:e.target.value}))}/>
            <input type="time" style={s.inp} value={newLecon.fin} onChange={e=>setNewLecon(p=>({...p,fin:e.target.value}))}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
            <select style={s.inp} value={newLecon.niveau} onChange={e=>setNewLecon(p=>({...p,niveau:e.target.value}))}>
              {Object.keys(niveauC).map(n=><option key={n}>{n}</option>)}
            </select>
            <input type="number" placeholder="Nb de places" style={s.inp} value={newLecon.places} onChange={e=>setNewLecon(p=>({...p,places:e.target.value}))}/>
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:14}}>
            <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>Couleur :</span>
            {["teal","purple","amber","blue","coral","green"].map(c=><div key={c} onClick={()=>setNewLecon(p=>({...p,color:c}))} style={{width:22,height:22,borderRadius:"50%",background:COLORS[c].bg,border:`2px solid ${newLecon.color===c?COLORS[c].border:"transparent"}`,cursor:"pointer"}}/>)}
          </div>
          <button style={s.btn("primary")} onClick={()=>{
            if(!newLecon.titre||!newLecon.date)return;
            const id=`l${Date.now()}`;
            const lecon={...newLecon,id,places:parseInt(newLecon.places)||8,inscrits:0};
            setGestLecons(p=>[...p,lecon]);
            // Synchronise avec eventsData pour que la leçon apparaisse dans le calendrier
            const cl=COLORS[newLecon.color]||COLORS.teal;
            upd({events:{...events,[newLecon.date]:[...(events[newLecon.date]||[]),{id:Date.now(),heure:newLecon.heure,fin:newLecon.fin,label:newLecon.titre,type:"Séance",color:newLecon.color}]}});
            setNewLecon({date:"",heure:"09:00",fin:"10:00",titre:"",niveau:"Débutant",places:"8",moniteur:"",color:"teal"});setShowNewLecon(false);
          }}>Créer la leçon</button>
        </FC>}

        {/* Planning semaine */}
        <div style={{border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",overflow:"hidden",marginBottom:24}}>
          <div style={{display:"grid",gridTemplateColumns:"40px repeat(7,1fr)"}}>
            <div style={{borderBottom:"0.5px solid var(--color-border-tertiary)",borderRight:"0.5px solid var(--color-border-tertiary)"}}/>
            {wd.map((d,i)=>{const it=isToday(d);return(
              <div key={i} style={{textAlign:"center",padding:"8px 4px",borderBottom:"0.5px solid var(--color-border-tertiary)",borderRight:i<6?"0.5px solid var(--color-border-tertiary)":"none"}}>
                <div style={{fontSize:10,color:"var(--color-text-secondary)",marginBottom:2}}>{JOURS2[i]}</div>
                <div style={{width:26,height:26,borderRadius:"50%",background:it?"var(--color-text-primary)":"transparent",color:it?"var(--color-background-primary)":"var(--color-text-primary)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:it?500:400,margin:"0 auto"}}>{d.getDate()}</div>
              </div>
            );})}
          </div>
          <div style={{overflowY:"auto",maxHeight:480}}>
            {HOURS.map(h=>(
              <div key={h} style={{display:"grid",gridTemplateColumns:"40px repeat(7,1fr)",minHeight:52}}>
                <div style={{fontSize:9,color:"var(--color-text-secondary)",padding:"3px 4px 0",textAlign:"right",borderRight:"0.5px solid var(--color-border-tertiary)",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>{String(h).padStart(2,'0')}h</div>
                {wd.map((d,di)=>{
                  const k=dk(d);
                  const lecons=gestLecons.filter(l=>l.date===k&&pH2(l.heure)>=h*60&&pH2(l.heure)<(h+1)*60);
                  return(
                    <div key={di} style={{borderRight:di<6?"0.5px solid var(--color-border-tertiary)":"none",borderBottom:"0.5px solid var(--color-border-tertiary)",padding:"2px 3px",minHeight:52}}>
                      {lecons.map(l=>{
                        const cl=COLORS[l.color]||COLORS.teal;const dur=Math.max(pH2(l.fin)-pH2(l.heure),30);
                        return(
                          <div key={l.id} onClick={()=>setSelLeconGest(l)}
                            style={{background:cl.bg,borderLeft:`3px solid ${cl.border}`,borderRadius:4,padding:"2px 5px",marginBottom:2,cursor:"pointer",height:Math.max(dur/60*52-4,20),overflow:"hidden",boxSizing:"border-box"}}>
                            <div style={{fontSize:10,fontWeight:500,color:cl.text,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.titre}</div>
                            <div style={{fontSize:9,color:cl.text,opacity:0.8}}>{l.heure}</div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <LeconDetailGest/>
      </>);
    })()}
    {mainTab==="client"&&(<>
      {/* Métriques client cliquables */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginBottom:24}}>
        {[
          {n:String(CLIENTS.length),label:"Clients",bg:"#E6F1FB",text:"#0C447C",border:"#85B7EB",icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>},
          {n:String(demandesCount),label:"Demandes en attente",bg:"#EEEDFE",text:"#3C3489",border:"#AFA9EC",icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>},
          {n:String(alertsPay),label:"Paiements à valider",bg:"#FAEEDA",text:"#854F0B",border:"#EF9F27",icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>},
          {n:String(taches.filter(t=>!t.fait&&(t.tag==="Client"||t.tag==="Paiement")).length),label:"Tâches clients",bg:"#E1F5EE",text:"#0F6E56",border:"#5DCAA5",icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>},
        ].map((m,i)=>(
          <div key={i} onClick={()=>{setClientMetriqueDetail(i);setView("clientMetriqueDetail");}}
            style={{background:m.bg,borderRadius:"var(--border-radius-lg)",padding:"1rem 1.25rem",border:`0.5px solid ${m.border}`,cursor:"pointer",transition:"opacity 0.15s"}}
            onMouseEnter={e=>e.currentTarget.style.opacity="0.8"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
              <div style={{width:34,height:34,borderRadius:"var(--border-radius-md)",background:"rgba(255,255,255,0.45)",display:"flex",alignItems:"center",justifyContent:"center",color:m.text}}>{m.icon}</div>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={m.text} strokeWidth="2" style={{opacity:0.5,marginTop:4}}><polyline points="9 18 15 12 9 6"/></svg>
            </div>
            <div style={{fontSize:30,fontWeight:500,color:m.text,lineHeight:1,marginBottom:6}}>{m.n}</div>
            <div style={{fontSize:12,color:m.text,opacity:0.75,fontWeight:500}}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Alertes */}
      <p style={{margin:"0 0 10px",fontSize:13,fontWeight:500,color:"var(--color-text-secondary)"}}>Alertes</p>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:24}}>
        {alertes.map((a,i)=>{const cl=colorMap[a.color]||COLORS.amber;return(
          <div key={i} onClick={a.action} style={{display:"flex",gap:12,padding:"12px 14px",borderRadius:"var(--border-radius-md)",background:cl.bg,border:`0.5px solid ${cl.border}`,cursor:"pointer",alignItems:"center"}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,0.5)",color:cl.text,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>!</div>
            <div style={{flex:1}}><p style={{margin:"0 0 2px",fontSize:13,fontWeight:500,color:cl.text}}>{a.text}</p><p style={{margin:0,fontSize:12,color:cl.text,opacity:0.8}}>{a.detail}</p></div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={cl.text} strokeWidth="2" style={{flexShrink:0,opacity:0.6}}><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        );})}
      </div>

      {/* Clients favoris / VIP */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <p style={{margin:0,fontSize:13,fontWeight:500,color:"var(--color-text-secondary)"}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#EF9F27" stroke="#854F0B" strokeWidth="2" style={{marginRight:5,verticalAlign:"middle"}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          Clients favoris
        </p>
      </div>
      {clientsFavoris.length===0
        ?<p style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:20}}>Aucun client favori. Ouvre une fiche client et clique sur l'étoile.</p>
        :<div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:24}}>
          {CLIENTS.filter(c=>clientsFavoris.includes(c.id)).map(c=>{
            const cl=colorMap[c.color]||COLORS.blue;
            const pendingPay=c.paiements.filter(p=>p.statut==="En attente"||p.statut==="Retard").length;
            const pendingDem=c.demandes.filter(d=>d.statut==="En attente").length;
            return(<div key={c.id} style={s.card} onClick={()=>{setSelClient(c.id);setView("clientFiche");setClientFicheTab("chevaux");}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={s.av(cl.bg,cl.text,40)}>{c.avatar}</div>
                <div style={{flex:1}}>
                  <p style={{margin:"0 0 2px",fontWeight:500,fontSize:14}}>{c.nom}</p>
                  <p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)"}}>{c.pension} · depuis {c.depuis}</p>
                </div>
                <div style={{display:"flex",gap:5,alignItems:"center",flexShrink:0}}>
                  {pendingPay>0&&<span style={s.bdg("#FAEEDA","#854F0B")}>{pendingPay} paiement{pendingPay>1?"s":""}</span>}
                  {pendingDem>0&&<span style={s.bdg("#EEEDFE","#3C3489")}>{pendingDem} demande{pendingDem>1?"s":""}</span>}
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="#EF9F27" stroke="#854F0B" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </div>
              </div>
            </div>);
          })}
        </div>
      }

      {/* Tâches du jour côté client */}
      <p style={{margin:"0 0 10px",fontSize:13,fontWeight:500,color:"var(--color-text-secondary)"}}>Tâches clients</p>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {taches.filter(t=>!t.fait&&(t.tag==="Client"||t.tag==="Paiement")).map(t=>{
          const pC={Haute:{bg:"#FCEBEB",text:"#A32D2D"},Normale:{bg:"#E6F1FB",text:"#0C447C"},Basse:{bg:"#F1EFE8",text:"#444441"}}[t.priorite]||{bg:"#E6F1FB",text:"#0C447C"};
          return(<div key={t.id} style={{...s.card,cursor:"default",display:"flex",alignItems:"center",gap:10}}>
            <button onClick={()=>setTaches(p=>p.map(x=>x.id===t.id?{...x,fait:true}:x))} style={{width:20,height:20,borderRadius:"50%",border:"1.5px solid var(--color-border-secondary)",background:"transparent",cursor:"pointer",flexShrink:0}}/>
            <div style={{flex:1}}><p style={{margin:"0 0 3px",fontSize:13}}>{t.titre}</p><div style={{display:"flex",gap:6}}><span style={s.bdg(pC.bg,pC.text)}>{t.priorite}</span>{t.echeance&&<span style={{fontSize:11,color:"var(--color-text-secondary)"}}>→ {t.echeance}</span>}</div></div>
          </div>);
        })}
      </div>
    </>)}
  </div>);
}

// ─── App Cavalier (Manon) ─────────────────────────────────────────────────────
function CavalierApp({session,data,save,saving,logout}){
  const [view,setView]         = useState("ecuries");
  const [selCheval,setSelCheval]= useState(null);
  const [activeTab,setActiveTab]= useState("seances");
  const [newNote,setNewNote]   = useState({type:[],exercice:"",duree:"",date:"",note:"",score:0});
  const [showAddNote,setShowAddNote]= useState(false);
  const [exTab,setExTab]       = useState("chevaux");
  const [selEx,setSelEx]       = useState(null);
  const [selMetrique,setSelMetrique]= useState(null);
  const [calMode,setCalMode]   = useState("semaine");
  const [calY,setCalY]         = useState(2025);
  const [calM,setCalM]         = useState(3);
  const [calWOff,setCalWOff]   = useState(0);
  const [selEvent,setSelEvent] = useState(null);
  const [activeConv,setActiveConv]= useState(null);
  const [msgInput,setMsgInput] = useState("");
  const [msgTab,setMsgTab]     = useState("libre");
  const [showNewMsg,setShowNewMsg]= useState(false);
  const [newMsgTo,setNewMsgTo] = useState("");
  const [newMsgCh,setNewMsgCh] = useState("");
  const [newMsgTxt,setNewMsgTxt]= useState("");
  const [editForm,setEditForm] = useState(null);
  const [showCreateCh,setShowCreateCh]= useState(false);
  const [newCh,setNewCh]       = useState({nom:"",race:"",age:"",robe:"",statut:"En travail",discipline:"",proprietaire:"",color:"teal"});
  const [catTab,setCatTab]     = useState("chevaux");
  const [fNiv,setFNiv]         = useState("");
  const [fDisc,setFDisc]       = useState("");
  const [fDur,setFDur]         = useState("");
  const [showCreateEx,setShowCreateEx]= useState(false);
  const [newEx,setNewEx]       = useState({titre:"",niveau:"",discipline:"",duree:"",objectif:"",description:""});
  const [showNewRdv,setShowNewRdv]= useState(false);
  const [newRdv,setNewRdv]     = useState({type:"",detail:"",date:"",heure:"08:00",fin:"09:00"});
  const [showNewPal,setShowNewPal]= useState(false);
  const [newPal,setNewPal]     = useState({date:"",epreuve:"",classement:""});
  const [showCreateEv,setShowCreateEv]= useState(false);
  const [newEv,setNewEv]       = useState({label:"",type:"Séance",heure:"09:00",fin:"10:00",date:"",cheval:""});
  const [showQuickAdd,setShowQuickAdd]= useState(false);

  const chevaux = data.chevaux||[];
  const events  = data.events||{};
  const convs   = data.convs||[];
  const notifs  = data.notifs||[];
  const extraExCh  = data.extraExCh||[];
  const extraExCav = data.extraExCav||[];
  const allExCh  = [...EX_CH,...extraExCh];
  const allExCav = [...EX_CAV,...extraExCav];

  const upd=(patch)=> save({...data,...patch});
  const updCh=(id,fn)=> upd({chevaux:chevaux.map(c=>c.id===id?fn(c):c)});

  const cheval = selCheval ? chevaux.find(c=>c.id===selCheval) : null;
  const col    = cheval ? COLORS[cheval.color]||COLORS.teal : COLORS.teal;
  const favoris= chevaux.filter(c=>c.favori);
  const unreadMsgs=convs.reduce((a,c)=>a+c.unread,0);
  const unreadNotifs=notifs.filter(n=>!n.read).length;

  const openFiche=(id)=>{setSelCheval(id);setView("fiche");setActiveTab("seances");setEditForm(null);setShowAddNote(false);setShowNewRdv(false);setShowNewPal(false);};
  const goHome=()=>{setView("ecuries");setSelCheval(null);setShowAddNote(false);setSelEx(null);setSelMetrique(null);setSelEvent(null);setActiveConv(null);setEditForm(null);setShowCreateCh(false);setShowCreateEv(false);};

  const toggleFav=(id)=> updCh(id,c=>({...c,favori:!c.favori}));

  const addSeance=()=>{
    if(!newNote.type.length)return;
    const d=newNote.date?new Date(newNote.date).toLocaleDateString("fr-FR"):new Date().toLocaleDateString("fr-FR");
    const exL=newNote.exercice?` — ${[...allExCh,...allExCav].find(e=>e.id===parseInt(newNote.exercice))?.titre||""}`:"";
    const entry={date:d,duree:newNote.duree||"—",type:newNote.type.join(", ")+exL,note:newNote.note,score:newNote.score};
    updCh(selCheval,c=>({...c,seances:[entry,...(c.seances||[])]}));
    setNewNote({type:[],exercice:"",duree:"",date:"",note:"",score:0});setShowAddNote(false);
  };

  const saveEdit=()=>{
    updCh(cheval.id,c=>({...c,...editForm,age:parseInt(editForm.age)||c.age}));
    setEditForm(null);
  };

  const handlePhoto=(e,id)=>{
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=(ev)=>updCh(id,c=>({...c,photo:ev.target.result}));
    reader.readAsDataURL(file);
  };

  const handleMedia=(e)=>{
    const files=Array.from(e.target.files);
    files.forEach(file=>{
      const reader=new FileReader();
      reader.onload=(ev)=>updCh(selCheval,c=>({...c,medias:[{url:ev.target.result,type:file.type.startsWith("video")?"video":"photo",name:file.name},...(c.medias||[])]}));
      reader.readAsDataURL(file);
    });
  };

  const saveRdv=()=>{
    if(!newRdv.type||!newRdv.date)return;
    const rdvEntry={date:new Date(newRdv.date).toLocaleDateString("fr-FR"),type:newRdv.type,detail:newRdv.detail};
    updCh(selCheval,c=>({...c,sante:{...c.sante,rdvs:[...(c.sante.rdvs||[]),rdvEntry]}}));
    const eid=Date.now();
    const ch=cheval;
    upd({events:{...events,[newRdv.date]:[...(events[newRdv.date]||[]),{id:eid,heure:newRdv.heure,fin:newRdv.fin,label:`${newRdv.type} — ${ch?.nom||""}`,type:"Santé",color:ch?.color||"amber"}]}});
    setNewRdv({type:"",detail:"",date:"",heure:"08:00",fin:"09:00"});setShowNewRdv(false);
  };

  const savePal=()=>{
    if(!newPal.epreuve)return;
    updCh(selCheval,c=>({...c,palmares:[{...newPal},...(c.palmares||[])]}));
    setNewPal({date:"",epreuve:"",classement:""});setShowNewPal(false);
  };

  const saveEvent=()=>{
    if(!newEv.label||!newEv.date)return;
    const ch=newEv.cheval?chevaux.find(c=>c.id===parseInt(newEv.cheval)):null;
    const label=ch?`${newEv.label} — ${ch.nom}`:newEv.label;
    const eid=Date.now();
    upd({events:{...events,[newEv.date]:[...(events[newEv.date]||[]),{id:eid,heure:newEv.heure,fin:newEv.fin,label,type:newEv.type,color:ch?ch.color:"teal"}]}});
    setNewEv({label:"",type:"Séance",heure:"09:00",fin:"10:00",date:"",cheval:""});setShowCreateEv(false);
  };

  const openConv=(id)=>{
    setActiveConv(id);
    upd({convs:convs.map(c=>c.id===id?{...c,unread:0}:c),notifs:notifs.map(n=>n.action===id?{...n,read:true}:n)});
  };

  const sendMsg=()=>{
    if(!msgInput.trim()||!activeConv)return;
    const now=new Date();const time=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const conv=convs.find(c=>c.id===activeConv);
    const chRef=conv?.type==="cheval"?{id:conv.chevalId,nom:chevaux.find(c=>c.id===conv.chevalId)?.nom,color:chevaux.find(c=>c.id===conv.chevalId)?.color}:null;
    upd({convs:convs.map(c=>c.id===activeConv?{...c,messages:[...c.messages,{id:Date.now(),from:session.user.id,text:msgInput,time,cheval:chRef}]}:c)});
    setMsgInput("");
  };

  const saveNewEx=()=>{
    if(!newEx.titre||!newEx.niveau||!newEx.discipline||!newEx.duree)return;
    const ex={...newEx,id:Date.now(),etapes:[]};
    if(catTab==="chevaux") upd({extraExCh:[...extraExCh,ex]});
    else upd({extraExCav:[...extraExCav,ex]});
    setNewEx({titre:"",niveau:"",discipline:"",duree:"",objectif:"",description:""});setShowCreateEx(false);
  };

  const getWD=(off=0)=>{const b=new Date(2025,3,13);b.setDate(b.getDate()+off*7);return Array.from({length:7},(_,i)=>{const d=new Date(b);d.setDate(b.getDate()+i);return d;});};
  const wd=getWD(calWOff);
  const wLabel=()=>{const f=wd[0],l=wd[6];if(f.getMonth()===l.getMonth())return`${f.getDate()} — ${l.getDate()} ${MOIS[f.getMonth()]} ${f.getFullYear()}`;return`${f.getDate()} ${MOIS[f.getMonth()]} — ${l.getDate()} ${MOIS[l.getMonth()]} ${f.getFullYear()}`;};

  const s={
    wrap:{fontFamily:"var(--font-sans)",padding:"0 0 80px"},
    hdr:{display:"flex",alignItems:"center",gap:10,padding:"1.25rem 0 1rem",borderBottom:"0.5px solid var(--color-border-tertiary)",marginBottom:"1.25rem"},
    nb:(a)=>({background:a?"var(--color-background-secondary)":"transparent",border:"0.5px solid "+(a?"var(--color-border-secondary)":"transparent"),borderRadius:"var(--border-radius-md)",padding:"6px 14px",fontSize:13,fontWeight:a?500:400,color:"var(--color-text-primary)",cursor:"pointer"}),
    card:{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",padding:"1rem 1.25rem",cursor:"pointer"},
    bdg:(bg,tx)=>({background:bg,color:tx,borderRadius:"var(--border-radius-md)",padding:"3px 10px",fontSize:12,fontWeight:500,display:"inline-block"}),
    av:(bg,tx,sz=44)=>({width:sz,height:sz,borderRadius:"50%",background:bg,color:tx,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:500,fontSize:sz>36?15:13,flexShrink:0}),
    tab:(a)=>({background:"transparent",border:"none",borderBottom:a?"2px solid var(--color-text-primary)":"2px solid transparent",padding:"8px 14px",fontSize:13,fontWeight:a?500:400,color:a?"var(--color-text-primary)":"var(--color-text-secondary)",cursor:"pointer",whiteSpace:"nowrap"}),
    row:{display:"flex",gap:10,alignItems:"flex-start",padding:"10px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"},
    btn:(v)=>({border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",padding:"7px 16px",fontSize:13,fontWeight:500,cursor:"pointer",background:v==="primary"?"var(--color-text-primary)":"transparent",color:v==="primary"?"var(--color-background-primary)":"var(--color-text-primary)"}),
    inp:{border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",padding:"8px 12px",fontSize:13,width:"100%",background:"var(--color-background-primary)",color:"var(--color-text-primary)",boxSizing:"border-box"},
    lnk:{background:"transparent",border:"none",fontSize:12,color:"var(--color-text-secondary)",cursor:"pointer",textDecoration:"underline",padding:0},
    fl:{fontSize:12,color:"var(--color-text-secondary)",marginBottom:6,display:"block"},
  };

  const FC=({title,onClose,children})=>(
    <div style={{...s.card,cursor:"default",marginBottom:16,border:"0.5px solid var(--color-border-secondary)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <p style={{margin:0,fontSize:14,fontWeight:500}}>{title}</p>
        {onClose&&<button onClick={onClose} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:16,color:"var(--color-text-secondary)"}}>✕</button>}
      </div>
      {children}
    </div>
  );

  // ── Barre de nav ─────────────────────────────────────────────────────────────
  const NavBar=()=>{
    const ak=["ecuries","quotidien"].includes(view)?"ecuries":view;
    const items=[
      {key:"ecuries",label:"Accueil",icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>},
      {key:"tousChevaux",label:"Chevaux",icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 16s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="20" x2="4" y2="16"/></svg>},
      {key:"plus",label:"",icon:null},
      {key:"catalogue",label:"Exercices",icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>},
      {key:"calendrier",label:"Agenda",icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>},
    ];
    return(
      <>
        {showQuickAdd&&(
          <div style={{position:"fixed",inset:0,zIndex:90}} onClick={()=>setShowQuickAdd(false)}>
            <div style={{position:"absolute",bottom:80,left:"50%",transform:"translateX(-50%)",width:260,background:"var(--color-background-primary)",borderRadius:"var(--border-radius-lg)",border:"0.5px solid var(--color-border-secondary)",overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
              <p style={{margin:0,padding:"10px 16px 8px",fontSize:11,fontWeight:500,color:"var(--color-text-secondary)",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>CRÉER</p>
              {[
                {label:"Nouveau cheval",icon:"🐴",fn:()=>{goHome();setView("tousChevaux");setShowCreateCh(true);setShowQuickAdd(false);}},
                {label:"Nouvel événement agenda",icon:"📅",fn:()=>{setView("calendrier");setShowCreateEv(true);setShowQuickAdd(false);}},
                {label:"Nouvelle séance",icon:"⏱",fn:()=>{if(selCheval){setShowAddNote(true);setActiveTab("seances");setView("fiche");}else{setView("tousChevaux");}setShowQuickAdd(false);}},
              ].map((it,i)=>(
                <button key={i} onClick={it.fn} style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"12px 16px",background:"transparent",border:"none",borderBottom:i<2?"0.5px solid var(--color-border-tertiary)":"none",cursor:"pointer",textAlign:"left",fontSize:13,color:"var(--color-text-primary)"}}>
                  <span style={{fontSize:16,width:20,textAlign:"center"}}>{it.icon}</span>{it.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:80,backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",background:"rgba(255,255,255,0.78)",borderTop:"0.5px solid var(--color-border-tertiary)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-around",maxWidth:600,margin:"0 auto",padding:"6px 0 10px"}}>
            {items.map(it=>{
              if(it.key==="plus") return(
                <button key="plus" onClick={()=>setShowQuickAdd(p=>!p)} style={{background:"var(--color-text-primary)",border:"none",borderRadius:"50%",width:48,height:48,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",marginBottom:4}}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-background-primary)" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
              );
              const isA=ak===it.key;
              return(
                <button key={it.key} onClick={()=>{setShowQuickAdd(false);it.key==="ecuries"?goHome():setView(it.key);}} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"transparent",border:"none",cursor:"pointer",padding:"4px 10px",color:isA?"var(--color-text-primary)":"#888"}}>
                  <span style={{opacity:isA?1:0.5}}>{it.icon}</span>
                  <span style={{fontSize:10,fontWeight:isA?500:400}}>{it.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </>
    );
  };

  // ── Sauvegarde indicator top ─────────────────────────────────────────────────
  const SaveBadge=()=>saving?(
    <div style={{position:"fixed",top:12,right:12,zIndex:200,background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)",padding:"4px 10px",fontSize:11,color:"var(--color-text-secondary)",display:"flex",alignItems:"center",gap:6}}>
      <div style={{width:6,height:6,borderRadius:"50%",background:"#3B6D11",animation:"pulse 1s infinite"}}/>
      Sauvegarde…
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  ):null;

  // ── Catalogue ─────────────────────────────────────────────────────────────────
  if(view==="catalogue"){
    const src=catTab==="chevaux"?allExCh:allExCav;
    const discs=[...new Set(src.map(e=>e.discipline))];
    const mDur=(d,f)=>{const mn=parseInt(d);if(f==="0–10 min")return mn<=10;if(f==="10–20 min")return mn>10&&mn<=20;if(f==="20+ min")return mn>20;return true;};
    const filt=src.filter(e=>(!fNiv||e.niveau===fNiv)&&(!fDisc||e.discipline===fDisc)&&(!fDur||mDur(e.duree,fDur)));
    return(<div style={s.wrap}><SaveBadge/><NavBar/>
      <div style={s.hdr}><button onClick={goHome} style={{...s.nb(false),padding:"6px 10px"}}>← Écurie</button><span style={{fontSize:15,fontWeight:500}}>Catalogue d'exercices</span><button style={{...s.btn("primary"),marginLeft:"auto",fontSize:12,padding:"5px 14px"}} onClick={()=>setShowCreateEx(p=>!p)}>{showCreateEx?"Annuler":"+ Créer"}</button></div>
      {showCreateEx&&<FC title="Nouvel exercice" onClose={()=>setShowCreateEx(false)}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}><input placeholder="Titre *" style={s.inp} value={newEx.titre} onChange={e=>setNewEx(p=>({...p,titre:e.target.value}))}/><input placeholder="Objectif" style={s.inp} value={newEx.objectif} onChange={e=>setNewEx(p=>({...p,objectif:e.target.value}))}/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
          <select style={s.inp} value={newEx.niveau} onChange={e=>setNewEx(p=>({...p,niveau:e.target.value}))}><option value="">Niveau *</option>{["Débutant","Intermédiaire","Avancé","Tous niveaux"].map(n=><option key={n}>{n}</option>)}</select>
          <input placeholder="Discipline *" style={s.inp} value={newEx.discipline} onChange={e=>setNewEx(p=>({...p,discipline:e.target.value}))}/>
          <input placeholder="Durée *" style={s.inp} value={newEx.duree} onChange={e=>setNewEx(p=>({...p,duree:e.target.value}))}/>
        </div>
        <textarea placeholder="Description…" rows={3} style={{...s.inp,resize:"vertical",marginBottom:12}} value={newEx.description} onChange={e=>setNewEx(p=>({...p,description:e.target.value}))}/>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button style={s.btn("primary")} onClick={saveNewEx}>Enregistrer</button>
          {[["chevaux","Chevaux"],["cavaliers","Cavaliers"]].map(([k,l])=><button key={k} style={{...s.nb(catTab===k),fontSize:12,padding:"4px 10px"}} onClick={()=>setCatTab(k)}>{l}</button>)}
        </div>
      </FC>}
      <div style={{borderBottom:"0.5px solid var(--color-border-tertiary)",marginBottom:14,display:"flex"}}>
        {[["chevaux","Chevaux"],["cavaliers","Cavaliers"]].map(([k,l])=><button key={k} style={s.tab(catTab===k)} onClick={()=>{setCatTab(k);setFDisc("");}}>{l} <span style={{fontSize:11,marginLeft:4,color:"var(--color-text-secondary)"}}>{catTab===k?filt.length:src.length}</span></button>)}
      </div>
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>Filtrer :</span>
        <select style={{...s.inp,width:"auto",fontSize:12,padding:"5px 10px"}} value={fNiv} onChange={e=>setFNiv(e.target.value)}><option value="">Tous niveaux</option>{["Débutant","Intermédiaire","Avancé","Tous niveaux"].map(n=><option key={n}>{n}</option>)}</select>
        <select style={{...s.inp,width:"auto",fontSize:12,padding:"5px 10px"}} value={fDisc} onChange={e=>setFDisc(e.target.value)}><option value="">Toutes disciplines</option>{discs.map(d=><option key={d}>{d}</option>)}</select>
        <select style={{...s.inp,width:"auto",fontSize:12,padding:"5px 10px"}} value={fDur} onChange={e=>setFDur(e.target.value)}><option value="">Toutes durées</option>{["0–10 min","10–20 min","20+ min"].map(d=><option key={d}>{d}</option>)}</select>
        {(fNiv||fDisc||fDur)&&<button style={s.lnk} onClick={()=>{setFNiv("");setFDisc("");setFDur("");}}>Réinitialiser</button>}
      </div>
      {filt.length===0?<p style={{fontSize:13,color:"var(--color-text-secondary)"}}>Aucun exercice pour ces filtres.</p>:(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:12}}>
          {filt.map((ex,i)=>{
            const bg=(catTab==="chevaux"?EX_BG.chevaux:EX_BG.cavaliers)[i%4];
            const tx=(catTab==="chevaux"?EX_TX.chevaux:EX_TX.cavaliers)[i%4];
            const nc=NIV_C[ex.niveau]||NIV_C["Tous niveaux"];const dc=DISC_C[ex.discipline]||DISC_C["Tous"];
            return(<div key={ex.id} style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",overflow:"hidden",cursor:"pointer"}} onClick={()=>{setSelEx({id:ex.id,type:catTab});setView("exercice");}}>
              <div style={{background:bg,height:88,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:5}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={tx} strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span style={{fontSize:12,fontWeight:500,color:tx,textAlign:"center",padding:"0 8px",lineHeight:1.3}}>{ex.titre}</span>
              </div>
              <div style={{padding:"0.75rem 1rem"}}>
                <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:5}}><span style={s.bdg(nc.bg,nc.text)}>{ex.niveau}</span><span style={s.bdg(dc.bg,dc.text)}>{ex.discipline}</span></div>
                <p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)"}}>{ex.duree}{ex.objectif?" · "+ex.objectif:""}</p>
              </div>
            </div>);
          })}
        </div>
      )}
    </div>);
  }

  // ── Fiche exercice ─────────────────────────────────────────────────────────────
  if(view==="exercice"&&selEx){
    const list=selEx.type==="chevaux"?allExCh:allExCav;
    const ex=list.find(e=>e.id===selEx.id);
    if(!ex) return <div style={s.wrap}><NavBar/><button onClick={goHome} style={s.nb(false)}>← Retour</button></div>;
    const idx=(ex.id-1)%4;const bg=(selEx.type==="chevaux"?EX_BG.chevaux:EX_BG.cavaliers)[idx];const tx=(selEx.type==="chevaux"?EX_TX.chevaux:EX_TX.cavaliers)[idx];
    const nc=NIV_C[ex.niveau]||NIV_C["Tous niveaux"];const dc=DISC_C[ex.discipline]||DISC_C["Tous"];
    return(<div style={s.wrap}><SaveBadge/><NavBar/>
      <div style={s.hdr}><button onClick={()=>setView("catalogue")} style={{...s.nb(false),padding:"6px 10px"}}>← Exercices</button><span style={{fontSize:15,fontWeight:500}}>{ex.titre}</span></div>
      <div style={{borderRadius:"var(--border-radius-lg)",background:bg,height:150,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",marginBottom:20,gap:8}}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={tx} strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span style={{fontSize:17,fontWeight:500,color:tx}}>{ex.titre}</span>
        <span style={{fontSize:12,color:tx,opacity:0.8}}>{ex.objectif}</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20}}>
        {[["Durée",ex.duree,null],["Niveau",ex.niveau,nc],["Discipline",ex.discipline,dc]].map(([k,v,b])=>(
          <div key={k} style={{background:"var(--color-background-secondary)",borderRadius:"var(--border-radius-md)",padding:"0.75rem 1rem"}}>
            <div style={{fontSize:11,color:"var(--color-text-secondary)",marginBottom:4}}>{k}</div>
            {b?<span style={s.bdg(b.bg,b.text)}>{v}</span>:<div style={{fontSize:14,fontWeight:500}}>{v}</div>}
          </div>
        ))}
      </div>
      <p style={{fontSize:14,fontWeight:500,marginBottom:8}}>Description</p>
      <p style={{fontSize:13,color:"var(--color-text-secondary)",lineHeight:1.7,marginBottom:20}}>{ex.description}</p>
      {ex.etapes?.length>0&&<><p style={{fontSize:14,fontWeight:500,marginBottom:10}}>Déroulé</p>
        {ex.etapes.map((e,i)=>(
          <div key={i} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
            <div style={{width:24,height:24,borderRadius:"50%",background:bg,color:tx,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:500,flexShrink:0}}>{i+1}</div>
            <p style={{margin:0,fontSize:13,color:"var(--color-text-secondary)",lineHeight:1.6}}>{e}</p>
          </div>
        ))}</>}
    </div>);
  }

  // ── Notifications ──────────────────────────────────────────────────────────────
  // ── Notifications gestionnaire ───────────────────────────────────────────────
  if(view==="notifications"){
    const ic=(t)=>({message:{bg:"#E6F1FB",text:"#0C447C",icon:"✉"},sante:{bg:"#FAEEDA",text:"#854F0B",icon:"+"},rdv:{bg:"#EAF3DE",text:"#3B6D11",icon:"◷"},demande:{bg:"#EEEDFE",text:"#3C3489",icon:"↗"}}[t]||{bg:"#F1EFE8",text:"#444441",icon:"·"});
    return(<div style={s.wrap}><SaveBadge/><NavBar/>
      <div style={s.hdr}><button onClick={goHome} style={{...s.nb(false),padding:"6px 10px"}}>← Écurie</button><span style={{fontSize:15,fontWeight:500}}>Notifications</span><button style={{...s.lnk,marginLeft:"auto"}} onClick={()=>upd({notifs:notifs.map(n=>({...n,read:true}))})}>Tout marquer lu</button></div>
      {notifs.map(n=>{const i=ic(n.type);return(
        <div key={n.id} onClick={()=>{if(n.action){setView("messagerie");setTimeout(()=>openConv(n.action),50);}upd({notifs:notifs.map(x=>x.id===n.id?{...x,read:true}:x)});}}
          style={{display:"flex",gap:12,padding:"12px 14px",borderRadius:"var(--border-radius-md)",background:n.read?"transparent":"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",cursor:n.action?"pointer":"default",alignItems:"flex-start",marginBottom:6}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:i.bg,color:i.text,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{i.icon}</div>
          <div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:13,fontWeight:n.read?400:500}}>{n.text}</span><span style={{fontSize:11,color:"var(--color-text-secondary)",marginLeft:8}}>{n.time}</span></div><p style={{margin:0,fontSize:12,color:"var(--color-text-secondary)"}}>{n.detail}</p></div>
          {!n.read&&<div style={{width:8,height:8,borderRadius:"50%",background:"#E24B4A",flexShrink:0,marginTop:4}}/>}
        </div>
      );})}
    </div>);
  }

  // ── Messagerie ─────────────────────────────────────────────────────────────────
  if(view==="messagerie"){
    const fConvs=convs.filter(c=>msgTab==="libre"?c.type==="libre":c.type==="cheval");
    const cur=activeConv?convs.find(c=>c.id===activeConv):null;
    const CBadge=({cheval:ch})=>{if(!ch)return null;const cl=COLORS[ch.color||"gray"];return(
      <div style={{display:"inline-flex",alignItems:"center",gap:6,background:cl.bg,borderRadius:"var(--border-radius-md)",padding:"4px 10px",marginBottom:8,cursor:"pointer"}} onClick={()=>openFiche(ch.id)}>
        <div style={{width:14,height:14,borderRadius:"50%",background:cl.border}}/><span style={{fontSize:12,fontWeight:500,color:cl.text}}>{ch.nom}</span><span style={{fontSize:11,color:cl.text,opacity:0.7}}>· Voir →</span>
      </div>
    );};
    return(<div style={s.wrap}><SaveBadge/><NavBar/>
      <div style={s.hdr}><button onClick={goHome} style={{...s.nb(false),padding:"6px 10px"}}>← Écurie</button><span style={{fontSize:15,fontWeight:500}}>Messagerie</span><button style={{...s.btn(),marginLeft:"auto"}} onClick={()=>setShowNewMsg(p=>!p)}>+ Nouveau</button></div>
      {showNewMsg&&<FC title="Nouveau message" onClose={()=>setShowNewMsg(false)}>
        <select style={{...s.inp,marginBottom:8}} value={newMsgTo} onChange={e=>setNewMsgTo(e.target.value)}><option value="">Destinataire…</option>{DEMO_ACCOUNTS.filter(a=>a.id!==session.user.id).map(a=><option key={a.id} value={a.id}>{a.nom} — {ROLES[a.role].label}</option>)}</select>
        <select style={{...s.inp,marginBottom:8}} value={newMsgCh} onChange={e=>setNewMsgCh(e.target.value)}><option value="">Rattacher un cheval (optionnel)</option>{chevaux.map(c=><option key={c.id} value={c.id}>{c.nom}</option>)}</select>
        <textarea placeholder="Message…" rows={3} style={{...s.inp,resize:"vertical",marginBottom:12}} value={newMsgTxt} onChange={e=>setNewMsgTxt(e.target.value)}/>
        <button style={s.btn("primary")} onClick={()=>{
          if(!newMsgTo||!newMsgTxt.trim())return;
          const now=new Date();const time=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
          const chRef=newMsgCh?{id:parseInt(newMsgCh),nom:chevaux.find(c=>c.id===parseInt(newMsgCh))?.nom,color:chevaux.find(c=>c.id===parseInt(newMsgCh))?.color}:null;
          const eid=`conv-${newMsgTo}`;const exists=convs.find(c=>c.id===eid);
          const msg={id:Date.now(),from:session.user.id,text:newMsgTxt,time,cheval:chRef};
          if(exists) upd({convs:convs.map(c=>c.id===eid?{...c,messages:[...c.messages,msg]}:c)});
          else upd({convs:[...convs,{id:eid,type:"libre",with:newMsgTo,unread:0,messages:[msg]}]});
          setActiveConv(eid);setShowNewMsg(false);setNewMsgTo("");setNewMsgCh("");setNewMsgTxt("");
        }}>Envoyer</button>
      </FC>}
      <div style={{display:"flex",gap:12,height:480}}>
        <div style={{width:220,flexShrink:0,border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
          <div style={{display:"flex",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
            {[["libre","Convs"],["cheval","Chevaux"]].map(([k,l])=><button key={k} style={{...s.tab(msgTab===k),flex:1,fontSize:12}} onClick={()=>{setMsgTab(k);setActiveConv(null);}}>{l}</button>)}
          </div>
          <div style={{overflowY:"auto",flex:1}}>
            {fConvs.map(c=>{
              const isC=c.type==="cheval";const ch2=isC?chevaux.find(x=>x.id===c.chevalId):null;
              const uid=!isC?c.with:null;const ua=uid?DEMO_ACCOUNTS.find(a=>a.id===uid):null;
              const clr=isC?COLORS[ch2?.color||"gray"]:COLORS[ua?ROLES[ua.role]?.color?"gray":"gray":"gray"];
              const label=isC?ch2?.nom:(ua?.nom||"Inconnu");const init=isC?(ch2?.nom||"?").slice(0,2).toUpperCase():(ua?.avatar||"?");
              const last=c.messages[c.messages.length-1];
              return(<div key={c.id} onClick={()=>openConv(c.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",cursor:"pointer",background:activeConv===c.id?"var(--color-background-secondary)":"transparent",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                <div style={{position:"relative",flexShrink:0}}>
                  <div style={{width:34,height:34,borderRadius:"50%",background:isC?COLORS[ch2?.color||"gray"].bg:"#E6F1FB",color:isC?COLORS[ch2?.color||"gray"].text:"#0C447C",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:500}}>{init}</div>
                  {c.unread>0&&<div style={{position:"absolute",top:-2,right:-2,width:14,height:14,borderRadius:"50%",background:"#E24B4A",color:"#fff",fontSize:9,display:"flex",alignItems:"center",justifyContent:"center"}}>{c.unread}</div>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:1}}><span style={{fontSize:12,fontWeight:c.unread?500:400}}>{label}</span><span style={{fontSize:10,color:"var(--color-text-secondary)"}}>{last?.time}</span></div>
                  <p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:c.unread?500:400}}>{last?.text}</p>
                </div>
              </div>);
            })}
          </div>
        </div>
        <div style={{flex:1,border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {!cur?<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{fontSize:13,color:"var(--color-text-secondary)"}}>Sélectionne une conversation</p></div>:(()=>{
            const isC=cur.type==="cheval";const ch2=isC?chevaux.find(x=>x.id===cur.chevalId):null;
            const uid=!isC?cur.with:null;const ua=uid?DEMO_ACCOUNTS.find(a=>a.id===uid):null;
            const label=isC?ch2?.nom:(ua?.nom||"Inconnu");const init=isC?(ch2?.nom||"?").slice(0,2).toUpperCase():(ua?.avatar||"?");
            return(<>
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                <div style={{width:34,height:34,borderRadius:"50%",background:isC?COLORS[ch2?.color||"gray"].bg:"#E6F1FB",color:isC?COLORS[ch2?.color||"gray"].text:"#0C447C",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:500,flexShrink:0}}>{init}</div>
                <div style={{flex:1}}><p style={{margin:0,fontSize:13,fontWeight:500}}>{label}</p><p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)"}}>{isC?ch2?.race:(ua?ROLES[ua.role]?.label:"")}</p></div>
                {isC&&<button style={{...s.btn(),fontSize:12,padding:"4px 10px"}} onClick={()=>openFiche(ch2.id)}>Voir fiche →</button>}
              </div>
              <div style={{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:8}}>
                {cur.messages.map(msg=>{
                  const isMe=msg.from===session.user.id;const sender=DEMO_ACCOUNTS.find(a=>a.id===msg.from);const r=sender?ROLES[sender.role]:null;
                  return(<div key={msg.id} style={{display:"flex",flexDirection:"column",alignItems:isMe?"flex-end":"flex-start",gap:3}}>
                    {msg.cheval&&<CBadge cheval={msg.cheval}/>}
                    <div style={{display:"flex",alignItems:"flex-end",gap:8,flexDirection:isMe?"row-reverse":"row"}}>
                      {!isMe&&<div style={{width:26,height:26,borderRadius:"50%",background:r?ROLES[sender.role].bg:"#E6F1FB",color:r?ROLES[sender.role].color:"#0C447C",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:500,flexShrink:0}}>{sender?.avatar||"?"}</div>}
                      <div style={{maxWidth:"72%",background:isMe?"var(--color-text-primary)":"var(--color-background-secondary)",color:isMe?"var(--color-background-primary)":"var(--color-text-primary)",borderRadius:isMe?"12px 12px 2px 12px":"12px 12px 12px 2px",padding:"8px 12px",fontSize:13,lineHeight:1.5}}>{msg.text}</div>
                    </div>
                    <span style={{fontSize:10,color:"var(--color-text-secondary)"}}>{msg.time}</span>
                  </div>);
                })}
              </div>
              <div style={{padding:"8px 12px",borderTop:"0.5px solid var(--color-border-tertiary)",display:"flex",gap:8}}>
                <input value={msgInput} onChange={e=>setMsgInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")sendMsg();}} placeholder="Écrire…" style={{...s.inp,flex:1}}/>
                <button style={{...s.btn("primary"),padding:"7px 12px",flexShrink:0}} onClick={sendMsg}>→</button>
              </div>
            </>);
          })()}
        </div>
      </div>
    </div>);
  }

  // ── Calendrier ─────────────────────────────────────────────────────────────────
  if(view==="calendrier"){
    const tod=new Date(2025,3,13);
    const SV=()=>{
      const isTod=(d)=>d.getFullYear()===tod.getFullYear()&&d.getMonth()===tod.getMonth()&&d.getDate()===tod.getDate();
      const dk=(d)=>dKey(d.getFullYear(),d.getMonth(),d.getDate());
      return(<div style={{border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"44px repeat(7,1fr)"}}>
          <div style={{borderBottom:"0.5px solid var(--color-border-tertiary)",borderRight:"0.5px solid var(--color-border-tertiary)"}}/>
          {wd.map((d,i)=>{const it=isTod(d);return(<div key={i} style={{textAlign:"center",padding:"8px 4px",borderBottom:"0.5px solid var(--color-border-tertiary)",borderRight:i<6?"0.5px solid var(--color-border-tertiary)":"none"}}>
            <div style={{fontSize:11,color:"var(--color-text-secondary)",marginBottom:3}}>{JOURS[i]}</div>
            <div style={{width:28,height:28,borderRadius:"50%",background:it?"var(--color-text-primary)":"transparent",color:it?"var(--color-background-primary)":"var(--color-text-primary)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:it?500:400,margin:"0 auto"}}>{d.getDate()}</div>
          </div>);})}
        </div>
        <div style={{overflowY:"auto",maxHeight:460}}>
          {HOURS.map(h=>(
            <div key={h} style={{display:"grid",gridTemplateColumns:"44px repeat(7,1fr)",minHeight:52}}>
              <div style={{fontSize:10,color:"var(--color-text-secondary)",padding:"3px 6px 0 0",textAlign:"right",borderRight:"0.5px solid var(--color-border-tertiary)",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>{String(h).padStart(2,'0')}:00</div>
              {wd.map((d,di)=>{
                const k=dk(d);const evts=(events[k]||[]).filter(e=>pH(e.heure)>=h*60&&pH(e.heure)<(h+1)*60);
                return(<div key={di} style={{borderRight:di<6?"0.5px solid var(--color-border-tertiary)":"none",borderBottom:"0.5px solid var(--color-border-tertiary)",padding:"2px 3px",minHeight:52}}>
                  {evts.map(ev=>{const cl=COLORS[ev.color]||COLORS.teal;const dur=Math.max(pH(ev.fin)-pH(ev.heure),30);return(
                    <div key={ev.id} onClick={()=>setSelEvent(ev)} style={{background:cl.bg,borderLeft:`2px solid ${cl.border}`,borderRadius:3,padding:"2px 5px",marginBottom:2,cursor:"pointer",height:Math.max(dur/60*52-4,18),overflow:"hidden",boxSizing:"border-box"}}>
                      <div style={{fontSize:10,fontWeight:500,color:cl.text,lineHeight:1.3}}>{ev.heure}</div>
                      <div style={{fontSize:10,color:cl.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.label}</div>
                    </div>
                  );})}
                </div>);
              })}
            </div>
          ))}
        </div>
      </div>);
    };
    const MV=()=>{
      const dim=getDIM(calY,calM);const first=getFDom(calY,calM);
      const cells=[];for(let i=0;i<first;i++)cells.push(null);for(let d=1;d<=dim;d++)cells.push(d);while(cells.length%7!==0)cells.push(null);
      const isTod=(d)=>d===tod.getDate()&&calM===tod.getMonth()&&calY===tod.getFullYear();
      return(<div style={{border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
          {JOURS.map((j,i)=><div key={j} style={{textAlign:"center",fontSize:11,fontWeight:500,color:"var(--color-text-secondary)",padding:"8px 0",borderRight:i<6?"0.5px solid var(--color-border-tertiary)":"none"}}>{j}</div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
          {cells.map((d,i)=>{
            const k=d?dKey(calY,calM,d):null;const evts=k?(events[k]||[]):[];const it=d&&isTod(d);
            return(<div key={i} style={{minHeight:80,borderRight:(i+1)%7!==0?"0.5px solid var(--color-border-tertiary)":"none",borderBottom:i<cells.length-7?"0.5px solid var(--color-border-tertiary)":"none",padding:"5px",background:it?"var(--color-background-secondary)":"transparent",cursor:d&&evts.length?"pointer":"default"}} onClick={()=>d&&evts.length&&setSelEvent({multiDay:true,date:k,evts})}>
              {d&&<>
                <div style={{width:22,height:22,borderRadius:"50%",background:it?"var(--color-text-primary)":"transparent",color:it?"var(--color-background-primary)":"var(--color-text-primary)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:it?500:400,marginBottom:3}}>{d}</div>
                {evts.slice(0,2).map(ev=>{const cl=COLORS[ev.color]||COLORS.teal;return(<div key={ev.id} style={{background:cl.bg,borderRadius:3,padding:"1px 4px",marginBottom:2}}><div style={{fontSize:10,color:cl.text,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.label}</div></div>);})}
                {evts.length>2&&<div style={{fontSize:10,color:"var(--color-text-secondary)"}}> +{evts.length-2}</div>}
              </>}
            </div>);
          })}
        </div>
      </div>);
    };
    const EP=()=>{
      if(!selEvent)return null;
      const cl=COLORS[selEvent.color||"teal"];const tc=RDV_C[selEvent.type||"Séance"]||RDV_C["Séance"];
      if(selEvent.multiDay)return(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.2)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}} onClick={()=>setSelEvent(null)}>
          <div style={{background:"var(--color-background-primary)",borderRadius:"var(--border-radius-lg)",padding:"1.25rem",width:320,border:"0.5px solid var(--color-border-tertiary)"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><span style={{fontSize:14,fontWeight:500}}>{new Date(selEvent.date+'T12:00').toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}</span><button onClick={()=>setSelEvent(null)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:16,color:"var(--color-text-secondary)"}}>✕</button></div>
            {selEvent.evts.map(ev=>{const ecl=COLORS[ev.color]||COLORS.teal;const etc=RDV_C[ev.type]||RDV_C["Séance"];return(<div key={ev.id} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
              <div style={{width:3,borderRadius:2,background:ecl.border,alignSelf:"stretch",flexShrink:0}}/>
              <div style={{flex:1}}><div style={{display:"flex",gap:6,alignItems:"center",marginBottom:2}}><span style={{fontSize:13,fontWeight:500}}>{ev.label}</span><span style={{...s.bdg(etc.bg,etc.text),padding:"1px 7px",fontSize:11}}>{ev.type}</span></div><span style={{fontSize:12,color:"var(--color-text-secondary)"}}>{ev.heure} — {ev.fin}</span></div>
            </div>);})}
          </div>
        </div>
      );
      return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.2)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}} onClick={()=>setSelEvent(null)}>
        <div style={{background:"var(--color-background-primary)",borderRadius:"var(--border-radius-lg)",padding:"1.25rem",width:300,border:"0.5px solid var(--color-border-tertiary)"}} onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><div><p style={{margin:"0 0 6px",fontSize:15,fontWeight:500}}>{selEvent.label}</p><span style={s.bdg(tc.bg,tc.text)}>{selEvent.type}</span></div><button onClick={()=>setSelEvent(null)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:16,color:"var(--color-text-secondary)"}}>✕</button></div>
          <div style={{display:"flex",gap:8,padding:"8px 0",borderTop:"0.5px solid var(--color-border-tertiary)"}}><div style={{width:3,borderRadius:2,background:cl.border,flexShrink:0}}/><div><p style={{margin:0,fontSize:13,fontWeight:500}}>{selEvent.heure} — {selEvent.fin}</p><p style={{margin:"2px 0 0",fontSize:12,color:"var(--color-text-secondary)"}}>Durée : {pH(selEvent.fin)-pH(selEvent.heure)} min</p></div></div>
        </div>
      </div>);
    };
    return(<div style={{...s.wrap,position:"relative"}}><SaveBadge/><NavBar/>
      <div style={s.hdr}>
        <button onClick={goHome} style={{...s.nb(false),padding:"6px 10px"}}>← Écurie</button>
        <span style={{fontSize:15,fontWeight:500}}>Calendrier</span>
        <div style={{marginLeft:"auto",display:"flex",gap:8}}>
          <button style={s.nb(calMode==="semaine")} onClick={()=>setCalMode("semaine")}>Semaine</button>
          <button style={s.nb(calMode==="mois")} onClick={()=>setCalMode("mois")}>Mois</button>
          <button style={s.btn("primary")} onClick={()=>setShowCreateEv(p=>!p)}>{showCreateEv?"Annuler":"+ Événement"}</button>
        </div>
      </div>
      {showCreateEv&&<FC title="Nouvel événement" onClose={()=>setShowCreateEv(false)}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
          <input placeholder="Titre *" style={s.inp} value={newEv.label} onChange={e=>setNewEv(p=>({...p,label:e.target.value}))}/>
          <select style={s.inp} value={newEv.type} onChange={e=>setNewEv(p=>({...p,type:e.target.value}))}>{["Séance","Santé","Coaching","Compétition"].map(t=><option key={t}>{t}</option>)}</select>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
          <input type="date" style={s.inp} value={newEv.date} onChange={e=>setNewEv(p=>({...p,date:e.target.value}))}/>
          <input type="time" style={s.inp} value={newEv.heure} onChange={e=>setNewEv(p=>({...p,heure:e.target.value}))}/>
          <input type="time" style={s.inp} value={newEv.fin} onChange={e=>setNewEv(p=>({...p,fin:e.target.value}))}/>
        </div>
        <select style={{...s.inp,marginBottom:12}} value={newEv.cheval} onChange={e=>setNewEv(p=>({...p,cheval:e.target.value}))}><option value="">Associer un cheval (optionnel)</option>{chevaux.map(c=><option key={c.id} value={c.id}>{c.nom}</option>)}</select>
        <button style={s.btn("primary")} onClick={saveEvent}>Ajouter au calendrier</button>
      </FC>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        {calMode==="semaine"?<span style={{fontSize:14,fontWeight:500}}>{wLabel()}</span>:<span style={{fontSize:14,fontWeight:500}}>{MOIS[calM]} {calY}</span>}
        <div style={{display:"flex",gap:6}}>
          <button style={{...s.nb(false),padding:"4px 10px",fontSize:12}} onClick={()=>{if(calMode==="semaine")setCalWOff(p=>p-1);else{if(calM===0){setCalM(11);setCalY(y=>y-1);}else setCalM(m=>m-1);}}}>←</button>
          <button style={{...s.nb(false),padding:"4px 10px",fontSize:12}} onClick={()=>{setCalWOff(0);setCalM(3);setCalY(2025);}}>Aujourd'hui</button>
          <button style={{...s.nb(false),padding:"4px 10px",fontSize:12}} onClick={()=>{if(calMode==="semaine")setCalWOff(p=>p+1);else{if(calM===11){setCalM(0);setCalY(y=>y+1);}else setCalM(m=>m+1);}}}>→</button>
        </div>
      </div>
      {calMode==="semaine"?<SV/>:<MV/>}
      <EP/>
    </div>);
  }

  // ── Détail métrique ────────────────────────────────────────────────────────────
  if(view==="metriqueDetail"&&selMetrique!==null){
    const mDefs=[
      {label:"Chevaux",items:chevaux.map(c=>`${c.nom} — ${c.statut} (${c.discipline||"—"})`)},
      {label:"Séances aujourd'hui",items:["10:00 — CSO avec Ténéré","11:30 — Débourrage Salsa","16:00 — Détente Ténéré"]},
      {label:"RDV planifiés",items:chevaux.flatMap(c=>(c.sante.rdvs||[]).map(r=>`${r.date} — ${r.type} ${c.nom}`))},
      {label:"Alertes santé",items:chevaux.filter(c=>c.sante.vaccin==="À renouveler").map(c=>`${c.nom} — Vaccin à renouveler (${c.sante.dernier})`)},
    ];
    const m=mDefs[selMetrique];
    return(<div style={s.wrap}><SaveBadge/><NavBar/>
      <div style={s.hdr}><button onClick={goHome} style={{...s.nb(false),padding:"6px 10px"}}>← Tableau de bord</button><span style={{fontSize:15,fontWeight:500}}>{m.label}</span></div>
      {m.items.length===0?<p style={{fontSize:13,color:"var(--color-text-secondary)"}}>Aucun élément.</p>:m.items.map((item,i)=>(
        <div key={i} style={{...s.row,cursor:"default"}}>
          <div style={{width:24,height:24,borderRadius:"50%",background:"var(--color-background-secondary)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:500,flexShrink:0,color:"var(--color-text-secondary)"}}>{i+1}</div>
          <p style={{margin:0,fontSize:13,lineHeight:1.6}}>{item}</p>
        </div>
      ))}
    </div>);
  }

  // ── Tous les chevaux ───────────────────────────────────────────────────────────
  if(view==="tousChevaux"){
    const saveCh=()=>{
      if(!newCh.nom||!newCh.proprietaire)return;
      upd({chevaux:[...chevaux,{...newCh,id:Date.now(),age:parseInt(newCh.age)||0,favori:false,photo:null,sante:{vaccin:"À jour",dernier:"—",rdvs:[]},palmares:[],seances:[],medias:[]}]});
      setNewCh({nom:"",race:"",age:"",robe:"",statut:"En travail",discipline:"",proprietaire:"",color:"teal"});setShowCreateCh(false);
    };
    return(<div style={s.wrap}><SaveBadge/><NavBar/>
      <div style={s.hdr}><button onClick={goHome} style={{...s.nb(false),padding:"6px 10px"}}>← Écurie</button><span style={{fontSize:15,fontWeight:500}}>Tous les chevaux</span><button style={{...s.btn("primary"),marginLeft:"auto",fontSize:12,padding:"5px 14px"}} onClick={()=>setShowCreateCh(p=>!p)}>{showCreateCh?"Annuler":"+ Nouveau cheval"}</button></div>
      {showCreateCh&&<FC title="Nouveau profil cheval" onClose={()=>setShowCreateCh(false)}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
          <input placeholder="Nom *" style={s.inp} value={newCh.nom} onChange={e=>setNewCh(p=>({...p,nom:e.target.value}))}/>
          <input placeholder="Propriétaire *" style={s.inp} value={newCh.proprietaire} onChange={e=>setNewCh(p=>({...p,proprietaire:e.target.value}))}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
          <input placeholder="Race" style={s.inp} value={newCh.race} onChange={e=>setNewCh(p=>({...p,race:e.target.value}))}/>
          <input placeholder="Robe" style={s.inp} value={newCh.robe} onChange={e=>setNewCh(p=>({...p,robe:e.target.value}))}/>
          <input type="number" placeholder="Âge" style={s.inp} value={newCh.age} onChange={e=>setNewCh(p=>({...p,age:e.target.value}))}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
          <input placeholder="Discipline" style={s.inp} value={newCh.discipline} onChange={e=>setNewCh(p=>({...p,discipline:e.target.value}))}/>
          <select style={s.inp} value={newCh.statut} onChange={e=>setNewCh(p=>({...p,statut:e.target.value}))}>{Object.keys(STAT_C).map(st=><option key={st}>{st}</option>)}</select>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:14}}>
          <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>Couleur :</span>
          {COL_OPTS.map(c=><div key={c} onClick={()=>setNewCh(p=>({...p,color:c}))} style={{width:22,height:22,borderRadius:"50%",background:COLORS[c].bg,border:`2px solid ${newCh.color===c?COLORS[c].border:"transparent"}`,cursor:"pointer"}}/>)}
        </div>
        <button style={s.btn("primary")} onClick={saveCh}>Créer le profil</button>
      </FC>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:12}}>
        {chevaux.map(c=>{
          const sc=STAT_C[c.statut];const cl=COLORS[c.color];
          const ownerAcc=DEMO_ACCOUNTS.find(a=>a.nom.toLowerCase()===c.proprietaire.toLowerCase());
          const ownerColor=ownerAcc?COLORS[ROLES[ownerAcc.role].color?"gray":"gray"]:COLORS.gray;
          return(<div key={c.id} style={s.card} onClick={()=>openFiche(c.id)}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              {c.photo?<img src={c.photo} alt={c.nom} style={{width:40,height:40,borderRadius:"50%",objectFit:"cover",border:`2px solid ${cl.border}`,flexShrink:0}}/>:<div style={s.av(cl.bg,cl.text,40)}>{c.nom.slice(0,2).toUpperCase()}</div>}
              <div>
                <div style={{display:"flex",alignItems:"center",gap:5}}><p style={{margin:0,fontWeight:500,fontSize:14}}>{c.nom}</p>{c.favori&&<svg width="11" height="11" viewBox="0 0 24 24" fill="#EF9F27" stroke="#854F0B" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}</div>
                <p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)"}}>{c.race}</p>
              </div>
            </div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}><span style={s.bdg(sc.bg,sc.text)}>{c.statut}</span><span style={s.bdg("var(--color-background-secondary)","var(--color-text-secondary)")}>{c.discipline||"—"}</span></div>
            <div style={{display:"flex",alignItems:"center",gap:6,paddingTop:8,borderTop:"0.5px solid var(--color-border-tertiary)"}}>
              <div style={{width:18,height:18,borderRadius:"50%",background:cl.bg,color:cl.text,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:500,flexShrink:0}}>{c.proprietaire.slice(0,2).toUpperCase()}</div>
              <span style={{fontSize:11,color:"var(--color-text-secondary)"}}>{c.proprietaire}</span>
            </div>
          </div>);
        })}
      </div>
    </div>);
  }

  // ── Fiche cheval ───────────────────────────────────────────────────────────────
  if(view==="fiche"&&cheval){
    const ownerAcc=DEMO_ACCOUNTS.find(a=>a.nom.toLowerCase()===cheval.proprietaire.toLowerCase());
    const ownerR=ownerAcc?ROLES[ownerAcc.role]:null;
    const ownerBg=ownerR?ownerR.bg:COLORS.gray.bg;const ownerTx=ownerR?ownerR.color:COLORS.gray.text;const ownerBrd=ownerR?ownerR.color+"50":COLORS.gray.border;
    return(<div style={s.wrap}><SaveBadge/><NavBar/>
      <div style={s.hdr}>
        <button onClick={goHome} style={{...s.nb(false),padding:"6px 10px"}}>← Écurie</button>
        <div style={{position:"relative",flexShrink:0}}>{cheval.photo?<img src={cheval.photo} alt={cheval.nom} style={{width:40,height:40,borderRadius:"50%",objectFit:"cover",border:`2px solid ${col.border}`}}/>:<div style={s.av(col.bg,col.text,40)}>{cheval.nom.slice(0,2).toUpperCase()}</div>}</div>
        <span style={{fontSize:16,fontWeight:500}}>{cheval.nom}</span>
        <span style={s.bdg(STAT_C[cheval.statut].bg,STAT_C[cheval.statut].text)}>{cheval.statut}</span>
        <div style={{marginLeft:"auto",display:"flex",gap:8}}>
          <button onClick={()=>setEditForm(editForm?null:{nom:cheval.nom,race:cheval.race,age:cheval.age,robe:cheval.robe,statut:cheval.statut,discipline:cheval.discipline,proprietaire:cheval.proprietaire,color:cheval.color})} style={{...s.nb(!!editForm),fontSize:12,padding:"5px 10px",display:"flex",alignItems:"center",gap:4}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            {editForm?"Annuler":"Modifier"}
          </button>
          <button onClick={()=>toggleFav(cheval.id)} style={{background:"transparent",border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",padding:"5px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontSize:12,color:cheval.favori?"#854F0B":"var(--color-text-secondary)"}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill={cheval.favori?"#EF9F27":"none"} stroke={cheval.favori?"#854F0B":"currentColor"} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            {cheval.favori?"Favori":"Favoris"}
          </button>
        </div>
      </div>

      {editForm&&<FC title="Modifier le profil" onClose={()=>setEditForm(null)}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12,padding:"10px 12px",borderRadius:"var(--border-radius-md)",background:"var(--color-background-secondary)"}}>
          <div style={{flexShrink:0}}>{cheval.photo?<img src={cheval.photo} style={{width:48,height:48,borderRadius:"50%",objectFit:"cover",border:`2px solid ${col.border}`}}/>:<div style={s.av(col.bg,col.text,48)}>{cheval.nom.slice(0,2).toUpperCase()}</div>}</div>
          <div><p style={{margin:"0 0 6px",fontSize:12,fontWeight:500}}>Photo de profil</p><label style={{...s.btn(),fontSize:12,padding:"4px 12px",cursor:"pointer",display:"inline-block"}}>{cheval.photo?"Changer":"Ajouter une photo"}<input type="file" accept="image/*" style={{display:"none"}} onChange={e=>handlePhoto(e,cheval.id)}/></label></div>
          {cheval.photo&&<button onClick={()=>updCh(cheval.id,c=>({...c,photo:null}))} style={{...s.lnk,marginLeft:"auto",color:"#A32D2D"}}>Supprimer</button>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
          <input style={s.inp} placeholder="Nom" value={editForm.nom} onChange={e=>setEditForm(p=>({...p,nom:e.target.value}))}/>
          <input style={s.inp} placeholder="Propriétaire" value={editForm.proprietaire} onChange={e=>setEditForm(p=>({...p,proprietaire:e.target.value}))}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
          <input style={s.inp} placeholder="Race" value={editForm.race} onChange={e=>setEditForm(p=>({...p,race:e.target.value}))}/>
          <input style={s.inp} placeholder="Robe" value={editForm.robe} onChange={e=>setEditForm(p=>({...p,robe:e.target.value}))}/>
          <input style={s.inp} placeholder="Âge" type="number" value={editForm.age} onChange={e=>setEditForm(p=>({...p,age:e.target.value}))}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
          <input style={s.inp} placeholder="Discipline" value={editForm.discipline} onChange={e=>setEditForm(p=>({...p,discipline:e.target.value}))}/>
          <select style={s.inp} value={editForm.statut} onChange={e=>setEditForm(p=>({...p,statut:e.target.value}))}>{Object.keys(STAT_C).map(st=><option key={st}>{st}</option>)}</select>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:14}}>
          <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>Couleur :</span>
          {COL_OPTS.map(c=><div key={c} onClick={()=>setEditForm(p=>({...p,color:c}))} style={{width:22,height:22,borderRadius:"50%",background:COLORS[c].bg,border:`2px solid ${editForm.color===c?COLORS[c].border:"transparent"}`,cursor:"pointer"}}/>)}
        </div>
        <button style={s.btn("primary")} onClick={saveEdit}>Enregistrer les modifications</button>
      </FC>}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))",gap:8,marginBottom:12}}>
        {[["Race",cheval.race],["Âge",cheval.age+" ans"],["Robe",cheval.robe],["Discipline",cheval.discipline||"—"]].map(([k,v])=>(
          <div key={k} style={{background:"var(--color-background-secondary)",borderRadius:"var(--border-radius-md)",padding:"0.6rem 0.9rem"}}>
            <div style={{fontSize:11,color:"var(--color-text-secondary)",marginBottom:3}}>{k}</div>
            <div style={{fontSize:13,fontWeight:500}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:"var(--border-radius-md)",background:ownerBg,border:`0.5px solid ${ownerBrd}`,marginBottom:16}}>
        <div style={{width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,0.5)",color:ownerTx,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:500,flexShrink:0}}>{cheval.proprietaire.slice(0,2).toUpperCase()}</div>
        <div><div style={{fontSize:11,color:ownerTx,opacity:0.8,marginBottom:1}}>Propriétaire</div><div style={{fontSize:13,fontWeight:500,color:ownerTx}}>{cheval.proprietaire}</div></div>
        {ownerR&&<span style={{...s.bdg(ownerBg,ownerTx),marginLeft:"auto",border:`0.5px solid ${ownerBrd}`,fontSize:11}}>{ownerR.label}</span>}
      </div>

      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        {[
          ["Message",()=>{const id=`cheval-${cheval.id}`;if(!convs.find(c=>c.id===id))upd({convs:[...convs,{id,type:"cheval",chevalId:cheval.id,unread:0,messages:[]}]});setView("messagerie");setTimeout(()=>{setMsgTab("cheval");openConv(id);},50);}],
          ["Demande",()=>setActiveTab("demande")],
          ["RDV santé",()=>{setShowNewRdv(true);setActiveTab("sante");}],
          ["Palmarès",()=>{setShowNewPal(true);setActiveTab("palmares");}],
        ].map(([label,fn])=><button key={label} style={{...s.btn(),fontSize:12,padding:"5px 12px"}} onClick={fn}>{label}</button>)}
      </div>

      <div style={{borderBottom:"0.5px solid var(--color-border-tertiary)",marginBottom:16,display:"flex",overflowX:"auto"}}>
        {[["seances","Séances"],["sante","Santé"],["palmares","Palmarès"],["medias","Médias"],["demande","Demande"]].map(([k,l])=><button key={k} style={s.tab(activeTab===k)} onClick={()=>setActiveTab(k)}>{l}</button>)}
      </div>

      {activeTab==="seances"&&<div>
        {showAddNote?<FC title="Nouvelle séance" onClose={()=>{setShowAddNote(false);setNewNote({type:[],exercice:"",duree:"",date:"",note:"",score:0});}}>
          <label style={s.fl}>Type de séance *</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
            {SEANCE_TYPES.map(t=>{const sel=newNote.type.includes(t);return(<button key={t} onClick={()=>setNewNote(p=>({...p,type:sel?p.type.filter(x=>x!==t):[...p.type,t]}))} style={{background:sel?"var(--color-text-primary)":"var(--color-background-secondary)",color:sel?"var(--color-background-primary)":"var(--color-text-primary)",border:"0.5px solid "+(sel?"var(--color-text-primary)":"var(--color-border-secondary)"),borderRadius:"var(--border-radius-md)",padding:"4px 12px",fontSize:12,cursor:"pointer",fontWeight:sel?500:400}}>{t}</button>);})}
          </div>
          <label style={s.fl}>Rattacher un exercice (optionnel)</label>
          <select style={{...s.inp,marginBottom:14}} value={newNote.exercice} onChange={e=>setNewNote(p=>({...p,exercice:e.target.value}))}>
            <option value="">Aucun exercice</option>
            <optgroup label="Exercices chevaux">{allExCh.map(e=><option key={e.id} value={e.id}>{e.titre}</option>)}</optgroup>
            <optgroup label="Exercices cavaliers">{allExCav.map(e=><option key={e.id} value={e.id}>{e.titre}</option>)}</optgroup>
          </select>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
            <div><label style={s.fl}>Durée</label><input placeholder="45 min" style={s.inp} value={newNote.duree} onChange={e=>setNewNote(p=>({...p,duree:e.target.value}))}/></div>
            <div><label style={s.fl}>Date</label><input type="date" style={s.inp} value={newNote.date} onChange={e=>setNewNote(p=>({...p,date:e.target.value}))}/></div>
          </div>
          <label style={s.fl}>Notes & observations</label>
          <textarea placeholder="Comportement, points travaillés…" rows={3} style={{...s.inp,resize:"vertical",marginBottom:14}} value={newNote.note} onChange={e=>setNewNote(p=>({...p,note:e.target.value}))}/>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
            <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>Note</span>
            <div style={{display:"flex",gap:4}}>{[1,2,3,4,5].map(n=><button key={n} onClick={()=>setNewNote(p=>({...p,score:p.score===n?0:n}))} style={{background:"transparent",border:"none",cursor:"pointer",padding:0,fontSize:22,lineHeight:1,color:n<=newNote.score?"#EF9F27":"var(--color-border-secondary)"}}>★</button>)}</div>
            {newNote.score>0&&<span style={{fontSize:12,color:"var(--color-text-secondary)"}}>{["","Difficile","Passable","Correcte","Bonne","Excellente"][newNote.score]}</span>}
          </div>
          <button style={s.btn("primary")} onClick={addSeance}>Enregistrer</button>
        </FC>:<button style={{...s.btn(),marginBottom:16}} onClick={()=>setShowAddNote(true)}>+ Ajouter une séance</button>}
        {(cheval.seances||[]).map((s2,i)=>(
          <div key={i} style={s.row}>
            <div style={{flexShrink:0,width:80,fontSize:12,color:"var(--color-text-secondary)",paddingTop:2}}>{s2.date}</div>
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:8,marginBottom:4,flexWrap:"wrap",alignItems:"center"}}>
                <span style={{fontSize:13,fontWeight:500}}>{s2.type}</span>
                {s2.duree&&s2.duree!=="—"&&<span style={{fontSize:12,color:"var(--color-text-secondary)"}}>{s2.duree}</span>}
                {s2.score>0&&<span style={{display:"flex",gap:1}}>{[1,2,3,4,5].map(n=><span key={n} style={{fontSize:12,color:n<=s2.score?"#EF9F27":"var(--color-border-secondary)"}}>★</span>)}</span>}
              </div>
              {s2.note&&<p style={{margin:0,fontSize:13,color:"var(--color-text-secondary)",lineHeight:1.5}}>{s2.note}</p>}
            </div>
          </div>
        ))}
      </div>}

      {activeTab==="sante"&&<div>
        {showNewRdv?<FC title="Nouveau RDV santé" onClose={()=>setShowNewRdv(false)}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
            <select style={s.inp} value={newRdv.type} onChange={e=>setNewRdv(p=>({...p,type:e.target.value}))}><option value="">Type *</option>{["Véto","Ostéo","Maréchal","Dentiste","Coaching","Autre"].map(t=><option key={t}>{t}</option>)}</select>
            <input placeholder="Détails…" style={s.inp} value={newRdv.detail} onChange={e=>setNewRdv(p=>({...p,detail:e.target.value}))}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
            <input type="date" style={s.inp} value={newRdv.date} onChange={e=>setNewRdv(p=>({...p,date:e.target.value}))}/>
            <input type="time" style={s.inp} value={newRdv.heure} onChange={e=>setNewRdv(p=>({...p,heure:e.target.value}))}/>
            <input type="time" style={s.inp} value={newRdv.fin} onChange={e=>setNewRdv(p=>({...p,fin:e.target.value}))}/>
          </div>
          <p style={{margin:"0 0 10px",fontSize:12,color:"var(--color-text-secondary)"}}>Ce RDV sera ajouté au calendrier automatiquement.</p>
          <button style={s.btn("primary")} onClick={saveRdv}>Enregistrer le RDV</button>
        </FC>:<button style={{...s.btn(),marginBottom:16}} onClick={()=>setShowNewRdv(true)}>+ Nouveau RDV santé</button>}
        <div style={{...s.card,cursor:"default",marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:13,fontWeight:500}}>Vaccinations</span>
            <span style={s.bdg(cheval.sante.vaccin==="À jour"?"#EAF3DE":"#FAEEDA",cheval.sante.vaccin==="À jour"?"#3B6D11":"#854F0B")}>{cheval.sante.vaccin}</span>
          </div>
          <p style={{margin:"8px 0 0",fontSize:12,color:"var(--color-text-secondary)"}}>Dernier rappel : {cheval.sante.dernier}</p>
        </div>
        {(cheval.sante.rdvs||[]).map((r,i)=>(
          <div key={i} style={s.row}>
            <div style={{flexShrink:0,width:80,fontSize:12,color:"var(--color-text-secondary)",paddingTop:2}}>{r.date}</div>
            <div style={{flex:1}}><p style={{margin:0,fontSize:13,fontWeight:500}}>{r.type}</p>{r.detail&&<p style={{margin:"2px 0 0",fontSize:12,color:"var(--color-text-secondary)"}}>{r.detail}</p>}</div>
          </div>
        ))}
      </div>}

      {activeTab==="palmares"&&<div>
        {showNewPal?<FC title="Ajouter un résultat" onClose={()=>setShowNewPal(false)}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
            <input placeholder="Épreuve *" style={s.inp} value={newPal.epreuve} onChange={e=>setNewPal(p=>({...p,epreuve:e.target.value}))}/>
            <input placeholder="Classement" style={s.inp} value={newPal.classement} onChange={e=>setNewPal(p=>({...p,classement:e.target.value}))}/>
          </div>
          <input type="date" style={{...s.inp,marginBottom:12}} value={newPal.date} onChange={e=>setNewPal(p=>({...p,date:e.target.value}))}/>
          <button style={s.btn("primary")} onClick={savePal}>Enregistrer</button>
        </FC>:<button style={{...s.btn(),marginBottom:16}} onClick={()=>setShowNewPal(true)}>+ Ajouter un résultat</button>}
        {(cheval.palmares||[]).length===0?<p style={{fontSize:13,color:"var(--color-text-secondary)"}}>Aucun résultat enregistré.</p>:(cheval.palmares||[]).map((p,i)=>(
          <div key={i} style={s.row}>
            <div style={{flexShrink:0,width:90,fontSize:12,color:"var(--color-text-secondary)",paddingTop:2}}>{p.date}</div>
            <div><p style={{margin:0,fontSize:13,fontWeight:500}}>{p.epreuve}</p><p style={{margin:"2px 0 0",fontSize:12,color:"var(--color-text-secondary)"}}>{p.classement}</p></div>
          </div>
        ))}
      </div>}

      {activeTab==="medias"&&<div>
        <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
          <label style={{...s.btn("primary"),fontSize:12,padding:"6px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            Photos<input type="file" accept="image/*" multiple style={{display:"none"}} onChange={handleMedia}/>
          </label>
          <label style={{...s.btn(),fontSize:12,padding:"6px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
            Vidéo<input type="file" accept="video/*" style={{display:"none"}} onChange={handleMedia}/>
          </label>
        </div>
        {(cheval.medias||[]).length>0?(
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
            {(cheval.medias||[]).map((m,i)=>(
              <div key={i} style={{borderRadius:"var(--border-radius-md)",overflow:"hidden",border:"0.5px solid var(--color-border-tertiary)",aspectRatio:"1",background:"var(--color-background-secondary)"}}>
                {m.type==="photo"?<img src={m.url} alt={m.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<video src={m.url} style={{width:"100%",height:"100%",objectFit:"cover"}} controls/>}
              </div>
            ))}
          </div>
        ):(
          <div style={{border:"1px dashed var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",padding:"32px 20px",textAlign:"center",marginBottom:16}}>
            <p style={{margin:"0 0 4px",fontSize:13,fontWeight:500}}>Aucun média</p>
            <p style={{margin:0,fontSize:12,color:"var(--color-text-secondary)"}}>Ajoute des photos ou vidéos ci-dessus.</p>
          </div>
        )}
        <div style={{padding:"10px 14px",borderRadius:"var(--border-radius-md)",background:col.bg,border:`0.5px solid ${col.border}`}}>
          <p style={{margin:"0 0 2px",fontSize:12,fontWeight:500,color:col.text}}>Partager la fiche</p>
          <p style={{margin:"0 0 10px",fontSize:12,color:col.text}}>Génère un lien ou PDF partageable.</p>
          <button style={{...s.btn("primary"),fontSize:12,padding:"5px 12px"}}>Générer un lien</button>
        </div>
      </div>}

      {activeTab==="demande"&&<div>
        <p style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:16,lineHeight:1.6}}>Envoie une demande à la gestionnaire concernant <strong style={{color:"var(--color-text-primary)"}}>{cheval.nom}</strong>.</p>
        <select style={{...s.inp,marginBottom:10}}><option value="">Type de demande…</option>{["Demande de visite","Bilan de progression","Demande de soins","Question santé","Autre"].map(t=><option key={t}>{t}</option>)}</select>
        <textarea placeholder={`Demande concernant ${cheval.nom}…`} rows={4} style={{...s.inp,resize:"vertical",marginBottom:12}}/>
        <button style={s.btn("primary")} onClick={()=>{upd({notifs:[{id:Date.now(),type:"demande",text:`Demande — ${cheval.nom}`,detail:`Nouvelle demande depuis la fiche`,time:"À l'instant",read:false,action:null},...notifs]});setActiveTab("seances");}}>Envoyer la demande</button>
      </div>}
    </div>);
  }

  // ── Vue principale ─────────────────────────────────────────────────────────────
  const metriquesDisplay=[
    {n:String(chevaux.length),label:"Chevaux",idx:0},
    {n:String((events["2025-04-13"]||[]).length),label:"Séances aujourd'hui",idx:1},
    {n:String(chevaux.reduce((a,c)=>(c.sante.rdvs||[]).length+a,0)),label:"RDV planifiés",idx:2},
    {n:String(chevaux.filter(c=>c.sante.vaccin==="À renouveler").length),label:"Alertes santé",idx:3},
  ];
  return(<div style={s.wrap}><SaveBadge/><NavBar/>
    <div style={s.hdr}>
      <div style={{display:"flex",alignItems:"center",gap:8,flex:1}}>
        <div style={{width:34,height:34,borderRadius:"50%",background:COLORS.teal.bg,color:COLORS.teal.text,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:500,flexShrink:0}}>MA</div>
        <div><p style={{margin:0,fontSize:15,fontWeight:500}}>Bonjour Manon</p><p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)"}}>Cavalier · Écuries AR</p></div>
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <button onClick={()=>setView("notifications")} style={{position:"relative",background:"transparent",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)",padding:"6px 10px",cursor:"pointer",color:"var(--color-text-primary)"}}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          {unreadNotifs>0&&<div style={{position:"absolute",top:-4,right:-4,width:16,height:16,borderRadius:"50%",background:"#E24B4A",color:"#fff",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center"}}>{unreadNotifs}</div>}
        </button>
        <button onClick={()=>setView("messagerie")} style={{position:"relative",background:"transparent",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)",padding:"6px 10px",cursor:"pointer",color:"var(--color-text-primary)"}}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          {unreadMsgs>0&&<div style={{position:"absolute",top:-4,right:-4,width:16,height:16,borderRadius:"50%",background:"#E24B4A",color:"#fff",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center"}}>{unreadMsgs}</div>}
        </button>
        <button onClick={logout} style={{background:"transparent",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)",padding:"6px 10px",cursor:"pointer",fontSize:12,color:"var(--color-text-secondary)"}}>↩</button>
      </div>
    </div>

    {view==="ecuries"&&<>
      {/* Métriques — rectangles colorés */}
      {(()=>{
        const palette=[
          {bg:"#E1F5EE",text:"#0F6E56",border:"#5DCAA5",icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 16s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="20" x2="4" y2="16"/></svg>},
          {bg:"#EEEDFE",text:"#3C3489",border:"#AFA9EC",icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>},
          {bg:"#FAEEDA",text:"#854F0B",border:"#EF9F27",icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>},
          {bg:"#FAECE7",text:"#712B13",border:"#F0997B",icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>},
        ];
        return(
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginBottom:24}}>
            {metriquesDisplay.map((m,i)=>{
              const p=palette[i];
              return(
                <div key={i} onClick={()=>{setSelMetrique(m.idx);setView("metriqueDetail");}}
                  style={{background:p.bg,borderRadius:"var(--border-radius-lg)",padding:"1rem 1.25rem",cursor:"pointer",border:`0.5px solid ${p.border}`,position:"relative",overflow:"hidden",transition:"opacity 0.15s"}}
                  onMouseEnter={e=>e.currentTarget.style.opacity="0.82"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                    <div style={{width:34,height:34,borderRadius:"var(--border-radius-md)",background:"rgba(255,255,255,0.45)",display:"flex",alignItems:"center",justifyContent:"center",color:p.text}}>{p.icon}</div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={p.text} strokeWidth="2" style={{opacity:0.5,marginTop:2}}><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                  <div style={{fontSize:30,fontWeight:500,color:p.text,lineHeight:1,marginBottom:6}}>{m.n}</div>
                  <div style={{fontSize:12,color:p.text,opacity:0.75,fontWeight:500}}>{m.label}</div>
                </div>
              );
            })}
          </div>
        );
      })()}

      <div style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",padding:"1rem 1.25rem",marginBottom:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <span style={{fontSize:14,fontWeight:500}}>Semaine du 13 — 19 avril</span>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button style={{...s.nb(false),padding:"4px 10px",fontSize:12}}>←</button>
            <button style={{...s.nb(false),padding:"4px 10px",fontSize:12}}>→</button>
            <button style={s.lnk} onClick={()=>setView("calendrier")}>Voir tout →</button>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:5}}>
          {JOURS.map((j,i)=>{
            const isT=i===0;const d=13+i;const k=dKey(2025,3,d);const evts=(events[k]||[]).slice(0,2);
            return(<div key={j} style={{borderRadius:"var(--border-radius-md)",border:isT?"1.5px solid var(--color-border-secondary)":"0.5px solid var(--color-border-tertiary)",background:isT?"var(--color-background-secondary)":"transparent",padding:"7px 5px",minHeight:80}}>
              <div style={{textAlign:"center",marginBottom:5}}><div style={{fontSize:10,color:"var(--color-text-secondary)"}}>{j}</div><div style={{fontSize:13,fontWeight:isT?500:400}}>{d}</div></div>
              {evts.map((e,ei)=>{const cl=COLORS[e.color]||COLORS.teal;return(<div key={ei} style={{background:cl.bg,borderRadius:3,padding:"2px 4px",marginBottom:2}}><div style={{fontSize:10,color:cl.text,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.label}</div></div>);})}
            </div>);
          })}
        </div>
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <p style={{margin:0,fontSize:13,fontWeight:500,color:"var(--color-text-secondary)"}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#EF9F27" stroke="#854F0B" strokeWidth="2" style={{marginRight:5,verticalAlign:"middle"}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          Chevaux favoris
        </p>
        <button style={s.lnk} onClick={()=>setView("tousChevaux")}>Voir tous →</button>
      </div>
      {favoris.length===0?<p style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:20}}>Aucun favori. Ouvre une fiche et clique sur l'étoile.</p>:(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:12,marginBottom:24}}>
          {favoris.map(c=>{const sc=STAT_C[c.statut];const cl=COLORS[c.color];return(
            <div key={c.id} style={s.card} onClick={()=>openFiche(c.id)}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                {c.photo?<img src={c.photo} alt={c.nom} style={{width:40,height:40,borderRadius:"50%",objectFit:"cover",border:`2px solid ${cl.border}`,flexShrink:0}}/>:<div style={s.av(cl.bg,cl.text,40)}>{c.nom.slice(0,2).toUpperCase()}</div>}
                <div><p style={{margin:0,fontWeight:500,fontSize:14}}>{c.nom}</p><p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)"}}>{c.race}</p></div>
              </div>
              <div style={{display:"flex",gap:5,marginBottom:8,flexWrap:"wrap"}}><span style={s.bdg(sc.bg,sc.text)}>{c.statut}</span><span style={s.bdg("var(--color-background-secondary)","var(--color-text-secondary)")}>{c.discipline||"—"}</span></div>
              <div style={{borderTop:"0.5px solid var(--color-border-tertiary)",paddingTop:8}}>
                <p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)"}}>Prochain RDV : {c.sante.rdvs?.[0]?.date||"—"}</p>
              </div>
            </div>
          );})}
        </div>
      )}

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <p style={{margin:0,fontSize:13,fontWeight:500,color:"var(--color-text-secondary)"}}>Exercices suggérés</p>
        <button style={s.lnk} onClick={()=>setView("catalogue")}>Voir le catalogue →</button>
      </div>
      <div style={{borderBottom:"0.5px solid var(--color-border-tertiary)",marginBottom:14,display:"flex"}}>
        {[["chevaux","Pour les chevaux"],["cavaliers","Pour les cavaliers"]].map(([k,l])=><button key={k} style={s.tab(exTab===k)} onClick={()=>setExTab(k)}>{l}</button>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:12}}>
        {(exTab==="chevaux"?allExCh:allExCav).slice(0,4).map((ex,i)=>{
          const bg=(exTab==="chevaux"?EX_BG.chevaux:EX_BG.cavaliers)[i%4];const tx=(exTab==="chevaux"?EX_TX.chevaux:EX_TX.cavaliers)[i%4];
          const nc=NIV_C[ex.niveau]||NIV_C["Tous niveaux"];const dc=DISC_C[ex.discipline]||DISC_C["Tous"];
          return(<div key={ex.id} style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",overflow:"hidden",cursor:"pointer"}} onClick={()=>{setSelEx({id:ex.id,type:exTab});setView("exercice");}}>
            <div style={{background:bg,height:88,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:5}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={tx} strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span style={{fontSize:12,fontWeight:500,color:tx,textAlign:"center",padding:"0 8px",lineHeight:1.3}}>{ex.titre}</span>
            </div>
            <div style={{padding:"0.75rem 1rem"}}>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:5}}><span style={s.bdg(nc.bg,nc.text)}>{ex.niveau}</span><span style={s.bdg(dc.bg,dc.text)}>{ex.discipline}</span></div>
              <p style={{margin:0,fontSize:11,color:"var(--color-text-secondary)"}}>{ex.duree}{ex.objectif?" · "+ex.objectif:""}</p>
            </div>
          </div>);
        })}
      </div>
    </>}

    {view==="quotidien"&&<>
      <p style={{margin:"0 0 4px",fontSize:15,fontWeight:500}}>Lundi 13 avril 2025</p>
      <p style={{margin:"0 0 20px",fontSize:13,color:"var(--color-text-secondary)"}}>{(events["2025-04-13"]||[]).length} événements aujourd'hui</p>
      {(events["2025-04-13"]||[]).map((r,i)=>{const tc=RDV_C[r.type]||RDV_C["Séance"];const cl=COLORS[r.color]||COLORS.teal;return(
        <div key={i} style={{display:"flex",gap:12,padding:"12px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
          <div style={{flexShrink:0,width:44,fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",paddingTop:2}}>{r.heure}</div>
          <div style={{width:3,alignSelf:"stretch",borderRadius:2,background:cl.border,flexShrink:0}}/>
          <div style={{flex:1}}><div style={{display:"flex",gap:8,alignItems:"center",marginBottom:3}}><span style={{fontSize:13,fontWeight:500}}>{r.label}</span><span style={s.bdg(tc.bg,tc.text)}>{r.type}</span></div><p style={{margin:0,fontSize:12,color:"var(--color-text-secondary)"}}>{r.heure} — {r.fin}</p></div>
        </div>
      );})}
    </>}
  </div>);
}
