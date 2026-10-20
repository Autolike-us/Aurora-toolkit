'use client';
import { useState } from 'react';
import { api } from '@/lib/client';

interface Overview {
  generatedAt: string;
  users: { total: number; verified: number; last7: number; last30: number; byDay: { d: string; n: number }[] };
  trials: { active: number; ended: number; started7: number };
  subs: { active: number; canceled: number; problem: number; mrrUsd: number; new30: number; byPlan: Record<string, number>; byProvider: Record<string, number> };
  reply: { packsByMonth: { ym: string; orders: number; usd: number }[]; packRevenueThisMonthUsd: number; month: string; repliesThisMonth: number; costThisMonthUsd: number; accounts: number };
  installs: Record<string, { total: number; active7: number }>;
  recentUsers: { email: string; at: string; verified: boolean }[];
  recentOrders: { email: string; pack: string; usd: number; provider: string; at: string }[];
}

const usd = (n: number) => '$' + n.toFixed(2);
const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const PLAN: Record<string, string> = { bundle: 'All 3 studios', facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', reply: 'Reply Standard', reply_pro: 'Reply Agency' };

function Tile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return <div className="step-card" style={{ flex: '1 1 170px', minWidth: 160 }}><div className="muted" style={{ fontSize: 13 }}>{label}</div><div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.2 }}>{value}</div>{sub && <div className="muted" style={{ fontSize: 13 }}>{sub}</div>}</div>;
}

function Bars({ data }: { data: { d: string; n: number }[] }) {
  const max = Math.max(1, ...data.map(x => x.n)); const w = 600, h = 120, bw = w / data.length;
  return (<svg viewBox={`0 0 ${w} ${h + 18}`} role="img" aria-label="Sign-ups per day, last 30 days" style={{ width: '100%', maxWidth: 720 }}>
    {data.map((x, i) => <g key={x.d}><title>{x.d}: {x.n}</title><rect x={i * bw + 2} y={h - (x.n / max) * h} width={bw - 4} height={Math.max(2, (x.n / max) * h)} rx={3} fill="#7c3aed" opacity={x.n ? 1 : 0.25} /></g>)}
    <text x={0} y={h + 14} fontSize="10" fill="currentColor" opacity=".6">{data[0]?.d}</text><text x={w} y={h + 14} fontSize="10" textAnchor="end" fill="currentColor" opacity=".6">{data[data.length - 1]?.d}</text>
  </svg>);
}

