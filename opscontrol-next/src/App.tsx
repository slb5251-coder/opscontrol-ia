import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { AnimatePresence, motion } from 'motion/react';
import { Activity, Bell, Boxes, ChevronRight, Droplets, Gauge, Menu, Search, ShieldCheck, Ship, Truck, Wrench, X } from 'lucide-react';
import { useMemo, useState } from 'react';

const tanks = [
  { id:'TK-04', product:'KCL Polymer 9.8 ppg', family:'WBM', volume:760, capacity:1000, status:'Operando' },
  { id:'TK-S08', product:'Rheliant 9.6 ppg', family:'SBM', volume:1125, capacity:1500, status:'Disponível' },
  { id:'TK-12', product:'Brine NaCl 9.9 ppg', family:'BRINE', volume:420, capacity:1000, status:'Recebendo' },
  { id:'SILO-02', product:'Barita', family:'BULK', volume:72, capacity:100, status:'Bombeando' }
];

const nav = [
  ['Visão geral', Gauge], ['Operações', Activity], ['Tanques e silos', Droplets],
  ['Embarcações', Ship], ['Carretas', Truck], ['Manutenção', Wrench], ['QHSE', ShieldCheck]
] as const;

function TankCard({tank}:{tank:typeof tanks[number]}) {
  const pct = Math.round((tank.volume/tank.capacity)*100);
  return <motion.article layout whileHover={{y:-5}} transition={{type:'spring', stiffness:280, damping:24}} className="tank-card">
    <div className="card-top"><div><span>{tank.family}</span><h3>{tank.id}</h3></div><b>{tank.status}</b></div>
    <div className="tank-visual" aria-label={`${pct}% ocupado`}>
      <motion.div className="liquid" initial={{height:0}} animate={{height:`${pct}%`}} transition={{duration:1.15, ease:[.22,1,.36,1]}} />
      <div className="tank-grid"/><strong>{pct}%</strong>
    </div>
    <div className="tank-copy"><h4>{tank.product}</h4><p>{tank.volume.toLocaleString('pt-BR')} / {tank.capacity.toLocaleString('pt-BR')} {tank.family==='BULK'?'t':'bbl'}</p></div>
    <button>Ver histórico <ChevronRight size={16}/></button>
  </motion.article>
}

export default function App(){
  const [sidebar,setSidebar]=useState(false); const [alerts,setAlerts]=useState(false); const [active,setActive]=useState('Visão geral');
  const total = useMemo(()=>tanks.reduce((a,t)=>a+t.volume,0),[]);
  return <div className="app-shell">
    <AnimatePresence>{sidebar&&<motion.button className="backdrop" aria-label="Fechar menu" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setSidebar(false)}/>}</AnimatePresence>
    <motion.aside className={`sidebar ${sidebar?'open':''}`}>
      <div className="brand"><div className="brand-mark"><Boxes size={22}/></div><div><strong>OPSControl</strong><span>IA NEXT</span></div><button onClick={()=>setSidebar(false)}><X size={20}/></button></div>
      <div className="plant"><i/><div><span>PLANTA ATIVA</span><strong>B-PORT LMP</strong></div></div>
      <nav>{nav.map(([label,Icon])=><button key={label} className={active===label?'active':''} onClick={()=>{setActive(label);setSidebar(false)}}><Icon size={19}/><span>{label}</span></button>)}</nav>
      <div className="user"><div>JV</div><span><strong>João Victor</strong><small>Líder de equipe</small></span></div>
    </motion.aside>

    <main>
      <header><button className="menu" onClick={()=>setSidebar(true)}><Menu/></button><div><span>Centro de controle operacional</span><h1>{active}</h1></div><div className="actions"><button><Search/></button><button onClick={()=>setAlerts(true)}><Bell/><i>3</i></button></div></header>
      <section className="hero">
        <div><span className="eyebrow">OPERAÇÃO EM TEMPO REAL</span><h2>Visibilidade total da planta,<br/>decisões mais rápidas.</h2><p>Fluidos, granéis, logística, manutenção e segurança em uma única experiência operacional.</p></div>
        <motion.div className="pulse-orbit" animate={{rotate:360}} transition={{duration:18, repeat:Infinity, ease:'linear'}}><div/><span/></motion.div>
      </section>
      <section className="metrics">
        {[['Volume monitorado',`${total.toLocaleString('pt-BR')} un.`,Droplets],['Operações ativas','08',Activity],['Embarcações na semana','12',Ship],['Conformidade QHSE','98,7%',ShieldCheck]].map(([l,v,I]:any)=><motion.article key={l} initial={{opacity:0,y:14}} animate={{opacity:1,y:0}}><div><I size={20}/></div><span>{l}</span><strong>{v}</strong><small>Atualizado agora</small></motion.article>)}
      </section>
      <section className="section-head"><div><span>ATIVOS PRINCIPAIS</span><h2>Tanques e silos</h2></div><button>Visualizar todos <ChevronRight size={17}/></button></section>
      <section className="tank-grid-list">{tanks.map(t=><TankCard key={t.id} tank={t}/>)}</section>
    </main>

    <Dialog open={alerts} onClose={setAlerts} className="dialog"><div className="dialog-backdrop"/><DialogPanel className="dialog-panel"><div className="dialog-title"><DialogTitle>Central de alertas</DialogTitle><button onClick={()=>setAlerts(false)}><X/></button></div>{['TK-12 atingiu 42% da capacidade','Operação PRIO inicia em 45 minutos','Inspeção do compressor vence hoje'].map((a,i)=><motion.div className="alert" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} transition={{delay:i*.08}} key={a}><i/><div><strong>{a}</strong><span>Agora</span></div></motion.div>)}</DialogPanel></Dialog>
  </div>
}
