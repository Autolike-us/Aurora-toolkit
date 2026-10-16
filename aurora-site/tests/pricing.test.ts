import { describe, expect, it } from 'vitest';
import { daysLeftInOffer, launchEnd, offerActive, productsForPlan, quote } from '../src/lib/pricing';

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
