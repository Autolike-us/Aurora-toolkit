// Settings page, popup and manifest.
const fs = require('node:fs'), path = require('node:path');
const { launch, read, check, done, ROOT } = require('./_pw.cjs');
const OUT = path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const m = JSON.parse(read('manifest.json'));
  check('manifest: Manifest V3, only the "storage" permission, host access to our own site only', m.manifest_version === 3 && JSON.stringify(m.permissions) === '["storage"]' && JSON.stringify(m.host_permissions) === '["https://getaurorastudios.com/*"]');
  check('manifest: content scripts run only on Facebook, Instagram and TikTok', JSON.stringify(m.content_scripts[0].matches) === '["https://*.facebook.com/*","https://*.instagram.com/*","https://*.tiktok.com/*"]' && m.content_scripts.length === 1);
  check('manifest: icons exist and no broad "all sites" access is requested', ['16', '32', '48', '128'].every((s) => fs.existsSync(path.join(ROOT, m.icons[s]))) && !/all_urls|\*:\/\/\*\/\*/.test(JSON.stringify(m)));
  check('the code never presses Send: no submit/Enter/click on a Post button anywhere', !/\.submit\(|requestSubmit|key:\s*'Enter'|dispatchEvent\(new KeyboardEvent/.test(read('content/panel.js') + read('content/adapters.js')));
  check('the Anthropic key is not in the extension', !/sk-ant|api\.anthropic\.com|x-api-key/i.test(['background.js', 'content/panel.js', 'content/adapters.js', 'options.js', 'popup.js'].map(read).join('\n')));

  const b = await launch(); const ctx = await b.newContext({ viewport: { width: 1000, height: 1100 } }); const pg = await ctx.newPage(); pg.on('pageerror', (e) => { throw e; });
  const stub = () => {
    const store = {}; window.__store = store; window.__msgs = [];
    window.chrome = {
      storage: { local: { get: async (k) => { const o = {}; [].concat(k).forEach((x) => { if (x in store) o[x] = store[x]; }); return o; }, set: async (o) => Object.assign(store, o) } },
      runtime: { openOptionsPage: () => { window.__msgs.push('opts'); }, sendMessage: (m, cb) => { window.__msgs.push(m); setTimeout(() => {
        if (m.type === 'status') cb(store.licenseKey === 'AUR-GOOD-GOOD-GOOD' ? { ok: true, status: 'active', usage: { used: 12, limit: 1500, resetsAt: '2026-11-01T00:00:00Z' } } : { ok: false, message: 'License key not found. Check it on your Aurora account page.' });
        else if (m.type === 'draft') cb({ ok: true, drafts: [{ text: 'Sundays are pick-up only 🥖' }, { text: 'Tue–Sat we deliver!' }, { text: 'DM us your address.' }], flag: 'none', note: '', usage: { used: 13, limit: 1500, resetsAt: '2026-11-01T00:00:00Z' } });
        else if (m.type === 'getState') cb({ ok: true, hasKey: !!store.licenseKey, voiceReady: !!(store.voice && store.voice.samples && store.voice.samples.length), usage: store.usage || null });
        else cb({ ok: true }); }, 20); } },
    };
  };
  const page = async (file, html = true) => { await pg.route('**/*', (r) => r.fulfill({ contentType: 'text/html; charset=utf-8', body: read(file).replace(/<link rel="stylesheet" href="ui.css">/, '<style>' + read('ui.css') + '</style>').replace(/<script src="[^"]*"><\/script>/, '').replace(/<img src="icons\/[^"]*"[^>]*>/g, '') })); await pg.goto('https://x.test/' + file); await pg.evaluate(stub); await pg.addScriptTag({ content: read(file.replace('.html', '.js')) }); await pg.waitForTimeout(200); };
  await page('options.html');
  check('settings: starts with a friendly "add your key" state', /Add your key to start/.test(await pg.textContent('#keyStatus')) && (await pg.isHidden('#meter')));
  await pg.fill('#key', 'aur-bad0-bad0-bad0'); await pg.click('#check'); await pg.waitForTimeout(150);
  check('settings: a wrong key shows the server\'s message', /not found/i.test(await pg.textContent('#keyStatus')) && (await pg.evaluate(() => window.__store.licenseKey)) === 'AUR-BAD0-BAD0-BAD0');
  await pg.fill('#key', 'AUR-GOOD-GOOD-GOOD'); await pg.click('#check'); await pg.waitForTimeout(150);
  check('settings: a good key shows "accepted" and the monthly usage meter', /accepted/i.test(await pg.textContent('#keyStatus')) && !(await pg.isHidden('#meter')) && /12 of 1500/.test(await pg.textContent('#meterText')) && /November 1/.test(await pg.textContent('#meterText')));
  await pg.fill('#name', 'Sunrise Bakery'); await pg.fill('#samples', 'Thank you Sam! See you Saturday 🥖\n\nGreat question — we are open until 3pm!\n'); await pg.fill('#about', 'Open Tue–Sun 7am–3pm.');
  await pg.click('#tones [data-t="playful"]'); await pg.selectOption('#emoji', 'some'); await pg.selectOption('#length', 'medium'); await pg.fill('#language', 'Spanish'); await pg.fill('#avoid', 'never promise a discount');
  await pg.waitForTimeout(900);
  const v = await pg.evaluate(() => window.__store.voice);
  check('settings: every voice field is saved automatically (blank lines ignored, max 20 examples)', v.name === 'Sunrise Bakery' && v.samples.length === 2 && v.about.startsWith('Open Tue') && v.tone === 'playful' && v.emoji === 'some' && v.length === 'medium' && v.language === 'Spanish' && v.avoid.startsWith('never'));
  check('settings: shows a count of saved examples and a "Saved" tick', /2 examples saved/.test(await pg.textContent('#sampleCount')));
  await pg.fill('#samples', Array.from({ length: 30 }, (_, i) => 'reply ' + i).join('\n')); await pg.waitForTimeout(800);
  check('settings: examples are capped at 20', (await pg.evaluate(() => window.__store.voice.samples.length)) === 20);
  await pg.fill('#tryText', 'Do you deliver on Sundays?'); await pg.click('#try'); await pg.waitForTimeout(250);
  const tryMsg = await pg.evaluate(() => window.__msgs.filter((m) => m.type === 'draft')[0]);
  check('settings: "Try it" shows three drafts and updates the meter', (await pg.locator('#tryOut .draft').count()) === 3 && tryMsg.comment.text === 'Do you deliver on Sundays?' && /13 of 1500/.test(await pg.textContent('#meterText')));
  await pg.screenshot({ path: path.join(OUT, 'options.png'), fullPage: true });
  check('settings: no sideways scrolling on a narrow window', await (async () => { await pg.setViewportSize({ width: 380, height: 900 }); return pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1); })());

  await pg.unroute('**/*'); await pg.setViewportSize({ width: 340, height: 420 });
  await page('popup.html');
  check('popup: shows the steps and "Ready" once a key is saved', /Open a post/.test(await pg.textContent('.steps')) && /Add your key/.test(await pg.textContent('#st')));
  await pg.evaluate(() => { window.__store.licenseKey = 'AUR-GOOD-GOOD-GOOD'; window.__store.usage = { used: 12, limit: 1500 }; });
  await pg.reload(); await pg.evaluate(stub); await pg.evaluate(() => { window.__store.licenseKey = 'AUR-GOOD-GOOD-GOOD'; window.__store.usage = { used: 12, limit: 1500 }; }); await pg.addScriptTag({ content: read('popup.js') }); await pg.waitForTimeout(150);
  check('popup: with a key it says Ready and shows usage', /Ready/.test(await pg.textContent('#st')) && /12 of 1500/.test(await pg.textContent('#st')));
  await b.close(); done();
})();
