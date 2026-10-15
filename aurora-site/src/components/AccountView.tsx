'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { PRODUCTS, type ProductId } from '@/lib/products';
import { api, browserClient } from '@/lib/supabase-browser';
import { CheckoutButtons } from './CheckoutButtons';
import { PlatformIcon } from './PlatformIcon';

interface Me { ok: boolean; email: string; licenseKey: string; access: { status: 'active' | 'trial' | 'expired' | 'none'; products: ProductId[]; trialEndsAt: string | null; renewsAt: string | null; plan: string | null; message: string }; subscriptions: { id: string; provider: string; plan: string; status: string; renewsAt: string | null; launchPrice: boolean }[]; }

function View() {
  const router = useRouter(), params = useSearchParams();
  const [me, setMe] = useState<Me | null>(null), [error, setError] = useState(''), [note, setNote] = useState(params.get('checkout') === 'success' ? 'Payment received — your subscription will show here in a moment.' : '');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (process.env.NEXT_PUBLIC_PREVIEW === '1') {
      const ends = new Date(Date.now() + 2 * 86400000 + 5 * 3600000).toISOString();
      setMe({ ok: true, email: 'demo@aurora.example', licenseKey: 'AUR-DEMO-7K2P-X9QM', access: { status: 'trial', products: ['facebook', 'instagram', 'tiktok'], trialEndsAt: ends, renewsAt: null, plan: null, message: 'Free trial: 3 days left.' }, subscriptions: [] });
      return;
    }
    const c = browserClient();
    if (!c) { setError('Accounts are not configured on this site yet.'); return; }
    const { data } = await c.auth.getSession();
    if (!data.session) { router.replace('/login'); return; }
    await api('/api/trial', {});
    const res = await api<Me>('/api/me');
    if (res.ok) setMe(res); else setError(res.error || 'Could not load your account.');
  }, [router]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (note.startsWith('Payment')) { const t = setTimeout(load, 3500); return () => clearTimeout(t); } }, [note, load]);

  async function download(product: ProductId) {
    if (process.env.NEXT_PUBLIC_PREVIEW === '1') { setNote('Preview only — downloads are switched off in this demo.'); return; }
    const res = await api<{ url: string }>('/api/download', { product });
    if (res.ok && res.url) window.location.href = res.url; else setNote(res.error || 'Download unavailable.');
  }
  async function portal() { const r = await api<{ url: string }>('/api/billing/portal', {}); if (r.ok && r.url) window.location.href = r.url; else setNote(r.error || 'Could not open billing.'); }
  async function cancelPayPal() { if (!confirm('Cancel your PayPal subscription? You keep access until the end of the paid period.')) return; const r = await api('/api/billing/cancel', {}); setNote(r.ok ? 'Cancelled. Access continues until the period ends.' : r.error || 'Could not cancel.'); load(); }
  async function signOut() { await browserClient()?.auth.signOut(); router.push('/'); }

  if (error) return <div className="auth"><p className="msg err">{error}</p></div>;
  if (!me) return <div className="auth"><p className="muted">Loading your account…</p></div>;
  const a = me.access, hasSub = me.subscriptions.some(s => ['active', 'trialing'].includes(s.status));

  return (
    <div className="wrap" style={{ paddingTop: 50 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div><span className="eyebrow">My account</span><h1 style={{ fontSize: 34, marginTop: 6 }}>Hi, {me.email}</h1></div>
        <button className="btn sm" onClick={signOut}>Log out</button>
      </div>
      {note && <p className="msg ok" role="status">{note}</p>}
      <div className="dash">
        <div style={{ display: 'grid', gap: 22 }}>
          <div className="card">
            <span className={'status ' + a.status}>{a.status === 'active' ? 'Subscribed' : a.status === 'trial' ? 'Free trial' : a.status === 'expired' ? 'Trial ended' : 'No plan'}</span>
            <p style={{ marginTop: 12, fontWeight: 650 }}>{a.message}</p>
            {a.status === 'trial' && a.trialEndsAt && <p className="note">Trial ends {new Date(a.trialEndsAt).toLocaleString()}.</p>}
            {a.status === 'active' && a.renewsAt && <p className="note">Current period ends {new Date(a.renewsAt).toLocaleDateString()}.</p>}
            <h3 style={{ marginTop: 22, fontSize: 16 }}>Your license key</h3>
            <div className="key"><span>{me.licenseKey}</span><button className="btn sm" onClick={() => { navigator.clipboard?.writeText(me.licenseKey); setCopied(true); setTimeout(() => setCopied(false), 1800); }}>{copied ? 'Copied ✓' : 'Copy'}</button></div>
            <p className="note" style={{ marginTop: 8 }}>Paste it into the extension’s <b>License</b> box. One key works on up to 3 browsers.</p>
          </div>
          <div className="card">
            <h2 style={{ fontSize: 22 }}>Downloads</h2>
            <div className="dl">
              {PRODUCTS.map(p => { const ok = a.products.includes(p.id); return (
                <div key={p.id} className={'item' + (ok ? '' : ' lock')}>
                  <span className="name inline-id"><PlatformIcon id={p.id} size="sm" />{p.name}</span>
                  {ok ? <button className="btn sm primary" onClick={() => download(p.id)}>Download .zip</button> : <Link className="btn sm" href="/pricing">Unlock</Link>}
                </div>); })}
            </div>
            <p className="note" style={{ marginTop: 12 }}>Install help: <Link href="/download" style={{ textDecoration: 'underline' }}>step-by-step guide</Link>.</p>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 22, alignContent: 'start' }}>
          <div className="card">
            <h2 style={{ fontSize: 22 }}>Billing</h2>
            {me.subscriptions.length === 0 && <p className="muted" style={{ marginTop: 8 }}>No subscription yet.</p>}
            {me.subscriptions.map(s => <p key={s.id} style={{ marginTop: 10 }}><b>{s.plan === 'bundle' ? 'All 3 extensions' : s.plan}</b> · {s.status} · via {s.provider}{s.launchPrice ? ' · launch price locked 🎉' : ''}</p>)}
            <div style={{ display: 'grid', gap: 8, marginTop: 16 }}>
              {me.subscriptions.some(s => s.provider === 'stripe') && <button className="btn" onClick={portal}>Manage card billing</button>}
              {me.subscriptions.some(s => s.provider === 'paypal' && s.status === 'active') && <button className="btn" onClick={cancelPayPal}>Cancel PayPal subscription</button>}
            </div>
          </div>
          {!hasSub && <div className="card"><h2 style={{ fontSize: 22 }}>Subscribe</h2><p className="muted" style={{ margin: '8px 0 14px' }}>All 3 extensions — launch price while the offer lasts.</p><CheckoutButtons plan="bundle" primary /></div>}
        </div>
      </div>
    </div>
  );
}

export function AccountView() { return <Suspense fallback={null}><View /></Suspense>; }
