'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { ReplyBuy } from './ReplyBuy';

interface Item { id: string; name: string; usd: number; replies: number }
interface Plans { enabled: boolean; trialDays: number; trialDaily: number; trialTotal: number; free: number; subs: Item[]; packs: Item[] }
const PREVIEW: Plans = { enabled: true, trialDays: 3, trialDaily: 50, trialTotal: 150, free: 10, subs: [{ id: 'reply', name: 'Standard', usd: 12, replies: 1500 }, { id: 'reply_pro', name: 'Agency', usd: 29, replies: 5000 }], packs: [{ id: 'pack150', name: '150 replies', usd: 5, replies: 150 }, { id: 'pack600', name: '600 replies', usd: 15, replies: 600 }] };
const money = (n: number) => '$' + (Number.isInteger(n) ? n : n.toFixed(2));
const per = (i: Item) => (i.usd / i.replies * 100).toFixed(i.usd / i.replies < 0.01 ? 2 : 1) + '¢';
const short = (n: string) => n.replace(/^Aurora Reply - /, '');

/** The pricing section of the Aurora Reply page. Everything comes from the server's catalog, so prices are changed in one place. */
export function ReplyPlans() {
  const [p, setP] = useState<Plans | null>(process.env.NEXT_PUBLIC_PREVIEW === '1' ? PREVIEW : null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { if (p) return; api<Plans>('/reply/plans').then(r => { if (r.ok) setP(r); else setFailed(true); }); }, [p]);
  if (failed) return <p className="muted">Plans could not be loaded just now. Please refresh in a moment.</p>;
  if (!p) return <p className="muted" aria-busy="true">Loading plans…</p>;
  if (!p.enabled) return <div className="rcallout"><div><h2 style={{ color: '#fff' }}>Plans open soon</h2></div><p style={{ gridColumn: 'auto' }}>Aurora Reply is in early access. Ask for a key on Telegram or by email and we will let you know when plans open.</p></div>;
  return (
    <>
      <div className="rplans">
        <div className="rplan"><span className="rtag s">Start here</span><h3>{p.trialDays}-day free trial</h3><p className="big">Free</p><ul><li>Every feature, up to {p.trialDaily} replies a day ({p.trialTotal} in total)</li><li>No card needed</li><li>Starts the first time you use it</li></ul><Link className="btn primary block" href="/signup/?next=reply">Start free trial</Link></div>
        <div className="rplan"><span className="rtag s">Then</span><h3>Free plan</h3><p className="big">{p.free}<small> replies a month</small></p><ul><li>Keep using it, just lighter</li><li>Renews every month</li><li>Upgrade any time</li></ul><Link className="btn block" href="/signup/?next=reply">Create free account</Link></div>
      </div>
      <h3 className="rh">Need more replies? Choose how you pay.</h3>
      <div className="rplans r2">
        <div className="rplan wide"><span className="rtag">Pay as you go</span><h3>Reply packs</h3><p className="muted">One-off. Replies last 12 months and are used after your monthly allowance. Best if you reply now and then.</p>
          <div className="rpacks">{p.packs.map(k => <div key={k.id} className="rpack"><b>{k.replies.toLocaleString()}</b><span>replies</span><em>{money(k.usd)}</em><small>{per(k)} each</small><ReplyBuy kind="pack" id={k.id} label={`Buy ${money(k.usd)}`} /></div>)}</div></div>
        <div className="rplan wide hot"><span className="rtag">Best for regular use</span><h3>Monthly subscription</h3><p className="muted">A fresh allowance every month — much cheaper per reply. Cancel any time.</p>
          <div className="rpacks">{p.subs.map((k, i) => <div key={k.id} className="rpack"><b>{short(k.name)}</b><span>{k.replies.toLocaleString()} replies / month</span><em>{money(k.usd)}<small>/mo</small></em><small>{per(k)} each</small><ReplyBuy kind="sub" id={k.id} label={`Subscribe ${money(k.usd)}/mo`} primary={i === 0} /></div>)}</div></div>
      </div>
      <p className="note center" style={{ marginTop: 18 }}>Each reply written counts as one. Choose 1, 2 or 3 replies per comment, so you only use what you need. Payments by Stripe or PayPal. See the <Link href="/legal/refunds/" style={{ textDecoration: 'underline' }}>refund policy</Link>.</p>
    </>
  );
}
