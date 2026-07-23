import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { AnimatePresence, motion } from 'motion/react';
import { Activity, Bell, Boxes, ChevronRight, Droplets, Gauge, Menu, Search, ShieldCheck, Ship, Truck, Wrench, X, LogOut } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Login } from './components/Login';
import { loadDashboard, type Tank } from './lib/data';
import { supabase } from './lib/supabase';

const demoTanks: Tank[] = [
  { id:'1', name:'TK-04', current_product:'KCL Polymer 9.8 ppg', kind:'WBM', phase:'Phase #1', current_volume:760, capacity:1000, status:'Operando', unit:'bbl' },
  { id:'2', name:'TK-S08', current_product:'Rheliant 9.6 ppg', kind:'SBM', phase:'Phase #2', current_volume:1125, capacity:1500, status:'Disponível', unit:'bbl' },
  { id:'3', name:'TK-12', current_product:'Brine NaCl 9.9 ppg', kind:'BRINE', phase:'Phase #1', current_volume:420, capacity:1000, status:'Recebendo', unit:'bbl' },
  { id:'4', name:'SILO-02', current_product:'Barita', kind:'BULK', phase:'Phase #1', current_volume:72, capacity:100, status:'Bombeando', unit:'t' }
];

const nav = [
  ['Visão geral', Gauge], ['Operações', Activity], ['Tanques e silos', Droplets],
  ['Embarcações', Ship], ['Carretas', Truck], ['Manutenção', Wrench], ['QHSE', ShieldCheck]
] as const;

function TankCard({tank}:{tank:Tank}) {
  const pct = Math.min(100, Math.round((tank.current_volume/tank.capacity)*100));
  return <motion.article layout whileHover={{y:-5}} transition={{type:'spring', stiffness:280, damping:24}} className="tank-card">
    <div className="card-top"><div><span>{tank.kind}</span><h3>{tank.name}</h3></div><b>{tank.status}</b></div>
    <div className="tank-visual" aria-label={`${pct}% ocupado`}>
      <motion.div className="liquid" initial={{height:0}} animate={{height:`${pct}%`}} transition={{duration:1.15, ease:[.22,1,.36,1]}} />
      <div className="tank-grid"/><strong>{pct}%</strong>
    </div>
    <div className="tank-copy"><h4>{tank.current_product || 'Sem produto'}</h4><p>{tank.current_volume.toLocaleString('pt-BR')} / {tank.capacity.toLocaleString('pt-BR')} {tank.unit}</p></div>
    <button>Ver histórico <ChevronRight size={16}/></button>
  </motion.article>
}

