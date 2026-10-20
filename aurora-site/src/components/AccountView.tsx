'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { PRODUCTS, type ProductId } from '@/lib/products';
import { api, downloadRelease, getToken, setToken } from '@/lib/client';
import { CheckoutButtons } from './CheckoutButtons';
import { ReplyBuy } from './ReplyBuy';
import { PlatformIcon } from './PlatformIcon';

interface Me { ok: boolean; email: string; licenseKey: string; access: { status: 'active' | 'trial' | 'expired' | 'none'; products: ProductId[]; trialEndsAt: string | null; renewsAt: string | null; plan: string | null; message: string }; subscriptions: { id: string; provider: string; plan: string; status: string; renewsAt: string | null; launchPrice: boolean }[]; }

interface ReplyAcct { ok: boolean; enabled: boolean; licenseKey: string; plan?: string; tier?: string | null; usage?: { used: number; limit: number; packs: number; resetsAt: string; dayLeft?: number; trialEndsAt?: string }; orders?: { pack: string; replies: number; usd: number; at: string }[] }

function View() {
  const router = useRouter(), params = useSearchParams();
  const [me, setMe] = useState<Me | null>(null), [error, setError] = useState(''), [note, setNote] = useState(params.get('checkout') === 'success' ? 'Payment received — your subscription will show here in a moment.' : '');
  const [copied, setCopied] = useState(false), [copiedR, setCopiedR] = useState(false);
  const [reply, setReply] = useState<ReplyAcct | null>(null), [rplans, setRplans] = useState<{ packs: { id: string; usd: number; replies: number }[]; subs: { id: string; usd: number; replies: number; name: string }[] } | null>(null);

  const load = useCallback(async () => {
    if (process.env.NEXT_PUBLIC_PREVIEW === '1') {
      const ends = new Date(Date.now() + 2 * 86400000 + 5 * 3600000).toISOString();
      setMe({ ok: true, email: 'demo@aurora.example', licenseKey: 'AUR-DEMO-7K2P-X9QM', access: { status: 'trial', products: ['facebook', 'instagram', 'tiktok'], trialEndsAt: ends, renewsAt: null, plan: null, message: 'Free trial: 3 days left.' }, subscriptions: [] });
      setReply({ ok: true, enabled: true, licenseKey: 'AUR-DEMO-7K2P-X9QM', plan: 'trial', usage: { used: 12, limit: 150, packs: 150, resetsAt: new Date(Date.now() + 12 * 86400000).toISOString(), dayLeft: 38, trialEndsAt: new Date(Date.now() + 2 * 86400000).toISOString() }, orders: [] });
      setRplans({ packs: [{ id: 'pack150', usd: 5, replies: 150 }, { id: 'pack600', usd: 15, replies: 600 }], subs: [{ id: 'reply', usd: 12, replies: 1500, name: 'Aurora Reply - Standard' }, { id: 'reply_pro', usd: 29, replies: 5000, name: 'Aurora Reply - Agency' }] });
      return;
    }
    if (!getToken()) { router.replace('/login/'); return; }
    const res = await api<Me>('/me');
    if (res.ok) {
      setMe(res);
      api<ReplyAcct>('/reply/account').then(r => { if (r.ok) setReply(r); });
      api<any>('/reply/plans').then(r => { if (r.ok) setRplans(r); });
    } else if (!getToken()) router.replace('/login/'); else setError(res.error || 'Could not load your account.');
  }, [router]);
  useEffect(() => { load(); }, [load]);
  const subId = params.get('subscription_id'), sessId = params.get('cs'), orderId = params.get('pack') ? params.get('token') : null; // not named session_id: host firewalls flag that name
  useEffect(() => {
    // PayPal sends the customer back with the subscription id: confirm it with PayPal now instead of waiting for the webhook.
    if ((!subId && !sessId && !orderId) || process.env.NEXT_PUBLIC_PREVIEW === '1') return;
    let tries = 0, stop = false, timer: ReturnType<typeof setTimeout> | undefined;
    const run = async () => {
      tries++;
      const r = await api<{ status: string }>('/billing/sync', orderId ? { orderId } : sessId ? { sessionId: sessId } : { subscriptionId: subId });
      await load();
      if (r.ok && r.status === 'PACK') { setNote('Your replies were added — thank you!'); return; }
      if (r.ok && r.status === 'ACTIVE') { setNote('You are subscribed — thank you!'); return; }
      if (!stop && tries < 5) timer = setTimeout(run, 4000);
    };
    run();
    return () => { stop = true; if (timer) clearTimeout(timer); };
  }, [subId, sessId, orderId, load]);
  useEffect(() => { if (note.startsWith('Payment')) { const t = setTimeout(load, 3500); return () => clearTimeout(t); } }, [note, load]);

  async function download(product: ProductId) {
    if (process.env.NEXT_PUBLIC_PREVIEW === '1') { setNote('Preview only — downloads are switched off in this demo.'); return; }
    const err = await downloadRelease(product);
    if (err) setNote(err);
  }
  async function portal() { const r = await api<{ url: string }>('/billing/portal', {}); if (r.ok && r.url) window.location.href = r.url; else setNote(r.error || 'Could not open billing.'); }
  async function cancelPayPal() { if (!confirm('Cancel your PayPal subscription? You keep access until the end of the paid period.')) return; const r = await api('/billing/cancel', {}); setNote(r.ok ? 'Cancelled. Access continues until the period ends.' : r.error || 'Could not cancel.'); load(); }
  async function signOut() { if (process.env.NEXT_PUBLIC_PREVIEW !== '1') await api('/auth/logout', {}); setToken(null); router.push('/'); }

  if (error) return <div className="auth"><p className="msg err">{error}</p></div>;
  if (!me) return <div className="auth"><p className="muted">Loading your account…</p></div>;
  const a = me.access, hasSub = me.subscriptions.some(s => ['active', 'trialing'].includes(s.status) && !s.plan.startsWith('reply'));

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
          <div className="card" id="reply">
            <span className={'status ' + (reply && reply.plan === 'subscription' ? 'active' : 'trial')}>{!reply ? '…' : reply.plan === 'subscription' ? 'Aurora Reply · Subscribed' : reply.plan === 'free' ? 'Aurora Reply · Free plan' : 'Aurora Reply · Free trial'}</span>
            <h2 style={{ fontSize: 22, marginTop: 10 }}>Aurora Reply</h2>
            {reply && !reply.enabled && <p className="muted" style={{ marginTop: 8 }}>Aurora Reply plans are being set up. Your key below will work as soon as they open.</p>}
            {reply && reply.enabled && reply.usage && <>
              <p style={{ marginTop: 10, fontWeight: 650 }}>{reply.plan === 'trial_waiting' ? `Your ${3}-day free trial starts the first time you use Aurora Reply.` : reply.plan === 'trial' ? `Free trial: ${reply.usage.dayLeft ?? 0} replies left today (ends ${reply.usage.trialEndsAt ? new Date(reply.usage.trialEndsAt).toLocaleDateString() : ''}).` : `${Math.max(0, reply.usage.limit - reply.usage.used)} of ${reply.usage.limit} replies left this month.`}{reply.usage.packs > 0 ? ` Plus ${reply.usage.packs} from your packs.` : ''}</p>
              {(reply.plan === 'free' || reply.plan === 'subscription') && <p className="note">Renews {new Date(reply.usage.resetsAt).toLocaleDateString()}.</p>}
            </>}
            <h3 style={{ marginTop: 18, fontSize: 16 }}>Your Aurora Reply key</h3>
            <div className="key"><span>{(reply && reply.licenseKey) || me.licenseKey}</span><button className="btn sm" onClick={() => { navigator.clipboard?.writeText((reply && reply.licenseKey) || me.licenseKey); setCopiedR(true); setTimeout(() => setCopiedR(false), 1800); }}>{copiedR ? 'Copied ✓' : 'Copy'}</button></div>
            <ol className="note" style={{ margin: '10px 0 0', paddingLeft: 18 }}><li><a href="/reply/" style={{ textDecoration: 'underline' }}>Install Aurora Reply</a> in Chrome.</li><li>Open its dashboard → <b>Settings &amp; key</b> and paste the key.</li><li>Open a post on Facebook, Instagram or TikTok and press <b>✦ Reply</b>.</li></ol>
            {reply && reply.enabled && rplans && <>
              <h3 style={{ marginTop: 20, fontSize: 16 }}>Get more replies</h3>
              <div style={{ display: 'grid', gap: 14, marginTop: 8 }}>
                {rplans.packs.map(k => <div key={k.id}><p className="note" style={{ marginBottom: 6 }}><b>{k.replies.toLocaleString()} replies</b> · one-off · valid 12 months</p><ReplyBuy kind="pack" id={k.id} label={`Buy $${k.usd}`} /></div>)}
                {reply.plan !== 'subscription' && rplans.subs.map(k => <div key={k.id}><p className="note" style={{ marginBottom: 6 }}><b>{k.name.replace('Aurora Reply - ', '')}</b> · {k.replies.toLocaleString()} replies a month</p><ReplyBuy kind="sub" id={k.id} label={`Subscribe $${k.usd}/mo`} /></div>)}
              </div>
              {(reply.orders || []).length > 0 && <p className="note" style={{ marginTop: 12 }}>Recent purchases: {(reply.orders || []).slice(0, 3).map(o => `${o.replies} replies ($${o.usd})`).join(' · ')}</p>}
            </>}
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
            {me.subscriptions.map(s => <p key={s.id} style={{ marginTop: 10 }}><b>{s.plan === 'bundle' ? 'All 3 extensions' : s.plan === 'reply' ? 'Aurora Reply — Standard' : s.plan === 'reply_pro' ? 'Aurora Reply — Agency' : s.plan}</b> · {s.status} · via {s.provider}{s.launchPrice ? ' · launch price locked 🎉' : ''}</p>)}
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
