'use client';
import { useEffect, useState } from 'react';

const KEY = 'aurora_token';
/** Where the PHP API lives. Same site by default ("/api"); set NEXT_PUBLIC_API_BASE to point elsewhere while developing. */
const BASE = process.env.NEXT_PUBLIC_API_BASE || '/api';

export const getToken = (): string | null => { try { return localStorage.getItem(KEY); } catch { return null; } };
export function setToken(t: string | null) {
  try { if (t) localStorage.setItem(KEY, t); else localStorage.removeItem(KEY); } catch { /* private mode */ }
  window.dispatchEvent(new Event('aurora-auth'));
}

/** True while a session token is stored in this browser. */
export function useSignedIn(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const sync = () => setOn(!!getToken());
    sync();
    window.addEventListener('aurora-auth', sync); window.addEventListener('storage', sync);
    return () => { window.removeEventListener('aurora-auth', sync); window.removeEventListener('storage', sync); };
  }, []);
  return on;
}

export async function api<T = any>(path: string, body?: unknown): Promise<T & { ok: boolean; error?: string; code?: string }> {
  const token = getToken();
  try {
    const res = await fetch(BASE + path, { method: body === undefined ? 'GET' : 'POST', headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const json = await res.json().catch(() => ({ ok: false, error: 'Unexpected response.' }));
    if (res.status === 401 && token && path !== '/auth/login') setToken(null);
    return json;
  } catch { return { ok: false, error: 'Could not reach Aurora. Check your connection and try again.' } as any; }
}

/** Downloads a release zip: the API checks the trial/plan, and the browser saves the file. */
export async function downloadRelease(product: string): Promise<string | null> {
  const token = getToken();
  try {
    const res = await fetch(`${BASE}/download?product=${encodeURIComponent(product)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) return (await res.json().catch(() => ({}))).error || 'Download unavailable.';
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a'); a.href = url; a.download = `aurora-${product}.zip`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return null;
  } catch { return 'Could not reach Aurora. Check your connection and try again.'; }
}
