/** @type {import('next').NextConfig} */
const preview = process.env.NEXT_PUBLIC_PREVIEW === '1';
// PREVIEW=1 builds a fully static copy of the UI (no API routes, demo data) for GitHub Pages.
export default {
  reactStrictMode: true,
  poweredByHeader: false,
  ...(preview ? { output: 'export', trailingSlash: true, images: { unoptimized: true }, basePath: process.env.PREVIEW_BASE_PATH || '' } : {}),
};
