import App from '../App';
import {useRealtimeRefresh} from '../hooks/useRealtimeRefresh';
import {AppErrorBoundary} from './AppErrorBoundary';
import {RealtimeIndicator} from './RealtimeIndicator';

export function RealtimeApp(){
 const{version,state,pendingSync,lastEvent,syncNow}=useRealtimeRefresh();
 return <AppErrorBoundary><div data-realtime-state={state} data-realtime-pending={pendingSync?'true':'false'}><App key={version}/><RealtimeIndicator state={state} pending={pendingSync} lastEvent={lastEvent} onSync={syncNow}/></div></AppErrorBoundary>;
}
