import { z } from 'zod';
import { loadAccess } from '@/lib/accounts';
import { fail, json } from '@/lib/http';
import { PRODUCT_IDS, getProduct, type ProductId } from '@/lib/products';
import { supabaseAdmin, userFromRequest } from '@/lib/supabase';

const Body = z.object({ product: z.enum(PRODUCT_IDS as [ProductId, ...ProductId[]]) });

/** Returns a 5-minute signed link to the private release zip, only for users whose trial or plan includes that product. */
export async function POST(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return fail('Please sign in to download.', 401);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('Unknown product.');
  const { access } = await loadAccess(user.id);
  if (!access.products.includes(parsed.data.product)) return fail(access.message, 402);
  const { data, error } = await supabaseAdmin().storage.from('releases').createSignedUrl(getProduct(parsed.data.product)!.zip, 300);
  if (error || !data) return fail('That download is not published yet. Please check back soon.', 404);
  return json({ ok: true, url: data.signedUrl });
}
