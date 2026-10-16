/** @type {import('next').NextConfig} */
// The site is exported as plain static files (HostGator serves them); the PHP API lives next to it in /api.
export default {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: process.env.PREVIEW_BASE_PATH || '',
};
