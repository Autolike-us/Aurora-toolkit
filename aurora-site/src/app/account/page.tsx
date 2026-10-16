import type { Metadata } from 'next';
import { AccountView } from '@/components/AccountView';
export const metadata: Metadata = { title: 'My account', robots: { index: false } };
export default function Page() { return <main><AccountView /></main>; }
