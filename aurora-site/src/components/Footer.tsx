import Link from 'next/link';
import { PRODUCTS } from '@/lib/products';

export function Footer() {
  return (
    <footer className="site"><div className="wrap">
      <div className="cols">
        <div><Link href="/" className="logo">✦ <span>Aurora</span></Link><p className="muted" style={{ marginTop: 10, maxWidth: 280 }}>Thoughtful growth tools for the platforms you already use.</p></div>
        <div><h4>Extensions</h4>{PRODUCTS.map(p => <Link key={p.id} href={`/products/${p.slug}`}>{p.name}</Link>)}</div>
        <div><h4>Company</h4><Link href="/pricing">Pricing</Link><Link href="/download">Download</Link><Link href="/account">My account</Link></div>
        <div><h4>Legal</h4><Link href="/legal/terms">Terms of service</Link><Link href="/legal/privacy">Privacy policy</Link><Link href="/legal/refunds">Refunds &amp; cancellation</Link><Link href="/legal/disclaimer">Platform disclaimer</Link></div>
      </div>
      <p className="legal">Aurora is an independent product and is not affiliated with, endorsed by, or sponsored by Meta Platforms, Facebook, Instagram or TikTok. All product names and logos are trademarks of their respective owners. Automating activity may be restricted by each platform’s rules; you are responsible for how you use Aurora. © {new Date().getFullYear()} Aurora.</p>
    </div></footer>
  );
}
