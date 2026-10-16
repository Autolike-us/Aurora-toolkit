import type { Metadata } from 'next';
import { AuthForm } from '@/components/AuthForm';
export const metadata: Metadata = { title: 'Log in' };
export default function Page() { return <main><AuthForm mode="login" /></main>; }