function Dashboard({ demo, onExitDemo }: { demo:boolean; onExitDemo:()=>void }) {
  const [sidebar,setSidebar]=useState(false);
  const [alertsOpen,setAlertsOpen]=useState(false);
  const [active,setActive]=useState('Visão geral');
  const [tanks,setTanks]=useState<Tank[]>(demoTanks);
  const [alerts,setAlerts]=useState<any[]>([]);
  const [summary,setSummary]=useState<any>(null);
  const [loading,setLoading]=useState(!demo);

  useEffect(()=>{
    if (demo) return;
    loadDashboard().then(data=>{setTanks(data.tanks);setAlerts(data.alerts);setSummary(data.summary);}).catch(console.error).finally(()=>setLoading(false));
  },[demo]);

  const total = useMemo(()=>tanks.reduce((a,t)=>a+t.current_volume,0),[tanks]);
  const userName = demo ? 'Homologação visual' : 'Usuário conectado';

  async function logout(){ if(demo) onExitDemo(); else await supabase?.auth.signOut(); }

  return <div className="app-shell">
    <AnimatePresence>{sidebar&&<motion.button className="backdrop" aria-label="Fechar menu" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setSidebar(false)}/>}</AnimatePresence>
    <motion.aside className={`sidebar ${sidebar?'open':''}`}>
      <div className="brand"><div className="brand-mark"><Boxes size={22}/></div><div><strong>OPSControl</strong><span>IA NEXT</span></div><button onClick={()=>setSidebar(false)}><X size={20}/></button></div>
      <div className="plant"><i/><div><span>{demo?'MODO HOMOLOGAÇÃO':'PLANTA ATIVA'}</span><strong>B-PORT LMP</strong></div></div>
      <nav>{nav.map(([label,Icon])=><button key={label} className={active===label?'active':''} onClick={()=>{setActive(label);setSidebar(false)}}><Icon size={19}/><span>{label}</span></button>)}</nav>
      <button className="logout" onClick={logout}><LogOut size={18}/>Sair</button>
      <div className="user"><div>OC</div><span><strong>{userName}</strong><small>{demo?'Dados demonstrativos':'Sessão segura'}</small></span></div>
    </motion.aside>

    <main>
      <header><button className="menu" onClick={()=>setSidebar(true)}><Menu/></button><div><span>Centro de controle operacional</span><h1>{active}</h1></div><div className="actions"><button><Search/></button><button onClick={()=>setAlertsOpen(true)}><Bell/><i>{alerts.length || 3}</i></button></div></header>
      <section className="hero"><div><span className="eyebrow">{demo?'HOMOLOGAÇÃO DA NOVA INTERFACE':'OPERAÇÃO EM TEMPO REAL'}</span><h2>Visibilidade total da planta,<br/>decisões mais rápidas.</h2><p>Fluidos, granéis, logística, manutenção e segurança em uma única experiência operacional.</p></div><motion.div className="pulse-orbit" animate={{rotate:360}} transition={{duration:18, repeat:Infinity, ease:'linear'}}><div/><span/></motion.div></section>
      <section className="metrics">
        {[
          ['Volume monitorado',`${total.toLocaleString('pt-BR')} un.`,Droplets],
          ['Operações ativas',String(summary?.operations_in_progress ?? (demo?8:0)).padStart(2,'0'),Activity],
          ['Operações programadas',String(summary?.operations_scheduled ?? (demo?12:0)).padStart(2,'0'),Ship],
          ['Pendências QHSE',String(summary?.qhse_pending ?? (demo?2:0)).padStart(2,'0'),ShieldCheck]
        ].map(([l,v,I]:any)=><motion.article key={l} initial={{opacity:0,y:14}} animate={{opacity:1,y:0}}><div><I size={20}/></div><span>{l}</span><strong>{v}</strong><small>{loading?'Carregando dados...':'Atualizado agora'}</small></motion.article>)}
      </section>
      <section className="section-head"><div><span>ATIVOS PRINCIPAIS</span><h2>Tanques e silos</h2></div><button>Visualizar todos <ChevronRight size={17}/></button></section>
      <section className="tank-grid-list">{tanks.map(t=><TankCard key={t.id} tank={t}/>)}</section>
    </main>

    <Dialog open={alertsOpen} onClose={setAlertsOpen} className="dialog"><div className="dialog-backdrop"/><DialogPanel className="dialog-panel"><div className="dialog-title"><DialogTitle>Central de alertas</DialogTitle><button onClick={()=>setAlertsOpen(false)}><X/></button></div>{(alerts.length?alerts:[{title:'TK-12 atingiu 42% da capacidade'},{title:'Operação PRIO inicia em 45 minutos'},{title:'Inspeção do compressor vence hoje'}]).map((a:any,i:number)=><motion.div className="alert" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} transition={{delay:i*.08}} key={a.alert_key||a.title}><i/><div><strong>{a.title}</strong><span>{a.message||'Agora'}</span></div></motion.div>)}</DialogPanel></Dialog>
  </div>;
}

export default function App(){
  const [session,setSession]=useState<Session|null>(null);
  const [checking,setChecking]=useState(Boolean(supabase));
  const [demo,setDemo]=useState(false);

  useEffect(()=>{
    if(!supabase){setChecking(false);return;}
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setChecking(false);});
    const {data}=supabase.auth.onAuthStateChange((_event,next)=>setSession(next));
    return ()=>data.subscription.unsubscribe();
  },[]);

  if(checking) return <div className="boot-screen"><div className="brand-mark">OC</div><strong>Inicializando OPSControl IA Next</strong></div>;
  if(!session&&!demo) return <Login onDemo={()=>setDemo(true)}/>;
  return <Dashboard demo={demo} onExitDemo={()=>setDemo(false)}/>;
}
