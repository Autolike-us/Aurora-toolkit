// Builds the demo copy of the site (no backend needed; demo account, checkout switched off) into ./out for GitHub Pages.
//   node scripts/build-preview.mjs /Aurora-toolkit/site-preview
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const base = process.argv[2] || '';
fs.rmSync('out', { recursive: true, force: true });
execSync('npx next build', { stdio: 'inherit', env: { ...process.env, NEXT_PUBLIC_PREVIEW: '1', PREVIEW_BASE_PATH: base, NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost' } });
fs.writeFileSync('out/.nojekyll', '');
