// The real unpacked extension in Chromium: service worker, settings, and a full draft on a page that pretends to be Instagram —
// the "server" is a stub that records exactly what the extension sends.
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('node:path'), fs = require('node:fs'), os = require('node:os');
const { IG } = require('./fixtures.cjs');
const ROOT = path.join(__dirname, '..');
const ok = (m) => console.log('PASS ' + m); const need = (c, m) => { if (!c) { console.error('FAIL ' + m); process.exit(1); } ok(m); };
(async () => {
  const exe = fs.readdirSync('/opt/pw-browsers').filter((d) => /^chromium-/.test(d)).map((d) => `/opt/pw-browsers/${d}/chrome-linux/chrome`).find(fs.existsSync);
  const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'ar-')), { executablePath: exe, headless: false, args: ['--headless=new', '--no-sandbox', `--disable-extensions-except=${ROOT}`, `--load-extension=${ROOT}`] });
  const sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker', { timeout: 15000 });
  const id = sw.url().split('/')[2]; ok('service worker is up ' + id);
  // a local stand-in for getaurorastudios.com/api (the extension's background worker is pointed at it through the "apiBase" setting)
  const http = require('node:http'); const calls = [];
  const srv = http.createServer((req, res) => {
    const h = { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'Content-Type', 'access-control-allow-methods': 'POST, OPTIONS' };
    if (req.method === 'OPTIONS') { res.writeHead(204, h); return res.end(); }
    let raw = ''; req.on('data', (d) => (raw += d)); req.on('end', () => {
      const body = JSON.parse(raw || '{}'); calls.push({ url: req.url, body });
      if (/\/reply\/status/.test(req.url) && body.key === 'AUR-GOOD-GOOD-GOOD') { res.writeHead(200, h); return res.end(JSON.stringify({ ok: true, status: 'active', usage: { used: 1, limit: 1500, resetsAt: '2026-11-01T00:00:00Z' } })); }
      if (body.key !== 'AUR-GOOD-GOOD-GOOD') { res.writeHead(404, h); return res.end(JSON.stringify({ ok: false, status: 'invalid', message: 'License key not found.' })); }
      res.writeHead(200, h); res.end(JSON.stringify({ ok: true, drafts: [{ text: 'About £4 — thanks for asking!' }, { text: 'Come by and see!' }, { text: 'DM us for details.' }], flag: 'none', note: '', usage: { used: 2, limit: 1500, resetsAt: '2026-11-01T00:00:00Z' } }));
    });
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  await sw.evaluate((p) => chrome.storage.local.set({ apiBase: 'http://127.0.0.1:' + p + '/api' }), srv.address().port);
  await ctx.route('https://www.instagram.com/**', (r) => r.fulfill({ contentType: 'text/html; charset=utf-8', body: IG }));

  const opts = await ctx.newPage(); await opts.goto(`chrome-extension://${id}/options.html`);
  need(/Add your key/.test(await opts.textContent('#keyStatus')), 'settings page opens');
  await opts.fill('#samples', 'Thank you Sam! See you Saturday 🥖\nGreat question — we are open until 3pm!'); await opts.fill('#about', 'Loaf £4. Open Tue–Sun.'); await opts.click('#tones [data-t="warm"]');
  await opts.fill('#key', 'AUR-GOOD-GOOD-GOOD'); await opts.click('#check'); await opts.waitForFunction(() => /accepted/i.test(document.querySelector('#keyStatus').textContent), null, { timeout: 8000 });
  need(/1 of 1500/.test(await opts.textContent('#meterText')), 'a key is checked against the server and the usage shows');
  await opts.waitForTimeout(800);
  const stored = await sw.evaluate(() => chrome.storage.local.get(['voice', 'licenseKey', 'installId']));
  need(stored.licenseKey === 'AUR-GOOD-GOOD-GOOD' && stored.voice.samples.length === 2 && stored.voice.tone === 'warm' && stored.installId && stored.installId.length >= 8, 'key, voice and an install id are stored in the browser');

  const page = await ctx.newPage(); await page.goto('https://www.instagram.com/p/ABC/'); await page.waitForSelector('button.pill', { timeout: 8000 });
  need(/2/.test(await page.textContent('button.pill')), 'the launcher shows up on the page with the comment count');
  await page.click('button.pill'); await page.locator('[data-draft="1"]').click(); await page.waitForSelector('textarea.dt', { timeout: 8000 });
  const draftCall = calls.filter((c) => /\/reply\/draft/.test(c.url)).pop();
  need(draftCall && draftCall.body.key === 'AUR-GOOD-GOOD-GOOD' && draftCall.body.comment.text.includes('whole loaf') && draftCall.body.comment.author === 'tom_b' && draftCall.body.platform === 'instagram' && draftCall.body.voice.samples.length === 2 && draftCall.body.voice.about.includes('Loaf £4') && draftCall.body.installId === stored.installId, 'the draft request carries exactly the comment, the post, the voice and the key');
  need(!JSON.stringify(draftCall.body).match(/cookie|password|token/i), 'the request contains no cookies, passwords or tokens');
  need((await page.locator('textarea.dt').count()) === 3 && /2 of 1500/.test(await page.textContent('.hd')), 'three drafts come back and the usage meter updates');
  await page.locator('[data-use="0"]').click(); await page.waitForTimeout(700);
  const res = await page.evaluate(() => ({ v: document.getElementById('box').value, ev: window.__events }));
  need(res.v === '@tom_b About £4 — thanks for asking!' && res.ev.length === 0, 'the chosen reply is in the box with the @mention — and nothing was sent');
  await opts.fill('#key', 'AUR-BAD0-BAD0-BAD0'); await opts.click('#check'); await opts.waitForFunction(() => /not found/i.test(document.querySelector('#keyStatus').textContent), null, { timeout: 8000 });
  need(true, 'a wrong key is refused with the server\'s message');
  const pop = await ctx.newPage(); await pop.goto(`chrome-extension://${id}/popup.html`); await pop.waitForTimeout(400);
  need(/Open a post/.test(await pop.textContent('.steps')), 'the toolbar popup opens');
  await ctx.close(); srv.close(); console.log('\nreal-extension smoke passed');
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
