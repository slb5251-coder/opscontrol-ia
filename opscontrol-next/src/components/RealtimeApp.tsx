import App from '../App';
import {useRealtimeRefresh} from '../hooks/useRealtimeRefresh';
import {RealtimeIndicator} from './RealtimeIndicator';

export function RealtimeApp(){
 const{version,state,pendingSync,lastEvent}=useRealtimeRefresh();
 return <div data-realtime-state={state} data-realtime-pending={pendingSync?'true':'false'}><App key={version}/><RealtimeIndicator state={state} pending={pendingSync} lastEvent={lastEvent}/></div>;
}
