import type { Metadata } from 'next';
import { AuthForm } from '@/components/AuthForm';
export const metadata: Metadata = { title: 'Start your free trial' };
export default function Page() { return <main><AuthForm mode="signup" /></main>; }
