import {useEffect,useRef,useState} from 'react';
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

export function useRealtimeRefresh(){
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

 return{version,state,pendingSync,lastEvent};
}
