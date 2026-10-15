export const revalidate = 3600; // the launch-offer banner depends on the date
import Link from 'next/link';
import { Faq } from '@/components/Faq';
import { PricingPlans } from '@/components/PricingPlans';
import { ProductCards } from '@/components/ProductCards';
import { StudioMock } from '@/components/StudioMock';
import { COMMON_FEATURES } from '@/lib/products';
import { TRIAL_DAYS } from '@/lib/pricing';

export default function Home() {
  return (
    <main>
      <section className="hero"><div className="wrap grid">
        <div>
          <span className="pill">✦ <b>New</b> · Aurora for Facebook, Instagram &amp; TikTok</span>
          <h1>Grow your presence, <span className="grad-text">one thoughtful action at a time.</span></h1>
          <p className="lead">Aurora is a family of browser extensions that like, comment, follow and more — in your own logged-in tab, at a human pace. Preview everything first. Go live when you are ready.</p>
          <div className="cta">
            <Link className="btn primary lg" href="/signup">Start your {TRIAL_DAYS}-day free trial</Link>
            <Link className="btn lg" href="/pricing">See pricing</Link>
          </div>
          <p className="fine">No card required · All 3 extensions during the trial · Then $10/month — launch offer inside</p>
        </div>
        <StudioMock />
      </div></section>

      <section className="block"><div className="wrap center">
        <span className="eyebrow">The Aurora series</span>
        <h2 style={{ marginTop: 10 }}>One studio. Three platforms.</h2>
        <p className="lead">Each extension feels the same, so what you learn on one works on the others — with the actions that make sense for each platform.</p>
        <ProductCards />
      </div></section>

      <section className="block"><div className="wrap center">
        <span className="eyebrow">How it works</span>
        <h2 style={{ marginTop: 10 }}>Up and running in three minutes</h2>
        <div className="steps" style={{ textAlign: 'left' }}>
          <div className="step"><h3>Install &amp; sign in</h3><p className="muted" style={{ marginTop: 8 }}>Add the extension, paste your license key from your account page, and open the studio from the toolbar.</p></div>
          <div className="step"><h3>Preview your task</h3><p className="muted" style={{ marginTop: 8 }}>Pick an action and your targets. Preview shows exactly what Aurora would do — nothing is sent.</p></div>
          <div className="step"><h3>Go live, at your pace</h3><p className="muted" style={{ marginTop: 8 }}>Switch to live. Watch “Target 2 of 5 · next in 24s” tick along, pause or skip a target any time.</p></div>
        </div>
      </div></section>

      <section className="block"><div className="wrap center">
        <span className="eyebrow">Why Aurora</span>
        <h2 style={{ marginTop: 10 }}>Built to be careful, calm and clear</h2>
        <div className="features" style={{ textAlign: 'left' }}>
          {COMMON_FEATURES.map(f => <div className="feature" key={f.title}><div className="ic">{f.icon}</div><h3>{f.title}</h3><p>{f.text}</p></div>)}
        </div>
      </div></section>

      <section className="block" id="pricing"><div className="wrap center">
        <span className="eyebrow">Pricing</span>
        <h2 style={{ marginTop: 10, marginBottom: 34 }}>Simple, honest pricing</h2>
        <PricingPlans />
      </div></section>

      <section className="block" id="faq"><div className="wrap center">
        <span className="eyebrow">FAQ</span>
        <h2 style={{ marginTop: 10 }}>Good questions</h2>
        <Faq />
      </div></section>

      <section><div className="wrap"><div className="cta-band">
        <h2>Try all three, free for {TRIAL_DAYS} days.</h2>
        <p style={{ marginTop: 10, opacity: .92 }}>No card. No commitment. Install in minutes.</p>
        <Link className="btn lg" href="/signup">Start free trial</Link>
      </div></div></section>
    </main>
  );
}
