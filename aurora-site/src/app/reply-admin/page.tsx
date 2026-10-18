import type { Metadata } from 'next';
import { CostReport } from './CostReport';

export const metadata: Metadata = { title: 'Reply costs', robots: { index: false, follow: false } };

export default function Page() {
  return (<main><section className="block"><div className="wrap">
    <span className="eyebrow">Owner only</span>
    <h1 style={{ fontSize: 'clamp(30px,4vw,44px)', margin: '8px 0 12px' }}>Aurora Reply — what it costs</h1>
    <p className="lead">Paste your admin key (a line marked <code>"admin": true</code> in <code>aurora-master-keys.json</code>) to see real token use and the cost of one reply. Nothing is stored in this page.</p>
    <CostReport />
  </div></section></main>);
}
