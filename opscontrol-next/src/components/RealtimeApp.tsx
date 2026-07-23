import {useEffect,useRef,useState} from 'react';
import App from '../App';
import {subscribeOperationalChanges,type RealtimeState} from '../lib/realtime';

type UiSnapshot={active:string;query:string};

function captureUi():UiSnapshot{
 const active=document.querySelector<HTMLButtonElement>('.sidebar nav button.active')?.textContent?.trim()||'Visão geral';
 const query=document.querySelector<HTMLInputElement>('.filters input')?.value||'';
 return{active,query};
}

function restoreUi(snapshot:UiSnapshot){
 requestAnimationFrame(()=>{
  const button=[...document.querySelectorAll<HTMLButtonElement>('.sidebar nav button')].find(item=>item.textContent?.trim()===snapshot.active);
  button?.click();
  if(snapshot.query){
   requestAnimationFrame(()=>{
    const input=document.querySelector<HTMLInputElement>('.filters input');
    if(!input)return;
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;
    setter?.call(input,snapshot.query);
    input.dispatchEvent(new Event('input',{bubbles:true}));
   });
  }
 });
}

export function RealtimeApp(){
 const[version,setVersion]=useState(0);
 const[state,setState]=useState<RealtimeState>('connecting');
 const pending=useRef(false);
 const snapshot=useRef<UiSnapshot>({active:'Visão geral',query:''});

 useEffect(()=>{
  const applyRefresh=()=>{
   if(document.querySelector('.dialog-panel')){pending.current=true;return}
   snapshot.current=captureUi();
   setVersion(value=>value+1);
  };
  const unsubscribe=subscribeOperationalChanges(applyRefresh,setState);
  const timer=window.setInterval(()=>{
   if(pending.current&&!document.querySelector('.dialog-panel')){
    pending.current=false;
    applyRefresh();
   }
  },500);
  return()=>{window.clearInterval(timer);unsubscribe()};
 },[]);

 useEffect(()=>{if(version>0)restoreUi(snapshot.current)},[version]);

 return <div data-realtime-state={state}><App key={version}/><div className={`realtime-indicator realtime-${state}`} title={`Supabase Realtime: ${state}`}><i/><span>{state==='connected'?'Tempo real ativo':state==='connecting'?'Conectando...':state==='error'?'Tempo real indisponível':'Tempo real desconectado'}</span></div></div>;
}
