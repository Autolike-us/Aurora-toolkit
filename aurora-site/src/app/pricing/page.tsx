export const revalidate = 3600; // the launch-offer banner depends on the date
import type { Metadata } from 'next';
import { Faq, FAQ } from '@/components/Faq';
import { PricingPlans } from '@/components/PricingPlans';
import { PRODUCTS } from '@/lib/products';
import { PlatformIcon } from '@/components/PlatformIcon';

export const metadata: Metadata = { title: 'Pricing', description: 'Aurora pricing: launch offer of $10/month for all 3 extensions, then $10 per extension or $20 for all three. 3-day free trial.' };

const ROWS: [string, boolean, boolean, boolean][] = [
  ['Like / react', true, true, true], ['Comment', true, true, true], ['Follow / unfollow', true, true, true],
  ['Share posts', true, false, false], ['Friend requests', true, false, false], ['Join groups', true, false, false],
  ['Profile walk (open post → act → Next)', false, true, false], ['Followers / hashtag / location sources', false, true, true],
];

export default function Pricing() {
  return (
    <main><section className="block"><div className="wrap">
      <div className="center" style={{ marginBottom: 44 }}>
        <span className="eyebrow">Pricing</span>
        <h1 style={{ fontSize: 'clamp(36px,5vw,60px)' }}>Start free. Stay for <em>$10/month.</em></h1>
        <p className="lead" style={{ marginTop: 16 }}>3 days free with every studio, no card. Then one simple subscription.</p>
      </div>
      <PricingPlans />
      <p className="note center" style={{ marginTop: 26 }}>Looking for data instead of automation? <a href="/extract" style={{ textDecoration: 'underline' }}>Aurora Extract</a> — the free extractor for Facebook, Instagram and TikTok — costs nothing.</p>
      <h2 style={{ margin: '80px 0 6px', fontSize: 32 }}>What each studio can do</h2>
      <table className="compare">
        <thead><tr><th>Action</th>{PRODUCTS.map(p => <th key={p.id}><span className="inline-id"><PlatformIcon id={p.id} size="xs" />{p.short}</span></th>)}</tr></thead>
        <tbody>{ROWS.map(r => <tr key={r[0]}><td>{r[0]}</td>{r.slice(1).map((v, i) => <td key={i} className={v ? 'y' : 'n'}>{v ? '✓' : '—'}</td>)}</tr>)}</tbody>
      </table>
      <div className="faqgrid" style={{ marginTop: 90 }}><div><span className="eyebrow">Good questions</span><h2>Pricing, answered.</h2></div><Faq items={FAQ.slice(0, 4)} /></div>
    </div></section></main>
  );
}
