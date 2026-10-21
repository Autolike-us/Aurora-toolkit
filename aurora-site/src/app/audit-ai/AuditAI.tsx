'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, getToken } from '@/lib/client';

interface Result { platform: string; bios: { text: string }[]; fixes: { title: string; detail: string; priority: 'high' | 'medium' | 'low' }[]; captions: { text: string }[]; note: string; cost: number }
interface Usage { used: number; limit: number; packs: number; dayLeft?: number }
const TONES: [string, string][] = [['friendly', 'Friendly'], ['professional', 'Professional'], ['playful', 'Playful'], ['direct', 'Direct']];
const COST = 3;
const PRIO: Record<string, string> = { high: '#ef4444', medium: '#f59e0b', low: '#7c3aed' };

/** Replies you can still use right now: the plan's own allowance (and today's trial cap) plus packs. */
function left(u: Usage | undefined): number | null {
  if (!u) return null;
  let a = Math.max(0, u.limit - u.used);
  if (u.dayLeft !== undefined) a = Math.min(a, u.dayLeft);
  return a + (u.packs || 0);
}

export function AuditAI() {
  const [ready, setReady] = useState(false), [signedIn, setSignedIn] = useState(false), [usage, setUsage] = useState<Usage | undefined>();
  const [text, setText] = useState(''), [tone, setTone] = useState('friendly'), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [upgrade, setUpgrade] = useState(false);
  const [res, setRes] = useState<Result | null>(null), [copied, setCopied] = useState('');

  useEffect(() => {
    if (!getToken()) { setReady(true); return; }
    api<{ usage?: Usage }>('/reply/account').then(r => { if (r.ok) { setSignedIn(true); setUsage(r.usage); } setReady(true); });
  }, []);

  async function paste() { try { setText((await navigator.clipboard.readText()).slice(0, 6000)); setErr(''); } catch { setErr('Your browser did not let us read the clipboard. Paste with Ctrl+V into the box instead.'); } }
  async function go() {
    setBusy(true); setErr(''); setUpgrade(false); setRes(null);
    const r: any = await api('/audit-ai', { text, tone });
    setBusy(false);
    if (r.usage) setUsage(r.usage);
    if (r.ok) { setRes(r); setTimeout(() => document.getElementById('audit-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }
    else { setErr(r.message || r.error || 'Something went wrong. Please try again.'); setUpgrade(r.status === 'quota'); }
  }
  async function copy(id: string, t: string) { try { await navigator.clipboard.writeText(t); setCopied(id); setTimeout(() => setCopied(''), 1400); } catch { /* ignore */ } }

  if (!ready) return <p className="muted" aria-busy="true" style={{ marginTop: 24 }}>Loading…</p>;
  if (!signedIn) return (<div className="step-card" style={{ marginTop: 24 }}><h3>Sign in to use Audit AI</h3>
    <p className="muted">It uses your Aurora reply balance, so you need a free account. New accounts get a 3-day trial, then 10 free replies a month.</p>
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}><Link className="btn primary" href="/login/?next=audit-ai">Sign in</Link><Link className="btn" href="/signup/?next=audit-ai">Create free account</Link></div></div>);

  const l = left(usage), enough = l === null || l >= COST;
  return (<div style={{ marginTop: 22 }}>
    <div className="step-card">
      <label htmlFor="aa-text" style={{ fontWeight: 700 }}>Your Aurora Audit summary</label>
      <textarea id="aa-text" value={text} onChange={e => setText(e.target.value.slice(0, 6000))} rows={9} placeholder={'Paste here (Ctrl+V).\nIn Aurora Extract: Health check → run it → "Copy audit for AI".'} style={{ width: '100%', marginTop: 8, padding: 14, borderRadius: 12, border: '1px solid var(--line)', background: 'var(--surface)', color: 'inherit', font: '14px/1.5 ui-monospace,Menlo,Consolas,monospace', resize: 'vertical' }} />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 12 }}>
        <button className="btn" type="button" onClick={paste} style={{ minHeight: 40 }}>Paste from clipboard</button>
        {TONES.map(([id, label]) => <button key={id} type="button" className={'btn' + (tone === id ? ' primary' : '')} style={{ minHeight: 40, padding: '0 16px' }} onClick={() => setTone(id)} aria-pressed={tone === id}>{label}</button>)}
        <span className="muted" style={{ marginLeft: 'auto', fontSize: 14 }}>Uses <b>{COST} replies</b>{l !== null && <> · you have <b>{l}</b> left</>}</span>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 16 }}>
        <button className="btn primary" type="button" onClick={go} disabled={busy || text.trim().length < 40 || !enough}>{busy ? 'Writing…' : '✦ Improve my profile'}</button>
        {!enough && <span className="muted">Not enough replies left. <Link href="/reply/#plans" style={{ textDecoration: 'underline' }}>Get more replies</Link></span>}
      </div>
      <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>We write the answer and do not keep what you paste: only a count is stored. The text is sent to an AI service (Anthropic) to write the suggestions. See the <Link href="/legal/privacy/" style={{ textDecoration: 'underline' }}>privacy policy</Link>.</p>
    </div>
    {err && <p style={{ color: '#d23a40', marginTop: 14 }} role="alert">{err} {upgrade && <Link href="/reply/#plans" style={{ textDecoration: 'underline' }}>Get more replies</Link>}</p>}
    {res && <div id="audit-results" style={{ marginTop: 26 }}>
      {res.note && <p className="muted" style={{ marginBottom: 12 }}>ℹ️ {res.note}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 18 }}>
        <div className="step-card"><h3>✍️ Bio options</h3>
          {res.bios.map((b, i) => <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 12, padding: '11px 13px', marginTop: 10 }}><div style={{ lineHeight: 1.45 }}>{b.text}</div>
            <button type="button" onClick={() => copy('b' + i, b.text)} style={{ background: 'none', border: 0, color: '#7c3aed', fontWeight: 800, cursor: 'pointer', padding: '6px 0 0' }}>{copied === 'b' + i ? 'Copied ✓' : 'Copy'}</button> <span className="muted" style={{ fontSize: 12 }}>{b.text.length} characters</span></div>)}</div>
        <div className="step-card"><h3>🛠 Your fix plan</h3>
          {res.fixes.map((f, i) => <div key={i} style={{ display: 'flex', gap: 10, marginTop: 12 }}><span aria-label={f.priority + ' priority'} style={{ flex: '0 0 22px', height: 22, borderRadius: '50%', background: PRIO[f.priority], color: '#fff', fontSize: 12, fontWeight: 800, display: 'grid', placeItems: 'center', marginTop: 1 }}>{i + 1}</span><div style={{ lineHeight: 1.45 }}><b>{f.title}.</b> {f.detail}</div></div>)}</div>
      </div>
      <div className="step-card" style={{ marginTop: 18 }}><h3>💡 Caption ideas</h3>
        {res.captions.map((c, i) => <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'baseline', padding: '9px 0', borderBottom: i < res.captions.length - 1 ? '1px solid var(--line)' : 0 }}><span style={{ flex: 1, lineHeight: 1.45 }}>{i + 1} · {c.text}</span>
          <button type="button" onClick={() => copy('c' + i, c.text)} style={{ background: 'none', border: 0, color: '#7c3aed', fontWeight: 800, cursor: 'pointer' }}>{copied === 'c' + i ? 'Copied ✓' : 'Copy'}</button></div>)}</div>
      <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>{l !== null && <><b>{l} replies left.</b> </>}Suggestions only: check them before you use them. Changes can make a profile clearer, but they do not promise more followers or sales.</p>
    </div>}
  </div>);
}
