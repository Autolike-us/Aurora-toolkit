import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Privacy policy' };
export default function Page() {
  return (<main><article className="prose">
    <h1>Privacy policy</h1><p className="muted">Last updated: October 2026. Template text — have it reviewed by a lawyer before launch.</p>
    <h2>What we collect</h2><p>Your email address and password (stored hashed by our authentication provider), your license key, device identifiers of browsers that use your license, and subscription status. Payments are handled by Stripe and PayPal; we never see or store full card numbers.</p>
    <h2>What stays on your device</h2><p>Your tasks, targets, comments, history and settings stay in your browser’s local storage. The extensions do not send them to us and do not read or store your social-network passwords.</p>
    <h2>How we use it</h2><p>To run your account, verify your license, process payments, send essential service emails and prevent abuse. We do not sell your data.</p>
    <h2>Processors</h2><p>Supabase (database and authentication), Vercel (hosting), Stripe and PayPal (payments).</p>
    <h2>Your rights</h2><p>You can ask to access, correct or delete your data at any time by contacting support@your-domain.example.</p>
  </article></main>);
}
