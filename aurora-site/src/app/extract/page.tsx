import type { Metadata } from 'next';
import Link from 'next/link';
import { EXTRACT } from '@/lib/products';
import { SUPPORT } from '@/lib/support';
import { ExtractIcon } from '@/components/ExtractIcon';
import { PlatformIcon } from '@/components/PlatformIcon';
import Image from 'next/image';
import { Faq } from '@/components/Faq';

export const metadata: Metadata = {
  title: 'Aurora Extract — free data extractor',
  description: 'Free Chrome extension: collect public data from Facebook, Instagram and TikTok — profiles, groups, Marketplace, posts, comments, followers — download photos and videos, and score any profile with the built-in health check. Export to CSV, Excel and JSON.',
  openGraph: { title: 'Aurora Extract — free data extractor for Facebook, Instagram & TikTok', description: 'Collect public data and download photos and videos. Export to CSV, Excel or JSON. Free, no account, your data stays on your computer.', images: [{ url: '/og-v2.png', width: 1200, height: 630 }] },
};

const FAQ_X = [
  { q: 'Is Aurora Extract really free?', a: 'Yes. No account, no card, no trial timer, no limits on how many times you use it. It is our free companion to the paid Aurora studios.' },
  { q: 'Does it send my data anywhere?', a: 'No. There is no server. Everything you collect is stored in your own browser and exported by you. We never see your account, your cookies or your results.' },
  { q: 'What data can it collect?', a: 'Only what your own logged-in account can already see: public profiles and pages, groups you belong to, Marketplace listings, posts, comments and the follower, following and friends lists that the platform shows you. Public business emails and phone numbers are collected only when they are shown publicly (bio, About section, listing text, business contact buttons).' },
  { q: 'What is the Health check?', a: 'Aurora Audit is built into Aurora Extract. Open a profile or page, choose Health check, and it reads the bio, link and contact details plus the latest 10, 20 or 30 posts. You get a 0–100 score with a grade, a breakdown of five areas and a short list of the fixes that would raise your score most. You can copy the summary or export it to CSV, Excel or JSON.' },
  { q: 'Does the Health check use AI or send my profile anywhere?', a: 'No. The score is calculated on your own computer with simple, transparent rules — nothing is uploaded and there is no AI service involved. Optionally, you can press “Copy audit for AI” and paste the summary on getaurorastudios.com/audit-ai to get bio and caption suggestions; that is a separate step on our website, uses your Aurora reply balance, and only sends what you choose to paste. The benchmarks (for example how often to post) are rough guide values, not rules, and every niche is different.' },
  { q: 'Will it get my account in trouble?', a: 'Platforms restrict automated activity. Aurora Extract reads pages at a human pace (Gentle, Normal or Fast — Gentle is the kindest) and stops on warnings, but no tool can promise your account will never be limited. Read our platform disclaimer and use it responsibly.' },
  { q: 'How do I install it?', a: 'The easiest way is the Chrome Web Store: open the listing, press Add to Chrome and pin the sparkle icon. Prefer to install it yourself? Download the zip, unzip it into a folder you keep, open chrome://extensions, switch on Developer mode, press Load unpacked and pick the folder. Both give you the same extension.' },
  { q: 'Something did not extract correctly. What now?', a: 'Press “Copy debug report” inside the extension and post it in our Telegram channel (or email it). Facebook, Instagram and TikTok change their pages often and these reports are how we keep up.' },
];

