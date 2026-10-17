import type { Metadata } from 'next';
import Link from 'next/link';
import { EXTRACT } from '@/lib/products';
import { SUPPORT } from '@/lib/support';
import { ExtractIcon } from '@/components/ExtractIcon';
import { PlatformIcon } from '@/components/PlatformIcon';
import { Faq } from '@/components/Faq';

export const metadata: Metadata = {
  title: 'Aurora Extract — free data extractor',
  description: 'Free Chrome extension: collect public data from Facebook, Instagram and TikTok — profiles, groups, Marketplace, posts, comments, followers — and download photos and videos. Export to CSV, Excel and JSON.',
};

const FAQ_X = [
  { q: 'Is Aurora Extract really free?', a: 'Yes. No account, no card, no trial timer, no limits on how many times you use it. It is our free companion to the paid Aurora studios.' },
  { q: 'Does it send my data anywhere?', a: 'No. There is no server. Everything you collect is stored in your own browser and exported by you. We never see your account, your cookies or your results.' },
  { q: 'What data can it collect?', a: 'Only what your own logged-in account can already see: public profiles and pages, groups you belong to, Marketplace listings, posts, comments and the follower, following and friends lists that the platform shows you. Public business emails and phone numbers are collected only when they are shown publicly (bio, About section, listing text, business contact buttons).' },
  { q: 'Will it get my account in trouble?', a: 'Platforms restrict automated activity. Aurora Extract reads pages at a human pace (Gentle, Normal or Fast — Gentle is the kindest) and stops on warnings, but no tool can promise your account will never be limited. Read our platform disclaimer and use it responsibly.' },
  { q: 'How do I install it?', a: 'Download the zip, unzip it into a folder you keep, open chrome://extensions, switch on Developer mode, press Load unpacked and pick the folder. It takes about a minute. A Chrome Web Store listing is planned.' },
  { q: 'Something did not extract correctly. What now?', a: 'Press “Copy debug report” inside the extension and post it in our Telegram channel (or email it). Facebook, Instagram and TikTok change their pages often and these reports are how we keep up.' },
];

export default function ExtractPage() {
  return (
    <main>
      <section className="xhero"><div className="wrap">
        <div className="xtitle"><ExtractIcon size={72} /><span className="freetag big">Free</span></div>
        <span className="eyebrow">New · Free for everyone</span>
        <h1>Aurora <em>Extract</em></h1>
        <p className="lead">{EXTRACT.tagline} One extension, three platforms — pick one, open a page, press start.</p>
        <div className="cta">
          <a className="btn primary lg" href={EXTRACT.zip} download>Download free · v{EXTRACT.version} <span className="arrow">↓</span></a>
          <a className="demo" href="#install"><span className="play">▶</span>How to install</a>
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
          <div className="step-card"><h3>Download &amp; unzip</h3><p className="muted" style={{ marginTop: 8 }}>Press <b>Download free</b> and unzip the file into a folder you will keep.</p></div>
          <div className="step-card"><h3>Load it in Chrome</h3><p className="muted" style={{ marginTop: 8 }}>Open <code>chrome://extensions</code>, switch on <b>Developer mode</b>, press <b>Load unpacked</b> and pick the folder.</p></div>
          <div className="step-card"><h3>Pin &amp; go</h3><p className="muted" style={{ marginTop: 8 }}>Pin the sparkle icon, open Facebook, Instagram or TikTok, and click it.</p></div>
        </div>
        <p className="note" style={{ marginTop: 22 }}>Updating? Download the new zip, replace the folder’s files and press the reload icon on <code>chrome://extensions</code>.</p>
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
