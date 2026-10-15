import Stripe from 'stripe';
import { env, requireEnv } from './env';
import { offerActive, productsForPlan, type PlanId } from './pricing';
import { supabaseAdmin } from './supabase';

let client: Stripe | null = null;
export const stripe = () => (client ??= new Stripe(requireEnv('STRIPE_SECRET_KEY', env.stripeSecret())));

/** Stripe Price id for a plan. The $10 launch bundle price is a separate Price that stays on subscribers who bought during the window. */
export function stripePriceId(plan: PlanId, launch: boolean): string {
  const key = plan === 'bundle' ? (launch ? 'STRIPE_PRICE_BUNDLE_LAUNCH' : 'STRIPE_PRICE_BUNDLE') : `STRIPE_PRICE_${plan.toUpperCase()}`;
  return requireEnv(key, process.env[key] || '');
}

export async function createStripeCheckout(args: { userId: string; email: string; plan: PlanId }): Promise<string> {
  const launch = args.plan === 'bundle' && offerActive();
  const session = await stripe().checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: stripePriceId(args.plan, launch), quantity: 1 }],
    customer_email: args.email,
    client_reference_id: args.userId,
    allow_promotion_codes: true,
    success_url: `${env.siteUrl()}/account?checkout=success`,
    cancel_url: `${env.siteUrl()}/pricing?checkout=cancelled`,
    subscription_data: { metadata: { user_id: args.userId, plan: args.plan, launch: String(launch) } },
  });
  if (!session.url) throw new Error('Stripe did not return a checkout URL.');
  return session.url;
}

const periodEnd = (sub: any): string | null => {
  const ts = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end;
  return ts ? new Date(ts * 1000).toISOString() : null;
};

/** Mirrors a Stripe subscription into our table (idempotent). */
export async function syncStripeSubscription(sub: Stripe.Subscription): Promise<void> {
  const userId = sub.metadata?.user_id, plan = sub.metadata?.plan;
  if (!userId || !plan || !productsForPlan(plan).length) return;
  await supabaseAdmin().from('subscriptions').upsert({
    provider: 'stripe', provider_sub_id: sub.id, provider_customer_id: String(sub.customer), user_id: userId, plan,
    status: sub.status, current_period_end: periodEnd(sub), launch_price: sub.metadata?.launch === 'true',
    cancel_at_period_end: !!sub.cancel_at_period_end, updated_at: new Date().toISOString(),
  }, { onConflict: 'provider,provider_sub_id' });
}
