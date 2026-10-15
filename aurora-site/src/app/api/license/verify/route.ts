import { z } from 'zod';
import { loadAccessByKey } from '@/lib/accounts';
import { CORS, json } from '@/lib/http';
import { PRODUCT_IDS, type ProductId } from '@/lib/products';
import { signLicenseToken } from '@/lib/token';
import { supabaseAdmin } from '@/lib/supabase';

const MAX_DEVICES = 3;
const Body = z.object({ key: z.string().regex(/^AUR-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/), product: z.enum(PRODUCT_IDS as [ProductId, ...ProductId[]]), installId: z.string().min(8).max(80), version: z.string().max(20).optional() });

export const OPTIONS = () => new Response(null, { status: 204, headers: CORS });

/** Called by the browser extensions. Returns a signed token when this license may run this product on this device. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ ok: false, status: 'invalid', message: 'That license key does not look right. Copy it from your Aurora account page.' }, 400, CORS);
  const { key, product, installId } = parsed.data;
  const found = await loadAccessByKey(key);
  if (!found) return json({ ok: false, status: 'invalid', message: 'License key not found. Check it on your Aurora account page.' }, 404, CORS);
  const { license, access } = found;
  const db = supabaseAdmin();
  const { data: devices } = await db.from('activations').select('install_id').eq('license_id', license.id);
  const known = (devices ?? []).some(d => d.install_id === installId);
  if (!known && (devices?.length ?? 0) >= MAX_DEVICES) return json({ ok: false, status: 'device_limit', message: `This license is already used on ${MAX_DEVICES} browsers. Remove one in your account, or contact support.` }, 403, CORS);
  await db.from('activations').upsert({ license_id: license.id, install_id: installId, product, last_seen: new Date().toISOString() }, { onConflict: 'license_id,install_id' });
  if (!access.products.includes(product)) return json({ ok: false, status: access.status === 'active' ? 'wrong_plan' : access.status, trialEndsAt: access.trialEndsAt, message: access.status === 'active' ? `Your plan does not include Aurora for ${product}. Upgrade on your account page.` : access.message }, 402, CORS);
  const { token, expiresAt } = await signLicenseToken({ licenseKey: key, product, access, installId });
  return json({ ok: true, status: access.status, token, expiresAt, trialEndsAt: access.trialEndsAt, renewsAt: access.renewsAt, message: access.message }, 200, CORS);
}
