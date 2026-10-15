import type { Metadata } from 'next';
import Link from 'next/link';
import { PRODUCTS } from '@/lib/products';
import { env } from '@/lib/env';

export const metadata: Metadata = { title: 'Download & install' };

export default function Download() {
  return (
    <main><section className="block"><div className="wrap">
      <span className="eyebrow">Download</span>
      <h1 style={{ fontSize: 'clamp(34px,5vw,52px)', margin: '8px 0 12px' }}>Install Aurora in about a minute</h1>
      <p className="lead">Pick the way that suits you. Both give you the same extension. Sign in to your account first so we can unlock your downloads and show your license key.</p>

      <div className="products" style={{ marginTop: 34 }}>
        {PRODUCTS.map(p => { const store = env.chromeStoreUrl(p.id); return (
          <article key={p.id} className="pcard" style={{ ['--a' as string]: p.accent, ['--b' as string]: p.accent2 }}>
            <div className="top"><div className="badge" aria-hidden>{p.short[0]}</div><span className="meta">Chrome extension</span></div><h3>{p.short} Studio</h3>
            {store ? <a className="btn primary" href={store} target="_blank" rel="noreferrer">Add from Chrome Web Store</a> : <span className="note">Chrome Web Store listing: coming soon.</span>}
            <Link className="btn" href="/account">Private download (my account)</Link>
          </article>); })}
      </div>

      <h2 style={{ margin: '60px 0 18px', fontSize: 30 }}>Private download: step by step</h2>
      <div className="dlsteps">
        <div className="step-card"><h3>Download &amp; unzip</h3><p className="muted" style={{ marginTop: 8 }}>In <Link href="/account" style={{ textDecoration: 'underline' }}>My account</Link>, press “Download .zip” and unzip the file into a folder you will keep.</p></div>
        <div className="step-card"><h3>Load it in Chrome</h3><p className="muted" style={{ marginTop: 8 }}>Open <code>chrome://extensions</code>, switch on <b>Developer mode</b>, press <b>Load unpacked</b> and pick the unzipped folder.</p></div>
        <div className="step-card"><h3>Add your license</h3><p className="muted" style={{ marginTop: 8 }}>Click the Aurora icon, open the studio, and paste your license key into the <b>License</b> box. Your trial or plan unlocks immediately.</p></div>
      </div>
      <p className="note" style={{ marginTop: 22 }}>Updating? Download the new zip, replace the folder’s files, and press the reload icon on <code>chrome://extensions</code>.</p>
    </div></section></main>
  );
}
