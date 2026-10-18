import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Platform disclaimer' };
export default function Page() {
  return (<main><article className="prose">
    <h1>Platform disclaimer</h1><p className="muted">Last updated: October 2026. Template text — have it reviewed by a lawyer before launch.</p>
    <h2>Independent product</h2><p>Aurora is not affiliated with, endorsed by or sponsored by Meta Platforms, Facebook, Instagram or TikTok. Names and logos belong to their owners.</p>
    <h2>Automation can be restricted</h2><p>Facebook, Instagram and TikTok limit automated activity in their terms and may restrict or suspend accounts that use it. Aurora paces actions, previews before it sends anything and pauses on warnings, but it cannot prevent a platform from acting on your account.</p>
    <h2>Data extraction</h2><p>Aurora Extract reads pages shown to your own logged-in account and can request the same data the platform’s own pages request. Platforms may limit or suspend accounts that collect data in bulk, and their terms may restrict it. Collected personal data (names, emails, phone numbers) is subject to privacy and marketing laws — use it lawfully and only for relevant, honest outreach, and honour opt-outs.</p>
    <h2>Use it sensibly</h2><p>Use modest limits, long delays and genuine content. Do not use Aurora on accounts you cannot afford to lose, and never for spam or harassment.</p>
  </article></main>);
}
