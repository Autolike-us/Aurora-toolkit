// Voice backup, end to end: real extension  ->  real PHP API (SQLite). "Reinstall" = a brand-new browser profile with the same key.
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('node:path'), fs = require('node:fs'), os = require('node:os'), { execSync, execFileSync } = require('node:child_process');
const ROOT = path.join(__dirname, '..'), HG = path.join(ROOT, '..', '..', 'aurora-site', 'hostgator');
const ok = (m) => console.log('PASS ' + m); const need = (c, m) => { if (!c) { console.error('FAIL ' + m); cleanup(); process.exit(1); } ok(m); };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-')); const pids = [];
const cleanup = () => pids.forEach((p) => { try { process.kill(p, 'SIGTERM'); } catch (_) {} });
const KEY = 'AUR-SYNC-TEST-0001';
(async () => {
  const aport = 25000 + Math.floor(Math.random() * 3000);
  execFileSync('php', [path.join(HG, 'tests', 'setup.php'), tmp, `http://127.0.0.1:${aport}`], { stdio: 'ignore' });
  fs.writeFileSync(path.join(tmp, 'aurora-master-keys.json'), JSON.stringify({ [KEY]: { note: 'sync test', until: null, products: ['reply'], quota: 4 } }));
  pids.push(+execSync(`AURORA_CONFIG=${tmp}/config.php nohup php -S 127.0.0.1:${aport} ${path.join(HG, 'api', 'index.php')} > /dev/null 2>&1 & echo $!`, { shell: '/bin/bash' }).toString().trim());
  await new Promise((r) => setTimeout(r, 1200));
  const api = (body) => fetch(`http://127.0.0.1:${aport}/api/reply/sync`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: KEY, installId: 'node-check-1', ...body }) }).then((r) => r.json());
  const exe = fs.readdirSync('/opt/pw-browsers').filter((d) => /^chromium-/.test(d)).map((d) => `/opt/pw-browsers/${d}/chrome-linux/chrome`).find(fs.existsSync);
  const launch = async () => {
    const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'ar-')), { executablePath: exe, headless: false, args: ['--headless=new', '--no-sandbox', `--disable-extensions-except=${ROOT}`, `--load-extension=${ROOT}`] });
    const sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker', { timeout: 15000 });
    await sw.evaluate((p) => chrome.storage.local.set({ apiBase: 'http://127.0.0.1:' + p + '/api' }), aport);
    const opts = await ctx.newPage(); opts.on('dialog', (d) => d.accept('Bakery 2')); await opts.goto(`chrome-extension://${sw.url().split('/')[2]}/options.html`).catch(() => {}); await opts.waitForTimeout(500);
    await opts.waitForSelector('[data-tour=skip]', { timeout: 8000 }); await opts.click('[data-tour=skip]');
    return { ctx, sw, opts };
  };
  const enterKey = async (o) => { await o.click('.nav[data-view=settings]'); await o.fill('#key', KEY); await o.click("#check"); await o.waitForFunction(() => /accepted|not|could|add/i.test(document.querySelector("#keyStatus").textContent && document.querySelector("#keyStatus").textContent), null, { timeout: 8000 }).catch(() => {}); };

  // 1. first browser: set up voices, then a key
  const A = await launch();
  await A.opts.click('.nav[data-view=voice]'); await A.opts.fill('#samples', 'Thank you Sam! See you Saturday 🥖\nGreat question — open until 3pm!'); await A.opts.fill('#about', 'Loaf £4. Open Tue–Sun.'); await A.opts.waitForTimeout(800);
  await A.opts.click('#pnew'); await A.opts.waitForTimeout(300); await A.opts.fill('#about', 'Second brand: cakes'); await A.opts.waitForTimeout(800);
  await A.sw.evaluate(() => chrome.storage.local.set({ quick: [{ id: 'q1', title: 'Thanks', text: 'Thank you so much! 🙏' }] }));
  await enterKey(A.opts);
  await A.opts.waitForFunction(() => /Backed up/.test(document.querySelector('#bkStatus').textContent), null, { timeout: 8000 });
  const saved = (await api({ action: 'get' })).data;
  need(saved && Object.keys(saved.profiles).length === 2 && saved.quick[0].text === 'Thank you so much! 🙏' && JSON.stringify(saved).includes('See you Saturday 🥖'), 'setting a key backs up both voice profiles and the quick replies, accents and emoji intact');
  await A.ctx.close();

  // 2. reinstall: a brand-new browser, same key
  const B = await launch();
  await B.opts.click('.nav[data-view=voice]'); need((await B.opts.inputValue('#samples')) === '', 'a fresh install starts empty');
  await enterKey(B.opts);
  await B.opts.waitForFunction(() => /restored/i.test(document.querySelector('#toast, .toast')?.textContent || ''), null, { timeout: 8000 }).catch(() => {});
  await B.opts.click('.nav[data-view=voice]'); await B.opts.waitForTimeout(500);
  const names = await B.opts.locator('#profile option').allTextContents();
  need(names.length === 2 && names.includes('Bakery 2'), 'after entering the key, both voice profiles come back');
  const st = await B.sw.evaluate(() => chrome.storage.local.get(['voice', 'quick', 'profiles']));
  need(/cakes/.test(st.voice.about) && st.quick.length === 1 && Object.values(st.profiles).some((p) => (p.voice.samples || []).join().includes('See you Saturday 🥖')), 'the restored voice, the other profile and the quick replies are all in the new browser');

  // 3. backup off: edits stay local
  await B.opts.click('.nav[data-view=settings]'); await B.opts.click('#bkToggle [data-b=off]');
  await B.opts.click('.nav[data-view=voice]'); await B.opts.fill('#about', 'CHANGED WHILE OFF'); await B.opts.waitForTimeout(4500);
  need(!JSON.stringify((await api({ action: 'get' })).data).includes('CHANGED WHILE OFF'), 'with backup off, nothing new is sent');
  await B.opts.click('.nav[data-view=settings]'); await B.opts.click('#bkToggle [data-b=on]'); await B.opts.waitForTimeout(1200);
  need(JSON.stringify((await api({ action: 'get' })).data).includes('CHANGED WHILE OFF'), 'turning it back on saves the latest voices');

  // 4. delete all my data also deletes the saved copy and stays deleted
  await B.opts.click('#wipe'); await B.opts.waitForTimeout(800);
  need((await api({ action: 'get' })).data === null, '"Delete all my data" also removes the saved copy from the server');
  await B.ctx.close();
  const C = await launch(); await enterKey(C.opts); await C.opts.waitForTimeout(1500);
  const cs = await C.sw.evaluate(() => chrome.storage.local.get(['voice', 'quick']));
  const cv = cs.voice || {}; need(!(cv.samples || []).length && !(cv.about || '') && !(cs.quick || []).length, 'after deleting, a new install gets nothing back');
  need((await api({ action: 'get' })).data === null, 'and a blank start never writes an empty backup over anything');
  await C.ctx.close(); cleanup(); console.log('\nsync test passed');
})().catch((e) => { console.error('FAIL', e.message); cleanup(); process.exit(1); });
