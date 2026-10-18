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
    const store = { prefs: { onboarded: true, seen: '0.3.1', theme: 'light', history: true } }; window.__store = store; window.__msgs = [];
    window.chrome = {
      storage: { local: { get: async (k) => { const o = {}; [].concat(k).forEach((x) => { if (x in store) o[x] = store[x]; }); return o; }, set: async (o) => Object.assign(store, o) } },
      runtime: { getManifest: () => ({ version: '0.3.1' }), openOptionsPage: () => { window.__msgs.push('opts'); }, sendMessage: (m, cb) => { window.__msgs.push(m); setTimeout(() => {
        if (m.type === 'status') cb(store.licenseKey === 'AUR-GOOD-GOOD-GOOD' ? { ok: true, status: 'active', usage: { used: 12, limit: 1500, resetsAt: '2026-11-01T00:00:00Z' } } : { ok: false, message: 'License key not found. Check it on your Aurora account page.' });
        else if (m.type === 'draft') cb({ ok: true, drafts: [{ text: 'Sundays are pick-up only 🥖' }, { text: 'Tue–Sat we deliver!' }, { text: 'DM us your address.' }], flag: 'none', note: '', usage: { used: 13, limit: 1500, resetsAt: '2026-11-01T00:00:00Z' } });
        else if (m.type === 'getState') cb({ ok: true, hasKey: !!store.licenseKey, voiceReady: !!(store.voice && store.voice.samples && store.voice.samples.length), usage: store.usage || null });
        else cb({ ok: true }); }, 20); } },
    };
  };
  const page = async (file, html = true) => { await pg.route('**/*', (r) => r.fulfill({ contentType: 'text/html; charset=utf-8', body: read(file).replace(/<link rel="stylesheet" href="ui.css">/, '<style>' + read('ui.css') + '</style>').replace(/<script src="[^"]*"><\/script>/g, '').replace(/<img src="icons\/[^"]*"[^>]*>/g, '') })); await pg.goto('https://x.test/' + file); await pg.evaluate(stub); if (file === 'options.html') await pg.addScriptTag({ content: read('profiles.js') }); await pg.addScriptTag({ content: read(file.replace('.html', '.js')) }); await pg.waitForTimeout(200); };
  await page('options.html');
  const nav = async (v) => { await pg.click(`.nav[data-view=${v}]`); await pg.waitForTimeout(60); };
  await nav('settings');
  check('settings: starts with a friendly "add your key" state', /Add your key to start/.test(await pg.textContent('#keyStatus')) && (await pg.isHidden('#meter')));
  await pg.fill('#key', 'aur-bad0-bad0-bad0'); await pg.click('#check'); await pg.waitForTimeout(150);
  check('settings: a wrong key shows the server\'s message', /not found/i.test(await pg.textContent('#keyStatus')) && (await pg.evaluate(() => window.__store.licenseKey)) === 'AUR-BAD0-BAD0-BAD0');
  await pg.fill('#key', 'AUR-GOOD-GOOD-GOOD'); await pg.click('#check'); await pg.waitForTimeout(150);
  check('settings: a good key shows "accepted" and the monthly usage meter', /accepted/i.test(await pg.textContent('#keyStatus')) && !(await pg.isHidden('#meter')) && /12 of 1500/.test(await pg.textContent('#meterText')) && /November 1/.test(await pg.textContent('#meterText')));
  await nav('voice');
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
  await nav('overview');
  check('overview: greets by name, shows usage ring and stats', /Sunrise Bakery/.test(await pg.textContent('#hello')) && /1%|13/.test(await pg.textContent('#stDrafts') + await pg.textContent('#ringNum')));
  await pg.evaluate(() => { const n = Date.now(); window.__store.history = [
    { id: 'a', ts: n - 3600e3, platform: 'instagram', author: 'maya.k', comment: 'Do you deliver on Sundays?', drafts: ['Sundays are pick-up only 🥖', 'No Sunday delivery.', 'Pick-up on Sundays!'], chosen: 'Sundays are pick-up only, see you! 🥖', action: 'inserted', edited: true, tone: 'warm' },
    { id: 'b', ts: n - 2 * 86400e3, platform: 'facebook', author: 'Tom B', comment: 'How much for a loaf?', drafts: ['$4 a loaf', '$4!', 'About $4'], chosen: '$4 a loaf', action: 'copied' },
    { id: 'c', ts: n - 5 * 86400e3, platform: 'tiktok', author: 'chef_ann', comment: 'Recipe please', drafts: ['It is in my bio!', 'Check my bio', 'Link in bio'], chosen: '', action: 'drafted' } ]; });
  await pg.reload(); await pg.evaluate(stub); await pg.evaluate(() => { window.__store.history = [
    { id: 'a', ts: Date.now() - 3600e3, platform: 'instagram', author: 'maya.k', comment: 'Do you deliver on Sundays?', drafts: ['Sundays are pick-up only 🥖', 'No Sunday delivery.', 'Pick-up on Sundays!'], chosen: 'Sundays are pick-up only, see you! 🥖', action: 'inserted', edited: true, tone: 'warm' },
    { id: 'b', ts: Date.now() - 2 * 86400e3, platform: 'facebook', author: 'Tom B', comment: 'How much for a loaf?', drafts: ['$4 a loaf', '$4!', 'About $4'], chosen: '$4 a loaf', action: 'copied' },
    { id: 'c', ts: Date.now() - 5 * 86400e3, platform: 'tiktok', author: 'chef_ann', comment: 'Recipe please', drafts: ['It is in my bio!', 'Check my bio', 'Link in bio'], chosen: '', action: 'drafted' } ];
    window.__store.licenseKey = 'AUR-GOOD-GOOD-GOOD'; window.__store.usage = { used: 13, limit: 1500, resetsAt: '2026-11-01T00:00:00Z' }; window.__store.voice = { name: 'Sunrise Bakery', samples: ['Thanks!'] }; });
  await pg.addScriptTag({ content: read('profiles.js') }); await pg.addScriptTag({ content: read('options.js') }); await pg.waitForTimeout(250);
  check('overview: stats come from history (2 replies used, 100% edited) and the setup card is done', (await pg.textContent('#stIns')) === '2' && (await pg.textContent('#stEdit')) === '100%' && (await pg.isHidden('#setupCard')));
  check('overview: activity chart has 14 bars and platform split lists 3 platforms', (await pg.locator('#bars i').count()) === 14 && (await pg.locator('#split .hbar').count()) === 3 && (await pg.locator('#recent .h').count()) === 3);
  check('overview: shows the three supported platforms and that DMs are not supported', (await pg.locator('#plats .plat').count()) === 3 && /private messages/.test(await pg.textContent('#view-overview')));
  check('light theme: the sidebar is light too', await pg.evaluate(() => { const c = getComputedStyle(document.querySelector('.side')).backgroundColor.match(/\d+/g).map(Number); return c[0] > 240 && c[1] > 240; }));
  check('overview: advertises the other Aurora tools (Extract free + the three studios)', (await pg.locator('#more .plat').count()) === 4 && /Aurora Extract/.test(await pg.textContent('#more')) && /3-day trial/.test(await pg.textContent('#more')));
  check('the default theme is light', (await pg.evaluate(() => document.documentElement.dataset.theme)) === 'light');
  await pg.screenshot({ path: path.join(OUT, 'overview.png'), fullPage: true });
  await nav('history');
  check('history: lists every draft with status badges and the nav count', (await pg.locator('#hlist .h').count()) === 3 && (await pg.textContent('#navHist')) === '3' && /Used · edited/.test(await pg.textContent('#hlist .h')) );
  await pg.fill('#hq', 'loaf'); await pg.waitForTimeout(80);
  check('history: search finds by comment text', (await pg.locator('#hlist .h').count()) === 1 && /Tom B/.test(await pg.textContent('#hlist')));
  await pg.fill('#hq', ''); await pg.selectOption('#hplat', 'tiktok'); await pg.waitForTimeout(80);
  check('history: platform filter works', (await pg.locator('#hlist .h').count()) === 1);
  await pg.selectOption('#hplat', ''); await pg.selectOption('#hstat', 'inserted'); await pg.waitForTimeout(80);
  check('history: status filter works', (await pg.locator('#hlist .h').count()) === 1);
  await pg.selectOption('#hstat', ''); await pg.locator('#hlist .h').first().locator('[data-act=fav]').click(); await pg.waitForTimeout(80);
  check('history: starring saves a favourite and the favourites filter shows it', (await pg.evaluate(() => window.__store.history[0].fav)) === true && (await (async () => { await pg.click('#hfav'); await pg.waitForTimeout(60); return (await pg.locator('#hlist .h').count()) === 1; })()));
  await pg.click('#hfav'); await pg.locator('#hlist .h').nth(2).locator('[data-act=quick]').click(); await pg.waitForTimeout(80);
  check('history: "Save as quick reply" adds it to Quick replies', (await pg.evaluate(() => (window.__store.quick || []).length)) === 1);
  await pg.screenshot({ path: path.join(OUT, 'history.png'), fullPage: true });
  await pg.locator('#hlist .h').nth(1).locator('[data-act=del]').click(); await pg.waitForTimeout(80);
  check('history: delete removes one entry', (await pg.evaluate(() => window.__store.history.length)) === 2);
  await nav('quick');
  await pg.click('#qstarters [data-starter="1"]'); await pg.click('#qadd'); await pg.waitForTimeout(80);
  check('quick replies: a starter can be added, and the list shows both', (await pg.locator('#qlist .qr').count()) === 2 && /Shipping/.test(await pg.textContent('#qlist')));
  await pg.screenshot({ path: path.join(OUT, 'quick.png'), fullPage: true });
  await pg.locator('#qlist .qr [data-qact=del]').first().click(); await pg.waitForTimeout(60);
  check('quick replies: delete works', (await pg.locator('#qlist .qr').count()) === 1);
  await nav('settings'); await pg.click('#theme [data-th=dark]'); await pg.click('#histToggle [data-h=off]'); await pg.waitForTimeout(80);
  check('settings: dark theme and history-off are remembered', (await pg.evaluate(() => document.documentElement.dataset.theme)) === 'dark' && (await pg.evaluate(() => window.__store.prefs.history)) === false);
  await pg.screenshot({ path: path.join(OUT, 'settings-dark.png'), fullPage: true });
  await pg.click('#theme [data-th=light]');
  check('settings: no sideways scrolling on a narrow window', await (async () => { await pg.setViewportSize({ width: 380, height: 900 }); return pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1); })());


  // ---- v0.3: profiles, tour, what's new, help
  await nav('voice');
  check('profiles: starts with one profile ("Main") and cannot delete the last one', (await pg.locator('#profile option').count()) === 1 && (await pg.isDisabled('#pdel')));
  await pg.fill('#name', 'Sunrise Bakery'); await pg.waitForTimeout(700);
  pg.once('dialog', (d) => d.accept('Harbor Coffee')); await pg.click('#pnew'); await pg.waitForTimeout(300);
  check('profiles: a new profile starts with an empty voice and becomes active', (await pg.locator('#profile option').count()) === 2 && (await pg.inputValue('#name')) === '' && /Harbor Coffee/.test(await pg.textContent('#profile')));
  await pg.fill('#name', 'Harbor Coffee Co.'); await pg.waitForTimeout(700);
  await pg.selectOption('#profile', { label: 'Main' }); await pg.waitForTimeout(300);
  check('profiles: switching brings back the other voice, and the live voice follows', (await pg.inputValue('#name')) === 'Sunrise Bakery' && (await pg.evaluate(() => window.__store.voice.name)) === 'Sunrise Bakery');
  await pg.selectOption('#profile', { label: 'Harbor Coffee' }); await pg.waitForTimeout(300);
  check('profiles: the other profile kept what was typed', (await pg.inputValue('#name')) === 'Harbor Coffee Co.');
  pg.once('dialog', (d) => d.accept()); await pg.click('#pdel'); await pg.waitForTimeout(300);
  check('profiles: deleting returns to the remaining profile', (await pg.locator('#profile option').count()) === 1 && (await pg.inputValue('#name')) === 'Sunrise Bakery');
  await nav('help');
  check('help: shortcuts, FAQ and contact are there, with a mail link to support', /Alt/.test(await pg.textContent('#view-help')) && (await pg.getAttribute('#mailBtn', 'href')).startsWith('mailto:support@getaurorastudios.com') && (await pg.getAttribute('#tgBtn', 'href')) === 'https://t.me/+GqmNSvnMJxhhMzJh' && (await pg.locator('.faq details').count()) >= 3);
  await pg.evaluate(() => { window.__store.prefs = { onboarded: true, seen: '0.2.2', theme: 'light', history: true }; });
  await pg.reload(); await pg.evaluate(stub); await pg.evaluate(() => { window.__store.prefs = { onboarded: true, seen: '0.2.2', theme: 'light', history: true }; });
  await pg.addScriptTag({ content: read('profiles.js') }); await pg.addScriptTag({ content: read('options.js') }); await pg.waitForTimeout(250);
  await nav('overview');
  check("what's new: shown once after an update, and goes away when dismissed", !(await pg.isHidden('#whatsNew')) && /0\.3\.1/.test(await pg.textContent('#whatsNew')) && await (async () => { await pg.click('#wnDismiss'); await pg.waitForTimeout(100); return (await pg.isHidden('#whatsNew')) && (await pg.evaluate(() => window.__store.prefs.seen)) === '0.3.1'; })());
  await pg.evaluate(() => { window.__store.prefs = {}; });
  await pg.reload(); await pg.evaluate(stub); await pg.evaluate(() => { window.__store.prefs = {}; });
  await pg.addScriptTag({ content: read('profiles.js') }); await pg.addScriptTag({ content: read('options.js') }); await pg.waitForTimeout(250);
  check('tour: a brand-new install opens the welcome tour', !(await pg.isHidden('#tour')) && /Welcome/.test(await pg.textContent('#tour')));
  await pg.screenshot({ path: path.join(OUT, 'tour1.png') });
  await pg.click('[data-tour=next]'); await pg.waitForTimeout(80);
  check('tour: step 2 shows where the ✦ Reply button appears', /bottom-right/.test(await pg.textContent('#tour')) && (await pg.locator('.mockpill').count()) === 1);
  await pg.screenshot({ path: path.join(OUT, 'tour2.png') });
  await pg.click('[data-tour=next]'); await pg.click('[data-tour=next]'); await pg.waitForTimeout(80);
  check('tour: the last step says the person presses Send', /You press Send/.test(await pg.textContent('#tour')));
  await pg.click('[data-tour=done]'); await pg.waitForTimeout(100);
  check('tour: finishing closes it and it does not come back', (await pg.isHidden('#tour')) && (await pg.evaluate(() => window.__store.prefs.onboarded)) === true);
  const hi = await pg.evaluate(() => { const orig = Date.prototype.getHours; const out = []; for (const h of [8, 14, 20]) { Date.prototype.getHours = () => h; renderOverview(); out.push(document.getElementById('hello').textContent); } Date.prototype.getHours = orig; return out; });
  check('the greeting follows the time of day: morning, afternoon, evening', /morning/.test(hi[0]) && /afternoon/.test(hi[1]) && /evening/.test(hi[2]), JSON.stringify(hi));

  await pg.unroute('**/*'); await pg.setViewportSize({ width: 340, height: 420 });
  await page('popup.html');
  check('popup: shows the steps and "Ready" once a key is saved', /Open a post/.test(await pg.textContent('.how')) && /Add your key/.test(await pg.textContent('#st')));
  await pg.evaluate(() => { window.__store.licenseKey = 'AUR-GOOD-GOOD-GOOD'; window.__store.usage = { used: 12, limit: 1500 }; });
  await pg.reload(); await pg.evaluate(stub); await pg.evaluate(() => { window.__store.licenseKey = 'AUR-GOOD-GOOD-GOOD'; window.__store.usage = { used: 12, limit: 1500 }; }); await pg.addScriptTag({ content: read('popup.js') }); await pg.waitForTimeout(150);
  check('popup: with a key it says Ready and shows usage', /Ready/.test(await pg.textContent('#st')) && /12 of 1500/.test(await pg.textContent('#st')));
  await b.close(); done();
})();
