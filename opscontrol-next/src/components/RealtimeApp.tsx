import {useEffect,useState} from 'react';
import App from '../App';
import {subscribeOperationalChanges,type RealtimeState} from '../lib/realtime';

export function RealtimeApp(){
 const[version,setVersion]=useState(0);
 const[state,setState]=useState<RealtimeState>('connecting');
 useEffect(()=>subscribeOperationalChanges(()=>setVersion(value=>value+1),setState),[]);
 return <div data-realtime-state={state}><App key={version}/><div className={`realtime-indicator realtime-${state}`} title={`Supabase Realtime: ${state}`}><i/><span>{state==='connected'?'Tempo real ativo':state==='connecting'?'Conectando...':state==='error'?'Tempo real indisponível':'Tempo real desconectado'}</span></div></div>;
}
