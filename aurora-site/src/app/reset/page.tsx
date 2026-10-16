import type { Metadata } from 'next';
import { TokenPage } from '@/components/TokenPage';
export const metadata: Metadata = { title: 'Reset your password', robots: { index: false } };
export default function Page() { return <main><TokenPage kind="reset" /></main>; }
