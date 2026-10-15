'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, getToken } from '@/lib/client';
import type { PlanId } from '@/lib/pricing';

export function CheckoutButtons({ plan, primary = false }: { plan: PlanId; primary?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<'stripe' | 'paypal' | null>(null);
  const [error, setError] = useState('');

  async function go(provider: 'stripe' | 'paypal') {
    setError('');
    if (process.env.NEXT_PUBLIC_PREVIEW === '1') { setError('Preview only — checkout is switched off in this demo. The live site opens Stripe or PayPal here.'); return; }
    if (!getToken()) { router.push(`/signup?plan=${plan}`); return; }
    setBusy(provider);
    const res = await api<{ url: string }>('/checkout', { plan, provider });
    if (res.ok && res.url) { window.location.href = res.url; return; }
    setError(res.error || 'Could not start checkout.'); setBusy(null);
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <button className={'btn block' + (primary ? ' primary' : '')} disabled={!!busy} onClick={() => go('stripe')}>{busy === 'stripe' ? 'Opening checkout…' : '💳 Subscribe with card'}</button>
      <button className="btn block" disabled={!!busy} onClick={() => go('paypal')}>{busy === 'paypal' ? 'Opening PayPal…' : 'Subscribe with PayPal'}</button>
      {error && <p className="msg err" role="alert">{error}</p>}
    </div>
  );
}
