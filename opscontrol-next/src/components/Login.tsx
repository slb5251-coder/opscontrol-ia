import { motion } from 'motion/react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export function Login({ onDemo }: { onDemo: () => void }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) {
      setMessage('Ambiente ainda não configurado. Use a visualização de homologação.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      let email = identifier.trim();
      if (!email.includes('@')) {
        const { data, error } = await supabase.rpc('resolve_login_email', { p_identifier: email });
        if (error || !data) throw new Error('Usuário não localizado.');
        email = data;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  }

  return <main className="login-next">
    <section className="login-scene">
      <div className="login-grid" />
      <motion.div className="login-orbit" animate={{ rotate: 360 }} transition={{ duration: 26, repeat: Infinity, ease: 'linear' }} />
      <div className="login-copy">
        <span className="eyebrow">B-PORT LMP · CENTRO OPERACIONAL</span>
        <h1>Operação conectada.<br/>Decisão em tempo real.</h1>
        <p>Uma nova experiência para controlar fluidos, granéis, logística, manutenção e segurança.</p>
        <div className="login-features">
          <span><ShieldCheck size={18}/> Dados protegidos por perfil</span>
          <span><LockKeyhole size={18}/> Sessão segura e auditável</span>
        </div>
      </div>
    </section>
    <section className="login-form-shell">
      <motion.form onSubmit={submit} className="login-form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="brand login-brand"><div className="brand-mark">OC</div><div><strong>OPSControl</strong><span>IA NEXT</span></div></div>
        <div><span className="eyebrow">ACESSO AO SISTEMA</span><h2>Bem-vindo de volta</h2><p>Entre com o mesmo usuário utilizado no OPSControl atual.</p></div>
        <label>E-mail ou usuário<div className="field"><Mail size={18}/><input value={identifier} onChange={e=>setIdentifier(e.target.value)} autoComplete="username" required placeholder="nome@empresa.com"/></div></label>
        <label>Senha<div className="field"><LockKeyhole size={18}/><input value={password} onChange={e=>setPassword(e.target.value)} type={showPassword?'text':'password'} autoComplete="current-password" required placeholder="Sua senha"/><button type="button" onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
        {message && <div className="login-message">{message}</div>}
        <button className="login-submit" disabled={loading}>{loading?'Entrando...':'Entrar no OPSControl'}<ArrowRight size={18}/></button>
        {!isSupabaseConfigured && <button className="demo-button" type="button" onClick={onDemo}>Abrir homologação visual</button>}
        <small>Esta versão não altera o sistema original.</small>
      </motion.form>
    </section>
  </main>;
}
