import {Component,type ErrorInfo,type ReactNode} from 'react';
import {AlertTriangle,RefreshCw} from 'lucide-react';

type Props={children:ReactNode};
type State={error:Error|null};

export class AppErrorBoundary extends Component<Props,State>{
 state:State={error:null};

 static getDerivedStateFromError(error:Error):State{
  return{error};
 }

 componentDidCatch(error:Error,info:ErrorInfo){
  console.error('[OPSControl IA] Falha não tratada na interface.',{error,componentStack:info.componentStack});
 }

 private reload=()=>window.location.reload();

 render(){
  if(!this.state.error)return this.props.children;
  return <main className="fatal-error" role="alert">
   <div className="fatal-error-card">
    <AlertTriangle size={34}/>
    <span>FALHA DE INTERFACE</span>
    <h1>Não foi possível carregar o OPSControl IA.</h1>
    <p>Os dados não foram alterados. Recarregue a aplicação para restabelecer a sessão.</p>
    <button className="primary" onClick={this.reload}><RefreshCw size={16}/>Recarregar aplicação</button>
   </div>
  </main>;
 }
}
