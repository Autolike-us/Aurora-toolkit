'use client';
import Script from 'next/script';
import { usePathname } from 'next/navigation';

/** Google Analytics for the website only. Off unless NEXT_PUBLIC_GA_ID (a "G-…" Measurement ID) is set at build time.
 *  Never loaded on /tiktok/callback: that page's address carries a one-time authorization code, which must not reach any third party. */
export function Analytics() {
  const path = usePathname() || '';
  const id = process.env.NEXT_PUBLIC_GA_ID;
  if (!id || !/^G-[A-Z0-9]+$/.test(id)) return null;
  if (path.startsWith('/tiktok/callback')) return null;
  return (<>
    <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
    <Script id="ga-init" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}',{anonymize_ip:true});`}</Script>
  </>);
}
