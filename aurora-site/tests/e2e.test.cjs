// End-to-end in a real browser: the exported site + the PHP API on a temporary SQLite database.
//   npm run build:e2e && node tests/e2e.test.cjs      (needs php and Chromium)
const { chromium } = require('playwright'), { spawn, execFileSync } = require('node:child_process'), fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const ROOT = path.join(__dirname, '..'), port = 20000 + Math.floor(Math.random() * 9000), site = `http://127.0.0.1:${port}`;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-e2e-'));
const cfg = execFileSync('php', [path.join(ROOT, 'hostgator/tests/setup.php'), dir, site]).toString().trim();
const srv = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', path.join(ROOT, 'out'), path.join(ROOT, 'hostgator/tests/dev-router.php')], { env: { ...process.env, AURORA_CONFIG: cfg }, stdio: 'ignore' });
let passed = 0; const check = (n, v) => { assert(v, n); passed++; console.log('PASS ' + n); };
const mails = () => (fs.existsSync(dir + '/mail.log') ? fs.readFileSync(dir + '/mail.log', 'utf8').trim().split('\n').map(l => JSON.parse(l)) : []);
(async () => {
  await new Promise(r => setTimeout(r, 800));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  try {
    const page = await (await browser.newContext()).newPage(); page.setDefaultTimeout(15000); page.on('pageerror', e => { throw e; });
    await page.goto(site + '/signup/');
    await page.fill('#email', 'e2e@example.com'); await page.fill('#password', 'a good passphrase 1'); await page.click('button.primary');
    await page.waitForSelector('.msg.ok');
    check('signing up shows "check your email"', /confirmation link/i.test(await page.textContent('.msg.ok')));
    const link = /(https?:\/\/[^\s]+\/verify\/\?token=[a-f0-9]+)/.exec(mails().pop().text)[1];
    await page.goto(link);
    await page.waitForURL('**/account/'); await page.waitForSelector('.key');
    check('the email link signs you in and shows the account page with the license key and trial', /AUR-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/.test(await page.textContent('.key')) && /FREE TRIAL/i.test(await page.textContent('.status')));
    check('the nav shows "My account" when signed in', /My account/.test(await page.textContent('header.nav')));
    const key = (await page.textContent('.key span')).trim();
    fs.writeFileSync(dir + '/releases/aurora-instagram-latest.zip', 'PK-e2e');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('.dl .item:nth-child(2) button')]);
    check('a trial user downloads the Instagram zip', fs.readFileSync(await dl.path(), 'utf8') === 'PK-e2e');
    await page.click('text=Log out'); await page.waitForURL(site + '/');
    check('logging out signs you out', /Sign in/.test(await page.textContent('header.nav')));
    await page.goto(site + '/account/'); await page.waitForURL('**/login/');
    check('the account page sends logged-out visitors to log in', true);
    await page.fill('#email', 'e2e@example.com'); await page.fill('#password', 'wrong password'); await page.click('button.primary');
    await page.waitForSelector('.msg.err'); check('a wrong password shows an error', /not right/i.test(await page.textContent('.msg.err')));
    await page.fill('#password', 'a good passphrase 1'); await page.click('button.primary'); await page.waitForURL('**/account/'); await page.waitForSelector('.key');
    check('logging in again shows the same license key', (await page.textContent('.key span')).trim() === key);
    // forgot + reset
    await page.click('text=Log out'); await page.goto(site + '/login/'); await page.fill('#email', 'e2e@example.com'); await page.click('text=Forgot password?'); await page.waitForSelector('.msg.ok');
    const reset = /(https?:\/\/[^\s]+\/reset\/\?token=[a-f0-9]+)/.exec(mails().pop().text)[1];
    await page.goto(reset); await page.fill('#pw', 'a brand new passphrase 2'); await page.click('button.primary'); await page.waitForURL('**/account/'); await page.waitForSelector('.key');
    check('the reset link lets you choose a new password and signs you in', true);
    // license check by an extension (plain HTTP, as the extension would)
    const res = await page.evaluate(async ([k]) => { const r = await fetch('/api/license/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k, product: 'tiktok', installId: 'e2e-install-1' }) }); return { status: r.status, body: await r.json() }; }, [key]);
    check('the extension license check accepts the trial key', res.status === 200 && res.body.status === 'trial' && res.body.token.split('.').length === 3);
    // no payment provider configured: the pricing page does not offer broken buttons
    await page.goto(site + '/pricing/'); await page.waitForSelector('.priceband .pricecard');
    await page.waitForFunction(() => /Subscriptions open very soon/.test(document.body.textContent));
    check('with no payment provider configured the pricing page says subscriptions open soon and shows no pay buttons', (await page.locator('.priceband .pricecard button:has-text("Subscribe")').count()) === 0);
    // PayPal configured (fake credentials): only the PayPal button shows, and checkout fails politely because PayPal cannot be reached here
    fs.writeFileSync(cfg, fs.readFileSync(cfg, 'utf8').replace('return array (', "return array ('paypal_client_id' => 'x', 'paypal_client_secret' => 'y', 'paypal_plan_bundle' => 'P-1', 'paypal_plan_bundle_launch' => 'P-2', 'paypal_plan_facebook' => 'P-3', "));
    await page.waitForTimeout(2500); // PHP's opcache re-reads a changed config file after about 2 seconds
    await page.goto(site + '/pricing/'); await page.waitForSelector('.priceband .pricecard button:has-text("PayPal")');
    check('once PayPal is configured only the PayPal button is offered (no card button)', (await page.locator('.priceband .pricecard button:has-text("card")').count()) === 0);
    await page.click('.priceband .pricecard button:has-text("PayPal")'); await page.waitForSelector('.msg.err');
    console.log('MSG', await page.textContent('.msg.err')); check('checkout shows a friendly message when the payment provider cannot be reached', /temporarily unavailable/i.test(await page.textContent('.msg.err')));
    // ---- free extension + Telegram support channel
    const TG = 'https://t.me/+GqmNSvnMJxhhMzJh';
    await page.goto(site + '/extract/');
    check('the Aurora Extract page presents the free extension with a direct download link', /Aurora\s*Extract/.test(await page.textContent('h1')) && (await page.getAttribute('a[download]', 'href')) === '/downloads/aurora-extract-latest.zip' && /Free/.test(await page.textContent('.freetag')));
    const zres = await page.request.get(site + '/downloads/aurora-extract-latest.zip');
    const buf = await zres.body();
    check('the download is a real zip containing the extension manifest', zres.ok() && buf.slice(0, 2).toString() === 'PK' && buf.includes(Buffer.from('manifest.json')));
    check('the bundled extension includes the Health check (core/audit.js) and the page shows the current version', buf.includes(Buffer.from('core/audit.js')) && /v0\.4\.0/.test(await page.textContent('.cta')));
    check('the extract page features the Health check: five checks, a sample report image that loads, and it is linked from the top', (await page.locator('#health .auditx-item').count()) === 5 && (await page.locator('#health img').evaluate((i) => i.complete && i.naturalWidth > 500)) && (await page.locator('.xhero a[href="#health"]').count()) === 1);
    check('the extract FAQ explains the Health check and says it uses no AI service', /Health check/.test(await page.textContent('main')) && /no AI service/.test(await page.textContent('main')));
    check('the extract page lists all three platforms and the export formats', (await page.locator('.xcard').count()) === 3 && /Excel/.test(await page.textContent('.xexports')));
    await page.goto(site + '/');
    check('the home page features the free extension with a download button', (await page.locator('#free a[download]').count()) === 1 && /Aurora Extract/.test(await page.textContent('#free')));
    check('the nav links to the free extractor', await page.locator('header.nav a[href="/extract/"]').count() === 1);
    check('the footer links to the Telegram channel, support page and extractor', (await page.locator(`footer.site a[href="${TG}"]`).count()) === 1 && (await page.locator('footer.site a[href="/support/"]').count()) === 1 && (await page.locator('footer.site a[href="/extract/"]').count()) === 1);
    await page.goto(site + '/support/');
    check('the support page offers the Telegram channel and the support email', (await page.getAttribute(`a[href="${TG}"]`, 'href')) === TG && /support@getaurorastudios.com/.test(await page.textContent('main')));
    await page.goto(site + '/reply/');
    check('Aurora Reply has its own page with the steps, the features, the privacy promise and the Telegram link', /Aurora/.test(await page.textContent('h1')) && (await page.locator('.rstep').count()) === 3 && (await page.locator('.rfeat .rf').count()) === 8 && /never presses Send/.test(await page.textContent('.rcallout')) && (await page.locator(`a[href="${TG}"]`).count()) >= 1);
    check('the nav and the footer link to Aurora Reply, and the home page advertises it', (await page.locator('header.nav a[href="/reply/"]').count()) === 1 && (await page.locator('footer.site a[href="/reply/"]').count()) === 1 && await (async () => { await page.goto(site + '/'); return (await page.locator('#reply .replybanner').count()) === 1; })());
    await page.goto(site + '/download/');
    check('the download page offers the free extension without needing an account', (await page.locator('.freebanner a[download]').count()) === 1);
    await page.goto(site + '/legal/privacy/');
    check('the privacy policy covers the free extension and no longer names old providers', /Aurora Extract/.test(await page.textContent('main')) && !/Supabase|Vercel/.test(await page.textContent('main')));
    // ---- theme switch, social-preview tags, robots/sitemap, mobile fit
    await page.goto(site + '/');
    check('the site starts in the LIGHT theme', await page.evaluate(() => document.documentElement.dataset.theme === undefined && getComputedStyle(document.documentElement).getPropertyValue('--paper').trim() === '#fbf9f6'));
    check('the header has a theme switch with an accessible name', /dark theme/i.test(await page.getAttribute('[data-theme-toggle]', 'aria-label')));
    await page.click('[data-theme-toggle]');
    check('clicking it switches to dark, remembers the choice, and the colours really change', await page.evaluate(() => document.documentElement.dataset.theme === 'dark' && localStorage.getItem('aurora-theme') === 'dark' && getComputedStyle(document.documentElement).getPropertyValue('--paper').trim() === '#0f0d19' && getComputedStyle(document.body).color !== 'rgb(29, 26, 38)'));
    await page.goto(site + '/pricing/');
    check('the dark choice persists on other pages and after navigation (no flash back to light)', await page.evaluate(() => document.documentElement.dataset.theme === 'dark') && /light theme/i.test(await page.getAttribute('[data-theme-toggle]', 'aria-label')));
    const contrast = await page.evaluate(() => { const v = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(); const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }; const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }; return ['--ink', '--muted', '--faint', '--accent'].map((t) => cr(v(t), v('--paper'))); });
    check('dark theme text colours meet 4.5:1 contrast on the page background', contrast.every((c) => c >= 4.5));
    await page.click('[data-theme-toggle]');
    check('switching back returns to light and remembers it', await page.evaluate(() => document.documentElement.dataset.theme === undefined && localStorage.getItem('aurora-theme') === 'light'));
    const lightContrast = await page.evaluate(() => { const v = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(); const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }; const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }; return ['--ink', '--muted', '--faint', '--accent'].map((t) => cr(v(t), v('--paper'))); });
    check('light theme text colours meet 4.5:1 contrast too (small grey text fixed)', lightContrast.every((c) => c >= 4.5));
    await page.goto(site + '/extract/');
    check('pages carry a canonical link and a social-preview image on the real domain', /^https:\/\/getaurorastudios\.com\/extract\/$/.test(await page.getAttribute('link[rel=canonical]', 'href')) && /^https:\/\/getaurorastudios\.com\/og\.png$/.test(await page.getAttribute('meta[property="og:image"]', 'content')) && (await page.getAttribute('meta[name="twitter:card"]', 'content')) === 'summary_large_image');
    const robots = await (await page.request.get(site + '/robots.txt')).text(), smap = await (await page.request.get(site + '/sitemap.xml')).text();
    check('robots.txt hides account/API pages and points at the sitemap', /Disallow: \/account\//.test(robots) && /Sitemap: https:\/\/getaurorastudios\.com\/sitemap\.xml/.test(robots));
    check('the sitemap lists the public pages including the free extractor and support', /\/extract\//.test(smap) && /\/support\//.test(smap) && /\/pricing\//.test(smap) && !/\/account\//.test(smap));
    const og = await page.request.get(site + '/og.png');
    check('the social-preview image exists and is a PNG', og.ok() && (await og.body()).slice(1, 4).toString() === 'PNG');
    const mob = await (await browser.newContext({ viewport: { width: 390, height: 800 } })).newPage();
    for (const u of ['/', '/pricing/', '/support/', '/extract/', '/reply/', '/download/', '/signup/']) { await mob.goto(site + u); check(`no sideways scrolling on a phone: ${u}`, await mob.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); }
    console.log('\n' + passed + ' e2e checks passed');
  } finally { await browser.close(); srv.kill(); }
})().catch(e => { console.error(e); srv.kill(); process.exit(1); });