export function OwnerDashboard() {
  const [key, setKey] = useState(''); const [d, setD] = useState<Overview | null>(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true); setErr('');
    const r: any = await api('/owner/overview', { key: key.trim() });
    setBusy(false);
    if (r.ok) setD(r); else { setD(null); setErr(r.message || r.error || 'Not allowed.'); }
  }
  const monthRevenue = d ? d.subs.mrrUsd + d.reply.packRevenueThisMonthUsd : 0;
  return (<div style={{ marginTop: 24 }}>
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <input type="password" value={key} onChange={e => setKey(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && key.trim()) load(); }} placeholder="AUR-XXXX-XXXX-XXXX" autoComplete="off" style={{ flex: '1 1 260px', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--line)', background: 'var(--surface)', color: 'inherit' }} />
      <button className="btn primary" onClick={load} disabled={busy || !key.trim()}>{busy ? 'Loading…' : d ? 'Refresh' : 'Show dashboard'}</button>
    </div>
    {err && <p style={{ color: '#d23a40', marginTop: 12 }}>{err}</p>}
    {d && <>
      <p className="muted" style={{ marginTop: 14, fontSize: 13 }}>Updated {when(d.generatedAt)}. Dollar figures are estimates from your own records, not your bank balance.</p>

      <h2 style={{ marginTop: 24 }}>Money</h2>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <Tile label="Monthly subscriptions (MRR)" value={usd(d.subs.mrrUsd)} sub={`${d.subs.active} active`} />
        <Tile label={`Reply packs · ${d.reply.month}`} value={usd(d.reply.packRevenueThisMonthUsd)} sub="one-off sales this month" />
        <Tile label="This month, roughly" value={usd(monthRevenue)} sub="subscriptions + packs" />
        <Tile label={`Reply AI cost · ${d.reply.month}`} value={'$' + d.reply.costThisMonthUsd.toFixed(2)} sub={`${d.reply.repliesThisMonth} replies written`} />
      </div>

      <h2 style={{ marginTop: 28 }}>People</h2>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <Tile label="Accounts" value={d.users.total} sub={`${d.users.verified} verified`} />
        <Tile label="New, last 7 days" value={d.users.last7} sub={`${d.users.last30} in 30 days`} />
        <Tile label="Studios trials running" value={d.trials.active} sub={`${d.trials.started7} started this week · ${d.trials.ended} ended`} />
        <Tile label="Reply accounts" value={d.reply.accounts} sub="have started the Reply trial" />
      </div>
      <div className="step-card" style={{ marginTop: 14 }}><b>Sign-ups per day</b><div style={{ marginTop: 8 }}><Bars data={d.users.byDay} /></div></div>

      <h2 style={{ marginTop: 28 }}>Subscriptions</h2>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <Tile label="Active" value={d.subs.active} sub={`${d.subs.new30} new in 30 days`} />
        <Tile label="Cancelled / ended" value={d.subs.canceled} />
        <Tile label="Needs a look" value={d.subs.problem} sub="payment problems or odd status" />
      </div>
      <p style={{ marginTop: 10 }} className="muted">By plan: {Object.keys(d.subs.byPlan).length ? Object.entries(d.subs.byPlan).map(([k, v]) => `${PLAN[k] || k} ${v}`).join(' · ') : 'none yet'}{Object.keys(d.subs.byProvider).length ? ' — paid with ' + Object.entries(d.subs.byProvider).map(([k, v]) => `${k} ${v}`).join(' · ') : ''}</p>

      <h2 style={{ marginTop: 28 }}>Installs with a licence</h2>
      <p className="muted">People who activated a licensed extension. “Active” = seen in the last 7 days. Store installs of the free Extract are in the Chrome Web Store dashboard.</p>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>{Object.keys(d.installs).length ? Object.entries(d.installs).map(([k, v]) => <Tile key={k} label={k[0].toUpperCase() + k.slice(1)} value={v.total} sub={`${v.active7} active this week`} />) : <p className="muted">None yet.</p>}</div>

      <h2 style={{ marginTop: 28 }}>Reply pack sales by month</h2>
      {d.reply.packsByMonth.length ? <table className="rtable" style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>{d.reply.packsByMonth.map(m => <tr key={m.ym}><td style={{ padding: '6px 0' }}>{m.ym}</td><td>{m.orders} order{m.orders === 1 ? '' : 's'}</td><td><b>{usd(m.usd)}</b></td></tr>)}</tbody></table> : <p className="muted">No pack sold yet.</p>}

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 28 }}>
        <div style={{ flex: '1 1 320px' }}><h2>Latest sign-ups</h2>
          {d.recentUsers.map(u => <p key={u.email + u.at} style={{ margin: '6px 0' }}>{u.email} <span className="muted" style={{ fontSize: 13 }}>· {when(u.at)}{u.verified ? '' : ' · not verified'}</span></p>)}</div>
        <div style={{ flex: '1 1 320px' }}><h2>Latest pack orders</h2>
          {d.recentOrders.length ? d.recentOrders.map(o => <p key={o.at + o.email} style={{ margin: '6px 0' }}>{usd(o.usd)} · {o.pack} <span className="muted" style={{ fontSize: 13 }}>· {o.email || 'unknown'} · {o.provider} · {when(o.at)}</span></p>) : <p className="muted">None yet.</p>}</div>
      </div>
    </>}
  </div>);
}
