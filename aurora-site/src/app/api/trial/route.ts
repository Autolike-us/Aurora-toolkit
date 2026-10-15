import { loadAccess } from '@/lib/accounts';
import { fail, json } from '@/lib/http';
import { userFromRequest } from '@/lib/supabase';

/** Creates the license (and starts the 3-day trial) the first time a signed-in user asks. Calling it again never extends the trial. */
export async function POST(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return fail('Please sign in.', 401);
  const { license, access } = await loadAccess(user.id);
  return json({ ok: true, licenseKey: license.license_key, access });
}
