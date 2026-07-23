import {useEffect,useMemo,useRef,useState} from 'react';
import App from '../App';
import {subscribeOperationalChanges,type OperationalRealtimeEvent,type RealtimeState} from '../lib/realtime';

type UiSnapshot={active:string;query:string;scrollY:number};

function captureUi():UiSnapshot{
 const active=document.querySelector<HTMLButtonElement>('.sidebar nav button.active')?.textContent?.trim()||'Visão geral';
 const query=document.querySelector<HTMLInputElement>('.filters input')?.value||'';
 return{active,query,scrollY:window.scrollY};
}

function restoreUi(snapshot:UiSnapshot){
 requestAnimationFrame(()=>{
  const button=[...document.querySelectorAll<HTMLButtonElement>('.sidebar nav button')].find(item=>item.textContent?.trim()===snapshot.active);
  button?.click();
  requestAnimationFrame(()=>{
   if(snapshot.query){
    const input=document.querySelector<HTMLInputElement>('.filters input');
    if(input){
     const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;
     setter?.call(input,snapshot.query);
     input.dispatchEvent(new Event('input',{bubbles:true}));
    }
   }
   window.scrollTo({top:snapshot.scrollY});
  });
 });
}

export function RealtimeApp(){
 const[version,setVersion]=useState(0);
 const[state,setState]=useState<RealtimeState>('connecting');
 const[pendingSync,setPendingSync]=useState(false);
 const[lastEvent,setLastEvent]=useState<OperationalRealtimeEvent|null>(null);
 const pending=useRef<OperationalRealtimeEvent|null>(null);
 const snapshot=useRef<UiSnapshot>({active:'Visão geral',query:'',scrollY:0});
 const refreshing=useRef(false);

 const applyRefresh=(event:OperationalRealtimeEvent)=>{
  if(refreshing.current)return;
  if(document.querySelector('.dialog-panel')){
   pending.current=event;
   setPendingSync(true);
   return;
  }
  refreshing.current=true;
  snapshot.current=captureUi();
  setLastEvent(event);
  setPendingSync(false);
  setVersion(value=>value+1);
 };

 useEffect(()=>{
  const unsubscribe=subscribeOperationalChanges(applyRefresh,setState);
  const observer=new MutationObserver(()=>{
   if(pending.current&&!document.querySelector('.dialog-panel')){
    const event=pending.current;
    pending.current=null;
    applyRefresh(event);
   }
  });
  observer.observe(document.body,{childList:true,subtree:true});
  return()=>{observer.disconnect();unsubscribe()};
 },[]);

 useEffect(()=>{
  if(version===0)return;
  restoreUi(snapshot.current);
  const done=window.setTimeout(()=>{refreshing.current=false},250);
  return()=>window.clearTimeout(done);
 },[version]);

 const label=useMemo(()=>{
  if(pendingSync)return'Atualização pendente';
  if(state==='connecting')return'Conectando...';
  if(state==='error')return'Tempo real indisponível';
  if(state==='disconnected')return'Tempo real desconectado';
  if(lastEvent)return`Atualizado ${new Date(lastEvent.receivedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`;
  return'Tempo real ativo';
 },[lastEvent,pendingSync,state]);

 const title=lastEvent?`${lastEvent.eventType} em ${lastEvent.table} · ${new Date(lastEvent.receivedAt).toLocaleString('pt-BR')}`:`Supabase Realtime: ${state}`;

 return <div data-realtime-state={state} data-realtime-pending={pendingSync?'true':'false'}><App key={version}/><button type="button" className={`realtime-indicator realtime-${pendingSync?'pending':state}`} title={title} onClick={()=>window.location.reload()}><i/><span>{label}</span><small>Atualizar</small></button></div>;
}
