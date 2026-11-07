// Builds the static site and assembles everything to upload to cPanel:  dist/aurora-public_html.zip
//   npm run build:hostgator
// Unzip it into public_html (File Manager > Upload > Extract). The PHP API is included in public_html/api.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const out = 'dist/public_html';
fs.rmSync('out', { recursive: true, force: true }); fs.rmSync('dist', { recursive: true, force: true });
execSync('npx next build', { stdio: 'inherit', env: { ...process.env, NEXT_PUBLIC_PREVIEW: '', PREVIEW_BASE_PATH: '' } });
fs.cpSync('out', out, { recursive: true });
fs.cpSync('hostgator/api', path.join(out, 'api'), { recursive: true });
fs.copyFileSync('hostgator/public_html.htaccess', path.join(out, '.htaccess'));
// Files that must live at the site root (for example a domain-verification file): everything in site-root/ except its README.
if (fs.existsSync('site-root')) for (const f of fs.readdirSync('site-root')) if (!['README.md', '.gitkeep'].includes(f)) fs.copyFileSync(path.join('site-root', f), path.join(out, f));

const files = [];
(function walk(dir) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); e.isDirectory() ? walk(p) : files.push(p); } })(out);
const table = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = b => { let c = 0xFFFFFFFF; for (const x of b) c = table[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
const parts = [], central = []; let offset = 0;
const dosDate = ((2026 - 1980) << 9) | (1 << 5) | 1;
for (const f of files) {
  const name = path.relative(out, f).split(path.sep).join('/'), data = fs.readFileSync(f), comp = zlib.deflateRawSync(data, { level: 9 }), nb = Buffer.from(name), crc = crc32(data);
  const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(8, 8); lh.writeUInt16LE(0, 10); lh.writeUInt16LE(dosDate, 12); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(nb.length, 26);
  parts.push(lh, nb, comp);
  const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(8, 10); ch.writeUInt16LE(0, 12); ch.writeUInt16LE(dosDate, 14); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(nb.length, 28); ch.writeUInt32LE(offset, 42);
  central.push(ch, nb); offset += 30 + nb.length + comp.length;
}
const cd = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
fs.writeFileSync('dist/aurora-public_html.zip', Buffer.concat([...parts, cd, end]));
console.log(`Built dist/aurora-public_html.zip (${files.length} files). Upload and extract it into public_html.`);
