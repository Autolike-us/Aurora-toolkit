import type { Metadata } from 'next';

const SITE = 'https://getaurorastudios.com';

/** Title, description and share preview for one page. Next replaces the whole openGraph/twitter object per page, so each page sets its own (never the homepage's). */
export function pageMeta(o: { title: string; description: string; path: string; image?: string; shareTitle?: string }): Metadata {
  const image = o.image || '/og-v2.png', title = o.shareTitle || o.title;
  return {
    title: o.title, description: o.description,
    alternates: { canonical: o.path },
    openGraph: { type: 'website', siteName: 'Aurora Studios', locale: 'en_US', url: SITE + o.path, title, description: o.description, images: [{ url: image, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', title, description: o.description, images: [image] },
  };
}
