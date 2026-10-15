import { PRODUCT_IDS, type ProductId } from './products';
import { productsForPlan, TRIAL_DAYS } from './pricing';

export interface LicenseRow { id: string; user_id: string; license_key: string; trial_started_at: string; trial_ends_at: string; }
export interface SubscriptionRow { id: string; plan: string; status: string; current_period_end: string | null; provider: string; launch_price: boolean; cancel_at_period_end?: boolean; }

export type AccessStatus = 'active' | 'trial' | 'expired' | 'none';
export interface Access { status: AccessStatus; products: ProductId[]; trialEndsAt: string | null; renewsAt: string | null; plan: string | null; message: string; }

/** A subscription grants access while it is active/trialing, or until the paid period ends if it was cancelled or payment is overdue (short grace). */
export function subscriptionGrantsAccess(s: SubscriptionRow, now = new Date()): boolean {
  if (['active', 'trialing'].includes(s.status)) return true;
  if (['canceled', 'cancelled', 'past_due', 'suspended'].includes(s.status) && s.current_period_end) return new Date(s.current_period_end) > now;
  return false;
}

export function computeAccess(license: LicenseRow | null, subs: SubscriptionRow[], now = new Date()): Access {
  const paid = new Set<ProductId>();
  let renewsAt: string | null = null, plan: string | null = null;
  for (const s of subs) {
    if (!subscriptionGrantsAccess(s, now)) continue;
    productsForPlan(s.plan).forEach(p => paid.add(p));
    plan = s.plan; renewsAt = s.current_period_end;
  }
  if (paid.size) return { status: 'active', products: [...paid], trialEndsAt: license?.trial_ends_at ?? null, renewsAt, plan, message: 'Subscription active.' };
  if (license && new Date(license.trial_ends_at) > now) {
    const left = Math.max(1, Math.ceil((new Date(license.trial_ends_at).getTime() - now.getTime()) / 86400000));
    return { status: 'trial', products: [...PRODUCT_IDS], trialEndsAt: license.trial_ends_at, renewsAt: null, plan: null, message: `Free trial: ${left} day${left === 1 ? '' : 's'} left.` };
  }
  if (license) return { status: 'expired', products: [], trialEndsAt: license.trial_ends_at, renewsAt: null, plan: null, message: `Your ${TRIAL_DAYS}-day trial has ended. Subscribe to keep using Aurora.` };
  return { status: 'none', products: [], trialEndsAt: null, renewsAt: null, plan: null, message: 'Start your free trial to get a license.' };
}

export function newLicenseKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const chars = [...bytes].map(b => alphabet[b % alphabet.length]);
  return 'AUR-' + [chars.slice(0, 4), chars.slice(4, 8), chars.slice(8, 12)].map(g => g.join('')).join('-');
}