export default function ExtractPage() {
  return (
    <main>
      <section className="xhero"><div className="wrap">
        <div className="xtitle"><ExtractIcon size={72} /><span className="freetag big">Free</span></div>
        <span className="eyebrow">New · Free for everyone</span>
        <h1>Aurora <em>Extract</em></h1>
        <p className="lead">{EXTRACT.tagline} One extension, three platforms — pick one, open a page, press start. <a href="#health" style={{ textDecoration: 'underline' }}>New: a free profile health check.</a></p>
        <div className="cta">
          <a className="btn primary lg" href={EXTRACT.store} target="_blank" rel="noopener noreferrer">Add to Chrome — it’s free <span className="arrow">↗</span></a>
          <a className="btn lg" href={EXTRACT.zip} download>Download zip · v{EXTRACT.version} <span className="arrow">↓</span></a>
          <a className="demo" href="#install"><span className="play">▶</span>Install options</a>
        </div>
        <p className="fine">Chrome and Chromium browsers (Edge, Brave) on desktop · No account needed · Your data never leaves your computer</p>
      </div></section>

      <section className="block"><div className="wrap">
        <div className="section-head">
          <div><span className="eyebrow">What it collects</span><h2>Everything you’d copy by hand —<br /><em>in one click.</em></h2></div>
          <p className="side">Only information your own logged-in account can already see. Photos and videos included.</p>
        </div>
        <div className="xgrid">
          {EXTRACT.platforms.map(pl => (
            <article key={pl.id} className="pcard xcard">
              <div className="top"><PlatformIcon id={pl.id} size="lg" /><span className="meta">{pl.id}</span></div>
              <ul className="xlist">{pl.items.map(i => <li key={i}>{i}</li>)}</ul>
            </article>
          ))}
        </div>
        <div className="xexports">{EXTRACT.exports.map(e => <span key={e} className="chip">{e}</span>)}</div>
      </div></section>

      <section className="block" id="health" style={{ paddingTop: 10 }}><div className="wrap">
        <div className="section-head">
          <div><span className="eyebrow"><span className="freetag">New</span> Built in · free</span><h2>How healthy is your<br /><em>profile or page?</em></h2></div>
          <p className="side">{EXTRACT.audit.tagline} Open a profile, choose <b>Health check</b>, and get your score in about a minute.</p>
        </div>
        <div className="auditx">
          <div className="auditx-list">
            {EXTRACT.audit.checks.map(c => (
              <div key={c.title} className="auditx-item"><span className="ic">{c.icon}</span><div><b>{c.title}</b><p>{c.text}</p></div></div>
            ))}
            <p className="note" style={{ marginTop: 6 }}>Works on Facebook pages and profiles, Instagram profiles and TikTok profiles. Choose Quick (10), Standard (20) or Deep (30) posts. Scored on your own computer — no AI service, nothing uploaded.</p>
          </div>
          <figure className="auditx-shot">
            <Image src="/extract-audit.png" alt="A sample Aurora Audit report: a score of 69 out of 100, grade C, with the top five fixes and a score breakdown" width={814} height={703} />
            <figcaption>Sample report with made-up data.</figcaption>
          </figure>
        </div>
      </div></section>

      <section className="block" id="how-extract" style={{ paddingTop: 10 }}><div className="wrap workflow">
        <div>
          <span className="eyebrow">How it works</span>
          <h2>Open. Choose.<br /><em>Download.</em></h2>
          <p className="lead">Designed to be calm and obvious — whether it is your first extraction or your five-hundredth.</p>
        </div>
        <div className="steps">
          <div className="step"><span className="n">01</span><div><h3>Open the page you want</h3><p>A profile, a group, Marketplace, a post, a hashtag. Aurora Extract recognises it and offers what can be collected — and opens the right tab (like a group’s Members) for you.</p></div></div>
          <div className="step"><span className="n">02</span><div><h3>Choose speed and size</h3><p>Pick how many items, and Gentle, Normal or Fast. Watch progress live and stop any time — what is collected is kept.</p></div></div>
          <div className="step"><span className="n">03</span><div><h3>Export</h3><p>Search and filter the results, then download CSV, Excel or JSON — or a ZIP of every photo and video.</p></div></div>
        </div>
      </div></section>

      <section className="block" id="install" style={{ paddingTop: 10 }}><div className="wrap">
        <h2 style={{ fontSize: 32, marginBottom: 18 }}>Install in about a minute</h2>
        <div className="dlsteps">
          <div className="step-card"><h3>Add it from the Chrome Web Store</h3><p className="muted" style={{ marginTop: 8 }}>Press <b>Add to Chrome</b> on the listing and confirm. Chrome keeps it up to date for you.</p><p style={{ marginTop: 12 }}><a className="btn primary" href={EXTRACT.store} target="_blank" rel="noopener noreferrer">Add to Chrome <span className="arrow">↗</span></a></p></div>
          <div className="step-card"><h3>Pin the sparkle icon</h3><p className="muted" style={{ marginTop: 8 }}>Click the puzzle icon in Chrome and pin <b>Aurora Extract</b> so it is always one click away.</p></div>
          <div className="step-card"><h3>Open a page &amp; go</h3><p className="muted" style={{ marginTop: 8 }}>Open Facebook, Instagram or TikTok, click the sparkle, and pick what to collect.</p></div>
        </div>
        <details className="faq" style={{ marginTop: 22 }}><summary style={{ cursor: 'pointer', fontWeight: 700 }}>Prefer to install it yourself? Use the zip</summary>
          <p className="muted" style={{ marginTop: 10 }}>Press <a href={EXTRACT.zip} download style={{ textDecoration: 'underline' }}>Download zip</a>, unzip it into a folder you will keep, open <code>chrome://extensions</code>, switch on <b>Developer mode</b>, press <b>Load unpacked</b> and pick the folder. To update, download the new zip, replace the folder’s files and press the reload icon.</p></details>
      </div></section>

      <section className="block" style={{ paddingTop: 10 }}><div className="wrap">
        <div className="closing" style={{ flexWrap: 'wrap', gap: 20 }}>
          <p><span className="star">✳</span><span>Found the right people? <b>Aurora Studios</b> can like, follow and comment for you — at a human pace, with a 3-day free trial.</span></p>
          <Link className="btn primary" href="/pricing">See the studios <span className="arrow">↗</span></Link>
        </div>
      </div></section>

      <section className="block" style={{ paddingTop: 10 }}><div className="wrap faqgrid">
        <div><span className="eyebrow">Good questions</span><h2>Before you<br />download.</h2>
          <p className="muted" style={{ marginTop: 14 }}>Bugs, feature requests or ideas? <a href={SUPPORT.telegram} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>Join our Telegram channel</a>.</p></div>
        <Faq items={FAQ_X} />
      </div></section>
    </main>
  );
}
