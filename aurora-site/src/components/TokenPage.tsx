'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { api, setToken } from '@/lib/client';

/** Landing page for the links in our emails: confirms an email address, or sets a new password. */
function Inner({ kind }: { kind: 'verify' | 'reset' }) {
  const router = useRouter(), token = useSearchParams().get('token') || '';
  const [state, setState] = useState<'working' | 'form' | 'error'>(kind === 'verify' ? 'working' : 'form');
  const [msg, setMsg] = useState(''), [password, setPassword] = useState(''), [busy, setBusy] = useState(false);

  useEffect(() => {
    if (kind !== 'verify') return;
    if (!token) { setState('error'); setMsg('This link is missing its token. Open the link from your email again.'); return; }
    api<{ token?: string }>('/auth/verify', { token }).then(r => {
      if (r.ok && r.token) { setToken(r.token); router.replace('/account/'); } else { setState('error'); setMsg(r.error || 'This link is not valid.'); }
    });
  }, [kind, token, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg('');
    const r = await api<{ token?: string }>('/auth/reset', { token, password });
    setBusy(false);
    if (r.ok && r.token) { setToken(r.token); router.replace('/account/'); } else setMsg(r.error || 'Could not reset the password.');
  }

  return (
    <div className="auth"><div className="card">
      {kind === 'verify' ? (state === 'working' ? <><h1 style={{ fontSize: 28 }}>Confirming your email…</h1><p className="muted" style={{ marginTop: 8 }}>One moment.</p></> : <><h1 style={{ fontSize: 28 }}>That link didn’t work</h1><p className="msg err">{msg}</p><p className="note" style={{ marginTop: 14 }}><Link href="/signup/" style={{ textDecoration: 'underline' }}>Sign up again</Link> to get a fresh link.</p></>)
        : <><h1 style={{ fontSize: 28 }}>Choose a new password</h1>
          <form onSubmit={submit}><label htmlFor="pw">New password</label><input id="pw" type="password" minLength={8} required autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} />
            <button className="btn primary block lg" style={{ marginTop: 20 }} disabled={busy || !token}>{busy ? 'One moment…' : 'Save password'}</button></form>
          {msg && <p className="msg err" role="alert">{msg}</p>}</>}
    </div></div>
  );
}
export function TokenPage({ kind }: { kind: 'verify' | 'reset' }) { return <Suspense fallback={null}><Inner kind={kind} /></Suspense>; }
