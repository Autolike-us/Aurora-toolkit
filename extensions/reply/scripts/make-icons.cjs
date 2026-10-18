// Renders the Aurora Reply icon (sunset coral-to-orange speech bubble with the Aurora sparkle) at 16/32/48/128. node scripts/make-icons.cjs
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('node:fs'), path = require('node:path');
const exe = fs.readdirSync('/opt/pw-browsers').filter((d) => /^chromium-/.test(d)).map((d) => `/opt/pw-browsers/${d}/chrome-linux/chrome`)[0];
const svg = (s) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f97316"/><stop offset="1" stop-color="#fbbf24"/></linearGradient></defs>
<rect x="6" y="6" width="116" height="116" rx="30" fill="#16120d"/>
<path d="M30 36h68a10 10 0 0 1 10 10v38a10 10 0 0 1-10 10H70L50 110V94H30a10 10 0 0 1-10-10V46a10 10 0 0 1 10-10z" fill="url(#g)"/>
<path d="M64 46c1.6 11 7 17 18 19-11 2-16.4 8-18 19-1.6-11-7-17-18-19 11-2 16.4-8 18-19z" fill="#16120d"/>
<path d="M88 44c.6 4 2.6 6.2 6.5 7-3.9.8-5.9 3-6.5 7-.6-4-2.6-6.2-6.5-7 3.9-.8 5.9-3 6.5-7z" fill="#16120d"/></svg>`;
(async () => {
  const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  for (const s of [16, 32, 48, 128]) {
    const pg = await b.newPage({ viewport: { width: s, height: s } });
    await pg.setContent(`<body style="margin:0;background:transparent">${svg(s)}</body>`);
    await pg.screenshot({ path: path.join(__dirname, '..', 'icons', `icon${s}.png`), omitBackground: true, clip: { x: 0, y: 0, width: s, height: s } });
    await pg.close();
  }
  await b.close(); console.log('icons written');
})();
