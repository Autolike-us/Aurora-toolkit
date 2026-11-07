'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, getToken } from '@/lib/client';

const usd = (n: number) => '$' + n.toFixed(2);
const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—');
const PLAN: Record<string, string> = { bundle: 'All 3 studios', facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', reply: 'Reply Standard', reply_pro: 'Reply Agency', pack150: '150 replies', pack600: '600 replies' };
const TABS = [['overview', 'Overview'], ['users', 'Users'], ['subs', 'Subscriptions'], ['orders', 'Pack orders'], ['cost', 'AI cost']] as const;
type Tab = typeof TABS[number][0];

function Tile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return <div className="step-card" style={{ flex: '1 1 170px', minWidth: 160 }}><div className="muted" style={{ fontSize: 13 }}>{label}</div><div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.2 }}>{value}</div>{sub && <div className="muted" style={{ fontSize: 13 }}>{sub}</div>}</div>;
}
function Bars({ data }: { data: { d: string; n: number }[] }) {
  const max = Math.max(1, ...data.map(x => x.n)); const w = 600, h = 110, bw = w / data.length;
  return (<svg viewBox={`0 0 ${w} ${h + 18}`} role="img" aria-label="Sign-ups per day, last 30 days" style={{ width: '100%', maxWidth: 720 }}>
    {data.map((x, i) => <g key={x.d}><title>{x.d}: {x.n}</title><rect x={i * bw + 2} y={h - (x.n / max) * h} width={bw - 4} height={Math.max(2, (x.n / max) * h)} rx={3} fill="#7c3aed" opacity={x.n ? 1 : 0.25} /></g>)}
    <text x={0} y={h + 14} fontSize="10" fill="currentColor" opacity=".6">{data[0]?.d}</text><text x={w} y={h + 14} fontSize="10" textAnchor="end" fill="currentColor" opacity=".6">{data[data.length - 1]?.d}</text></svg>);
}
const th: React.CSSProperties = { textAlign: 'left', padding: '8px 10px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', borderBottom: '1px solid var(--line)' };
const td: React.CSSProperties = { padding: '9px 10px', borderBottom: '1px solid var(--line)', fontSize: 14, verticalAlign: 'top' };
function Table({ head, rows, empty }: { head: string[]; rows: React.ReactNode[][]; empty?: string }) {
  if (!rows.length) return <p className="muted">{empty || 'Nothing yet.'}</p>;
  return <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>{head.map(h => <th key={h} style={th}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={td}>{c}</td>)}</tr>)}</tbody></table></div>;
}
const Status = ({ s }: { s: string }) => <span style={{ fontWeight: 700, color: ['active', 'trialing', 'running'].includes(s) ? '#059669' : ['canceled', 'cancelled', 'expired', 'ended', 'none'].includes(s) ? '#6b7280' : '#d97706' }}>{s}</span>;

