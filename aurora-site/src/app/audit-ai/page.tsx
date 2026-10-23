import type { Metadata } from 'next';
import Link from 'next/link';
import { AuditAI } from './AuditAI';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta({ title: 'Audit AI — improve your profile', description: 'Paste your free Aurora Audit and get new bio options, a plain-English fix plan and caption ideas. Suggestions only; you decide what to use.', path: '/audit-ai/' });

export default function Page() {
  return (<main><section className="block"><div className="wrap" style={{ maxWidth: 980 }}>
    <span className="eyebrow">Aurora Extract · Audit AI</span>
    <h1 style={{ fontSize: 'clamp(30px,4vw,46px)', margin: '8px 0 12px' }}>Improve your profile with AI</h1>
    <p className="lead">Run the free Health check in <Link href="/extract" style={{ textDecoration: 'underline' }}>Aurora Extract</Link>, press <b>Copy audit for AI</b>, and paste it here. You get new bio options, a plain-English fix plan and caption ideas. They are suggestions: you decide what to use.</p>
    <AuditAI />
  </div></section></main>);
}
