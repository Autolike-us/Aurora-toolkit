'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { api, browserClient } from '@/lib/supabase-browser';

function Form({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter(), params = useSearchParams();
  const [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [msg, setMsg] = useState<{ kind: 'err' | 'ok'; text: string } | null>(null), [busy, setBusy] = useState(false);
  const plan = params.get('plan');

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    if (process.env.NEXT_PUBLIC_PREVIEW === '1') { router.push('/account/'); return; }
    const c = browserClient();
    if (!c) { setMsg({ kind: 'err', text: 'Accounts are not configured on this site yet.' }); return; }
    if (password.length < 8) { setMsg({ kind: 'err', text: 'Use a password of at least 8 characters.' }); return; }
    setBusy(true);
    if (mode === 'signup') {
      const { data, error } = await c.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/account` } });
      if (error) { setMsg({ kind: 'err', text: error.message }); setBusy(false); return; }
      if (!data.session) { setMsg({ kind: 'ok', text: 'Check your email and click the confirmation link — your 3-day trial starts as soon as you are in.' }); setBusy(false); return; }
    } else {
      const { error } = await c.auth.signInWithPassword({ email, password });
      if (error) { setMsg({ kind: 'err', text: 'Email or password is not right.' }); setBusy(false); return; }
    }
    await api('/api/trial', {});
    router.push(plan ? `/pricing?plan=${plan}` : '/account');
  }

  async function reset() {
    const c = browserClient();
    if (!c || !email) { setMsg({ kind: 'err', text: 'Type your email first.' }); return; }
    await c.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/account` });
    setMsg({ kind: 'ok', text: 'If that email has an account, a reset link is on its way.' });
  }

  return (
    <div className="auth"><div className="card">
      <h1 style={{ fontSize: 30 }}>{mode === 'signup' ? 'Start your free trial' : 'Welcome back'}</h1>
      <p className="muted" style={{ marginTop: 6 }}>{mode === 'signup' ? '3 days of all three extensions. No card needed.' : 'Log in to see your license and downloads.'}</p>
      <form onSubmit={submit}>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" required minLength={8} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} />
        <button className="btn primary block lg" style={{ marginTop: 22 }} disabled={busy}>{busy ? 'One moment…' : mode === 'signup' ? 'Create account & start trial' : 'Log in'}</button>
      </form>
      {process.env.NEXT_PUBLIC_PREVIEW === '1' && <p className="msg" style={{ marginTop: 14 }}>Preview mode: nothing is saved. Press the button to see a demo account.</p>}
      {msg && <p className={'msg ' + msg.kind} role="status">{msg.text}</p>}
      <p className="note" style={{ marginTop: 16 }}>
        {mode === 'signup' ? <>Already have an account? <Link href="/login" style={{ textDecoration: 'underline' }}>Log in</Link>.</> : <>New here? <Link href="/signup" style={{ textDecoration: 'underline' }}>Start your free trial</Link>. · <button type="button" onClick={reset} style={{ all: 'unset', cursor: 'pointer', textDecoration: 'underline' }}>Forgot password?</button></>}
      </p>
      {mode === 'signup' && <p className="note" style={{ marginTop: 10 }}>By continuing you agree to the <Link href="/legal/terms" style={{ textDecoration: 'underline' }}>Terms</Link> and <Link href="/legal/privacy" style={{ textDecoration: 'underline' }}>Privacy Policy</Link>.</p>}
    </div></div>
  );
}

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  return <Suspense fallback={null}><Form mode={mode} /></Suspense>;
}
