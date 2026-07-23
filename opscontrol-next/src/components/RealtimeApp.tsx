import {useEffect,useState} from 'react';
import App from '../App';
import {subscribeOperationalChanges,type RealtimeState} from '../lib/realtime';

export const REALTIME_REFRESH_EVENT='opscontrol:realtime-refresh';

export function RealtimeApp(){
 const[state,setState]=useState<RealtimeState>('connecting');
 useEffect(()=>subscribeOperationalChanges(()=>window.dispatchEvent(new CustomEvent(REALTIME_REFRESH_EVENT)),setState),[]);
 return <div data-realtime-state={state}><App/><div className={`realtime-indicator realtime-${state}`} title={`Supabase Realtime: ${state}`}><i/><span>{state==='connected'?'Tempo real ativo':state==='connecting'?'Conectando...':state==='error'?'Tempo real indisponível':'Tempo real desconectado'}</span></div></div>;
}
