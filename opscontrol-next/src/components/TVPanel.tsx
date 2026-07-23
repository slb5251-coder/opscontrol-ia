import {Activity, AlertTriangle, Droplets, ShieldCheck, Ship, Truck} from 'lucide-react';
import {motion} from 'motion/react';
import type {Operation, QhseRecord, Tank, Truck as TruckRecord, VesselSchedule} from '../lib/data';

type AlertItem={title?:string;message?:string;severity?:string};

type Props={
  tanks:Tank[];
  operations:Operation[];
  vessels:VesselSchedule[];
  trucks:TruckRecord[];
  qhse:QhseRecord[];
  alerts:AlertItem[];
  summary?:Record<string,number>|null;
};

const pct=(value:number,total:number)=>Math.max(0,Math.min(100,Math.round(value/(total||1)*100)));

export function TVPanel({tanks,operations,vessels,trucks,qhse,alerts,summary}:Props){
  const total=tanks.reduce((acc,t)=>acc+t.current_volume,0);
  const activeOperations=operations.filter(o=>['Em andamento','Pausada'].includes(o.status)).slice(0,4);
  const criticalTanks=tanks.filter(t=>pct(t.current_volume,t.capacity)<=20||pct(t.current_volume,t.capacity)>=90||['Bloqueado','Manutenção'].includes(t.status)).slice(0,5);
  const nextVessels=vessels.slice(0,4);
  const pendingTrucks=trucks.filter(t=>(t.workflow_stage||'').toLowerCase()!=='liberada').slice(0,4);
  const pendingQhse=summary?.qhse_pending??qhse.filter(q=>q.status!=='Concluído').length;
  const metrics=[
    {label:'Volume monitorado',value:`${total.toLocaleString('pt-BR')} un.`,Icon:Droplets,tone:'blue'},
    {label:'Operações ativas',value:String(summary?.operations_in_progress??activeOperations.length),Icon:Activity,tone:'green'},
    {label:'Carretas pendentes',value:String(summary?.trucks_pending??pendingTrucks.length),Icon:Truck,tone:'amber'},
    {label:'Pendências QHSE',value:String(pendingQhse),Icon:ShieldCheck,tone:'red'}
  ];
  return <section className="tv-page tv-control-room">
    <div className="tv-heading"><div><span>CENTRO DE CONTROLE</span><h2>Painel TV</h2><p>Visão operacional consolidada da B-PORT LMP.</p></div><div className="tv-live"><i/>LIVE</div></div>
    <div className="tv-metrics">{metrics.map(({label,value,Icon,tone},index)=><motion.article key={label} className={`tv-kpi ${tone}`} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:index*.06}}><Icon/><span>{label}</span><strong>{value}</strong></motion.article>)}</div>
    <div className="tv-operations-grid">
      <article className="tv-block tv-wide"><header><div><Activity/><span>Operações em andamento</span></div><b>{activeOperations.length}</b></header><div className="tv-list">{activeOperations.length?activeOperations.map(o=>{const progress=pct(o.executed_quantity,o.planned_quantity);return <div key={o.id} className="tv-operation"><div><strong>{o.vessel}</strong><span>{o.client} · {o.product}</span></div><b>{progress}%</b><div className="tv-progress"><i style={{width:`${progress}%`}}/></div></div>}):<div className="tv-empty">Nenhuma operação em andamento</div>}</div></article>
      <article className="tv-block"><header><div><AlertTriangle/><span>Tanques críticos</span></div><b>{criticalTanks.length}</b></header><div className="tv-list compact">{criticalTanks.length?criticalTanks.map(t=><div key={t.id} className="tv-row"><span><strong>{t.name}</strong><small>{t.current_product||t.status}</small></span><b>{pct(t.current_volume,t.capacity)}%</b></div>):<div className="tv-empty">Nenhum nível crítico</div>}</div></article>
      <article className="tv-block"><header><div><Ship/><span>Próximas embarcações</span></div><b>{nextVessels.length}</b></header><div className="tv-list compact">{nextVessels.length?nextVessels.map(v=><div key={v.id} className="tv-row"><span><strong>{v.vessel_name}</strong><small>{v.client} · {v.product||v.operation_type}</small></span><b>{v.status}</b></div>):<div className="tv-empty">Sem embarcações programadas</div>}</div></article>
      <article className="tv-block"><header><div><Truck/><span>Fluxo de carretas</span></div><b>{pendingTrucks.length}</b></header><div className="tv-list compact">{pendingTrucks.length?pendingTrucks.map(t=><div key={t.id} className="tv-row"><span><strong>{t.plate||'Sem placa'}</strong><small>{t.product} · {t.quantity} {t.unit}</small></span><b>{t.workflow_stage||'Programada'}</b></div>):<div className="tv-empty">Fluxo sem pendências</div>}</div></article>
      <article className="tv-block tv-alerts"><header><div><ShieldCheck/><span>Alertas prioritários</span></div><b>{alerts.length}</b></header><div className="tv-list compact">{alerts.length?alerts.slice(0,4).map((a,index)=><div key={`${a.title}-${index}`} className="tv-alert-row"><i/><span><strong>{a.title||'Alerta operacional'}</strong><small>{a.message||'Verifique a central de alertas.'}</small></span></div>):<div className="tv-empty">Nenhum alerta prioritário</div>}</div></article>
    </div>
    <footer className="tv-status"><span><i/>SUPABASE CONECTADO</span><span>ATUALIZAÇÃO OPERACIONAL CONTÍNUA</span><strong>OPSControl IA Next</strong></footer>
  </section>;
}
