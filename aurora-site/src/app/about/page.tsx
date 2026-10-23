import type { Metadata } from 'next';
import Link from 'next/link';
import { SUPPORT } from '@/lib/support';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({ title: 'About', shareTitle: 'About Aurora Studios', description: 'Aurora Studios is a small independent software company in New York, USA, making browser extensions for Facebook, Instagram and TikTok.', path: '/about/' });

const ORG = { '@context': 'https://schema.org', '@type': 'Organization', name: 'Aurora Studios', url: 'https://getaurorastudios.com/', email: SUPPORT.email, address: { '@type': 'PostalAddress', addressRegion: 'NY', addressCountry: 'US' } };

export default function About() {
  return (<main><section className="block"><div className="wrap" style={{ maxWidth: 860 }}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG) }} />
    <span className="eyebrow">About</span>
    <h1 style={{ fontSize: 'clamp(32px,4.5vw,52px)', margin: '8px 0 14px' }}>About Aurora Studios</h1>
    <p className="lead">Aurora Studios is a small independent software company based in New York, USA. We make browser extensions that help people handle the repetitive parts of Facebook, Instagram and TikTok, while keeping them in control.</p>

    <h2 style={{ marginTop: 36 }}>What we make</h2>
    <ul style={{ lineHeight: 1.7, paddingLeft: 20 }}>
      <li><Link href="/reply" style={{ textDecoration: 'underline' }}><b>Aurora Reply</b></Link> — drafts replies to your comments in your own voice. You read, edit and press Send yourself.</li>
      <li><Link href="/extract" style={{ textDecoration: 'underline' }}><b>Aurora Extract</b></Link> — a free extension that collects public data you can already see and exports it to a spreadsheet, with a free profile health check.</li>
      <li><Link href="/pricing" style={{ textDecoration: 'underline' }}><b>The Aurora studios</b></Link> for Facebook, Instagram and TikTok — extensions that like, comment and follow at a steady pace, with a preview before anything is sent.</li>
    </ul>

    <h2 style={{ marginTop: 36 }}>How we work</h2>
    <ul style={{ lineHeight: 1.7, paddingLeft: 20 }}>
      <li><b>You stay in control.</b> Reply never sends anything for you, and the studios start in Preview.</li>
      <li><b>We keep data in your browser where we can.</b> Read exactly what is sent, and when, in the <Link href="/legal/privacy" style={{ textDecoration: 'underline' }}>privacy policy</Link>.</li>
      <li><b>We are honest about risk.</b> Facebook, Instagram and TikTok restrict automated activity, and no tool can guarantee growth or account safety. See the <Link href="/legal/disclaimer" style={{ textDecoration: 'underline' }}>platform disclaimer</Link>.</li>
      <li><b>We fix things quickly.</b> Platforms change their pages often, so we ship updates regularly and read every problem report.</li>
    </ul>

    <h2 style={{ marginTop: 36 }}>Contact</h2>
    <p>Email <a href={`mailto:${SUPPORT.email}`} style={{ textDecoration: 'underline' }}>{SUPPORT.email}</a>, or join our <a href={SUPPORT.telegram} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>Telegram channel</a> to report a bug or suggest a feature. More help is on the <Link href="/support" style={{ textDecoration: 'underline' }}>support page</Link>.</p>
    <p className="muted" style={{ fontSize: 14, marginTop: 14 }}>Aurora Studios · New York, USA. Aurora is independently developed and is not affiliated with, endorsed by, or sponsored by Meta, Facebook, Instagram, TikTok or Google.</p>
    <p className="muted" style={{ fontSize: 14 }}>Also see: <Link href="/legal/terms" style={{ textDecoration: 'underline' }}>Terms</Link> · <Link href="/legal/privacy" style={{ textDecoration: 'underline' }}>Privacy</Link> · <Link href="/legal/refunds" style={{ textDecoration: 'underline' }}>Refunds</Link></p>
  </div></section></main>);
}
