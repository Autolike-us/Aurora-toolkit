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

  const rep = await pg.evaluate(() => AuroraReplyAdapters.findComments().map((c) => ({ a: c.author, replied: c.replied, own: c.own })));
  check('Facebook: a comment that already has replies is marked replied; the page\'s own comment is marked own', rep[0].replied === true && rep[2].replied === false && rep[1].own === true && rep[2].own === false, JSON.stringify(rep));

  await load('https://www.facebook.com/x', `<!doctype html><body><div role="main"><div role="article"><h3><a href="/p">Boulangerie</a></h3><div data-ad-preview="message">Pain frais!</div>
   <div role="article" aria-label="Commentaire de Léa"><a href="/lea">Léa</a><div dir="auto">Vous livrez le dimanche ?</div><div><span role="button">J’aime</span> <span role="button" class="rp">Répondre</span> <span>2 h</span></div></div>
   <div role="article" aria-label="Comment"><a href="/pablo">Pablo R</a><div dir="auto">¿Cuánto cuesta el pan?</div><div><span role="button">Me gusta</span> <span role="button" class="rp">Responder</span> <span>3 sem</span></div></div>
   <div role="article" aria-label="Comment"><a href="/yuki">ゆき</a><div dir="auto">配達はありますか？</div><div><span role="button">いいね！</span> <span role="button" class="rp">返信する</span> <span>1日</span></div></div>
   <div role="article" aria-label="Comment"><a href="/yuki2">ゆうき</a><div dir="auto">配達はありますか？</div><div><span role="button">いいね</span> <span role="button" class="rp">返信</span> <span>1日</span></div></div>
   </div></div></body>`);
  cs = await find();
  check('other languages: finds comments labelled Répondre / Responder / 返信 and keeps only the words', cs.length === 4 && cs[0].text === 'Vous livrez le dimanche ?' && cs[0].author === 'Léa' && cs[0].text === 'Vous livrez le dimanche ?' && cs[1].text === '¿Cuánto cuesta el pan?' && cs.some((c) => c.text === '配達はありますか？'), JSON.stringify(cs));

  await load('https://www.instagram.com/p/ABC/', IG);
  cs = await find();
  check('Instagram: finds the comments, not the caption', cs.length === 2 && cs[0].author === 'maya.k' && cs[0].text === 'Do you deliver on Sundays?' && cs[1].author === 'tom_b', JSON.stringify(cs));
  pc = await pg.evaluate(() => AuroraReplyAdapters.postContext());
  check('Instagram: reads the caption and author', /Fresh sourdough today!/.test(pc.caption) && pc.author === 'sunrisebakery', JSON.stringify(pc));
  const igIns = await pg.evaluate(async () => { const c = AuroraReplyAdapters.findComments()[1]; const box = await AuroraReplyAdapters.openReply(c); const ok = AuroraReplyAdapters.setText(box, 'About £4 — thanks for asking!'); return { v: box.value, ok, ev: window.__events }; });
  check('Instagram: Reply fills the main box, keeping the @mention Instagram added', igIns.ok && igIns.v === '@tom_b About £4 — thanks for asking!', JSON.stringify(igIns));
  check('Instagram: nothing was sent', igIns.ev.length === 0);

  await load('https://www.instagram.com/p/ABC/', IG.replace(/document\.addEventListener\('click'[^\n]*/, ''));
  const dead = await pg.evaluate(async () => { document.getElementById('box').focus(); const c = AuroraReplyAdapters.findComments()[0]; const box = await AuroraReplyAdapters.openReply(c, { wait: 1800 }); return { box: box === null, v: document.getElementById('box').value }; });
  check('when Reply does nothing, the main comment box is never used (falls back to copy)', dead.box && dead.v === '', JSON.stringify(dead));

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

  // Harder pages: the click handler sits on a button INSIDE a wrapper that has the same text, and the new box is far from the comment, unfocused and unlabelled.
  const HARD = (boxAttrs, focus, handlerWorks = true) => `<!doctype html><body><div role="main"><div role="article"><h3><a href="/p">Shop</a></h3><div data-ad-preview="message">Fresh bread</div>
   <ul id="thread"><li id="th1"><div><div><div><div><div><div><div id="cm"><a href="/amy">Amy L</a><div dir="auto">Do you ship to Canada?</div>
     <div><span>Like</span> <div class="wrap"><div role="button" tabindex="0" class="rp"><span>Reply</span></div></div> <span>1h</span></div></div></div></div></div></div></div></div></li></ul>
   <div id="mainwrap"><div contenteditable="true" role="textbox" aria-label="Write a comment" id="main-box"></div></div></div></div>
   <script>document.addEventListener('click',e=>{ if(!${handlerWorks}) return; const b=e.target.closest('.rp'); if(!b||document.getElementById('rbox'))return; const d=document.createElement('div'); d.innerHTML='<div contenteditable="true" role="textbox" id="rbox" ${boxAttrs}></div>'; document.getElementById('th1').appendChild(d); ${focus ? "document.getElementById('rbox').focus();" : ''} });</script></body>`;
  for (const [name, attrs, focus] of [['a labelled box that is not focused', 'aria-label="Write a reply…"', false], ['a plain box that is not labelled or focused', '', false], ['a box that takes focus', '', true]]) {
    await load('https://www.facebook.com/hard', HARD(attrs, focus));
    const r = await pg.evaluate(async () => { const c = AuroraReplyAdapters.findComments()[0]; const box = await AuroraReplyAdapters.openReply(c); return { id: box && box.id, ok: !!box && AuroraReplyAdapters.setText(box, 'We do ship to Canada!'), main: document.getElementById('main-box').textContent }; });
    check('Harder page, ' + name + ': the click reaches the real button and the comment\'s own box is found', r.id === 'rbox' && r.ok && r.main === '', JSON.stringify(r));
  }
  await load('https://www.facebook.com/hard', HARD('', false, false));
  const stuck = await pg.evaluate(async () => { const c = AuroraReplyAdapters.findComments()[0]; const box = await AuroraReplyAdapters.openReply(c, { wait: 400 }); return { box: box === null, trace: AuroraReplyAdapters.lastTrace, diag: JSON.stringify(AuroraReplyAdapters.diagnose()) }; });
  check('when nothing opens, we give up and leave a trace without any comment text or names', stuck.box && stuck.trace.tries.length >= 2 && !/Amy|Canada/.test(stuck.diag), JSON.stringify(stuck.trace));
  const guided = await pg.evaluate(async () => { const p = AuroraReplyAdapters.waitForBox(5000); setTimeout(() => { const e = document.createElement('div'); e.contentEditable = 'true'; e.id = 'mine'; document.body.appendChild(e); e.focus(); }, 200); const el = await p; return el && el.id; });
  check('guided fallback: after the person clicks a box, that is the box we fill', guided === 'mine');
  const quiet = await pg.evaluate(async () => AuroraReplyAdapters.waitForBox(300));
  check('guided fallback: gives up quietly when no box is clicked', quiet === null);

  // Translated comments: the platform shows the viewer's language; the reply must go in the original one.
  await load('https://www.facebook.com/x', `<!doctype html><body><div role="main"><div role="article"><h3><a href="/p">Panadería</a></h3><div data-ad-preview="message">Pan fresco</div>
   <div role="article" aria-label="Comment"><a href="/tom">Tom B</a><div dir="auto" id="tt">Do you deliver on Sundays?</div><div><span role="button">Like</span> <span role="button" class="rp">Reply</span> <span role="button" id="tg">See original</span> <span>Rate this translation</span></div></div>
   <div role="article" aria-label="Comment"><a href="/ana">Ana</a><div dir="auto">¿Abren los domingos?</div><div><span role="button">Me gusta</span> <span role="button" class="rp">Responder</span> <span role="button">See translation</span></div></div>
   </div></div><script>document.getElementById('tg').addEventListener('click',function(){var t=document.getElementById('tt');t.textContent='¿Hacen entregas los domingos?';this.textContent='See translation';});</script></body>`);
  const tr0 = await pg.evaluate(() => AuroraReplyAdapters.findComments().map((c) => ({ text: c.text, hasOrig: !!c.orig })));
  check('translated: the "See original" link is found, and neither it nor "Rate this translation" is part of the text', tr0[0].hasOrig && tr0[0].text === 'Do you deliver on Sundays?' && !tr0[1].hasOrig && tr0[1].text === '¿Abren los domingos?', JSON.stringify(tr0));
  const tr1 = await pg.evaluate(async () => { const c = AuroraReplyAdapters.findComments()[0]; const t = await AuroraReplyAdapters.revealOriginal(c); const again = await AuroraReplyAdapters.revealOriginal(c); return { t, again, now: document.getElementById('tt').textContent, c2: AuroraReplyAdapters.findComments().map((x) => x.text) }; });
  check('translated: asking for the original shows it, returns the original text, and does not toggle it back', tr1.t === '¿Hacen entregas los domingos?' && tr1.again === tr1.t && tr1.now === tr1.t && tr1.c2[0] === tr1.t, JSON.stringify(tr1));

  // Main comment box (a new comment under the post), per site
  await load('https://www.facebook.com/sunrisebakery/posts/1', FB);
  let pb = await pg.evaluate(async () => { const c = AuroraReplyAdapters.findComments()[0]; await AuroraReplyAdapters.openReply(c); const b = AuroraReplyAdapters.findPostBox(); return { id: b && b.id, all: AuroraReplyAdapters.postBoxes().map((e) => e.id), scope: !!AuroraReplyAdapters.postScope(b), cap: AuroraReplyAdapters.postContext(AuroraReplyAdapters.postScope(b)) }; });
  check('post box (Facebook): finds the main "Write a comment" box, never the reply box that a Reply click opens', pb.id === 'main-box' && !pb.all.includes('reply-box'), JSON.stringify(pb));
  check('post box (Facebook): the post is read from the box\'s own post', pb.scope && pb.cap.caption === 'Fresh sourdough today!' && pb.cap.author === 'Sunrise Bakery', JSON.stringify(pb));
  await load('https://www.instagram.com/p/abc/', IG);
  pb = await pg.evaluate(() => { const b = AuroraReplyAdapters.findPostBox(); return { id: b && b.id, set: AuroraReplyAdapters.setText(b, 'Great post!'), v: b.value, ev: window.__events }; });
  check('post box (Instagram): finds "Add a comment…", fills it and does not submit', pb.id === 'box' && pb.set && pb.v === 'Great post!' && pb.ev.length === 0, JSON.stringify(pb));
  await load('https://www.tiktok.com/@chef/video/1', TT);
  pb = await pg.evaluate(() => { const b = AuroraReplyAdapters.findPostBox(); return b && b.id; });
  check('post box (TikTok): finds the comment input', pb === 'box');
  // a feed with two posts: the box in the middle of the screen wins, and its own post is read
  await load('https://www.facebook.com/', `<!doctype html><body><div role="main">
   <div role="article" style="height:700px"><h3><a href="/one">First Page</a></h3><div data-ad-preview="message">First post text</div><div contenteditable="true" role="textbox" aria-label="Write a comment" id="b1"></div></div>
   <div role="article" style="height:700px"><h3><a href="/two">Second Page</a></h3><div data-ad-preview="message">Second post text</div><div contenteditable="true" role="textbox" aria-label="Write a comment" id="b2"></div></div></div></body>`);
  await pg.evaluate(() => document.getElementById('b2').scrollIntoView({ block: 'center' }));
  pb = await pg.evaluate(() => { const b = AuroraReplyAdapters.findPostBox(); return { id: b.id, c: AuroraReplyAdapters.postContext(AuroraReplyAdapters.postScope(b)) }; });
  check('post box (feed): the box nearest the middle of the screen is used, with that post\'s text', pb.id === 'b2' && pb.c.caption === 'Second post text' && pb.c.author === 'Second Page', JSON.stringify(pb));

  // Facebook photo viewer: the post's words are in a side panel with no stable label
  await load('https://www.facebook.com/photo/?fbid=123', `<!doctype html><body><div role="dialog"><div><img alt="BREAKING Kenya pastor convicted" width="400" height="300"></div>
   <div><div><h2><a href="/bbcnews">BBC News</a></h2><span>2h</span></div>
   <div dir="auto">Kenyan cult leader Paul Mackenzie, who told his followers to starve to death, has been convicted.</div>
   <div role="button"><span>Like</span></div><div role="button"><span>Share</span></div>
   <ul><li><div role="article" aria-label="Comment by Joe"><a href="/joe">Joe</a><div dir="auto">This is horrifying news, thoughts with the families</div><div><span role="button">Like</span> <span role="button">Reply</span></div></div></li></ul>
   <div><div contenteditable="true" role="textbox" aria-label="Write a comment…" id="vb"></div></div></div></div></body>`);
  pb = await pg.evaluate(() => { const b = AuroraReplyAdapters.findPostBox(); return { id: b && b.id, c: AuroraReplyAdapters.postContext(AuroraReplyAdapters.postScope(b)) }; });
  check('Facebook photo viewer: reads the post\'s text and author from the side panel, not a comment or a button', pb.id === 'vb' && /^Kenyan cult leader Paul Mackenzie/.test(pb.c.caption) && !/horrifying|Like|Share/.test(pb.c.caption) && pb.c.author === 'BBC News', JSON.stringify(pb));
  await load('https://www.facebook.com/x', `<!doctype html><head><meta property="og:description" content="Page-wide text"></head><body><div role="main"><div role="article"><h3><a href="/p">Page</a></h3><div contenteditable="true" role="textbox" aria-label="Write a comment" id="nb"></div></div></div></body>`);
  pb = await pg.evaluate(() => { const b = AuroraReplyAdapters.findPostBox(); return AuroraReplyAdapters.postContext(AuroraReplyAdapters.postScope(b)); });
  check('Facebook feed: the page-wide description is never used as one post\'s text', pb.caption === '', JSON.stringify(pb));

  // Facebook hides decoy letters inside the post's text: only what a person can see is read
  await load('https://www.facebook.com/photo/?fbid=9', `<!doctype html><body><div role="dialog"><img alt="x" width="300" height="200">
   <div><h2><a href="/bbcnews">BBC News</a></h2>
   <div dir="auto"><span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)">dsSnoeptor9m82i313127t6aa3754hl</span><span>2h</span><span aria-hidden="true">3872111908cglamc9chc643a1mh5u</span></div>
   <div dir="auto"><span style="display:none">zz9a8b7c6d5e4f3g2h1i0jklmnop</span>Kenyan cult leader Paul Mackenzie, who told parents to starve their children, has been found guilty of 191 counts of murder.<div><br></div>Read more: <a href="https://bbc.in/4smJzzB">https://bbc.in/4smJzzB</a><span style="opacity:0">qw3rty7uiop9asdf8ghj2klzx</span> 3872111908cglamc9chc643a1mh5u</div>
   <ul><li><div role="article" aria-label="Comment by Joe"><a href="/joe">Joe</a><div dir="auto">Were parents charged too? cannot read article</div><div><span role="button">Reply</span></div></div></li></ul>
   <div contenteditable="true" role="textbox" aria-label="Comment as Aly Pierre" id="cb"></div></div></div></body>`);
  pb = await pg.evaluate(() => { const b = AuroraReplyAdapters.findPostBox(); return { id: b && b.id, c: AuroraReplyAdapters.postContext(AuroraReplyAdapters.postScope(b)) }; });
  check('Facebook decoy text: hidden letters and random ids are not read; the visible post text is', pb.id === 'cb' && pb.c.caption === 'Kenyan cult leader Paul Mackenzie, who told parents to starve their children, has been found guilty of 191 counts of murder. Read more: https://bbc.in/4smJzzB', JSON.stringify(pb));
  await b.close(); done();
})();
