import type { MetadataRoute } from 'next';
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/account/', '/verify/', '/reset/', '/reply-admin/', '/admin/'] }], sitemap: 'https://getaurorastudios.com/sitemap.xml' };
}
