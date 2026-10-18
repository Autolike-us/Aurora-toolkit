import Link from 'next/link';
import { PRODUCTS } from '@/lib/products';
import { SUPPORT } from '@/lib/support';
import { Brand } from './Brand';
import { PlatformIcon } from './PlatformIcon';

export function Footer() {
  return (
    <footer className="site"><div className="wrap">
      <div className="cols">
        <div><Brand /><p className="muted" style={{ marginTop: 12, maxWidth: 280, fontSize: 14 }}>Tools for a more intentional social workflow.</p></div>
        <div><h4>The studios</h4>{PRODUCTS.map(p => <Link className="l footer-id" key={p.id} href={`/products/${p.slug}`}><PlatformIcon id={p.id} size="xs" />{p.short} Studio</Link>)}</div>
        <div><h4>Aurora</h4><Link className="l" href="/pricing">Pricing</Link><Link className="l" href="/reply">Aurora Reply (early access)</Link><Link className="l" href="/extract">Aurora Extract (free)</Link><Link className="l" href="/download">Download</Link><Link className="l" href="/account">My account</Link><Link className="l" href="/support">Support &amp; ideas</Link><a className="l" href={SUPPORT.telegram} target="_blank" rel="noopener noreferrer">Telegram: bugs &amp; ideas</a><a className="l" href={`mailto:${SUPPORT.email}`}>Contact support</a></div>
        <div><h4>Legal</h4><Link className="l" href="/legal/terms">Terms of service</Link><Link className="l" href="/legal/privacy">Privacy policy</Link><Link className="l" href="/legal/refunds">Refunds &amp; cancellation</Link><Link className="l" href="/legal/disclaimer">Platform disclaimer</Link></div>
      </div>
      <p className="legal">© {new Date().getFullYear()} Aurora Series. Aurora is independently developed and is not affiliated with, endorsed by, or sponsored by Meta, Facebook, Instagram, TikTok, Google, Stripe or PayPal. Product names and logos belong to their owners. Automating activity may be restricted by each platform’s rules; you are responsible for how you use Aurora.</p>
    </div></footer>
  );
}