export function AdminDashboard() {
  const [state, setState] = useState<'loading' | 'signedout' | 'denied' | 'ok'>('loading');
  const [tab, setTab] = useState<Tab>('overview'); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [ov, setOv] = useState<any>(null), [users, setUsers] = useState<any>(null), [subs, setSubs] = useState<any[] | null>(null), [orders, setOrders] = useState<any>(null), [cost, setCost] = useState<any[] | null>(null), [detail, setDetail] = useState<any>(null);
  const [q, setQ] = useState(''), [page, setPage] = useState(1);

  const call = useCallback(async (path: string, body: unknown = {}) => {
    setBusy(true); setErr('');
    const r: any = await api(path, body); setBusy(false);
    if (!r.ok) { if (r.error && /not an administrator/i.test(r.error)) setState('denied'); else if (/sign in/i.test(r.error || '')) setState('signedout'); else setErr(r.error || r.message || 'Something went wrong.'); return null; }
    setState('ok'); return r;
  }, []);
  const load = useCallback(async (t: Tab, opts?: { q?: string; page?: number }) => {
    if (t === 'overview') { const r = await call('/admin/overview'); if (r) setOv(r); }
    if (t === 'users') { const r = await call('/admin/users', { q: opts?.q ?? q, page: opts?.page ?? page }); if (r) setUsers(r); }
    if (t === 'subs') { const r = await call('/admin/subscriptions'); if (r) setSubs(r.subscriptions); }
    if (t === 'orders') { const r = await call('/admin/orders'); if (r) setOrders(r); }
    if (t === 'cost') { const r = await call('/admin/cost'); if (r) setCost(r.months); }
  }, [call, q, page]);
  useEffect(() => { if (!getToken()) { setState('signedout'); return; } load('overview'); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const open = async (id: string) => { const r = await call('/admin/user', { id }); if (r) setDetail(r); };
  const go = (t: Tab) => { setTab(t); setDetail(null); load(t); };

  if (state === 'loading') return <p className="muted" aria-busy="true">Loading…</p>;
  if (state === 'signedout') return <div className="step-card"><h3>Sign in to continue</h3><p className="muted">Use the same email and password you use on getaurorastudios.com. Only accounts listed as administrators can open this page.</p><Link className="btn primary" href="/login/?next=admin" style={{ marginTop: 12 }}>Sign in</Link></div>;
  if (state === 'denied') return <div className="step-card"><h3>This account is not an administrator</h3><p className="muted">Add the email you sign in with to <code>admin_emails</code> in <code>aurora-config.php</code> on your server, and make sure that email is confirmed.</p><Link className="btn" href="/account/" style={{ marginTop: 12 }}>My account</Link></div>;

  return (<div>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      {TABS.map(([id, label]) => <button key={id} type="button" className={'btn' + (tab === id ? ' primary' : '')} style={{ minHeight: 40, padding: '0 18px' }} onClick={() => go(id)}>{label}</button>)}
      <button type="button" className="btn" style={{ minHeight: 40, marginLeft: 'auto' }} onClick={() => (detail ? open(detail.user.id) : load(tab))} disabled={busy}>{busy ? 'Loading…' : 'Refresh'}</button>
    </div>
    {err && <p style={{ color: '#d23a40', marginTop: 12 }} role="alert">{err}</p>}
    <p className="muted" style={{ fontSize: 13, margin: '10px 0 0' }}>Read-only. Dollar figures are estimates from your own records, not your bank balance.</p>

    {tab === 'overview' && ov && <div>
      <h2 style={{ marginTop: 22 }}>Money</h2>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <Tile label="Monthly subscriptions (MRR)" value={usd(ov.subs.mrrUsd)} sub={`${ov.subs.active} active`} />
        <Tile label={`Reply packs · ${ov.reply.month}`} value={usd(ov.reply.packRevenueThisMonthUsd)} sub="one-off sales this month" />
        <Tile label="This month, roughly" value={usd(ov.subs.mrrUsd + ov.reply.packRevenueThisMonthUsd)} sub="subscriptions + packs" />
        <Tile label={`AI cost · ${ov.reply.month}`} value={'$' + ov.reply.costThisMonthUsd.toFixed(2)} sub={`${ov.reply.repliesThisMonth} replies written`} />
      </div>
      <h2 style={{ marginTop: 26 }}>People</h2>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <Tile label="Accounts" value={ov.users.total} sub={`${ov.users.verified} verified`} />
        <Tile label="New, last 7 days" value={ov.users.last7} sub={`${ov.users.last30} in 30 days`} />
        <Tile label="Studios trials running" value={ov.trials.active} sub={`${ov.trials.started7} started this week · ${ov.trials.ended} ended`} />
        <Tile label="Reply accounts" value={ov.reply.accounts} sub="started the Reply trial" />
      </div>
      <div className="step-card" style={{ marginTop: 14 }}><b>Sign-ups per day</b><div style={{ marginTop: 8 }}><Bars data={ov.users.byDay} /></div></div>
      <h2 style={{ marginTop: 26 }}>Subscriptions</h2>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <Tile label="Active" value={ov.subs.active} sub={`${ov.subs.new30} new in 30 days`} /><Tile label="Cancelled / ended" value={ov.subs.canceled} /><Tile label="Needs a look" value={ov.subs.problem} sub="payment problems or odd status" />
      </div>
      <p className="muted" style={{ marginTop: 10 }}>By plan: {Object.keys(ov.subs.byPlan).length ? Object.entries(ov.subs.byPlan).map(([k, v]) => `${PLAN[k] || k} ${v}`).join(' · ') : 'none yet'}{Object.keys(ov.subs.byProvider).length ? ' — paid with ' + Object.entries(ov.subs.byProvider).map(([k, v]) => `${k} ${v}`).join(' · ') : ''}</p>
      <h2 style={{ marginTop: 26 }}>Installs with a licence</h2>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>{Object.keys(ov.installs).length ? Object.entries(ov.installs).map(([k, v]: any) => <Tile key={k} label={k[0].toUpperCase() + k.slice(1)} value={v.total} sub={`${v.active7} active this week`} />) : <p className="muted">None yet.</p>}</div>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 26 }}>
        <div style={{ flex: '1 1 340px' }}><h2>Latest sign-ups</h2>{ov.recentUsers.map((u: any) => <p key={u.id} style={{ margin: '6px 0' }}><button type="button" onClick={() => { setTab('users'); open(u.id); }} style={{ background: 'none', border: 0, padding: 0, color: '#7c3aed', fontWeight: 700, cursor: 'pointer', font: 'inherit' }}>{u.email}</button> <span className="muted" style={{ fontSize: 13 }}>· {when(u.at)}{u.verified ? '' : ' · not verified'}</span></p>)}</div>
        <div style={{ flex: '1 1 340px' }}><h2>Latest pack orders</h2>{ov.recentOrders.length ? ov.recentOrders.map((o: any, i: number) => <p key={i} style={{ margin: '6px 0' }}>{usd(o.usd)} · {PLAN[o.pack] || o.pack} <span className="muted" style={{ fontSize: 13 }}>· {o.email || 'unknown'} · {o.provider} · {when(o.at)}</span></p>) : <p className="muted">None yet.</p>}</div>
      </div>
    </div>}

    {tab === 'users' && !detail && <div style={{ marginTop: 18 }}>
      <form onSubmit={e => { e.preventDefault(); setPage(1); load('users', { q, page: 1 }); }} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by email" aria-label="Search by email" style={{ flex: '1 1 260px', padding: '11px 14px', borderRadius: 12, border: '1px solid var(--line)', background: 'var(--surface)', color: 'inherit' }} />
        <button className="btn primary" type="submit" style={{ minHeight: 44 }}>Search</button></form>
      {users && <><p className="muted" style={{ margin: '12px 0 6px' }}>{users.total} account{users.total === 1 ? '' : 's'}</p>
        <Table head={['Email', 'Joined', 'Verified', 'Studios trial', 'Active plans']} rows={users.users.map((u: any) => [<button key="e" type="button" onClick={() => open(u.id)} style={{ background: 'none', border: 0, padding: 0, color: '#7c3aed', fontWeight: 700, cursor: 'pointer', font: 'inherit' }}>{u.email}</button>, when(u.createdAt), u.verified ? 'yes' : 'no', <Status key="t" s={u.trial} />, u.plans.map((p: string) => PLAN[p] || p).join(', ') || '—'])} />
        <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center' }}>
          <button className="btn" type="button" style={{ minHeight: 38 }} disabled={page <= 1 || busy} onClick={() => { setPage(page - 1); load('users', { page: page - 1 }); }}>← Previous</button>
          <span className="muted">Page {page} of {Math.max(1, Math.ceil(users.total / users.per))}</span>
          <button className="btn" type="button" style={{ minHeight: 38 }} disabled={page * users.per >= users.total || busy} onClick={() => { setPage(page + 1); load('users', { page: page + 1 }); }}>Next →</button></div></>}
    </div>}

    {tab === 'users' && detail && <div style={{ marginTop: 18 }}>
      <button type="button" className="btn" style={{ minHeight: 38 }} onClick={() => setDetail(null)}>← All users</button>
      <h2 style={{ marginTop: 16 }}>{detail.user.email}</h2>
      <p className="muted">Joined {when(detail.user.createdAt)} · {detail.user.verified ? 'email confirmed' : 'email NOT confirmed'} · id {detail.user.id}</p>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 8 }}>
        <Tile label="Licence key" value={detail.license?.key || '—'} sub={detail.license ? `Studios trial ${day(detail.license.trialStartedAt)} → ${day(detail.license.trialEndsAt)}` : 'no licence yet'} />
        <Tile label="Reply plan" value={detail.reply.plan || '—'} sub={detail.reply.limit != null ? `${detail.reply.usedThisMonth} of ${detail.reply.limit} used this month` : `${detail.reply.usedThisMonth} used this month`} />
        <Tile label="Reply packs left" value={detail.reply.packsLeft} sub={detail.reply.trialStartedAt ? `Reply trial started ${day(detail.reply.trialStartedAt)}` : 'Reply trial not started'} />
      </div>
      <h3 style={{ marginTop: 22 }}>Subscriptions</h3>
      <Table head={['Plan', 'Paid with', 'Status', 'Price', 'Renews / ends', 'Started']} rows={detail.subscriptions.map((s: any) => [PLAN[s.plan] || s.plan, s.provider, <Status key="s" s={s.status} />, usd(s.usd) + (s.launch ? ' (launch)' : '') + '/mo', day(s.periodEnd), day(s.createdAt)])} empty="No subscriptions." />
      <h3 style={{ marginTop: 22 }}>Pack orders</h3>
      <Table head={['Pack', 'Price', 'Paid with', 'Date']} rows={detail.orders.map((o: any) => [PLAN[o.pack] || o.pack, usd(o.usd), o.provider, when(o.at)])} empty="No pack orders." />
      <h3 style={{ marginTop: 22 }}>Reply packs</h3>
      <Table head={['Bought', 'Left', 'Source', 'Expires']} rows={detail.reply.packs.map((p: any) => [p.total, p.left, p.source, day(p.expiresAt)])} empty="No packs." />
      <h3 style={{ marginTop: 22 }}>Installs</h3>
      <Table head={['Product', 'First seen', 'Last seen']} rows={detail.installs.map((i: any) => [i.product, when(i.firstSeen), when(i.lastSeen)])} empty="No licensed installs." />
    </div>}

    {tab === 'subs' && subs && <div style={{ marginTop: 18 }}><Table head={['Customer', 'Plan', 'Paid with', 'Status', 'Price', 'Renews / ends', 'Started']} rows={subs.map(s => [<button key="e" type="button" onClick={() => { setTab('users'); open(s.userId); }} style={{ background: 'none', border: 0, padding: 0, color: '#7c3aed', fontWeight: 700, cursor: 'pointer', font: 'inherit' }}>{s.email || s.userId}</button>, PLAN[s.plan] || s.plan, s.provider, <Status key="s" s={s.status} />, usd(s.usd) + (s.launch ? ' (launch)' : '') + '/mo', day(s.periodEnd), day(s.createdAt)])} empty="No subscriptions yet." /></div>}

    {tab === 'orders' && orders && <div style={{ marginTop: 18 }}><div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}><Tile label="Pack orders" value={orders.count} /><Tile label="Total sold" value={usd(orders.totalUsd)} /></div>
      <Table head={['Customer', 'Pack', 'Price', 'Paid with', 'Date']} rows={orders.orders.map((o: any) => [o.email || o.userId, PLAN[o.pack] || o.pack, usd(o.usd), o.provider, when(o.at)])} empty="No pack orders yet." /></div>}

    {tab === 'cost' && cost && <div style={{ marginTop: 18 }}>{cost.length ? cost.map(m => <div key={m.ym} className="step-card" style={{ marginBottom: 14 }}><h3 style={{ marginBottom: 6 }}>{m.ym}</h3>
      <p><b>${m.costUsd.toFixed(4)}</b> total · <b>${m.costPerReplyUsd.toFixed(5)}</b> per reply · {m.replies} replies in {m.requests} requests</p>
      <p className="muted" style={{ fontSize: 14 }}>By plan: {Object.entries(m.byPlan).map(([k, v]) => `${k} ${v}`).join(' · ')} — by model: {Object.entries(m.byModel).map(([k, v]) => `${k} ${v}`).join(' · ')}</p></div>) : <p className="muted">No replies written yet.</p>}</div>}
  </div>);
}
