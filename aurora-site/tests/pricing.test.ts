import { describe, expect, it } from 'vitest';
import { daysLeftInOffer, launchEnd, offerActive, productsForPlan, quote } from '../src/lib/pricing';
import { computeAccess, newLicenseKey, subscriptionGrantsAccess, type LicenseRow, type SubscriptionRow } from '../src/lib/entitlements';

const env = { LAUNCH_DATE: '2026-10-15' };
const day = (s: string) => new Date(s + 'T12:00:00Z');

describe('launch offer', () => {
  it('runs for exactly 3 months from launch day', () => {
    expect(launchEnd(env).toISOString().slice(0, 10)).toBe('2027-01-15');
    expect(offerActive(day('2026-10-15'), env)).toBe(true);
    expect(offerActive(day('2027-01-14'), env)).toBe(true);
    expect(offerActive(day('2027-01-16'), env)).toBe(false);
    expect(offerActive(day('2026-10-01'), env)).toBe(false);
  });
  it('quotes the bundle at $10 during the offer and $20 after; singles are always $10', () => {
    expect(quote('bundle', day('2026-11-01'), env)).toMatchObject({ amount: 10, launch: true });
    expect(quote('bundle', day('2027-02-01'), env)).toMatchObject({ amount: 20, launch: false });
    expect(quote('instagram', day('2027-02-01'), env)).toMatchObject({ amount: 10, products: ['instagram'] });
  });
  it('counts the days left', () => { expect(daysLeftInOffer(day('2027-01-10'), env)).toBeGreaterThan(0); expect(daysLeftInOffer(day('2027-03-01'), env)).toBe(0); });
  it('maps plans to products', () => { expect(productsForPlan('bundle')).toHaveLength(3); expect(productsForPlan('tiktok')).toEqual(['tiktok']); expect(productsForPlan('nope')).toEqual([]); });
});

const license = (trialEnd: string): LicenseRow => ({ id: 'l', user_id: 'u', license_key: 'AUR-AAAA-BBBB-CCCC', trial_started_at: '2026-10-01T00:00:00Z', trial_ends_at: trialEnd });
const sub = (o: Partial<SubscriptionRow>): SubscriptionRow => ({ id: 's', plan: 'bundle', status: 'active', current_period_end: '2027-01-01T00:00:00Z', provider: 'stripe', launch_price: true, ...o });

describe('entitlements', () => {
  const now = new Date('2026-10-02T00:00:00Z');
  it('gives all 3 products during the trial', () => {
    const a = computeAccess(license('2026-10-04T00:00:00Z'), [], now);
    expect(a.status).toBe('trial'); expect(a.products).toHaveLength(3);
  });
  it('locks everything after the trial without a subscription', () => {
    const a = computeAccess(license('2026-10-01T12:00:00Z'), [], now);
    expect(a.status).toBe('expired'); expect(a.products).toEqual([]);
  });
  it('a single-product plan unlocks only that product', () => {
    const a = computeAccess(license('2026-10-01T12:00:00Z'), [sub({ plan: 'facebook' })], now);
    expect(a.status).toBe('active'); expect(a.products).toEqual(['facebook']);
  });
  it('multiple single plans add up', () => {
    const a = computeAccess(license('2026-10-01T12:00:00Z'), [sub({ plan: 'facebook' }), sub({ id: 't', plan: 'tiktok' })], now);
    expect(a.products.sort()).toEqual(['facebook', 'tiktok']);
  });
  it('a cancelled subscription keeps working until the paid period ends', () => {
    expect(subscriptionGrantsAccess(sub({ status: 'canceled', current_period_end: '2026-10-20T00:00:00Z' }), now)).toBe(true);
    expect(subscriptionGrantsAccess(sub({ status: 'canceled', current_period_end: '2026-10-01T00:00:00Z' }), now)).toBe(false);
    expect(subscriptionGrantsAccess(sub({ status: 'incomplete' }), now)).toBe(false);
  });
  it('no license means no access', () => { expect(computeAccess(null, [], now).status).toBe('none'); });
  it('license keys have the expected shape and are unique', () => {
    const keys = new Set(Array.from({ length: 200 }, newLicenseKey));
    expect(keys.size).toBe(200);
    for (const k of keys) expect(k).toMatch(/^AUR-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  });
});
