export const FAQ: { q: string; a: string }[] = [
  { q: 'How does the free trial work?', a: 'Create an account with your email — no card needed. You get 3 full days with all three extensions. When it ends, subscribe to keep going; nothing is charged automatically.' },
  { q: 'How much does it cost?', a: 'Launch offer: all 3 extensions for $10/month for the first 3 months after launch, and that price stays locked for as long as you stay subscribed. After the offer, each extension is $10/month, or $20/month for all three.' },
  { q: 'What happens to my launch price later?', a: 'If you subscribe during the launch window you keep the $10 all-3 price for as long as your subscription stays active. If you cancel and come back after the offer, the regular price applies.' },
  { q: 'Which payment methods can I use?', a: 'Credit and debit cards through Stripe, or PayPal. You can cancel any time; access continues until the end of the period you paid for.' },
  { q: 'Is it safe for my accounts?', a: 'Aurora paces actions like a person, previews before it sends anything, and stops on warnings or captchas. But no tool can promise your accounts will never be limited: Facebook, Instagram and TikTok restrict automated activity, so use sensible limits and read our platform disclaimer.' },
  { q: 'Does Aurora need my password?', a: 'No. It runs inside your own browser, in the tab where you are already signed in. It never asks for or stores your social-network password.' },
  { q: 'Which browsers are supported?', a: 'Google Chrome and Chromium browsers (Edge, Brave) on desktop. Download from the Chrome Web Store where available, or install the private download in a minute.' },
  { q: 'Can I use it on more than one computer?', a: 'One license works on up to 3 browsers, so you can use it on your laptop and desktop.' },
];

export function Faq({ items = FAQ }: { items?: { q: string; a: string }[] }) {
  return <div className="faq">{items.map(i => <details key={i.q}><summary>{i.q}</summary><p>{i.a}</p></details>)}</div>;
}
