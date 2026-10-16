export const FAQ: { q: string; a: string }[] = [
  { q: 'How does the free trial work?', a: 'Create an account with your email — no card needed. You get 3 full days with all three studios. When it ends, subscribe to keep going; nothing is charged automatically.' },
  { q: 'How much does it cost?', a: 'Launch offer: all 3 studios for $10/month for everyone who subscribes in the first 3 months after launch, and that price stays locked for as long as you stay subscribed. After the offer, each studio is $10/month, or $20/month for all three.' },
  { q: 'What happens to my launch price later?', a: 'If you subscribe during the launch window you keep the $10 all-3 price for as long as your subscription stays active. If you cancel and come back after the offer, the regular price applies.' },
  { q: 'Which payment methods can I use?', a: 'You pay through PayPal (PayPal balance, or a debit or credit card where PayPal offers it), and card payments through Stripe are being added. We never see or store your card details. You can cancel any time; access continues until the end of the period you paid for.' },
  { q: 'Will Aurora guarantee growth, or keep my accounts safe?', a: 'No tool can promise either. Aurora paces actions like a person, previews before it sends anything and stops on warnings or captchas — but Facebook, Instagram and TikTok restrict automated activity, so use sensible limits and read our platform disclaimer.' },
  { q: 'Does Aurora need my social passwords?', a: 'No. It runs inside your own browser, in the tab where you are already signed in. It never asks for or stores your social-network passwords, and your tasks and history stay in your browser.' },
  { q: 'Which browsers are supported?', a: 'Google Chrome and Chromium browsers (Edge, Brave) on desktop. Install from the Chrome Web Store where available, or use the private download in about a minute.' },
  { q: 'Can I use it on more than one computer?', a: 'One license works on up to 3 browsers, so you can use it on your laptop and desktop.' },
];

export function Faq({ items = FAQ }: { items?: { q: string; a: string }[] }) {
  return <div className="faq">{items.map(i => <details key={i.q}><summary>{i.q}</summary><p>{i.a}</p></details>)}</div>;
}
