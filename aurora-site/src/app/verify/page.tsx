import type { Metadata } from 'next';
import { TokenPage } from '@/components/TokenPage';
export const metadata: Metadata = { title: 'Confirm your email', robots: { index: false } };
export default function Page() { return <main><TokenPage kind="verify" /></main>; }
