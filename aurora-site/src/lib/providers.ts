'use client';
import { useEffect, useState } from 'react';
import { api } from './client';

export type ReplyProviders = { stripe: boolean; paypal: boolean; stripeSub: boolean; paypalSub: boolean };
export type Providers = { stripe: boolean; paypal: boolean; reply?: ReplyProviders };
let cache: Providers | null = null;

/** Which payment methods the server has switched on (null while loading). The demo preview shows both. */
export function useProviders(): Providers | null {
  const preview = process.env.NEXT_PUBLIC_PREVIEW === '1';
  const [p, setP] = useState<Providers | null>(preview ? { stripe: true, paypal: true, reply: { stripe: true, paypal: true, stripeSub: true, paypalSub: true } } : cache);
  useEffect(() => {
    if (preview || cache) return;
    api<Providers>('/billing/providers').then(r => {
      // If we cannot find out, offer both and let the server answer politely.
      cache = r.ok ? { stripe: !!r.stripe, paypal: !!r.paypal, reply: r.reply } : { stripe: true, paypal: true, reply: { stripe: true, paypal: true, stripeSub: true, paypalSub: true } };
      setP(cache);
    });
  }, [preview]);
  return p;
}
