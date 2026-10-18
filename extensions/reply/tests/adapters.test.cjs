// Reading comments and filling the reply box on fixtures shaped like Facebook, Instagram and TikTok.
const { launch, read, check, done } = require('./_pw.cjs');
const { FB, IG, TT } = require('./fixtures.cjs');
(async () => {
  const b = await launch(); const pg = await (await b.newContext({ viewport: { width: 1100, height: 900 } })).newPage(); pg.on('pageerror', (e) => { throw e; });
  const load = async (url, html) => { await pg.route('**/*', (r) => r.fulfill({ contentType: 'text/html; charset=utf-8', body: html })); await pg.goto(url); await pg.addScriptTag({ content: read('content/adapters.js') }); };
  const find = () => pg.evaluate(() => AuroraReplyAdapters.findComments().map((c) => ({ author: c.author, text: c.text })));

  await load('https://www.facebook.com/sunrisebakery/posts/1', FB);
  let cs = await find();
  check('Facebook: finds every comment and reply once, with author and clean text', cs.length === 3 && cs[0].author === 'Maya K' && cs[0].text === 'Do you deliver on Sundays?' && cs[1].author === 'Sunrise Bakery' && cs[1].text === 'Hi Maya! Tuesday to Saturday only.' && cs[2].author === 'Tom B' && /whole loaf/.test(cs[2].text), JSON.stringify(cs));
  check('Facebook: the parent comment does not swallow its nested reply', !/Tuesday/.test(cs[0].text));
  let pc = await pg.evaluate(() => AuroraReplyAdapters.postContext());
  check('Facebook: reads the post caption and author', pc.caption === 'Fresh sourdough today!' && pc.author === 'Sunrise Bakery', JSON.stringify(pc));
  const pick = await pg.evaluate(() => { const t = document.querySelector('#c2 [dir=auto]'); const c = AuroraReplyAdapters.commentFromElement(t); const none = AuroraReplyAdapters.commentFromElement(document.querySelector('#list')); return { a: c && c.author, none: none === null }; });
  check('Facebook: clicking a comment picks that comment, clicking the list picks nothing', pick.a === 'Tom B' && pick.none);
  const fbIns = await pg.evaluate(async () => {
    const c = AuroraReplyAdapters.findComments()[0]; const box = await AuroraReplyAdapters.openReply(c);
    const ok = box && AuroraReplyAdapters.setText(box, 'Hi Maya! Sundays are pick-up only.');
    return { id: box && box.id, ok, text: box && box.textContent.replace(/ /g, ' '), ev: window.__events };
  });
  check('Facebook: Reply opens the comment\'s own box, keeps the @mention and adds the text after it', fbIns.id === 'reply-box' && fbIns.ok && /^Maya K\s+Hi Maya! Sundays are pick-up only\.$/.test(fbIns.text), JSON.stringify(fbIns));
  check('Facebook: nothing was sent (no Enter, no submit)', fbIns.ev.length === 0);

  await load('https://www.instagram.com/p/ABC/', IG);
  cs = await find();
  check('Instagram: finds the comments, not the caption', cs.length === 2 && cs[0].author === 'maya.k' && cs[0].text === 'Do you deliver on Sundays?' && cs[1].author === 'tom_b', JSON.stringify(cs));
  pc = await pg.evaluate(() => AuroraReplyAdapters.postContext());
  check('Instagram: reads the caption and author', /Fresh sourdough today!/.test(pc.caption) && pc.author === 'sunrisebakery', JSON.stringify(pc));
  const igIns = await pg.evaluate(async () => { const c = AuroraReplyAdapters.findComments()[1]; const box = await AuroraReplyAdapters.openReply(c); const ok = AuroraReplyAdapters.setText(box, 'About £4 — thanks for asking!'); return { v: box.value, ok, ev: window.__events }; });
  check('Instagram: Reply fills the main box, keeping the @mention Instagram added', igIns.ok && igIns.v === '@tom_b About £4 — thanks for asking!', JSON.stringify(igIns));
  check('Instagram: nothing was sent', igIns.ev.length === 0);

  await load('https://www.tiktok.com/@chef/video/1', TT);
  cs = await find();
  check('TikTok: finds the comments', cs.length === 2 && cs[0].author === 'maya.k' && cs[0].text === 'Recipe please!!' && cs[1].text === 'Which flour do you use?', JSON.stringify(cs));
  pc = await pg.evaluate(() => AuroraReplyAdapters.postContext());
  check('TikTok: reads the video caption and author', /Pasta in 60 seconds/.test(pc.caption) && pc.author === 'chef');
  const ttIns = await pg.evaluate(async () => { const c = AuroraReplyAdapters.findComments()[0]; const box = await AuroraReplyAdapters.openReply(c); const ok = AuroraReplyAdapters.setText(box, 'Recipe is in my bio!'); return { t: box.textContent, ok, ev: window.__events }; });
  check('TikTok: Reply focuses the comment box and fills it', ttIns.ok && ttIns.t === 'Recipe is in my bio!' && ttIns.ev.length === 0, JSON.stringify(ttIns));

  await load('https://www.facebook.com/x', '<!doctype html><body><div>No comments here, just a <a href="/x">link</a> and a Reply to nothing</div></body>');
  check('a page without comments yields none (and does not crash)', (await find()).length === 0);
  const miss = await pg.evaluate(async () => { const el = document.createElement('div'); document.body.appendChild(el); const box = await AuroraReplyAdapters.openReply({ el, btn: el }, { wait: 300 }); return box; });
  check('when no reply box ever appears, openReply gives up politely', miss === null);
  await b.close(); done();
})();
