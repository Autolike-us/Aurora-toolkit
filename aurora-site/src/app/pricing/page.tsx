export const revalidate = 3600; // the launch-offer banner depends on the date
import type { Metadata } from 'next';
import { Faq, FAQ } from '@/components/Faq';
import { PricingPlans } from '@/components/PricingPlans';
import { PRODUCTS } from '@/lib/products';

export const metadata: Metadata = { title: 'Pricing', description: 'Aurora pricing: launch offer of $10/month for all 3 extensions, then $10 per extension or $20 for all three. 3-day free trial.' };

const ROWS: [string, boolean, boolean, boolean][] = [
  ['Like / react', true, true, true], ['Comment', true, true, true], ['Follow / unfollow', true, true, true],
  ['Share posts', true, false, false], ['Friend requests', true, false, false], ['Join groups', true, false, false],
  ['Profile walk (open post → act → Next)', false, true, false], ['Followers / hashtag / location sources', false, true, true],
];

export default function Pricing() {
  return (
    <main><section className="block"><div className="wrap center">
      <span className="eyebrow">Pricing</span>
      <h1 style={{ margin: '10px 0 14px', fontSize: 'clamp(34px,5vw,56px)' }}>Start free. Stay for <span className="grad-text">$10/month.</span></h1>
      <p className="lead" style={{ marginBottom: 36 }}>3 days free with every extension, no card. Then one simple subscription.</p>
      <PricingPlans />
      <h2 style={{ margin: '70px 0 6px', fontSize: 30 }}>What each extension can do</h2>
      <table className="compare">
        <thead><tr><th>Action</th>{PRODUCTS.map(p => <th key={p.id}>{p.short}</th>)}</tr></thead>
        <tbody>{ROWS.map(r => <tr key={r[0]}><td>{r[0]}</td>{r.slice(1).map((v, i) => <td key={i} className={v ? 'y' : 'n'}>{v ? '✓' : '—'}</td>)}</tr>)}</tbody>
      </table>
      <h2 style={{ margin: '70px 0 0', fontSize: 30 }}>Pricing questions</h2>
      <Faq items={FAQ.slice(0, 4)} />
    </div></section></main>
  );
}
