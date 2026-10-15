import { env, requireEnv } from './env';
import { offerActive, productsForPlan, type PlanId } from './pricing';
import { supabaseAdmin } from './supabase';

async function token(): Promise<string> {
  const id = requireEnv('PAYPAL_CLIENT_ID', env.paypalClientId()), secret = requireEnv('PAYPAL_CLIENT_SECRET', env.paypalSecret());
  const res = await fetch(`${env.paypalBase()}/v1/oauth2/token`, { method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' });
  if (!res.ok) throw new Error('PayPal sign-in failed.');
  return (await res.json()).access_token;
}
async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(env.paypalBase() + path, { ...init, headers: { Authorization: 'Bearer ' + await token(), 'Content-Type': 'application/json', ...(init.headers || {}) } });
  if (!res.ok) throw new Error(`PayPal ${path} failed (${res.status}).`);
  return res.status === 204 ? (undefined as T) : res.json();
}

export function paypalPlanId(plan: PlanId, launch: boolean): string {
  const key = plan === 'bundle' ? (launch ? 'PAYPAL_PLAN_BUNDLE_LAUNCH' : 'PAYPAL_PLAN_BUNDLE') : `PAYPAL_PLAN_${plan.toUpperCase()}`;
  return requireEnv(key, process.env[key] || '');
}

export async function createPayPalSubscription(args: { userId: string; plan: PlanId }): Promise<string> {
  const launch = args.plan === 'bundle' && offerActive();
  const sub = await api<{ id: string; links: { rel: string; href: string }[] }>('/v1/billing/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      plan_id: paypalPlanId(args.plan, launch), custom_id: `${args.userId}|${args.plan}|${launch}`,
      application_context: { brand_name: 'Aurora', user_action: 'SUBSCRIBE_NOW', return_url: `${env.siteUrl()}/account?checkout=success`, cancel_url: `${env.siteUrl()}/pricing?checkout=cancelled` },
    }),
  });
  const url = sub.links.find(l => l.rel === 'approve')?.href;
  if (!url) throw new Error('PayPal did not return an approval link.');
  return url;
}

export async function verifyPayPalWebhook(headers: Headers, rawBody: string): Promise<boolean> {
  try {
    const res = await api<{ verification_status: string }>('/v1/notifications/verify-webhook-signature', {
      method: 'POST',
      body: JSON.stringify({
        auth_algo: headers.get('paypal-auth-algo'), cert_url: headers.get('paypal-cert-url'), transmission_id: headers.get('paypal-transmission-id'),
        transmission_sig: headers.get('paypal-transmission-sig'), transmission_time: headers.get('paypal-transmission-time'),
        webhook_id: requireEnv('PAYPAL_WEBHOOK_ID', env.paypalWebhookId()), webhook_event: JSON.parse(rawBody),
      }),
    });
    return res.verification_status === 'SUCCESS';
  } catch { return false; }
}

const MAP: Record<string, string> = { ACTIVE: 'active', APPROVAL_PENDING: 'incomplete', APPROVED: 'incomplete', SUSPENDED: 'suspended', CANCELLED: 'canceled', EXPIRED: 'canceled' };

/** Reads the subscription from PayPal (never trusts the event body for state) and mirrors it into our table. */
export async function syncPayPalSubscription(subscriptionId: string): Promise<void> {
  const s = await api<any>(`/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`);
  const [userId, plan, launch] = String(s.custom_id || '').split('|');
  if (!userId || !productsForPlan(plan).length) return;
  await supabaseAdmin().from('subscriptions').upsert({
    provider: 'paypal', provider_sub_id: s.id, provider_customer_id: s.subscriber?.payer_id ?? null, user_id: userId, plan,
    status: MAP[s.status] ?? 'incomplete', current_period_end: s.billing_info?.next_billing_time ?? s.status_update_time ?? null,
    launch_price: launch === 'true', updated_at: new Date().toISOString(),
  }, { onConflict: 'provider,provider_sub_id' });
}

export async function cancelPayPalSubscription(subscriptionId: string): Promise<void> {
  await api(`/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, { method: 'POST', body: JSON.stringify({ reason: 'Cancelled by customer' }) });
}
