import Link from 'next/link';
import { PRODUCTS } from '@/lib/products';

export function ProductCards() {
  return (
    <div className="products" id="products">
      {PRODUCTS.map(p => (
        <article key={p.id} className="pcard" style={{ ['--a' as string]: p.accent, ['--b' as string]: p.accent2 }}>
          <div className="badge" aria-hidden>{p.short[0]}</div>
          <div><h3>{p.name}</h3><p className="muted" style={{ marginTop: 6 }}>{p.tagline}</p></div>
          <div className="tags">{p.actions.map(a => <span key={a}>{a}</span>)}</div>
          <ul>{p.highlights.map(h => <li key={h}>{h}</li>)}</ul>
          <Link className="more" href={`/products/${p.slug}`}>See what it does →</Link>
        </article>
      ))}
    </div>
  );
}
