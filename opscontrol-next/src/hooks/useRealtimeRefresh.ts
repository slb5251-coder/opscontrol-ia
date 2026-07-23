import {useEffect,useRef,useState} from 'react';
import {subscribeOperationalChanges,type OperationalRealtimeEvent,type RealtimeState} from '../lib/realtime';

export const REALTIME_REFRESH_EVENT='opscontrol:refresh';

export function useRealtimeRefresh(){
 const[state,setState]=useState<RealtimeState>(navigator.onLine?'connecting':'disconnected');
 const[pendingSync,setPendingSync]=useState(false);
 const[lastEvent,setLastEvent]=useState<OperationalRealtimeEvent|null>(null);
 const pending=useRef<OperationalRealtimeEvent|null>(null);
 const refreshing=useRef(false);
 const lastRefreshAt=useRef(0);
 const hiddenAt=useRef<number|null>(null);
 const retryTimer=useRef<number|null>(null);
 const finishTimer=useRef<number|null>(null);

 const clearRetry=()=>{
  if(retryTimer.current!==null){window.clearTimeout(retryTimer.current);retryTimer.current=null}
 };
 const clearFinish=()=>{
  if(finishTimer.current!==null){window.clearTimeout(finishTimer.current);finishTimer.current=null}
 };

 const finishRefresh=()=>{
  clearFinish();
  finishTimer.current=window.setTimeout(()=>{
   finishTimer.current=null;
   refreshing.current=false;
   const queued=pending.current;
   if(queued&&!document.querySelector('.dialog-panel')){
    pending.current=null;
    applyRefresh(queued);
   }
  },250);
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
  setLastEvent(event);
  setPendingSync(false);
  window.dispatchEvent(new CustomEvent<OperationalRealtimeEvent>(REALTIME_REFRESH_EVENT,{detail:event}));
  finishRefresh();
 };

 const syncNow=()=>{
  if(!navigator.onLine)return;
  applyRefresh({table:'manual',eventType:'UPDATE',receivedAt:new Date().toISOString()});
 };

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
  const onOffline=()=>{setState('disconnected');setPendingSync(true)};
  const onOnline=()=>{
   setState('connecting');
   applyRefresh({table:'reconnect',eventType:'UPDATE',receivedAt:new Date().toISOString()});
  };
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('visibilitychange',onVisibilityChange);
  window.addEventListener('offline',onOffline);
  window.addEventListener('online',onOnline);
  return()=>{
   clearRetry();clearFinish();observer.disconnect();
   document.removeEventListener('visibilitychange',onVisibilityChange);
   window.removeEventListener('offline',onOffline);
   window.removeEventListener('online',onOnline);
   unsubscribe();
  };
 },[]);

 return{state,pendingSync,lastEvent,syncNow};
}
