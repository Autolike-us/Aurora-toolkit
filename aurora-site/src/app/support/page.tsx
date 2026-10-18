import type { Metadata } from 'next';
import { SUPPORT } from '@/lib/support';

export const metadata: Metadata = { title: 'Support & ideas', description: 'Report a bug, request a feature or share an idea for any Aurora extension or the website — on Telegram or by email.' };

export default function Support() {
  return (
    <main><section className="block"><div className="wrap">
      <span className="eyebrow">Support &amp; ideas</span>
      <h1 style={{ fontSize: 'clamp(34px,5vw,52px)', margin: '8px 0 12px' }}>Tell us what’s <em>not working</em> — or what you’d love next.</h1>
      <p className="lead">One place for all three Aurora studios, the free Aurora Extract and this website: report bugs, request features and share ideas with us and with other users.</p>

      <div className="supportgrid">
        <article className="tgcard">
          <span className="eyebrow">Fastest way</span>
          <h2>Join the Telegram channel</h2>
          <p className="muted">“{SUPPORT.telegramName}” — post a bug report, ask for a feature, vote with a 👍 on ideas, and see what we are fixing.</p>
          <a className="btn primary lg" href={SUPPORT.telegram} target="_blank" rel="noopener noreferrer">Open Telegram <span className="arrow">↗</span></a>
        </article>
        <article className="tgcard alt">
          <span className="eyebrow">Prefer email?</span>
          <h2>{SUPPORT.email}</h2>
          <p className="muted">Billing, licenses and anything private. Include the email you signed up with. Never send passwords.</p>
          <a className="btn lg" href={`mailto:${SUPPORT.email}`}>Write to support</a>
        </article>
      </div>

      <h2 style={{ margin: '56px 0 18px', fontSize: 30 }}>How to report a bug so we can fix it fast</h2>
      <div className="dlsteps">
        <div className="step-card"><h3>1 · Copy the debug report</h3><p className="muted" style={{ marginTop: 8 }}>In any Aurora extension press <b>Copy debug report</b> (or <b>Report an issue</b>). It lists the version, what ran and what went wrong — no passwords, cookies or personal data.</p></div>
        <div className="step-card"><h3>2 · Say what you expected</h3><p className="muted" style={{ marginTop: 8 }}>One sentence: “I opened a group and chose Group members but only 3 came back.” A screenshot helps.</p></div>
        <div className="step-card"><h3>3 · Post it</h3><p className="muted" style={{ marginTop: 8 }}>Paste both in our Telegram channel, or email them. Platforms change their pages often — reports are how we keep up.</p></div>
      </div>

      <h2 style={{ margin: '56px 0 14px', fontSize: 30 }}>Feature requests &amp; ideas</h2>
      <p className="muted" style={{ maxWidth: 760 }}>New data types, new actions, a platform you want covered, a better layout — post it in the channel. The most requested ideas go to the top of the list, and shipped ideas are announced there first.</p>
      <p className="note" style={{ marginTop: 22 }}>Please never share your social-network passwords, license keys or payment details in public chats.</p>
    </div></section></main>
  );
}
