'use client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;
/** Browser Supabase client (anon key). Returns null when the site has no Supabase configuration yet. */
export function browserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return (client ??= createClient(url, key));
}

export async function accessToken(): Promise<string | null> {
  const c = browserClient();
  if (!c) return null;
  const { data } = await c.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function api<T = any>(path: string, body?: unknown): Promise<T & { ok: boolean; error?: string }> {
  const token = await accessToken();
  const res = await fetch(path, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return res.json().catch(() => ({ ok: false, error: 'Unexpected response.' }));
}
