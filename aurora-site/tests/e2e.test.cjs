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
    // checkout without provider config fails politely in the UI
    await page.goto(site + '/pricing/'); await page.click('.priceband .pricecard button:has-text("card")'); await page.waitForSelector('.msg.err');
    console.log('MSG', await page.textContent('.msg.err')); check('checkout shows a friendly message when payments are not configured yet', /temporarily unavailable/i.test(await page.textContent('.msg.err')));
    console.log('\n' + passed + ' e2e checks passed');
  } finally { await browser.close(); srv.kill(); }
})().catch(e => { console.error(e); srv.kill(); process.exit(1); });
