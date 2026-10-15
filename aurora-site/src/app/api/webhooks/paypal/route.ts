import { fail, json } from '@/lib/http';
import { syncPayPalSubscription, verifyPayPalWebhook } from '@/lib/paypal';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  const raw = await req.text();
  if (!(await verifyPayPalWebhook(req.headers, raw))) return fail('Invalid signature.', 400);
  const event = JSON.parse(raw);
  const db = supabaseAdmin();
  const seen = await db.from('webhook_events').select('id').eq('id', event.id).maybeSingle();
  if (seen.data) return json({ ok: true, duplicate: true });
  try {
    const type: string = event.event_type || '';
    const subId = type.startsWith('BILLING.SUBSCRIPTION.') ? event.resource?.id : event.resource?.billing_agreement_id;
    if (subId) await syncPayPalSubscription(subId);
    await db.from('webhook_events').insert({ id: event.id, provider: 'paypal' });
    return json({ ok: true });
  } catch (e) { console.error('paypal webhook', e); return fail('Webhook handling failed.', 500); }
}
