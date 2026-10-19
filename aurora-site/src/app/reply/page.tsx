import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { REPLY, EXTRACT } from '@/lib/products';
import { SUPPORT } from '@/lib/support';
import { PlatformRow } from '@/components/PlatformIcon';
import { Faq } from '@/components/Faq';
import { ReplyPlans } from '@/components/ReplyPlans';

export const metadata: Metadata = {
  title: 'Aurora Reply — comment replies in your voice',
  description: 'Aurora Reply drafts replies to your Facebook, Instagram and TikTok comments in your own voice. Choose 1, 2 or 3 options, edit, and press Send yourself. Start free.',
  openGraph: { title: 'Aurora Reply — answer your comments in your own voice', description: 'AI reply drafts for Facebook, Instagram and TikTok comments. You stay in control: it never sends anything.', images: [{ url: '/reply-panel.png' }] },
};

const FAQ_R = [
  { q: 'Does it post replies for me?', a: 'No. It drafts the reply and places it in the comment’s reply box. You read it, change anything you like and press Send yourself.' },
  { q: 'How does it sound like me?', a: 'In the dashboard you paste a few of your own past replies, your business facts (hours, prices, delivery, links) and pick a tone. Every draft is written to match, and it only uses the facts you give it.' },
  { q: 'How do I get my key?', a: 'Create a free Aurora account and open My account: your Aurora Reply key is there. Install the extension, open its dashboard, go to Settings & key and paste it. Your 3-day trial starts the first time you use it.' },
  { q: 'What counts as a draft?', a: 'Each reply it writes counts as one. You choose 1, 2 or 3 replies per comment, so you can use fewer when you only need one. Quick replies are free.' },
  { q: 'What is sent to your server?', a: 'Only when you press “Draft a reply” or “Draft a comment”: the comment you chose (or, for a new comment, the text of the post), the post caption and your voice settings. They go to an AI service (Anthropic) to write the drafts. We keep only a count of drafts — not your comments or replies. Your history stays in your browser. Your voices are backed up to your key (you can turn that off), so you get them back if you reinstall.' },
  { q: 'Does it read private messages?', a: 'No. Aurora Reply is built for public comments only.' },
  { q: 'Which platforms and languages?', a: 'Facebook, Instagram and TikTok in Chrome and Chromium browsers on desktop. Comments are found in English, French, Spanish, Portuguese, German, Italian, Dutch, Japanese, Chinese, Korean, Arabic, Russian, Turkish and more.' },
  { q: 'What does it cost?', a: 'A free 3-day trial with every feature, then 10 free replies every month. Need more? Buy a reply pack (one-off, valid 12 months) or subscribe monthly — the subscription is much cheaper per reply. Prices are in the Plans section above.' },
  { q: 'Something does not work. What now?', a: 'Press “Report a problem” inside the panel: it opens our Telegram channel or an email and copies the technical details. Facebook, Instagram and TikTok change their pages often and these reports are how we keep up.' },
];

