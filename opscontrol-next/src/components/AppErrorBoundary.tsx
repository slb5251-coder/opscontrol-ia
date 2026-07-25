import {Component,type ErrorInfo,type ReactNode} from 'react';
import {AlertTriangle,RefreshCw,RotateCcw} from 'lucide-react';

type Props={children:ReactNode};
type State={error:Error|null;attempts:number};

export class AppErrorBoundary extends Component<Props,State>{
 state:State={error:null,attempts:0};

 static getDerivedStateFromError(error:Error):Partial<State>{
  return{error};
 }

 componentDidCatch(error:Error,info:ErrorInfo){
  console.error('[OPSControl IA] Falha não tratada na interface.',{error,componentStack:info.componentStack});
 }

 private retry=()=>this.setState(state=>({error:null,attempts:state.attempts+1}));
 private reload=()=>window.location.reload();

 render(){
  if(!this.state.error)return <div key={this.state.attempts}>{this.props.children}</div>;
  return <main className="fatal-error" role="alert" aria-live="assertive">
   <div className="fatal-error-card">
    <AlertTriangle size={34}/>
    <span>FALHA DE INTERFACE</span>
    <h1>Não foi possível carregar o OPSControl IA.</h1>
    <p>Os dados não foram alterados. Tente reconstruir a interface sem sair da sessão. Caso a falha continue, recarregue a aplicação.</p>
    <div className="fatal-error-actions">
     <button className="primary" onClick={this.retry}><RotateCcw size={16}/>Tentar novamente</button>
     <button type="button" onClick={this.reload}><RefreshCw size={16}/>Recarregar aplicação</button>
    </div>
   </div>
  </main>;
 }
}