import { PRODUCT_IDS, type ProductId } from './products';

export const PRICE_SINGLE = 10;
export const PRICE_BUNDLE_LAUNCH = 10;
export const PRICE_BUNDLE = 20;
export const TRIAL_DAYS = 3;
export const LAUNCH_MONTHS = 3;

/** Launch date (ISO). Set LAUNCH_DATE in the environment; the offer runs for LAUNCH_MONTHS from this day. */
export function launchStart(env: Record<string, string | undefined> = process.env): Date {
  const raw = env.NEXT_PUBLIC_LAUNCH_DATE || env.LAUNCH_DATE || '2026-10-15';
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date('2026-10-15') : d;
}

export function launchEnd(env?: Record<string, string | undefined>): Date {
  const d = new Date(launchStart(env));
  d.setUTCMonth(d.getUTCMonth() + LAUNCH_MONTHS);
  return d;
}

export function offerActive(now: Date = new Date(), env?: Record<string, string | undefined>): boolean {
  return now >= launchStart(env) && now < launchEnd(env);
}

/** The end of the launch offer as plain text, always in UTC so it reads the same for everyone (e.g. "January 15, 2027"). */
export function launchEndLabel(env?: Record<string, string | undefined>): string {
  return launchEnd(env).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export function daysLeftInOffer(now: Date = new Date(), env?: Record<string, string | undefined>): number {
  return Math.max(0, Math.ceil((launchEnd(env).getTime() - now.getTime()) / 86400000));
}

export type PlanId = 'bundle' | ProductId;
export const PLAN_IDS: PlanId[] = ['bundle', ...PRODUCT_IDS];

export interface PlanQuote { plan: PlanId; amount: number; launch: boolean; products: ProductId[]; label: string; }

/** What a customer pays today for a plan (the bundle is $10 during the launch window, $20 afterwards). */
export function quote(plan: PlanId, now: Date = new Date(), env?: Record<string, string | undefined>): PlanQuote {
  if (plan === 'bundle') {
    const launch = offerActive(now, env);
    return { plan, amount: launch ? PRICE_BUNDLE_LAUNCH : PRICE_BUNDLE, launch, products: [...PRODUCT_IDS], label: 'All 3 extensions' };
  }
  return { plan, amount: PRICE_SINGLE, launch: false, products: [plan], label: plan[0].toUpperCase() + plan.slice(1) };
}

export function productsForPlan(plan: string): ProductId[] {
  return plan === 'bundle' ? [...PRODUCT_IDS] : (PRODUCT_IDS as string[]).includes(plan) ? [plan as ProductId] : [];
}
