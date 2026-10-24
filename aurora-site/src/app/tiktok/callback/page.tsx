import type { Metadata } from 'next';
import { CallbackView } from './CallbackView';

// The address of this page carries a one-time authorization code: keep it out of search engines and out of referrers.
export const metadata: Metadata = { title: 'TikTok authorization', robots: { index: false, follow: false, nocache: true }, referrer: 'no-referrer' };

export default function Page() {
  return (<main><section className="block"><div className="wrap" style={{ maxWidth: 680 }}>
    <span className="eyebrow">TikTok authorization</span>
    <h1 style={{ fontSize: 'clamp(28px,4vw,40px)', margin: '8px 0 12px' }}>Your authorization code</h1>
    <CallbackView />
  </div></section></main>);
}
