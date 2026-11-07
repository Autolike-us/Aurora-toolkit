'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, getToken } from '@/lib/client';
import { useProviders } from '@/lib/providers';
import { track, itemOf } from '@/lib/track';

/** Pay for an Aurora Reply pack (one-time) or subscription (monthly) with card (Stripe) or PayPal. Signed-out visitors are sent to sign up first. */
export function ReplyBuy({ kind, id, label, primary = false, value }: { kind: 'pack' | 'sub'; id: string; label: string; primary?: boolean; value?: number }) {
  const router = useRouter();
  const providers = useProviders();
  const [busy, setBusy] = useState<'stripe' | 'paypal' | null>(null);
  const [error, setError] = useState('');
  const rp = providers?.reply;
  const stripeOn = !!rp && (kind === 'pack' ? rp.stripe : rp.stripeSub), paypalOn = !!rp && (kind === 'pack' ? rp.paypal : rp.paypalSub);

  async function go(provider: 'stripe' | 'paypal') {
    setError('');
    if (process.env.NEXT_PUBLIC_PREVIEW === '1') { setError('Preview only — checkout is switched off in this demo.'); return; }
    if (!getToken()) { router.push('/signup/?next=reply'); return; }
    setBusy(provider);
    track('begin_checkout', { currency: 'USD', ...(value !== undefined ? { value } : {}), payment_type: provider, items: [itemOf(id, value ?? 0)] });
    const res = kind === 'pack' ? await api<{ url: string }>('/checkout/pack', { pack: id, provider }) : await api<{ url: string }>('/checkout', { plan: id, provider });
    if (res.ok && res.url) { window.location.href = res.url; return; }
    setError(res.error || 'Could not start checkout.'); setBusy(null);
  }

  if (!providers) return <button className="btn block" disabled>Loading…</button>;
  if (!stripeOn && !paypalOn) return <p className="muted" style={{ fontSize: 13.5 }}>Opening very soon.</p>;
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {stripeOn && <button className={'btn block' + (primary ? ' primary' : '')} disabled={!!busy} onClick={() => go('stripe')}>{busy === 'stripe' ? 'Opening checkout…' : `💳 ${label} — card`}</button>}
      {paypalOn && <button className={'btn block' + (primary && !stripeOn ? ' primary' : '')} disabled={!!busy} onClick={() => go('paypal')}>{busy === 'paypal' ? 'Opening PayPal…' : `${label} — PayPal`}</button>}
      {error && <p className="msg err" role="alert">{error}</p>}
    </div>
  );
}
