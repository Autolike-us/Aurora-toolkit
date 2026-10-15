import Link from 'next/link';
import { CheckoutButtons } from './CheckoutButtons';
import { PRODUCTS } from '@/lib/products';
import { PRICE_BUNDLE, TRIAL_DAYS, daysLeftInOffer, launchEnd, offerActive, quote } from '@/lib/pricing';

const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export function PricingPlans({ showCta = true }: { showCta?: boolean }) {
  const now = new Date(), launch = offerActive(now), bundle = quote('bundle', now);
  return (
    <>
      {launch && (
        <div className="offer" role="note">
          <span>🎉 <b>Launch offer:</b> all 3 extensions for <b>$10/month</b> — price locked while you stay subscribed.</span>
          <span>Ends {fmt(launchEnd())} · {daysLeftInOffer(now)} days left</span>
        </div>
      )}
      <div className="plans">
        <div className="plan best">
          <span className="tag">{launch ? 'Launch offer' : 'Best value'}</span>
          <h3>All 3 extensions</h3>
          <p className="muted">Facebook + Instagram + TikTok</p>
          <div className="price">{launch && <s>${PRICE_BUNDLE}</s>}<strong>${bundle.amount}</strong><span>/month</span></div>
          <ul><li>Every Aurora extension</li><li>Up to 3 browsers</li><li>All future updates</li><li>Cancel any time</li></ul>
          {showCta ? <CheckoutButtons plan="bundle" primary /> : null}
        </div>
        {PRODUCTS.map(p => (
          <div key={p.id} className="plan">
            <h3>{p.name.replace('Aurora for ', '')} only</h3>
            <p className="muted">{p.actions.slice(0, 3).join(' · ')}{p.actions.length > 3 ? ' …' : ''}</p>
            <div className="price"><strong>$10</strong><span>/month</span></div>
            <ul><li>Aurora for {p.short}</li><li>Up to 3 browsers</li><li>All future updates</li><li>Cancel any time</li></ul>
            {showCta ? <CheckoutButtons plan={p.id} /> : null}
          </div>
        ))}
      </div>
      <p className="note center" style={{ marginTop: 18 }}>
        {launch ? `After the launch offer: $10/month per extension, or $${PRICE_BUNDLE}/month for all three. ` : ''}
        Every account starts with a {TRIAL_DAYS}-day free trial of all three — <Link href="/signup" style={{ textDecoration: 'underline' }}>no card required</Link>. Pay by card (Stripe) or PayPal.
      </p>
    </>
  );
}
