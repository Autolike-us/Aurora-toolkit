import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Privacy policy' };
export default function Page() {
  return (<main><article className="prose">
    <h1>Privacy policy</h1><p className="muted">Last updated: October 2026. Template text — have it reviewed by a lawyer before launch.</p>
    <h2>What we collect</h2><p>Your email address and password (stored hashed by our authentication provider), your license key, device identifiers of browsers that use your license, and subscription status. Payments are handled by Stripe and PayPal; we never see or store full card numbers.</p>
    <h2>What stays on your device</h2><p>Your tasks, targets, comments, history and settings stay in your browser’s local storage. The extensions do not send them to us and do not read or store your social-network passwords.</p>
    <h2>How we use it</h2><p>To run your account, verify your license, process payments, send essential service emails and prevent abuse. We do not sell your data.</p>
    <h2>Processors</h2><p>HostGator (website hosting and our database), Titan (email delivery for account and license emails), Stripe and PayPal (payments).</p>
    <h2>Aurora Extract (free extension)</h2><p>Aurora Extract has no account and no server. The data it collects, your results and your settings stay in your browser’s local storage and are exported only when you choose to. We do not receive your account details, cookies, messages or the data you extract. It only reads pages your own logged-in session can already open. Its Health check (Aurora Audit) is calculated on your computer from the page you have open; nothing is uploaded and no AI service is used. You are the controller of any personal data you collect with it (for example public names, emails or phone numbers) and are responsible for handling it lawfully.</p>
    <h2>Support channels</h2><p>If you email us or post in our Telegram channel “Aurora Studios Report”, we receive what you send. Telegram’s own privacy policy applies to the channel. Please do not post passwords, license keys or payment details, and keep debug reports free of personal data (they contain none by design).</p>
    <h2>Your rights</h2><p>You can ask to access, correct or delete your data at any time by contacting support@getaurorastudios.com.</p>
  </article></main>);
}
