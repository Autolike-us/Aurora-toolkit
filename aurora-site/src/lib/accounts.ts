import { supabaseAdmin } from './supabase';
import { computeAccess, newLicenseKey, type Access, type LicenseRow, type SubscriptionRow } from './entitlements';
import { TRIAL_DAYS } from './pricing';

/** Returns the user's license, creating it (and starting the 3-day trial) on first use. */
export async function ensureLicense(userId: string): Promise<LicenseRow> {
  const db = supabaseAdmin();
  const { data: existing } = await db.from('licenses').select('*').eq('user_id', userId).maybeSingle();
  if (existing) return existing as LicenseRow;
  const now = new Date(), ends = new Date(now.getTime() + TRIAL_DAYS * 86400000);
  const { data, error } = await db.from('licenses').insert({ user_id: userId, license_key: newLicenseKey(), trial_started_at: now.toISOString(), trial_ends_at: ends.toISOString() }).select('*').single();
  if (error) throw error;
  return data as LicenseRow;
}

export async function loadAccess(userId: string): Promise<{ license: LicenseRow; subs: SubscriptionRow[]; access: Access }> {
  const license = await ensureLicense(userId);
  const { data } = await supabaseAdmin().from('subscriptions').select('*').eq('user_id', userId);
  const subs = (data ?? []) as SubscriptionRow[];
  return { license, subs, access: computeAccess(license, subs) };
}

export async function loadAccessByKey(key: string): Promise<{ license: LicenseRow; access: Access } | null> {
  const db = supabaseAdmin();
  const { data: license } = await db.from('licenses').select('*').eq('license_key', key).maybeSingle();
  if (!license) return null;
  const { data } = await db.from('subscriptions').select('*').eq('user_id', (license as LicenseRow).user_id);
  return { license: license as LicenseRow, access: computeAccess(license as LicenseRow, (data ?? []) as SubscriptionRow[]) };
}
