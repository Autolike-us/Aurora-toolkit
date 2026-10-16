'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, getToken } from '@/lib/client';
import type { PlanId } from '@/lib/pricing';
import { useProviders } from '@/lib/providers';

export function CheckoutButtons({ plan, primary = false }: { plan: PlanId; primary?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<'stripe' | 'paypal' | null>(null);
  const [error, setError] = useState('');
  const providers = useProviders();

  async function go(provider: 'stripe' | 'paypal') {
    setError('');
    if (process.env.NEXT_PUBLIC_PREVIEW === '1') { setError('Preview only — checkout is switched off in this demo. The live site opens Stripe or PayPal here.'); return; }
    if (!getToken()) { router.push(`/signup?plan=${plan}`); return; }
    setBusy(provider);
    const res = await api<{ url: string }>('/checkout', { plan, provider });
    if (res.ok && res.url) { window.location.href = res.url; return; }
    setError(res.error || 'Could not start checkout.'); setBusy(null);
  }

  if (!providers) return <div style={{ display: 'grid', gap: 8 }} aria-busy="true"><button className="btn block" disabled>Loading…</button></div>;
  if (!providers.stripe && !providers.paypal) return <p className="muted" style={{ fontSize: 14 }}>Subscriptions open very soon. Your free trial works in the meantime, no card needed.</p>;
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {providers.stripe && <button className={'btn block' + (primary ? ' primary' : '')} disabled={!!busy} onClick={() => go('stripe')}>{busy === 'stripe' ? 'Opening checkout…' : '💳 Subscribe with card'}</button>}
      {providers.paypal && <button className={'btn block' + (primary && !providers.stripe ? ' primary' : '')} disabled={!!busy} onClick={() => go('paypal')}>{busy === 'paypal' ? 'Opening PayPal…' : 'Subscribe with PayPal'}</button>}
      {error && <p className="msg err" role="alert">{error}</p>}
    </div>
  );
}

export function PaymentsBy() {
  const p = useProviders();
  if (!p || (!p.stripe && !p.paypal)) return null;
  return <div className="paid"><span>Payments handled by</span>{p.stripe && <b>stripe</b>}{p.paypal && <b className="pp">PayPal</b>}</div>;
}
