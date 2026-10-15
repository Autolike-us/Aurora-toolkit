import { fail, json } from '@/lib/http';
import { cancelPayPalSubscription, syncPayPalSubscription } from '@/lib/paypal';
import { supabaseAdmin, userFromRequest } from '@/lib/supabase';

/** Cancels the user's own PayPal subscription (Stripe customers use the portal instead). Access continues until the paid period ends. */
export async function POST(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return fail('Please sign in.', 401);
  const { data } = await supabaseAdmin().from('subscriptions').select('provider_sub_id').eq('user_id', user.id).eq('provider', 'paypal').eq('status', 'active').limit(1).maybeSingle();
  if (!data) return fail('No active PayPal subscription found.', 404);
  await cancelPayPalSubscription(data.provider_sub_id);
  await syncPayPalSubscription(data.provider_sub_id);
  return json({ ok: true });
}
