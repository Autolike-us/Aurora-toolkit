import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { COMMON_FEATURES, PRODUCTS, getProduct } from '@/lib/products';
import { StudioMock } from '@/components/StudioMock';
import { TRIAL_DAYS } from '@/lib/pricing';

export const generateStaticParams = () => PRODUCTS.map(p => ({ slug: p.slug }));
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = getProduct((await params).slug);
  return p ? { title: p.name, description: p.tagline } : {};
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = getProduct((await params).slug);
  if (!p) notFound();
  return (
    <main style={{ ['--a' as string]: p.accent, ['--b' as string]: p.accent2 }}>
      <section className="hero"><div className="wrap grid">
        <div>
          <span className="pill" style={{ color: p.accent }}>✦ {p.name}</span>
          <h1 style={{ fontSize: 'clamp(34px,5vw,56px)' }}>{p.tagline}</h1>
          <div className="cta">
            <Link className="btn primary lg" href="/signup">Try it free for {TRIAL_DAYS} days</Link>
            <Link className="btn lg" href="/pricing">Pricing</Link>
          </div>
          <p className="fine">Works on {p.site} in Chrome, Edge and Brave · $10/month after the trial</p>
        </div>
        <StudioMock />
      </div></section>

      <section className="block"><div className="wrap">
        <h2>What {p.short} can do</h2>
        <div className="features">
          {p.actions.map(a => <div className="feature" key={a}><h3>{a}</h3></div>)}
        </div>
        <ul style={{ marginTop: 30, display: 'grid', gap: 10, paddingLeft: 20 }}>{p.highlights.map(h => <li key={h}>{h}</li>)}</ul>
      </div></section>

      <section className="block"><div className="wrap">
        <h2>Included with every Aurora extension</h2>
        <div className="features">{COMMON_FEATURES.map(f => <div className="feature" key={f.title}><div className="ic">{f.icon}</div><h3>{f.title}</h3><p>{f.text}</p></div>)}</div>
      </div></section>

      <section><div className="wrap"><div className="cta-band"><h2>Start with a free preview.</h2><p style={{ marginTop: 10, opacity: .92 }}>Everything is shown, nothing is sent, until you say so.</p><Link className="btn lg" href="/signup">Start free trial</Link></div></div></section>
    </main>
  );
}
