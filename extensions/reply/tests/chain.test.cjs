// Whole chain, nothing stubbed on our side:  real extension  ->  real PHP API (SQLite)  ->  stand-in for the AI service.
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('node:path'), fs = require('node:fs'), os = require('node:os'), { execSync, execFileSync } = require('node:child_process');
const { IG } = require('./fixtures.cjs');
const ROOT = path.join(__dirname, '..'), HG = path.join(ROOT, '..', '..', 'aurora-site', 'hostgator');
const ok = (m) => console.log('PASS ' + m); const need = (c, m) => { if (!c) { console.error('FAIL ' + m); cleanup(); process.exit(1); } ok(m); };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chain-')); const pids = [];
const cleanup = () => pids.forEach((p) => { try { process.kill(p, 'SIGTERM'); } catch (_) {} });
(async () => {
  const aport = 21000 + Math.floor(Math.random() * 3000), mport = aport + 4000;
  execFileSync('php', [path.join(HG, 'tests', 'setup.php'), tmp, `http://127.0.0.1:${aport}`], { stdio: 'ignore' });
  execFileSync('php', ['-r', `$f='${tmp}/config.php';$c=require $f;$c['anthropic_api_key']='sk-ant-chain-test';$c['anthropic_base_url']='http://127.0.0.1:${mport}';$c['reply_monthly_quota']=50;file_put_contents($f,'<?php return '.var_export($c,true).';');`]);
  fs.writeFileSync(path.join(tmp, 'aurora-master-keys.json'), JSON.stringify({ 'AUR-CHAI-NTST-0001': { note: 'chain test', until: null, products: ['reply'], quota: 4 } }));
  const start = (cmd, env) => { const p = execSync(`${env} nohup ${cmd} > /dev/null 2>&1 & echo $!`, { shell: '/bin/bash' }).toString().trim(); pids.push(+p); };
  start(`php -S 127.0.0.1:${mport} ${path.join(HG, 'tests', 'mock-anthropic.php')}`, `MOCK_LOG=${tmp}/anthropic.log`);
  start(`php -S 127.0.0.1:${aport} ${path.join(HG, 'api', 'index.php')}`, `AURORA_CONFIG=${tmp}/config.php`);
  await new Promise((r) => setTimeout(r, 1200));

  const exe = fs.readdirSync('/opt/pw-browsers').filter((d) => /^chromium-/.test(d)).map((d) => `/opt/pw-browsers/${d}/chrome-linux/chrome`).find(fs.existsSync);
  const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'ar-')), { executablePath: exe, headless: false, args: ['--headless=new', '--no-sandbox', `--disable-extensions-except=${ROOT}`, `--load-extension=${ROOT}`] });
  const sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker', { timeout: 15000 });
  const id = sw.url().split('/')[2];
  await sw.evaluate((p) => chrome.storage.local.set({ apiBase: 'http://127.0.0.1:' + p + '/api' }), aport);
  await ctx.route('https://www.instagram.com/**', (r) => r.fulfill({ contentType: 'text/html; charset=utf-8', body: IG }));

  const opts = await ctx.newPage(); await opts.goto(`chrome-extension://${id}/options.html`); await opts.waitForSelector('[data-tour=skip]', { timeout: 8000 }); await opts.click('[data-tour=skip]');
  await opts.click('.nav[data-view=settings]'); await opts.fill('#key', 'AUR-CHAI-NTST-0001'); await opts.click('.nav[data-view=voice]'); await opts.fill('#samples', 'Thank you Sam! See you Saturday 🥖'); await opts.fill('#about', 'Loaf £4. Open Tue–Sun.'); await opts.waitForTimeout(700);
  await opts.click('.nav[data-view=settings]'); await opts.click('#check'); await opts.waitForFunction(() => /accepted/i.test(document.querySelector('#keyStatus').textContent), null, { timeout: 8000 });
  need(/0 of 4/.test(await opts.textContent('#meterText')), 'the real PHP server accepts the key (CORS and payload fine) and reports 0 of 4 drafts used');

  const page = await ctx.newPage(); await page.goto('https://www.instagram.com/p/ABC/'); await page.waitForSelector('button.pill', { timeout: 8000 });
  await page.click('button.pill'); await page.locator('[data-draft="0"]').click(); await page.waitForSelector('textarea.dt', { timeout: 10000 });
  const drafts = await page.locator('textarea.dt').evaluateAll((a) => a.map((x) => x.value));
  need(drafts.length === 3 && drafts[0] === 'Thanks so much! 😊' && /3 of 4/.test(await page.textContent('.hd')), 'three drafts come back through the whole chain and the meter says 3 of 4');
  const log = fs.readFileSync(path.join(tmp, 'anthropic.log'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  const req = log[log.length - 1]; const user = req.body.messages[0].content;
  need(req.headers['x-api-key'] === 'sk-ant-chain-test' && /Do you deliver on Sundays\?/.test(user) && /See you Saturday/.test(user) && /Loaf £4/.test(user) && /Fresh sourdough today/.test(user) && req.body.model === 'claude-haiku-5-5', 'the AI service received the comment, the post, the voice and the server\'s own key');
  need(!/AUR-CHAI|installId|install-/.test(JSON.stringify(req.body)), 'the customer\'s license key and install id are not passed on to the AI service');
  await page.locator('[data-use="1"]').click(); await page.waitForTimeout(600);
  need(await page.evaluate(() => document.getElementById('box').value === '@maya.k Glad you liked it — see you soon!' && window.__events.length === 0), 'the chosen reply is inserted, nothing is sent');
  const hx = await sw.evaluate(async () => (await chrome.storage.local.get('history')).history[0]);
  need(hx.action === 'inserted' && /Glad you liked it/.test(hx.chosen) && hx.edited === false, 'a reply put in the box is marked Used in the history, and not marked edited');
  await page.evaluate(() => { document.getElementById('box').value = ''; }); // the person sent the reply, so the box is empty again
  await page.click('button.pill'); await page.click('#postc'); await page.waitForSelector('textarea.dt', { timeout: 10000 });
  const log2 = fs.readFileSync(path.join(tmp, 'anthropic.log'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)); const u2 = log2[log2.length - 1].body.messages[0].content;
  need(/to leave under the post/.test(u2) && /Fresh sourdough today! #bread/.test(u2) && !/Do you deliver on Sundays\?/.test(u2), 'a new comment under the post goes through the whole chain: the AI is asked to comment on the post, not to reply to a comment');
  const hp = await sw.evaluate(async () => (await chrome.storage.local.get('history')).history[0]);
  need(hp.mode === 'post' && /Fresh sourdough/.test(hp.comment) && hp.author === 'sunrisebakery' && hp.action === 'drafted', 'the history keeps it as a comment on that post');
  need((await page.locator('textarea.dt').count()) === 1 && /4 of 4/.test(await page.textContent('.hd')), 'only the drafts that are left are written (1), and the meter says 4 of 4');
  await page.click('#back'); await page.locator('[data-draft="0"]').click(); await page.waitForSelector('.err', { timeout: 10000 });
  need(/used all 4 drafts/.test(await page.textContent('.err')), 'after the monthly quota the person sees a clear message instead of drafts');
  await ctx.close(); cleanup(); console.log('\nchain test passed');
})().catch((e) => { console.error('FAIL', e.message); cleanup(); process.exit(1); });
