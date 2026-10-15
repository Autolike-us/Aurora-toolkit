// Builds a static, no-backend copy of the UI (demo account, checkout switched off) into ./out for GitHub Pages.
//   node scripts/build-preview.mjs /Aurora-toolkit/site-preview
// It temporarily moves the API routes aside (they cannot be exported) and restores everything afterwards.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const base = process.argv[2] || '';
const api = 'src/app/api', hold = '.api-off', pages = ['src/app/page.tsx', 'src/app/pricing/page.tsx'];
const saved = Object.fromEntries(pages.map(p => [p, fs.readFileSync(p, 'utf8')]));
const restore = () => { if (fs.existsSync(hold)) fs.renameSync(hold, api); for (const p of pages) fs.writeFileSync(p, saved[p]); fs.rmSync('.next', { recursive: true, force: true }); };
try {
  fs.renameSync(api, hold);
  for (const p of pages) fs.writeFileSync(p, saved[p].replace(/^export const revalidate.*\n/m, ''));
  fs.rmSync('out', { recursive: true, force: true });
  execSync('npx next build', { stdio: 'inherit', env: { ...process.env, NEXT_PUBLIC_PREVIEW: '1', PREVIEW_BASE_PATH: base, NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost' } });
  fs.writeFileSync('out/.nojekyll', '');
} finally { restore(); }
