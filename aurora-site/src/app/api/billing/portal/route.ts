import { env } from '@/lib/env';
import { fail, json } from '@/lib/http';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin, userFromRequest } from '@/lib/supabase';

/** Opens Stripe's customer portal (update card, cancel, invoices) for the signed-in user. */
export async function POST(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return fail('Please sign in.', 401);
  const { data } = await supabaseAdmin().from('subscriptions').select('provider_customer_id').eq('user_id', user.id).eq('provider', 'stripe').not('provider_customer_id', 'is', null).order('updated_at', { ascending: false }).limit(1).maybeSingle();
  if (!data?.provider_customer_id) return fail('No card subscription found for this account.', 404);
  const session = await stripe().billingPortal.sessions.create({ customer: data.provider_customer_id, return_url: `${env.siteUrl()}/account` });
  return json({ ok: true, url: session.url });
}
