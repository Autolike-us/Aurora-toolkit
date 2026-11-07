import type { Metadata } from 'next';
import { AdminDashboard } from './AdminDashboard';

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };

export default function Page() {
  return (<main><section className="block"><div className="wrap" style={{ maxWidth: 1100 }}>
    <span className="eyebrow">Admin</span>
    <h1 style={{ fontSize: 'clamp(28px,4vw,42px)', margin: '8px 0 12px' }}>Aurora admin</h1>
    <AdminDashboard />
  </div></section></main>);
}
