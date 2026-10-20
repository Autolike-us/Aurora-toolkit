import type { Metadata } from 'next';
import { OwnerDashboard } from './OwnerDashboard';

export const metadata: Metadata = { title: 'Owner dashboard', robots: { index: false, follow: false } };

export default function Page() {
  return (<main><section className="block"><div className="wrap">
    <span className="eyebrow">Owner only</span>
    <h1 style={{ fontSize: 'clamp(30px,4vw,44px)', margin: '8px 0 12px' }}>Aurora — how the business is doing</h1>
    <p className="lead">Paste your admin key to see sign-ups, trials, subscriptions, Reply sales and costs. Nothing is stored in this page.</p>
    <OwnerDashboard />
  </div></section></main>);
}
