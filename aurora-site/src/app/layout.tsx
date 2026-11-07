import type { Metadata } from 'next';
import './globals.css';
import { Footer } from '@/components/Footer';
import { Announcement } from '@/components/Announcement';
import { Nav } from '@/components/Nav';
import { Analytics } from '@/components/Analytics';

export const metadata: Metadata = {
  title: { default: 'Aurora: Facebook, Instagram & TikTok Engagement Tools', template: '%s · Aurora Studios' },
  description: 'Browser extensions that help you like, comment and follow on Facebook, Instagram and TikTok at a steady pace. Preview first. 3-day free trial.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://getaurorastudios.com'),
  alternates: { canonical: './' },
  openGraph: {
    type: 'website', siteName: 'Aurora Studios', locale: 'en_US',
    title: 'Aurora: Facebook, Instagram & TikTok Engagement Tools',
    description: 'Browser extensions for Facebook, Instagram and TikTok, plus Aurora Reply and the free Aurora Extract. Preview first. 3-day free trial.',
    images: [{ url: '/og-v2.png', width: 1200, height: 630, alt: 'Aurora — tools for Facebook, Instagram and TikTok' }],
  },
  twitter: { card: 'summary_large_image', title: 'Aurora: Facebook, Instagram & TikTok Engagement Tools', description: 'Extensions for steady, previewed engagement, plus Aurora Reply and a free data extractor.', images: ['/og-v2.png'] },
};

/** Applies a saved dark choice before first paint so the page never flashes light. */
const THEME_BOOT = "try{if(localStorage.getItem('aurora-theme')==='dark')document.documentElement.dataset.theme='dark'}catch(e){}";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} /></head><body><Announcement /><Nav />{children}<Footer /><Analytics /></body></html>
  );
}
