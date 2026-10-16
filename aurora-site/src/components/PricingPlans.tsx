import Link from 'next/link';
import { CheckoutButtons, PaymentsBy } from './CheckoutButtons';
import { PRODUCTS } from '@/lib/products';
import { PlatformIcon, PlatformRow } from './PlatformIcon';
import { PRICE_BUNDLE, PRICE_SINGLE, TRIAL_DAYS, daysLeftInOffer, launchEnd, offerActive, quote } from '@/lib/pricing';

const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export function PricingPlans({ showCta = true }: { showCta?: boolean }) {
  const now = new Date(), launch = offerActive(now), bundle = quote('bundle', now);
  return (
    <>
      <div className="priceband">
        <div>
          <span className="eyebrow">03 / Your next chapter starts here</span>
          <h2>Small subscription.<br /><em>A brighter toolkit.</em></h2>
          <p className="lead">Get to know the complete Aurora series. {TRIAL_DAYS} days to explore with all three studios unlocked — no card needed.</p>
          <div className="timeline">
            <div><i>01</i><p><b>First {TRIAL_DAYS} days free</b><span>All three studios, no payment method.</span></p></div>
            <div><i>02</i><p><b>{launch ? `Launch window: $${bundle.amount}/month for all three` : `Today: $${PRICE_BUNDLE}/month for all three`}</b><span>{launch ? `Locked while you stay subscribed. Offer ends ${fmt(launchEnd())} (${daysLeftInOffer(now)} days left).` : `Or $${PRICE_SINGLE}/month for a single studio.`}</span></p></div>
            <div><i>03</i><p><b>After the launch window</b><span>New subscribers pay ${PRICE_SINGLE}/month per studio, or ${PRICE_BUNDLE}/month for all three.</span></p></div>
          </div>
        </div>
        <div className="pricecard">
          <div className="row"><span>The complete series</span><span className="pill">{launch ? 'Launch offer' : 'Best value'}</span></div>
          <div className="price"><sup>$</sup><strong>{bundle.amount}</strong><span className="per">USD /<br />month</span>{launch && <s>${PRICE_BUNDLE}</s>}</div>
          <p className="muted inline-id" style={{ fontSize: 14 }}><PlatformRow size="sm" />Facebook + Instagram + TikTok studios.</p>
          <ul><li>All three studios, every feature</li><li>One subscription, one license</li><li>Up to 3 browsers</li><li>Preview, task controls &amp; local history</li><li>Cancel any time — access lasts through the paid period</li></ul>
          {showCta ? <CheckoutButtons plan="bundle" primary /> : null}
          <PaymentsBy />
        </div>
      </div>
      <div className="singles">
        {PRODUCTS.map(p => (
          <div key={p.id} className="single">
            <span className="inline-id"><PlatformIcon id={p.id} size="md" /><span className="eyebrow" style={{ margin: 0, color: p.accent }}>{p.short} only</span></span>
            <h3>Aurora for {p.short}</h3>
            <div className="p"><strong>${PRICE_SINGLE}</strong><span>/month</span></div>
            <ul><li>{p.actions.slice(0, 3).join(' · ')}{p.actions.length > 3 ? ' …' : ''}</li><li>Up to 3 browsers</li><li>Cancel any time</li></ul>
            {showCta ? <CheckoutButtons plan={p.id} /> : null}
          </div>
        ))}
      </div>
      <p className="note center" style={{ marginTop: 20 }}>Every account starts with a {TRIAL_DAYS}-day free trial of all three — <Link href="/signup" style={{ textDecoration: 'underline' }}>no card required</Link>.</p>
    </>
  );
}
