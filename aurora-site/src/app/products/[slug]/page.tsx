import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { COMMON_FEATURES, PRODUCTS, getProduct } from '@/lib/products';
import { PlatformIcon } from '@/components/PlatformIcon';
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
          <span className="eyebrow inline-id" style={{ color: p.accent }}><PlatformIcon id={p.id} size="md" />{p.short} Studio</span>
          <h1 style={{ fontSize: 'clamp(34px,4.6vw,58px)' }}>{p.tagline}</h1>
          <div className="cta" style={{ marginTop: 28 }}>
            <Link className="btn primary lg" href="/signup">Try it free for {TRIAL_DAYS} days <span className="arrow">↗</span></Link>
            <Link className="demo" href="/pricing"><span className="play">$</span>See pricing</Link>
          </div>
          <p className="fine">Works on {p.site} in Chrome, Edge and Brave · $10/month after the trial</p>
        </div>
        <StudioMock />
      </div></section>

      <section className="block"><div className="wrap">
        <span className="eyebrow">What it does</span><h2>What {p.short} Studio can do</h2>
        <div className="features">
          {p.actions.map(a => <div className="feature" key={a}><h3>{a}</h3></div>)}
        </div>
        <ul style={{ marginTop: 30, display: 'grid', gap: 10, paddingLeft: 20 }}>{p.highlights.map(h => <li key={h}>{h}</li>)}</ul>
      </div></section>

      <section className="block"><div className="wrap">
        <span className="eyebrow">Inside the studio</span><h2>A quick popup, and a full dashboard</h2>
        <p className="sdash-lead">Click the toolbar icon for a small status card: what is running, Pause and Stop, today&rsquo;s count and your license. Open the dashboard for new tasks, saved setups, history and the debug log.</p>
        <div className="sdash">
          <figure><Image src={`/studios/${p.id}-dashboard.png`} alt={`The Aurora ${p.short} Studio dashboard after a preview: nothing was sent, with the task form and live session`} width={1280} height={800} /><figcaption>The dashboard: every preview ends with &ldquo;nothing was sent&rdquo;.</figcaption></figure>
          <figure><Image src={`/studios/${p.id}-popup.png`} alt={`The Aurora ${p.short} Studio toolbar popup: a preview in progress with Pause and Stop`} width={360} height={480} /><figcaption>The popup: a glance, plus Pause and Stop.</figcaption></figure>
        </div>
      </div></section>

      <section className="block"><div className="wrap">
        <span className="eyebrow">In every studio</span><h2>Included with every Aurora extension</h2>
        <div className="features">{COMMON_FEATURES.map(f => <div className="feature" key={f.title}><div className="ic">{f.icon}</div><h3>{f.title}</h3><p>{f.text}</p></div>)}</div>
      </div></section>

      <section><div className="wrap"><div className="closing"><p><span className="star">✳</span>Start with a free preview. Nothing is sent until you say so.</p><Link className="btn primary" href="/signup">Start free trial <span className="arrow">↗</span></Link></div></div></section>
    </main>
  );
}
