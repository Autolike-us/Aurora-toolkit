import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, requireEnv } from './env';

let admin: SupabaseClient | null = null;
/** Service-role client: server only. Never import this from a client component. */
export function supabaseAdmin(): SupabaseClient {
  admin ??= createClient(requireEnv('NEXT_PUBLIC_SUPABASE_URL', env.supabaseUrl()), requireEnv('SUPABASE_SERVICE_ROLE_KEY', env.supabaseService()), { auth: { persistSession: false } });
  return admin;
}

export interface AuthedUser { id: string; email: string; }
/** Validates a Supabase access token ("Authorization: Bearer …") and returns the user. */
export async function userFromRequest(req: Request): Promise<AuthedUser | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await supabaseAdmin().auth.getUser(token);
  if (error || !data.user?.email) return null;
  return { id: data.user.id, email: data.user.email };
}
