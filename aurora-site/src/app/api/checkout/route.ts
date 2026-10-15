import { z } from 'zod';
import { fail, json } from '@/lib/http';
import { PLAN_IDS, type PlanId } from '@/lib/pricing';
import { createPayPalSubscription } from '@/lib/paypal';
import { createStripeCheckout } from '@/lib/stripe';
import { userFromRequest } from '@/lib/supabase';
import { ensureLicense } from '@/lib/accounts';

const Body = z.object({ plan: z.enum(PLAN_IDS as [PlanId, ...PlanId[]]), provider: z.enum(['stripe', 'paypal']) });

export async function POST(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return fail('Please sign in to subscribe.', 401);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('Choose a plan and a payment method.');
  try {
    await ensureLicense(user.id);
    const url = parsed.data.provider === 'stripe'
      ? await createStripeCheckout({ userId: user.id, email: user.email, plan: parsed.data.plan })
      : await createPayPalSubscription({ userId: user.id, plan: parsed.data.plan });
    return json({ ok: true, url });
  } catch (e) {
    console.error('checkout failed', e);
    return fail('Checkout is temporarily unavailable. Please try again in a moment.', 502);
  }
}
