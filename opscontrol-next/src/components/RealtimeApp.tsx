import {useEffect,useRef,useState} from 'react';
import App from '../App';
import {subscribeOperationalChanges,type RealtimeState} from '../lib/realtime';

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
 const pending=useRef(false);
 const snapshot=useRef<UiSnapshot>({active:'Visão geral',query:'',scrollY:0});
 const refreshing=useRef(false);

 useEffect(()=>{
  const hasOpenDialog=()=>Boolean(document.querySelector('.dialog-panel'));
  const applyRefresh=()=>{
   if(refreshing.current)return;
   if(hasOpenDialog()){pending.current=true;return}
   refreshing.current=true;
   snapshot.current=captureUi();
   setVersion(value=>value+1);
  };
  const unsubscribe=subscribeOperationalChanges(applyRefresh,setState);
  const observer=new MutationObserver(()=>{
   if(pending.current&&!hasOpenDialog()){
    pending.current=false;
    applyRefresh();
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

 return <div data-realtime-state={state}><App key={version}/><div className={`realtime-indicator realtime-${state}`} title={`Supabase Realtime: ${state}`}><i/><span>{state==='connected'?'Tempo real ativo':state==='connecting'?'Conectando...':state==='error'?'Tempo real indisponível':'Tempo real desconectado'}</span></div></div>;
}
