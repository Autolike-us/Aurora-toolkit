import type { MetadataRoute } from 'next';
export const dynamic = 'force-static';

const BASE = 'https://getaurorastudios.com';
const PAGES = ['', '/pricing', '/extract', '/reply', '/download', '/support', '/about', '/openshorts', '/audit-ai', '/products/facebook', '/products/instagram', '/products/tiktok', '/signup', '/login', '/legal/terms', '/legal/privacy', '/legal/refunds', '/legal/disclaimer'];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PAGES.map((p) => ({ url: `${BASE}${p}${p ? '/' : '/'}`.replace(/\/\/$/, '/'), lastModified: now, changeFrequency: p === '' || p === '/extract' ? 'weekly' : 'monthly', priority: p === '' ? 1 : p === '/extract' || p === '/pricing' ? 0.9 : 0.6 }));
}
