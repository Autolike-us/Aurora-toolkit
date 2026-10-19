// The panel on the page: list comments, draft, tone, errors, pick mode, "Use this reply" — with the extension's messages stubbed.
const { launch, read, check, done } = require('./_pw.cjs');
const { FB, IG } = require('./fixtures.cjs');
(async () => {
  const b = await launch(); const pg = await (await b.newContext({ viewport: { width: 1200, height: 900 } })).newPage(); pg.on('pageerror', (e) => { throw e; });
  const stub = (cfg) => {
    window.__msgs = []; window.__cfg = cfg;
    window.chrome = { runtime: { sendMessage: (m, cb) => { window.__msgs.push(m); const c = window.__cfg; setTimeout(() => {
      if (m.type === 'getState') cb(c.state);
      else if (m.type === 'draft') cb(typeof c.draft === 'function' ? c.draft(m) : c.draft);
      else if (m.type === 'setCount') cb({ ok: true });
      else if (m.type === 'setProfile') { c.state = { ...c.state, profiles: { ...c.state.profiles, active: m.id } }; cb({ ok: true }); }
      else if (m.type === 'addSample') cb({ ok: true, count: 4 });
      else cb({ ok: true });
    }, 30); } } };
  };
  const OK = { ok: true, drafts: [{ text: 'Hi Maya! Sundays are pick-up only 🥖' }, { text: 'Great question — Tue to Sat we deliver!' }, { text: 'Thanks Maya, DM us your address.' }], flag: 'none', note: '', usage: { used: 4, limit: 1500, resetsAt: '2026-11-01T00:00:00Z' } };
  const STATE = { ok: true, hasKey: true, voiceReady: true, usage: { used: 3, limit: 1500 }, voice: { tone: 'warm' } };
  const open = async (url, html, cfg) => {
    await pg.unroute('**/*'); await pg.route('**/*', (r) => r.fulfill({ contentType: 'text/html; charset=utf-8', body: html }));
    await pg.goto(url); await pg.evaluate(stub, cfg);
    await pg.addScriptTag({ content: read('content/adapters.js') }); await pg.addScriptTag({ content: read('content/panel.js') }); await pg.waitForTimeout(150);
  };
  const msgs = (t) => pg.evaluate((t) => window.__msgs.filter((m) => m.type === t), t);

  await open('https://www.facebook.com/sunrisebakery/posts/1', FB, { state: STATE, draft: OK });
  check('the launcher appears only because there are comments, and shows how many', (await pg.textContent('button.pill')).replace(/\s+/g, ' ').includes('3'));
  await pg.click('button.pill'); await pg.waitForTimeout(150);
  check('opening the panel lists each comment with its author', (await pg.locator('.c').count()) === 3 && /Maya K/.test(await pg.locator('.c').first().textContent()) && /Drafts in your voice|3 of 1500/.test(await pg.textContent('.hd')));
  check('the panel says the person sends every reply', /read, edit and send every reply yourself/.test(await pg.textContent('.ft')));
  await pg.locator('[data-draft="0"]').click();
  check('asking for a draft shows a loading state', (await pg.locator('.sk').count()) === 3);
  await pg.waitForSelector('textarea.dt');
  check('three editable drafts appear and the usage meter updates', (await pg.locator('textarea.dt').count()) === 3 && /4 of 1500/.test(await pg.textContent('.hd')));
  const d1 = (await msgs('draft'))[0];
  check('the request carries the comment, its author, the post caption and the platform (and no tone unless chosen)', d1.comment.text === 'Do you deliver on Sundays?' && d1.comment.author === 'Maya K' && d1.post.caption === 'Fresh sourdough today!' && d1.platform === 'facebook' && d1.tone === undefined && d1.quality === 'standard');
  check('the saved tone is highlighted by default', /warm/i.test(await pg.locator('[data-tone].on').textContent()));
  await pg.locator('[data-tone="playful"]').click(); await pg.waitForSelector('textarea.dt');
  const d2 = (await msgs('draft'))[1];
  check('choosing a tone writes new drafts with that tone', d2.tone === 'playful');
  await pg.fill('#hint', 'mention Saturday'); await pg.locator('#best').check(); await pg.click('#again'); await pg.waitForSelector('textarea.dt');
  const d3 = (await msgs('draft'))[2];
  check('a hint and "Best quality" are sent along', d3.hint === 'mention Saturday' && d3.quality === 'best');
  await pg.locator('textarea.dt').nth(1).fill('Tue to Sat we deliver — Sundays are pick-up!');
  await pg.locator('[data-save="1"]').click(); await pg.waitForTimeout(120);
  check('"My style" saves the edited reply as an example of how you write', (await msgs('addSample')).length === 1 && (await msgs('addSample'))[0].text.startsWith('Tue to Sat we deliver — Sundays'));
  await pg.locator('[data-use="1"]').click(); await pg.waitForTimeout(500);
  const ins = await pg.evaluate(() => ({ box: document.getElementById('reply-box') && document.getElementById('reply-box').textContent.replace(/ /g, ' '), ev: window.__events, open: !!document.querySelector('#aurora-reply-host').shadowRoot.querySelector('.panel') }));
  check('"Use this reply" puts the (edited) text in Maya\'s reply box, after the @mention', /^Maya K\s+Tue to Sat we deliver — Sundays are pick-up!$/.test(ins.box), JSON.stringify(ins));
  check('it never sends: no Enter key, no submit — and the panel gets out of the way', ins.ev.length === 0 && ins.open === false);
  check('a confirmation tells the person to press Send themselves', /press Send yourself/.test(await pg.evaluate(() => document.querySelector('#aurora-reply-host').shadowRoot.getElementById('toast').textContent)));

  // spam flag + errors
  await open('https://www.facebook.com/sunrisebakery/posts/1', FB, { state: STATE, draft: { ...OK, flag: 'spam', note: 'Looks like a scam link.' } });
  await pg.click('button.pill'); await pg.locator('[data-draft="2"]').click(); await pg.waitForSelector('textarea.dt');
  check('a spam flag is shown with the reason, and drafts are still offered', /looks like spam/i.test(await pg.textContent('.warn')) && /scam link/.test(await pg.textContent('.warn')) && (await pg.locator('textarea.dt').count()) === 3);
  await open('https://www.facebook.com/sunrisebakery/posts/1', FB, { state: { ...STATE, hasKey: false }, draft: { ok: false, status: 'no_key', message: 'Add your Aurora Reply key in the settings first.' } });
  await pg.click('button.pill'); await pg.waitForTimeout(150);
  check('without a key the panel says so up front and links to settings', /add your Aurora Reply key/i.test(await pg.textContent('.bd')) && !!(await pg.$('#optKey')));
  await pg.locator('[data-draft="0"]').click(); await pg.waitForSelector('.err');
  await pg.click('.err #optKey'); await pg.waitForTimeout(100);
  check('a refused draft shows the reason and "Open settings" works', /key in the settings/.test(await pg.textContent('.err')) && (await msgs('openOptions')).length >= 1);
  await open('https://www.facebook.com/sunrisebakery/posts/1', FB, { state: STATE, draft: { ok: false, status: 'quota', message: 'You have used all 1500 drafts for this month. They renew on November 1.', usage: { used: 1500, limit: 1500 } } });
  await pg.click('button.pill'); await pg.locator('[data-draft="0"]').click(); await pg.waitForSelector('.err');
  check('quota used up: a calm message with the renewal date, and no drafts', /renew on November 1/.test(await pg.textContent('.err')) && (await pg.locator('textarea.dt').count()) === 0 && /1500 of 1500/.test(await pg.textContent('.hd')));

  // Instagram + pick mode
  await open('https://www.instagram.com/p/ABC/', IG, { state: STATE, draft: OK });
  await pg.click('button.pill'); await pg.click('#pick'); await pg.waitForTimeout(100);
  check('pick mode hides the panel and highlights the comment under the mouse', !(await pg.$('.panel')));
  await pg.mouse.move(40, 40); await pg.hover('li.cm:nth-of-type(3) span[dir=auto]'); await pg.waitForTimeout(100);
  check('hovering a comment outlines it', (await pg.evaluate(() => document.querySelectorAll('li.cm')[1].style.outline)).includes('solid'));
  await pg.click('li.cm:nth-of-type(3) span[dir=auto]'); await pg.waitForSelector('textarea.dt');
  const dp = (await msgs('draft'))[0];
  check('clicking a comment drafts a reply for exactly that comment', dp.comment.author === 'tom_b' && /whole loaf/.test(dp.comment.text) && dp.platform === 'instagram');
  check('the pick did not press anything on the page (no Reply click, no submit)', await pg.evaluate(() => window.__events.length === 0 && document.getElementById('box').value === ''));
  await pg.locator('[data-use="0"]').click(); await pg.waitForTimeout(500);
  check('Instagram: the reply lands in the main box after "@tom_b "', await pg.evaluate(() => document.getElementById('box').value.startsWith('@tom_b Hi Maya!')) && await pg.evaluate(() => window.__events.length === 0));
  await pg.click('button.pill'); await pg.click('#pick'); await pg.keyboard.press('Escape'); await pg.waitForTimeout(100);
  check('Escape cancels pick mode', !!(await pg.$('.panel')));

  // queue of unanswered comments, shortcuts, report, profiles
  await open('https://www.instagram.com/p/ABC/', IG, { state: { ...STATE, profiles: { active: 'default', items: [{ id: 'default', label: 'Main' }, { id: 'p2', label: 'Shop' }] } }, draft: OK });
  await pg.click('button.pill'); await pg.waitForTimeout(150);
  check('profiles: a voice picker appears when there is more than one profile and switching it tells the extension', (await pg.locator('#profile option').count()) === 2 && await (async () => { await pg.selectOption('#profile', 'p2'); await pg.waitForTimeout(150); return (await msgs('setProfile'))[0].id === 'p2'; })());
  check('profiles: the voice picker is readable even on a dark page (dark text on a white box, both names visible)', await pg.evaluate(() => { document.documentElement.style.cssText = 'color:#fff;background:#111'; document.body.style.color = '#fff'; const sel = document.querySelector('aurora-reply-host, #aurora-reply-host') || Array.from(document.querySelectorAll('*')).find((e) => e.shadowRoot && e.shadowRoot.getElementById('profile')); const el = sel.shadowRoot.getElementById('profile'); const cs = getComputedStyle(el); const oc = getComputedStyle(el.options[0]); return cs.color === 'rgb(26, 22, 18)' && oc.color === 'rgb(26, 22, 18)' && oc.backgroundColor === 'rgb(255, 255, 255)'; }));
  check('queue: offers to reply to unanswered comments, with the count', /Reply to unanswered comments \(2\)/.test(await pg.textContent('#qstart')));
  await pg.click('#qstart'); await pg.waitForTimeout(80);
  check('queue: explains that it uses drafts, one at a time, and that the person sends', /at a time/.test(await pg.textContent('.q')) && /up to 6 of your drafts/.test(await pg.textContent('.bd')));
  await pg.click('#qgo'); await pg.waitForSelector('textarea.dt');
  check('queue: starts with the first comment and shows the position', /Queue 1 of 2/.test(await pg.textContent('.bd')) && (await msgs('draft')).length === 1 && (await msgs('draft'))[0].comment.author === 'maya.k');
  await pg.keyboard.press('Alt+Digit2'); await pg.waitForTimeout(500);
  check('shortcut Alt+2 inserts the second draft, nothing is sent, and the panel stays open for the next one', await pg.evaluate(() => document.getElementById('box').value.startsWith('@maya.k Great question') && window.__events.length === 0) && !!(await pg.$('#qnext')));
  await pg.click('#qnext'); await pg.waitForSelector('textarea.dt');
  check('queue: "Next" drafts the next comment only now (lazy, saves drafts)', (await msgs('draft')).length === 2 && (await msgs('draft'))[1].comment.author === 'tom_b' && /Queue 2 of 2/.test(await pg.textContent('.bd')));
  await pg.click('#qskip'); await pg.waitForTimeout(150);
  check('queue: finishing shows a done message and goes back to the list', /Queue finished/.test(await pg.textContent('.bd')) && !!(await pg.$('#pick')));
  await pg.keyboard.press('Alt+KeyR'); await pg.waitForTimeout(80);
  check('shortcut Alt+R closes and opens the panel', !(await pg.$('.panel')) && await (async () => { await pg.keyboard.press('Alt+KeyR'); await pg.waitForTimeout(100); return !!(await pg.$('.panel')); })());
  await open('https://www.facebook.com/x', '<!doctype html><body><p>No comments here</p></body>', { state: STATE, draft: OK });
  await pg.click('button.pill'); await pg.waitForTimeout(100);
  check('nothing found: the panel says so and offers "Report a problem" instead of staying silent', /No comments found/.test(await pg.textContent('.bd')) && !!(await pg.$('.bd #report')));
  const diag = await pg.evaluate(() => JSON.stringify(AuroraReplyAdapters.diagnose()));
  check('the report holds page facts only (no names, no comment text)', /"replyLabels":0/.test(diag) && !/Maya|Tom/.test(diag));

  // choose 1-3 replies, report via Telegram or email
  await open('https://www.facebook.com/sunrisebakery/posts/1', FB, { state: STATE, draft: OK });
  await pg.click('button.pill'); await pg.locator('[data-draft="0"]').click(); await pg.waitForSelector('textarea.dt');
  check('replies per comment: three by default, and the first request asks for three', (await msgs('draft'))[0].count === 3 && /uses 3 drafts/.test(await pg.textContent('.bd')));
  await pg.locator('[data-count="1"]').click(); await pg.waitForTimeout(80);
  check('choosing 1 is remembered, says it uses 1 draft, and the next request asks for one', /uses 1 draft\b/.test(await pg.textContent('.bd')) && (await msgs('setCount'))[0].count === 1 && await (async () => { await pg.click('#again'); await pg.waitForSelector('textarea.dt'); return (await msgs('draft')).pop().count === 1; })());
  await pg.evaluate(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return null; }; });
  await pg.click('#report'); await pg.waitForTimeout(80);
  check('report a problem offers Telegram and email', !!(await pg.$('#repTg')) && !!(await pg.$('#repMail')));
  await pg.click('#repTg'); await pg.waitForTimeout(100);
  check('the Telegram button opens the Aurora Studios Report channel and says the details are copied', (await pg.evaluate(() => window.__opened[0])) === 'https://t.me/+GqmNSvnMJxhhMzJh' && /Telegram is opening/.test(await pg.textContent('.bd')));

  // free plan: usage wording and the "get more replies" link
  await open('https://www.facebook.com/sunrisebakery/posts/1', FB, { state: STATE, draft: { ok: false, status: 'quota', message: 'You have used your 10 free replies for this month. They renew on November 1 — or get more replies at getaurorastudios.com/reply.', upgrade: 'https://getaurorastudios.com/reply/#plans', usage: { used: 10, limit: 10, plan: 'free', packs: 0 } } });
  await pg.evaluate(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return null; }; });
  await pg.click('button.pill'); await pg.locator('[data-draft="0"]').click(); await pg.waitForSelector('.err');
  check('free plan: the panel header says "Free plan · 10 of 10 replies used" and the error offers "Get more replies"', /Free plan · 10 of 10 replies used/.test(await pg.textContent('.hd')) && !!(await pg.$('#upgrade')));
  await pg.click('#upgrade'); await pg.waitForTimeout(80);
  check('"Get more replies" opens the Aurora Reply page', (await pg.evaluate(() => window.__opened[0])) === 'https://getaurorastudios.com/reply/#plans');
  await b.close(); done();
})();
