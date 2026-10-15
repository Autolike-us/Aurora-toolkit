import type Stripe from 'stripe';
import { env } from '@/lib/env';
import { fail, json } from '@/lib/http';
import { stripe, syncStripeSubscription } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  const raw = await req.text();
  let event: Stripe.Event;
  try { event = stripe().webhooks.constructEvent(raw, req.headers.get('stripe-signature') || '', env.stripeWebhook()); }
  catch { return fail('Invalid signature.', 400); }
  const db = supabaseAdmin();
  const seen = await db.from('webhook_events').select('id').eq('id', event.id).maybeSingle();
  if (seen.data) return json({ ok: true, duplicate: true });
  try {
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.subscription) await syncStripeSubscription(await stripe().subscriptions.retrieve(String(s.subscription)));
    } else if (event.type.startsWith('customer.subscription.')) {
      await syncStripeSubscription(event.data.object as Stripe.Subscription);
    }
    await db.from('webhook_events').insert({ id: event.id, provider: 'stripe' });
    return json({ ok: true });
  } catch (e) { console.error('stripe webhook', e); return fail('Webhook handling failed.', 500); }
}
