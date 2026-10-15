import { loadAccess } from '@/lib/accounts';
import { fail, json } from '@/lib/http';
import { userFromRequest } from '@/lib/supabase';

export async function GET(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return fail('Please sign in.', 401);
  const { license, subs, access } = await loadAccess(user.id);
  return json({ ok: true, email: user.email, licenseKey: license.license_key, access, subscriptions: subs.map(s => ({ id: s.id, provider: s.provider, plan: s.plan, status: s.status, renewsAt: s.current_period_end, launchPrice: s.launch_price, cancelAtPeriodEnd: !!s.cancel_at_period_end })) });
}
