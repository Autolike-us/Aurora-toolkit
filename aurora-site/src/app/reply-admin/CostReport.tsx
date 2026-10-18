'use client';
import { useState } from 'react';
import { api } from '@/lib/client';

interface Month { ym: string; requests: number; replies: number; tokensIn: number; tokensOut: number; costUsd: number; costPerReplyUsd: number; avgTokensInPerRequest: number; avgTokensOutPerRequest: number; byPlan: Record<string, number>; byModel: Record<string, number> }

export function CostReport() {
  const [key, setKey] = useState(''); const [months, setMonths] = useState<Month[] | null>(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true); setErr('');
    const r: any = await api('/reply/admin', { key: key.trim(), installId: 'owner-cost-report' });
    setBusy(false);
    if (r.ok) setMonths(r.months); else { setMonths(null); setErr(r.message || r.error || 'Not allowed.'); }
  }
  return (<div style={{ marginTop: 24 }}>
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <input type="password" value={key} onChange={e => setKey(e.target.value)} placeholder="AUR-XXXX-XXXX-XXXX" autoComplete="off" style={{ flex: '1 1 260px', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--line)', background: 'var(--surface)', color: 'inherit' }} />
      <button className="btn primary" onClick={load} disabled={busy || !key.trim()}>{busy ? 'Loading…' : 'Show costs'}</button>
    </div>
    {err && <p style={{ color: '#d23a40', marginTop: 12 }}>{err}</p>}
    {months && months.length === 0 && <p className="muted" style={{ marginTop: 16 }}>No replies have been written yet.</p>}
    {months && months.map(m => (
      <div key={m.ym} className="step-card" style={{ marginTop: 18 }}>
        <h3 style={{ marginBottom: 8 }}>{m.ym}</h3>
        <p><b>${m.costUsd.toFixed(4)}</b> total · <b>${m.costPerReplyUsd.toFixed(5)}</b> per reply · {m.replies} replies in {m.requests} requests</p>
        <p className="muted" style={{ fontSize: 14 }}>Average per request: {m.avgTokensInPerRequest} tokens in, {m.avgTokensOutPerRequest} tokens out.</p>
        <p className="muted" style={{ fontSize: 14 }}>By plan: {Object.entries(m.byPlan).map(([k, v]) => `${k} ${v}`).join(' · ')} — by model: {Object.entries(m.byModel).map(([k, v]) => `${k} ${v}`).join(' · ')}</p>
      </div>))}
  </div>);
}
