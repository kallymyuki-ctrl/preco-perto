import { useState } from 'react';
import {
  IconMail, IconLock, IconEye, IconEyeOff, IconGoogle, IconApple,
  IconSparkles, IconShield, IconCheck, IconArrowRight,
} from './Icons';
import { formatPhone } from '../lib/mercadopago';

export interface UserData {
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
}

interface LoginProps {
  onLogin: (user: UserData) => void;
  onNavigate: (page: string) => void;
}

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim());

export default function Login({ onLogin, onNavigate }: LoginProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!emailOk(email)) return setError('Informe um e-mail válido.');
    if (password.length < 6) return setError('A senha precisa de pelo menos 6 caracteres.');

    if (mode === 'register') {
      if (name.trim().length < 3) return setError('Informe seu nome completo.');
      if (phone.replace(/\D/g, '').length < 10) return setError('Informe um telefone válido com DDD.');
      onLogin({ name: name.trim(), email: email.trim(), phone });
      return;
    }

    // Login local de demonstração — substituir por Supabase Auth / backend.
    onLogin({ name: email.split('@')[0], email: email.trim() });
  };

  const social = (provider: string) =>
    setNotice(`Login com ${provider} exige OAuth configurado no backend — em breve.`);

  return (
    <div className="app-shell">
      <div className="px-4 pt-10 pb-6 animate-fadeIn">
        <div className="flex items-center gap-3 mb-8">
          <div className="grid w-12 h-12 text-white rounded-2xl place-items-center bg-gradient-to-br from-[#0a1f1c] to-[#0f8b64]">
            <IconSparkles size={24} />
          </div>
          <div>
            <div className="text-xl font-bold font-display">Preço Perto</div>
            <div className="text-xs text-slate-500">Compare e economize</div>
          </div>
        </div>

        <h1 className="mb-2 text-3xl font-bold leading-tight font-display text-balance">
          {mode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
        </h1>
        <p className="mb-8 text-sm text-slate-500">
          {mode === 'login'
            ? 'Entre para comparar preços e acompanhar sua economia.'
            : 'Leva menos de um minuto e você já sai economizando.'}
        </p>

        <form onSubmit={submit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="label" htmlFor="name">Nome completo</label>
                <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Como podemos te chamar?" autoComplete="name" />
              </div>
              <div>
                <label className="label" htmlFor="phone">Telefone</label>
                <input id="phone" className="input" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(51) 99999-9999" inputMode="numeric" autoComplete="tel" />
              </div>
            </>
          )}

          <div>
            <label className="label" htmlFor="email">E-mail</label>
            <div className="relative">
              <IconMail className="absolute -translate-y-1/2 left-3 top-1/2 text-slate-400" size={18} />
              <input id="email" className="input pl-11" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" autoComplete="email" />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="password">Senha</label>
            <div className="relative">
              <IconLock className="absolute -translate-y-1/2 left-3 top-1/2 text-slate-400" size={18} />
              <input
                id="password"
                className="input pr-11 pl-11"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute -translate-y-1/2 right-3 top-1/2 text-slate-400 bg-transparent border-0" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
              </button>
            </div>
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}
          {notice && <p className="p-3 text-xs font-semibold rounded-xl text-accent-dark bg-accent-light" role="status">{notice}</p>}

          <button type="submit" className="btn btn-primary w-full">
            {mode === 'login' ? 'Entrar' : 'Criar conta'}
            <IconArrowRight size={18} />
          </button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 divider" />
          <span className="text-xs text-slate-400">ou</span>
          <div className="flex-1 divider" />
        </div>

        <div className="grid gap-3">
          <button type="button" onClick={() => social('Google')} className="btn btn-secondary w-full">
            <IconGoogle size={18} /> Continuar com Google
          </button>
          <button type="button" onClick={() => social('Apple')} className="btn btn-secondary w-full">
            <IconApple size={18} /> Continuar com Apple
          </button>
        </div>

        <button
          type="button"
          onClick={() => onLogin({ name: 'Visitante', email: 'visitante@precoperto.app' })}
          className="w-full mt-4 text-sm font-bold border-0 bg-transparent text-accent"
        >
          Entrar como visitante
        </button>

        <p className="mt-6 text-xs leading-relaxed text-center text-slate-400">
          Ao continuar você concorda com nossos{' '}
          <button type="button" onClick={() => onNavigate('terms')} className="border-0 bg-transparent underline text-accent">Termos de Uso</button>{' '}
          e{' '}
          <button type="button" onClick={() => onNavigate('privacy')} className="border-0 bg-transparent underline text-accent">Política de Privacidade</button>.
        </p>

        <div className="flex items-center justify-center gap-2 mt-6 text-xs text-slate-400">
          <IconShield size={14} /> Seus dados ficam neste dispositivo.
        </div>

        <button
          type="button"
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
          className="w-full mt-6 text-sm border-0 bg-transparent text-slate-600"
        >
          {mode === 'login' ? 'Ainda não tem conta? Criar agora' : 'Já tenho conta. Entrar'}
        </button>
      </div>
    </div>
  );
}
