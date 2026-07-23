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
 const lastRefreshAt=useRef(0);
 const hiddenAt=useRef<number|null>(null);
 const retryTimer=useRef<number|null>(null);

 const clearRetry=()=>{
  if(retryTimer.current!==null){
   window.clearTimeout(retryTimer.current);
   retryTimer.current=null;
  }
 };

 const applyRefresh=(event:OperationalRealtimeEvent)=>{
  const now=Date.now();
  const cooldown=Math.max(0,1200-(now-lastRefreshAt.current));
  if(refreshing.current||cooldown>0){
   pending.current=event;
   setPendingSync(true);
   clearRetry();
   retryTimer.current=window.setTimeout(()=>{
    retryTimer.current=null;
    const queued=pending.current;
    if(!queued)return;
    pending.current=null;
    applyRefresh(queued);
   },Math.max(300,cooldown));
   return;
  }
  if(document.querySelector('.dialog-panel')){
   pending.current=event;
   setPendingSync(true);
   return;
  }
  clearRetry();
  refreshing.current=true;
  lastRefreshAt.current=now;
  snapshot.current=captureUi();
  setLastEvent(event);
  setPendingSync(false);
  setVersion(value=>value+1);
 };

 const syncNow=()=>applyRefresh({table:'manual',eventType:'UPDATE',receivedAt:new Date().toISOString()});

 useEffect(()=>{
  const unsubscribe=subscribeOperationalChanges(applyRefresh,setState);
  const observer=new MutationObserver(()=>{
   if(pending.current&&!document.querySelector('.dialog-panel')&&!refreshing.current){
    const event=pending.current;
    pending.current=null;
    applyRefresh(event);
   }
  });
  const onVisibilityChange=()=>{
   if(document.hidden){hiddenAt.current=Date.now();return}
   const inactiveFor=hiddenAt.current?Date.now()-hiddenAt.current:0;
   hiddenAt.current=null;
   if(inactiveFor>=60000)applyRefresh({table:'resume',eventType:'UPDATE',receivedAt:new Date().toISOString()});
  };
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('visibilitychange',onVisibilityChange);
  return()=>{
   clearRetry();
   observer.disconnect();
   document.removeEventListener('visibilitychange',onVisibilityChange);
   unsubscribe();
  };
 },[]);

 useEffect(()=>{
  if(version===0)return;
  restoreUi(snapshot.current);
  const done=window.setTimeout(()=>{
   refreshing.current=false;
   const queued=pending.current;
   if(queued&&!document.querySelector('.dialog-panel')){
    pending.current=null;
    applyRefresh(queued);
   }
  },250);
  return()=>window.clearTimeout(done);
 },[version]);

 return{version,state,pendingSync,lastEvent,syncNow};
}
