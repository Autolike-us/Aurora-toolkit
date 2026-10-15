// Uploads a packaged extension zip to the private "releases" bucket so /api/download can serve it to paying and trial users.
//   node scripts/upload-release.mjs facebook ../FB-Growth-V1/dist/aurora-facebook-studio-2.1.0.zip
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
const [product, file] = process.argv.slice(2);
if (!['facebook', 'instagram', 'tiktok'].includes(product) || !file || !fs.existsSync(file)) { console.error('Usage: node scripts/upload-release.mjs <facebook|instagram|tiktok> <path-to-zip>'); process.exit(1); }
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
await db.storage.createBucket('releases', { public: false }).catch(() => {});
const { error } = await db.storage.from('releases').upload(`aurora-${product}-latest.zip`, fs.readFileSync(file), { upsert: true, contentType: 'application/zip' });
if (error) { console.error(error.message); process.exit(1); }
console.log('Uploaded', file, '→ releases/aurora-' + product + '-latest.zip');
