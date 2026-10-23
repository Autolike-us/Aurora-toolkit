import Link from 'next/link';
import { PRODUCTS } from '@/lib/products';
import { PlatformIcon } from './PlatformIcon';

const CLS: Record<string, string> = { facebook: 'fb', instagram: 'ig', tiktok: 'tk' };

export function ProductCards() {
  return (
    <div className="products" id="studios">
      {PRODUCTS.map(p => (
        <article key={p.id} className={'pcard ' + CLS[p.id]} style={{ ['--a' as string]: p.accent, ['--b' as string]: p.accent2 }}>
          <div className="top"><PlatformIcon id={p.id} size="lg" /><span className="meta">Chrome extension</span></div>
          <h3>{p.short}<br />Studio</h3>
          <p className="tag">{p.tagline}</p>
          <ul>{p.highlights.map(h => <li key={h}>{h}</li>)}</ul>
          <Link className="more" href={`/products/${p.slug}`}><span>Explore {p.short} Studio</span><span>→</span></Link>
        </article>
      ))}
    </div>
  );
}
