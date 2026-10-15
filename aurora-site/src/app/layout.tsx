import type { Metadata } from 'next';
import './globals.css';
import { Footer } from '@/components/Footer';
import { Announcement } from '@/components/Announcement';
import { Nav } from '@/components/Nav';

export const metadata: Metadata = {
  title: { default: 'Aurora — thoughtful growth tools for Facebook, Instagram & TikTok', template: '%s · Aurora' },
  description: 'Aurora is a family of browser extensions that like, comment, follow and more on Facebook, Instagram and TikTok at a human pace. Preview first. 3-day free trial.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body><Announcement /><Nav />{children}<Footer /></body></html>
  );
}
