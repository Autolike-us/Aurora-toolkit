'use client';
import { useEffect, useState } from 'react';
import { api } from './client';

export type Providers = { stripe: boolean; paypal: boolean };
let cache: Providers | null = null;

/** Which payment methods the server has switched on (null while loading). The demo preview shows both. */
export function useProviders(): Providers | null {
  const preview = process.env.NEXT_PUBLIC_PREVIEW === '1';
  const [p, setP] = useState<Providers | null>(preview ? { stripe: true, paypal: true } : cache);
  useEffect(() => {
    if (preview || cache) return;
    api<Providers>('/billing/providers').then(r => {
      // If we cannot find out, offer both and let the server answer politely.
      cache = r.ok ? { stripe: !!r.stripe, paypal: !!r.paypal } : { stripe: true, paypal: true };
      setP(cache);
    });
  }, [preview]);
  return p;
}
