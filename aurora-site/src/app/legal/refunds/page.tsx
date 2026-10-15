import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Refunds & cancellation' };
export default function Page() {
  return (<main><article className="prose">
    <h1>Refunds & cancellation</h1><p className="muted">Last updated: October 2026. Template text — have it reviewed by a lawyer before launch.</p>
    <h2>Free trial</h2><p>Try everything free for 3 days, no card needed, before you decide to pay.</p>
    <h2>Cancel any time</h2><p>Cancel from your account page (card payments through the billing portal, PayPal from your account). Access continues until the end of the period you have paid for; we do not charge again after cancelling.</p>
    <h2>Refunds</h2><p>Because you can test everything for free first, payments are generally non-refundable. If something went wrong with a charge, contact support@your-domain.example within 7 days and we will make it right.</p>
  </article></main>);
}
