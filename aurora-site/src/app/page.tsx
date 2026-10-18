export const revalidate = 3600; // the launch-offer banner depends on the date
import Link from 'next/link';
import { Faq } from '@/components/Faq';
import { PricingPlans } from '@/components/PricingPlans';
import { ProductCards } from '@/components/ProductCards';
import { PlatformRow } from '@/components/PlatformIcon';
import { StudioMock } from '@/components/StudioMock';
import { COMMON_FEATURES } from '@/lib/products';
import { TRIAL_DAYS } from '@/lib/pricing';
import { EXTRACT } from '@/lib/products';
import { ExtractIcon } from '@/components/ExtractIcon';

export default function Home() {
  return (
    <main>
      <section className="hero"><div className="wrap grid">
        <div>
          <span className="eyebrow"><span className="star">✳</span>Your social workflow, in a better light</span>
          <h1>Less busywork.<br />More <em>possibility.</em></h1>
          <p className="lead">A little more intention. A lot less repetition. Meet your new browser companions for Facebook, Instagram and TikTok — they like, comment, follow and more, at a human pace.</p>
          <div className="cta">
            <Link className="btn primary lg" href="/signup">Start my {TRIAL_DAYS}-day free trial <span className="arrow">↗</span></Link>
            <a className="demo" href="#how"><span className="play">▶</span>Take a closer look</a>
          </div>
          <p className="fine">All three studios included. No card required for the trial.<br />Then $10/month — launch offer inside. Cancel any time.</p>
          <div className="platforms">
            <span className="cap">Three platforms<br />One familiar feel</span>
            <PlatformRow size="md" />
            <span className="sep" /><span className="chrome"><i />Made for<br />Chrome</span>
          </div>
        </div>
        <StudioMock />
      </div></section>

      <div className="principles"><div className="wrap">
        <span className="lead-in">Thoughtful tools.<br /><b>By design.</b></span>
        <p><span>◉</span>Preview before you act</p><p><span>◷</span>Set your own pace</p><p><span>▤</span>Keep a local activity history</p><p><span>✦</span>Stay in control</p>
      </div></div>

      <section className="block"><div className="wrap">
        <div className="section-head">
          <div><span className="eyebrow">01 / The Aurora series</span><h2>Three studios.<br />Your kind of workflow.</h2></div>
          <p className="side">Different platforms. The same thoughtful approach. Choose your studio and make it your own.</p>
        </div>
        <ProductCards />
        <p className="fineprint center">Works with the English versions of each platform in Chrome 110+. Keep your task tab open and start with a one-target preview.</p>
      </div></section>

      <section className="block" id="free" style={{ paddingTop: 0 }}><div className="wrap">
        <div className="freebanner">
          <ExtractIcon size={84} />
          <div className="txt">
            <span className="eyebrow" style={{ marginBottom: 8 }}>New · <span className="freetag">Free</span></span>
            <h2>Aurora Extract</h2>
            <p>{EXTRACT.tagline} One extension for all three platforms — profiles, groups, Marketplace, posts, comments, followers and more. Export to CSV, Excel or JSON. Now with a free profile health check.</p>
          </div>
          <div className="act">
            <a className="btn primary lg" href={EXTRACT.zip} download>Download free <span className="arrow">↓</span></a>
            <Link className="linkarrow" href="/extract">See what it collects ↗</Link>
          </div>
        </div>
      </div></section>

      <section className="block" id="how"><div className="wrap workflow">
        <div>
          <span className="eyebrow">02 / A little less friction</span>
          <h2>From hello<br />to <em>in your flow.</em></h2>
          <p className="lead">No new social password to share. Your studios work in the tabs you already use.</p>
          <Link className="linkarrow" href="/download">Find your starting point ↗</Link>
        </div>
        <div className="steps">
          <div className="step"><span className="n">01</span><div><h3>Meet your new companions</h3><p>Create your Aurora account — your {TRIAL_DAYS}-day trial starts right away, no card needed.</p></div></div>
          <div className="step"><span className="n">02</span><div><h3>Make yourself at home</h3><p>Download your studios, load them in Chrome and paste your license key. Choose a task, your targets and a pace that fits.</p></div></div>
          <div className="step"><span className="n">03</span><div><h3>Preview. Then decide.</h3><p>See what your session will do. Start live actions only when you’re ready — with pause and skip within reach.</p></div></div>
        </div>
      </div></section>

      <section className="block" style={{ paddingTop: 20 }}><div className="wrap">
        <span className="eyebrow">Why Aurora</span>
        <h2>Built to be careful,<br /><em>calm and clear.</em></h2>
        <div className="features">{COMMON_FEATURES.map(f => <div className="feature" key={f.title}><div className="ic">{f.icon}</div><h3>{f.title}</h3><p>{f.text}</p></div>)}</div>
      </div></section>

      <section className="block" id="pricing" style={{ paddingTop: 20 }}><div className="wrap" style={{ maxWidth: 1360, padding: 0 }}><PricingPlans /></div></section>

      <section className="block" id="faq"><div className="wrap faqgrid">
        <div><span className="eyebrow">04 / Good questions</span><h2>A little clarity<br />before you begin.</h2></div>
        <Faq />
      </div></section>

      <section><div className="wrap"><div className="closing">
        <p><span className="star">✳</span>A little more space for what comes next.</p>
        <Link className="btn primary" href="/signup">Find your Aurora <span className="arrow">↗</span></Link>
      </div></div></section>
    </main>
  );
}
