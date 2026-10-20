'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { api, setToken } from '@/lib/client';

const PREVIEW = process.env.NEXT_PUBLIC_PREVIEW === '1';

function Form({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter(), params = useSearchParams();
  const [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [msg, setMsg] = useState<{ kind: 'err' | 'ok'; text: string } | null>(null), [busy, setBusy] = useState(false);
  const plan = params.get('plan');

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    if (PREVIEW) { router.push('/account/'); return; }
    if (password.length < 8) { setMsg({ kind: 'err', text: 'Use a password of at least 8 characters.' }); return; }
    setBusy(true);
    const res = await api<{ token?: string; message?: string }>(mode === 'signup' ? '/auth/signup' : '/auth/login', { email, password });
    setBusy(false);
    if (!res.ok) { setMsg({ kind: 'err', text: res.error || 'Something went wrong.' }); return; }
    if (mode === 'signup') { setMsg({ kind: 'ok', text: res.message || 'Check your email to confirm your address.' }); return; }
    setToken(res.token || null);
    router.push(params.get('next') === 'reply' ? '/account/#reply' : plan ? `/pricing/?plan=${plan}` : '/account/');
  }

  async function reset() {
    if (!email) { setMsg({ kind: 'err', text: 'Type your email first.' }); return; }
    if (PREVIEW) { setMsg({ kind: 'ok', text: 'Preview mode: no email is sent.' }); return; }
    const res = await api<{ message?: string }>('/auth/forgot', { email });
    setMsg({ kind: res.ok ? 'ok' : 'err', text: res.message || res.error || 'Could not send the email.' });
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
      {PREVIEW && <p className="msg" style={{ marginTop: 14 }}>Preview mode: nothing is saved. Press the button to see a demo account.</p>}
      {msg && <p className={'msg ' + msg.kind} role="status">{msg.text}</p>}
      <p className="note" style={{ marginTop: 16 }}>
        {mode === 'signup' ? <>Already have an account? <Link href="/login/" style={{ textDecoration: 'underline' }}>Log in</Link>.</> : <>New here? <Link href="/signup/" style={{ textDecoration: 'underline' }}>Start your free trial</Link>. · <button type="button" onClick={reset} style={{ all: 'unset', cursor: 'pointer', textDecoration: 'underline' }}>Forgot password?</button></>}
      </p>
      {mode === 'signup' && <p className="note" style={{ marginTop: 10 }}>By continuing you agree to the <Link href="/legal/terms/" style={{ textDecoration: 'underline' }}>Terms</Link> and <Link href="/legal/privacy/" style={{ textDecoration: 'underline' }}>Privacy Policy</Link>.</p>}
    </div></div>
  );
}

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  return <Suspense fallback={null}><Form mode={mode} /></Suspense>;
}
