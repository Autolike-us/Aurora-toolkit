import type { Metadata } from 'next';
import Link from 'next/link';
import { SUPPORT } from '@/lib/support';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({
  title: 'OpenShorts — long videos into short clips',
  description: 'OpenShorts cuts long videos into short vertical clips and lets you publish them to your own TikTok account. Aurora Studios runs it for its own content.',
  path: '/openshorts/',
});

const FEATURES = [
  'Upload a long video (a podcast, interview, webinar or tutorial) and get a transcript with word-level timing.',
  'Finds strong moments in the transcript and suggests short clips for you to review.',
  'Cuts each clip into a vertical 9:16 shape, following the speaker where it can.',
  'Adds burned-in subtitles and optional hook text on the first seconds.',
  'You choose which clips to keep, then download them or publish them to your own TikTok account.',
];

export default function OpenShorts() {
  return (<main><section className="block"><div className="wrap" style={{ maxWidth: 860 }}>
    <span className="eyebrow">OpenShorts</span>
    <h1 style={{ fontSize: 'clamp(32px,4.5vw,52px)', margin: '8px 0 14px' }}>Long videos into short clips</h1>
    <p className="lead">OpenShorts is a clip generator. It cuts a long video into short vertical clips and, if you choose, publishes them to <b>your own</b> TikTok account. Aurora Studios uses it for its own videos.</p>

    <h2 style={{ marginTop: 34 }}>What it does</h2>
    <ul style={{ lineHeight: 1.7, paddingLeft: 20 }}>{FEATURES.map(f => <li key={f}>{f}</li>)}</ul>

    <h2 style={{ marginTop: 34 }}>Publishing to TikTok</h2>
    <ul style={{ lineHeight: 1.7, paddingLeft: 20 }}>
      <li><b>You sign in on TikTok, not here.</b> Access is granted through TikTok’s own authorization screen. We never see or store your TikTok password.</li>
      <li><b>What we ask for:</b> your basic TikTok profile information (display name and avatar), and permission to publish videos that you choose to post.</li>
      <li><b>You are in control.</b> Nothing is published unless you choose to publish it, and only to the account you authorized.</li>
      <li><b>You can stop at any time.</b> In TikTok, open <i>Settings and privacy → Security &amp; permissions → Apps and services</i> (the menu names can vary slightly by version), select the app and remove its access. Details are in our <Link href="/legal/privacy" style={{ textDecoration: 'underline' }}>Privacy policy</Link>.</li>
      <li><b>Your content, your responsibility.</b> Only upload videos you own or have the right to use, and follow TikTok’s Community Guidelines. See our <Link href="/legal/terms" style={{ textDecoration: 'underline' }}>Terms of service</Link>.</li>
    </ul>

    <h2 style={{ marginTop: 34 }}>Open source</h2>
    <p>OpenShorts is an open-source project released under the MIT licence. Aurora Studios is not affiliated with TikTok, and TikTok does not endorse this tool.</p>

    <h2 style={{ marginTop: 34 }}>Contact and policies</h2>
    <p>Questions or requests (including removing your data): <a href={`mailto:${SUPPORT.email}`} style={{ textDecoration: 'underline' }}>{SUPPORT.email}</a>.</p>
    <p className="muted" style={{ fontSize: 14 }}>
      <Link href="/legal/terms" style={{ textDecoration: 'underline' }}>Terms of service</Link> · <Link href="/legal/privacy" style={{ textDecoration: 'underline' }}>Privacy policy</Link> · <Link href="/about" style={{ textDecoration: 'underline' }}>About Aurora Studios</Link>
    </p>
  </div></section></main>);
}
