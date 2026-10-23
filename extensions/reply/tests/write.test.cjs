// Aurora Write: the "ideas from your comments" logic, and the Write tab in the dashboard (offline, stubbed extension APIs).
const fs = require('node:fs'), path = require('node:path');
const { launch, read, check, done } = require('./_pw.cjs');
const Write = require('../write.js');
const OUT = path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const NOW = Date.parse('2026-10-21T12:00:00Z'), DAY = 86400000;
const H = (daysAgo, platform, comment, mode) => ({ ts: NOW - daysAgo * DAY, platform, mode: mode || 'reply', comment, drafts: ['x'] });

(async () => {
  // ---- ideas
  const hist = [
    H(1, 'instagram', 'Do you deliver on Sundays?'), H(2, 'facebook', 'do u deliver sundays??'), H(3, 'instagram', 'Deliver on Sunday? 🥖'), H(4, 'tiktok', 'Do you deliver on Sundays'),
    H(1, 'tiktok', 'Do you have gluten-free options?'), H(5, 'instagram', 'Any gluten free options?'),
    H(2, 'facebook', 'How much for a whole rye loaf?'),
    H(1, 'instagram', 'Love this!! 😍'), H(2, 'instagram', 'Nice photo'),
    H(40, 'instagram', 'What time do you open?'),
    H(1, 'test', 'Do you deliver on Sundays?'), H(1, 'instagram', 'Do you deliver on Sundays?', 'post'),
  ];
  const week = Write.ideas(hist, { now: NOW, days: 30 });
  check('ideas: similar questions are grouped even when worded differently, biggest first', week[0].count === 4 && /deliver/i.test(week[0].text) && week[1].count === 2 && /gluten/i.test(week[1].text), JSON.stringify(week));
  check('ideas: compliments, "test" drafts and comments written under other people\'s posts are ignored', !week.some((g) => /love|nice/i.test(g.text)) && week[0].count === 4);
  check('ideas: the platforms the question came from are listed', ['instagram', 'facebook', 'tiktok'].every((p) => week[0].platforms.includes(p)) && !week[0].platforms.includes('test'));
  check('ideas: the time range limits what is counted (40 days ago only appears under "all time")', !week.some((g) => /open/i.test(g.text)) && Write.ideas(hist, { now: NOW, days: 0 }).some((g) => /open/i.test(g.text)) && Write.ideas(hist, { now: NOW, days: 7 }).length >= 1);
  check('ideas: an empty or odd history never crashes', Write.ideas([], {}).length === 0 && Write.ideas(null).length === 0 && Write.ideas([{}, null, { comment: 5 }]).length === 0);
  check('isQuestion: a question mark or a question word counts, a short remark does not', Write.isQuestion('Where are you located') && Write.isQuestion('Is it vegan?') && !Write.isQuestion('Great!') && !Write.isQuestion('Love it so much'));

  // ---- the Write tab
  const b = await launch(); const ctx = await b.newContext({ viewport: { width: 1100, height: 1500 } }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  const stub = () => {
    const store = { prefs: { onboarded: true, seen: '1.2.0', theme: 'light', history: true }, licenseKey: 'AUR-GOOD-GOOD-GOOD', usage: { used: 12, limit: 1500, resetsAt: '2026-11-01T00:00:00Z' }, voice: { name: 'Sunrise Bakery', samples: ['Thanks!'] } };
    window.__store = store; window.__msgs = []; window.__clip = '';
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t) => { window.__clip = t; } }, configurable: true });
    window.chrome = { storage: { local: { get: async (k) => { const o = {}; [].concat(k).forEach((x) => { if (x in store) o[x] = store[x]; }); return o; }, set: async (o) => Object.assign(store, o) }, onChanged: { addListener() {} } },
      runtime: { getManifest: () => ({ version: '1.2.0' }), sendMessage: (m, cb) => { window.__msgs.push(m); setTimeout(() => {
        if (m.type === 'write') cb(m.topic === 'FAIL' ? { ok: false, status: 'quota', message: 'You have used all your credits.' } : { ok: true, captions: [{ text: 'The smell of 7am, bottled. 🥖' }, { text: 'Rye is back. $4 a loaf.' }, { text: 'Order by Saturday for Sunday pick-up.' }], hooks: [{ text: 'Friday just got tastier.' }, { text: 'Rye or sourdough?' }, { text: 'We bake at 4am.' }], hashtags: ['#sourdough', '#freshbread', '#ryebread'], note: '', cost: 1, usage: { used: 13, limit: 1500, resetsAt: '2026-11-01T00:00:00Z' } });
        else if (m.type === 'status') cb({ ok: true, status: 'active', usage: { used: 12, limit: 1500, resetsAt: '2026-11-01T00:00:00Z' } }); else cb({ ok: true }); }, 15); } } };
  };
  await pg.route('**/*', (r) => r.fulfill({ contentType: 'text/html; charset=utf-8', body: read('options.html').replace(/<link rel="stylesheet" href="ui.css">/, '<style>' + read('ui.css') + '</style>').replace(/<script src="[^"]*"><\/script>/g, '').replace(/<img src="icons\/[^"]*"[^>]*>/g, '') }));
  await pg.goto('https://example.test/options.html'); await pg.evaluate(stub);
  await pg.evaluate((h) => { window.__store.history = h; }, hist);
  for (const f of ['profiles.js', 'write.js', 'options.js']) await pg.addScriptTag({ content: read(f) }); await pg.waitForTimeout(250);
  await pg.click('.nav[data-view=write]'); await pg.waitForTimeout(100);
  check('Write: the tab is in the menu with a NEW badge and opens the writer', /NEW/.test(await pg.textContent('.nav[data-view=write]')) && !(await pg.isHidden('#view-write')) && /Write a post in your voice/.test(await pg.textContent('#view-write h1')));
  check('Write: "Ideas from your comments" lists the repeated questions with their counts', (await pg.locator('#ideas .qrow').count()) >= 3 && (await pg.textContent('#ideas .qrow .cnt')) === '4' && /deliver/i.test(await pg.textContent('#ideas .qrow .q b')));
  await pg.fill('#wTopic', 'Fresh rye loaf, $4, Fridays'); await pg.click('#wPlat [data-p=tiktok]'); await pg.click('#wTones [data-wt=playful]'); await pg.click('#wGo'); await pg.waitForTimeout(150);
  await pg.waitForSelector('#wOut .wopt');
  const wm = await pg.evaluate(() => window.__msgs.filter((m) => m.type === 'write')[0]);
  check('Write: pressing "Write it" sends the topic, platform and tone and shows 3 captions, 3 hooks and hashtags', wm.mode === 'caption' && wm.topic === 'Fresh rye loaf, $4, Fridays' && wm.platform === 'tiktok' && wm.tone === 'playful' && (await pg.locator('#wOut .wopt').count()) === 3 && (await pg.locator('#wOut .whook').count()) === 3 && (await pg.locator('#wOut .htags span').count()) === 3);
  check('Write: the credit meter updates after a successful write', /13 of 1500/.test(await pg.textContent('#meterText')) || /13/.test(await pg.evaluate(() => document.body.innerText)));
  await pg.locator('#wOut .wopt').first().locator('text=Copy with hashtags').click(); await pg.waitForTimeout(80);
  check('Write: "Copy with hashtags" puts the caption and its hashtags on the clipboard', /^The smell of 7am/.test(await pg.evaluate(() => window.__clip)) && /#sourdough #freshbread #ryebread$/.test(await pg.evaluate(() => window.__clip)));
  await pg.screenshot({ path: path.join(OUT, 'write-1.png'), fullPage: true });
  await pg.click('#ideas .qrow:first-child [data-idea]'); await pg.waitForSelector('#ideas [data-iout="0"] .wopt');
  const im = await pg.evaluate(() => window.__msgs.filter((m) => m.type === 'write' && m.mode === 'idea')[0]);
  check('Write: "Write a post" on an idea sends only that question and shows the result under it', im && /deliver/i.test(im.question) && !('topic' in im && im.topic) && (await pg.locator('#ideas [data-iout="0"] .wopt').count()) === 3);
  await pg.screenshot({ path: path.join(OUT, 'write-2.png'), fullPage: true });
  await pg.fill('#wTopic', 'FAIL'); await pg.click('#wGo'); await pg.waitForTimeout(150);
  check('Write: an error from the server (for example no credits) is shown in plain words', /used all your credits/.test(await pg.textContent('#wOut')));
  await pg.fill('#wTopic', ''); await pg.click('#wGo'); await pg.waitForTimeout(50);
  check('Write: an empty topic is not sent', /about first/.test(await pg.textContent('#wNote')));
  await pg.click('#iRange [data-d="7"]'); await pg.waitForTimeout(50);
  check('Write: changing the time range updates the ideas without errors', (await pg.locator('#ideas .qrow').count()) >= 1 && errs.length === 0, errs.join(' | '));
  const m = JSON.parse(read('manifest.json'));
  check('manifest: 1.2.0, still only the "storage" permission and no new hosts', m.version === '1.2.0' && JSON.stringify(m.permissions) === '["storage"]' && JSON.stringify(m.host_permissions) === '["https://getaurorastudios.com/*"]');
  check('the dashboard loads write.js before options.js and the code never presses Send or Post', /write\.js"><\/script><script src="options\.js/.test(read('options.html')) && !/\.submit\(|requestSubmit|key:\s*'Enter'/.test(read('options.js') + read('write.js')));
  await b.close(); done();
})().catch((e) => { console.error(e); process.exit(1); });