export default function ReplyPage() {
  return (
    <main>
      <section className="rhero"><div className="wrap rgrid">
        <div>
          <div className="rtitle"><Image src="/reply-icon.png" alt="" width={72} height={72} className="ricon" /><span className="rtag">New</span></div>
          <span className="eyebrow">AI comment replies · 3-day free trial</span>
          <h1>Aurora <em>Reply</em></h1>
          <p className="lead">{REPLY.tagline}</p>
          <div className="cta">
            <Link className="btn primary lg" href="/signup/?next=reply">Start my free trial <span className="arrow">↗</span></Link>
            <a className="btn lg" href="#plans">See plans</a>
            <a className="demo" href="#how"><span className="play">▶</span>How it works</a>
          </div>
          <p className="fine">Chrome and Chromium browsers on desktop · It never sends anything — you press Send<br />Free account · No card for the trial · Then 10 free replies a month</p>
          <div className="platforms"><PlatformRow size="md" /></div>
        </div>
        <figure className="rshot"><Image src="/reply-panel.png" alt="The Aurora Reply panel on a post: the comment, and three editable reply options in the owner’s voice" width={1280} height={800} priority /></figure>
      </div></section>

      <section className="block" id="how"><div className="wrap">
        <div className="section-head"><div><span className="eyebrow">How it works</span><h2>Three clicks from comment<br />to <em>a reply you’d write.</em></h2></div>
          <p className="side">Built for people with more comments than time.</p></div>
        <div className="rsteps">{REPLY.steps.map(s => <div key={s.n} className="rstep"><span className="n">{s.n}</span><h3>{s.title}</h3><p>{s.text}</p></div>)}</div>
      </div></section>

      <section className="block" style={{ paddingTop: 0 }}><div className="wrap">
        <div className="section-head"><div><span className="eyebrow">What you get</span><h2>More than a <em>reply button.</em></h2></div></div>
        <div className="rfeat">{REPLY.features.map(f => <div key={f.title} className="rf"><span className="ic">{f.icon}</span><b>{f.title}</b><p>{f.text}</p></div>)}</div>
      </div></section>

      <section className="block" style={{ paddingTop: 0 }}><div className="wrap">
        <div className="rdash">
          <figure><Image src="/reply-dashboard.png" alt="The Aurora Reply dashboard: usage, stats, activity chart and recent replies" width={1280} height={800} /><figcaption>Your dashboard — usage, time saved and activity.</figcaption></figure>
          <figure><Image src="/reply-history.png" alt="The history of generated replies, searchable and exportable" width={1280} height={800} /><figcaption>Your history — searchable, exportable, private to your browser.</figcaption></figure>
        </div>
      </div></section>

      <section className="block" id="plans" style={{ paddingTop: 0 }}><div className="wrap">
        <div className="section-head"><div><span className="eyebrow">Pricing</span><h2>Start free. Pay only if <em>you need more.</em></h2></div>
          <p className="side">Get your key by creating a free account. Use it in the extension on desktop.</p></div>
        <ReplyPlans />
      </div></section>

      <section className="block" style={{ paddingTop: 0 }}><div className="wrap">
        <div className="rcallout"><div><span className="eyebrow" style={{ color: '#fbbf24' }}>Private by design</span><h2>You stay in control.</h2></div>
          <ul><li>It only reads a comment or a post when you press <b>Draft a reply</b> or <b>Draft a comment</b>.</li><li>It never presses Send, never reads private messages and never asks for your password.</li><li>Your history stays in your browser. Your voices and quick replies are backed up to your key so a reinstall can restore them — you can turn that off. Otherwise our server keeps only a count of drafts.</li></ul>
          <p>Read the <Link href="/legal/privacy">privacy policy</Link>.</p></div>
      </div></section>

      <section className="block" style={{ paddingTop: 0 }}><div className="wrap">
        <div className="section-head"><div><span className="eyebrow">The Aurora family</span><h2>Grow, collect, <em>and reply.</em></h2></div>
          <p className="side">Aurora Reply works great alongside our other tools.</p></div>
        <div className="rfam">
          <Link className="rf" href="/extract"><span className="ic">📥</span><b>Aurora Extract <span className="freetag">Free</span></b><p>{EXTRACT.tagline}</p></Link>
          <Link className="rf" href="/pricing"><span className="ic">✳</span><b>The three Aurora studios</b><p>Facebook, Instagram and TikTok: like, comment, follow and more, at a human pace. 3-day free trial.</p></Link>
        </div>
      </div></section>

      <section className="block" style={{ paddingTop: 0 }}><div className="wrap faqgrid">
        <div><span className="eyebrow">Good questions</span><h2>Before you<br />join.</h2>
          <p className="muted" style={{ marginTop: 14 }}>Bugs, ideas or questions? <a href={SUPPORT.telegram} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>Join our Telegram channel</a> or email <a href={`mailto:${SUPPORT.email}`} style={{ textDecoration: 'underline' }}>{SUPPORT.email}</a>.</p></div>
        <Faq items={FAQ_R} />
      </div></section>
    </main>
  );
}
