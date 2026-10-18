/* Aurora Reply — the panel on Facebook, Instagram and TikTok. Lists the comments you can see, asks for three drafts in your voice,
   and puts the one you choose into the reply box. It never presses Send: you read it, edit it and send it yourself. */
(function () {
  'use strict';
  const A = globalThis.AuroraReplyAdapters;
  if (!A || document.getElementById('aurora-reply-host') || window.__auroraReply) return;
  window.__auroraReply = true;

  const ask = (type, extra) => new Promise((res) => { try { chrome.runtime.sendMessage({ aurora: 'reply', type, ...extra }, (r) => res(r || { ok: false, message: 'The extension was updated — reload this page.' })); } catch (_) { res({ ok: false, message: 'The extension was updated — reload this page.' }); } });
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const TONES = [['friendly', 'Friendly'], ['warm', 'Warm'], ['professional', 'Professional'], ['playful', 'Playful'], ['direct', 'Direct']];

  const S = { open: false, view: 'list', comments: [], sel: null, drafts: [], flag: 'none', note: '', loading: false, error: null, tone: '', quality: false, hint: '', usage: null, state: null, pick: false, done: '', hid: '', quick: [], qmark: {}, queue: null, count: 0 };

  /* ---------- shell ---------- */
  const host = document.createElement('div');
  host.id = 'aurora-reply-host';
  host.style.cssText = 'all:initial;position:fixed;right:18px;bottom:18px;z-index:2147483646';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>
    :host{all:initial}*{box-sizing:border-box}
    .w{font:14px/1.45 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#1a1612;display:flex;flex-direction:column;align-items:flex-end;gap:10px}
    .pill{display:flex;align-items:center;gap:9px;border:1px solid rgba(251,191,36,.45);cursor:pointer;color:#fbbf24;font:700 14px system-ui,sans-serif;padding:11px 16px 11px 12px;border-radius:999px;background:#16120d;box-shadow:0 12px 30px rgba(20,12,4,.45)}
    .pill i{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#f97316,#fbbf24);color:#16120d;font-style:normal}
    .pill b{background:#f97316;color:#16120d;border-radius:99px;padding:1px 8px;font-size:12px}
    .panel{width:392px;max-width:calc(100vw - 24px);max-height:min(78vh,720px);display:flex;flex-direction:column;background:#fff;border:1px solid rgba(40,25,10,.14);border-radius:20px;box-shadow:0 30px 70px rgba(40,25,10,.35);overflow:hidden}
    .hd{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid rgba(40,25,10,.1);background:linear-gradient(120deg,#16120d,#2a1d0e)}
    .hd .lg{width:30px;height:30px;border-radius:10px;background:linear-gradient(135deg,#f97316,#fbbf24);display:grid;place-items:center;color:#16120d;font-size:16px}
    .hd h1{margin:0;font-size:15px;flex:1;color:#fff}.hd small{display:block;font-weight:500;color:#cdbfae;font-size:12px}
    .x{border:0;background:none;font-size:20px;cursor:pointer;color:#cdbfae;border-radius:8px;width:30px;height:30px}.x:hover{background:rgba(255,255,255,.12)}
    .bd{padding:14px 16px;overflow:auto;display:grid;gap:12px}
    .bar{display:flex;gap:8px;flex-wrap:wrap}
    button.b{font:600 13px system-ui,sans-serif;border:1px solid rgba(40,25,10,.16);background:#fff;color:#1a1612;border-radius:10px;padding:7px 12px;cursor:pointer}
    button.b:hover{border-color:#f97316;color:#f97316}button.b.p{border:0;color:#1a1209;background:linear-gradient(120deg,#f97316,#fbbf24)}button.b.p:hover{color:#1a1209;filter:brightness(1.08)}button.b:disabled{opacity:.55;cursor:default}
    .c{border:1px solid rgba(40,25,10,.12);border-radius:14px;padding:11px 12px;display:grid;gap:8px;background:#fffaf3}.c:hover{border-color:#f97316}
    .c .a{font-weight:700;font-size:13px}.c .t{color:#3d342b;font-size:13.5px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
    .q{border-left:3px solid #f97316;padding:4px 0 4px 10px;color:#3d342b;font-size:13.5px}.q b{display:block;font-size:12px;color:#7a7066}
    .chips{display:flex;flex-wrap:wrap;gap:6px}.chip{border:1px solid rgba(40,25,10,.16);background:#fff;border-radius:99px;padding:4px 11px;font:600 12.5px system-ui,sans-serif;cursor:pointer;color:#3d342b}.chip.on{background:#f97316;border-color:#f97316;color:#1a1209}
    .row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:13px;color:#3d342b}.row label{display:flex;gap:6px;align-items:center;cursor:pointer}
    input.h,select.h{width:100%;background:#fff;border:1px solid rgba(40,25,10,.18);border-radius:10px;padding:8px 10px;font:13px system-ui,sans-serif}
    .d{border:1.5px solid rgba(40,25,10,.14);border-radius:14px;padding:10px;display:grid;gap:8px}.d:focus-within{border-color:#f97316;box-shadow:0 0 0 3px rgba(249,115,22,.14)}
    textarea.dt{width:100%;border:0;resize:none;font:14px/1.45 system-ui,sans-serif;color:#1a1612;outline:none;min-height:46px;background:transparent}
    .note{font-size:12.5px;color:#7a7066}.warn{background:#fff4dd;border:1px solid #f1d28a;border-radius:12px;padding:9px 12px;font-size:13px;color:#5c4400}
    .err{background:#ffe9ea;border:1px solid #f3b4b8;border-radius:12px;padding:9px 12px;font-size:13px;color:#7a1820}.ok{background:#e4f8ee;border:1px solid #a7e3c4;border-radius:12px;padding:9px 12px;font-size:13px;color:#0d5b36}
    .sk{height:62px;border-radius:14px;background:linear-gradient(90deg,#fdeedd,#fff8ee,#fdeedd);background-size:200% 100%;animation:sh 1.2s infinite}@keyframes sh{to{background-position:-200% 0}}
    .ft{padding:10px 16px;border-top:1px solid rgba(40,25,10,.1);font-size:12px;color:#7a7066;display:flex;justify-content:space-between;gap:10px}
    a.l{white-space:nowrap;color:#c2410c;cursor:pointer;text-decoration:underline}
  </style><div class="w" id="w"></div>`;
  const W = root.getElementById('w');

  /* ---------- rendering ---------- */
  function usageText() {
    const u = S.usage; if (!u) return 'Drafts in your voice';
    if (!u.plan) return `${u.used} of ${u.limit} drafts used this month`;
    const name = { trial: 'Free trial', free: 'Free plan', subscription: 'Subscription' }[u.plan] || '';
    const left = u.plan === 'trial' ? `${u.dayLeft} left today` : `${u.used} of ${u.limit} replies used`;
    return `${name} · ${left}${u.packs ? ` · +${u.packs} pack` : ''}`;
  }
  function render() {
    const n = S.comments.length;
    if (!S.open) { host.style.display = ''; W.innerHTML = `<button class="pill" id="open"><i>✦</i>Reply${n ? ` <b>${n}</b>` : ''}</button>`; return; }
    host.style.display = '';
    let body = '';
    const st = S.state || {};
    if (st.ok && !st.hasKey) body += `<div class="warn"><b>One quick step:</b> add your Aurora Reply key. <a class="l" id="optKey">Open settings</a></div>`;
    else if (st.ok && !st.voiceReady) body += `<div class="note">💡 It writes better when it knows you. <a class="l" id="optVoice">Teach it your voice</a> (30 seconds).</div>`;
    if (st.ok && st.profiles && st.profiles.items.length > 1) body += `<div class="row"><label>Voice: <select class="h" id="profile" style="width:auto">${st.profiles.items.map((p) => `<option value="${esc(p.id)}" ${p.id === st.profiles.active ? 'selected' : ''}>${esc(p.label)}</option>`).join('')}</select></label></div>`;
    if (S.done) body += `<div class="ok">${esc(S.done)}</div>`;
    if (S.view === 'list') {
      body += `<div class="bar"><button class="b" id="pick">🎯 Pick a comment on the page</button><button class="b" id="rescan">↻ Rescan</button></div>`;
      body += n ? S.comments.map((c, i) => `<div class="c" data-i="${i}"><div class="a">${esc(c.author)}</div><div class="t">${esc(c.text)}</div><div><button class="b p" data-draft="${i}">✦ Draft a reply</button></div></div>`).join('')
        : `<div class="warn"><b>No comments found yet.</b> Open a post and scroll to its comments, then press Rescan.<br>Comments are on screen but nothing shows? The site may have changed its page. <a class="l" id="report">Report a problem</a> — it takes 10 seconds.</div>`;
      const un = unanswered(); if (un.length) body = body.replace('<div class="c"', `<button class="b p" id="qstart" style="justify-self:start">▶ Reply to unanswered comments (${un.length})</button><div class="c"`);
    } else if (S.view === 'report') {
      body += `<div class="q"><b>Report a problem</b>Tell us what went wrong. We copy a few technical details about the page (no names, no comments) so we can fix it faster.</div><div class="bar"><button class="b p" id="repTg">💬 Telegram channel (fastest)</button><button class="b" id="repMail">✉ Email</button></div><div class="bar"><button class="b" id="back">← Back</button></div>`;
    } else if (S.view === 'qintro') {
      const un = unanswered(), N = Math.min(un.length, 15), u = S.usage, left = u ? Math.max(0, u.limit - u.used) : null;
      body += `<div class="q"><b>Reply to unanswered comments</b>Aurora writes ${nReplies() === 1 ? 'one reply' : nReplies() + ' options'} at a time for the ${N} comment${N === 1 ? '' : 's'} nobody has answered yet. You read each one, insert it, and press Send yourself — then go to the next.</div><div class="note">Uses up to ${N * nReplies()} of your drafts${left != null ? ` (${left} left this month)` : ''}. A draft is only written when you reach that comment.</div><div class="bar"><button class="b p" id="qgo">Start</button><button class="b" id="back">Cancel</button></div>`;
    } else {
      const c = S.sel;
      if (S.queue) body += `<div class="bar"><span class="note" style="flex:1"><b>Queue ${S.queue.i + 1} of ${S.queue.list.length}</b></span><button class="b" id="qskip">Skip ›</button><button class="b" id="qstop">Stop</button></div>`;
      body += `<div class="bar">${S.queue ? '' : '<button class="b" id="back">← All comments</button>'}</div><div class="q"><b>${esc(c.author)} wrote</b>${esc(c.text.length > 300 ? c.text.slice(0, 300) + '…' : c.text)}</div>`;
      body += `<div class="chips">${TONES.map(([id, l]) => `<button class="chip ${((S.tone || (S.state && S.state.voice && S.state.voice.tone) || 'friendly') === id) ? 'on' : ''}" data-tone="${id}">${l}</button>`).join('')}</div>`;
      body += `<input class="h" id="hint" maxlength="200" placeholder="Optional: what should the reply say? e.g. thank them and mention Saturday" value="${esc(S.hint)}"><div class="row"><span>Replies:</span><div class="chips">${[1, 2, 3].map((k) => `<button class="chip ${nReplies() === k ? 'on' : ''}" data-count="${k}">${k}</button>`).join('')}</div><span class="note">uses ${nReplies()} draft${nReplies() > 1 ? 's' : ''}</span></div><div class="row"><label><input type="checkbox" id="best" ${S.quality ? 'checked' : ''}> Best quality (slower)</label></div>`;
      if (S.loading) body += `<div class="sk"></div><div class="sk"></div><div class="sk"></div><div class="note">Writing ${nReplies() === 1 ? 'a reply' : nReplies() + ' replies'} in your voice…</div>`;
      else {
        if (S.error) body += `<div class="err">${esc(S.error.message)}${S.error.status === 'no_key' || S.error.status === 'invalid' || S.error.status === 'wrong_plan' ? ' <a class="l" id="optKey">Open settings</a>' : ''}${S.error.upgrade ? ' <a class="l" id="upgrade">Get more replies ↗</a>' : ''}</div>`;
        if (S.flag !== 'none') body += `<div class="warn"><b>${{ spam: 'This looks like spam.', abusive: 'This looks abusive.', sensitive: 'This one may need you personally.' }[S.flag]}</b> ${esc(S.note)}</div>`;
        body += S.drafts.map((d, i) => `<div class="d"><textarea class="dt" data-t="${i}" rows="2">${esc(d)}</textarea><div class="bar"><button class="b p" data-use="${i}">Use this reply</button><button class="b" data-copy="${i}">Copy</button><button class="b" data-save="${i}" title="Add to the examples of how you write">＋ My style</button></div></div>`).join('');
        if (S.quick.length) body += `<div class="note">⚡ Your quick replies</div><div class="chips">${S.quick.slice(0, 8).map((q, i) => `<button class="chip" data-quick="${i}" title="${esc(q.text)}">${esc(q.title)}</button>`).join('')}</div>`;
        if (S.queue && S.done && /Inserted/.test(S.done)) body = body.replace('<div class="ok">', '<div class="bar"><button class="b p" id="qnext">Next comment ›  (Alt+N)</button></div><div class="ok">');
        if (S.drafts.length || S.error) body += `<div class="bar"><button class="b" id="again">↻ Write new ones</button></div>`;
      }
    }
    W.innerHTML = `<div class="panel"><div class="hd"><div class="lg">✦</div><h1>Aurora Reply<small>${esc(usageText())}</small></h1><button class="x" id="close" aria-label="Close">×</button></div><div class="bd">${body}</div><div class="ft"><span>You read, edit and send every reply yourself.</span><a class="l" id="report" title="Something not working?">Report a problem</a></div></div>`;
    root.querySelectorAll('textarea.dt').forEach(grow);
  }
  const grow = (t) => { t.style.height = 'auto'; t.style.height = Math.min(220, t.scrollHeight) + 'px'; };

  /* ---------- actions ---------- */
  function scan() { S.comments = A.findComments(); if (S.sel && !document.contains(S.sel.el)) S.sel = null; }
  async function refreshState() { const q = await ask('quickList'); S.quick = (q && q.quick) || []; S.state = await ask('getState'); if (S.state && S.state.usage) S.usage = S.state.usage; }
  function highlight(el, on) { if (!el) return; el.style.outline = on ? '2px solid #f97316' : ''; el.style.outlineOffset = on ? '2px' : ''; }

  const nReplies = () => S.count || (S.state && S.state.voice && +S.state.voice.count) || 3;
  const unanswered = () => S.comments.filter((c) => !c.replied && !c.own && !(S.state && S.state.voice && S.state.voice.name && c.author.toLowerCase() === String(S.state.voice.name).toLowerCase()));
  function queueGo(step) {
    const q = S.queue; if (!q) return;
    q.i += step;
    while (q.i < q.list.length && !document.contains(q.list[q.i].el)) q.i++;
    if (q.i >= q.list.length) { S.queue = null; S.view = 'list'; S.sel = null; S.done = '✓ Queue finished. Nice work!'; scan(); render(); return; }
    draft(q.list[q.i]);
  }
  const TG = 'https://t.me/+GqmNSvnMJxhhMzJh';
  function reportText() {
    const info = Object.assign({ extension: (chrome.runtime.getManifest && chrome.runtime.getManifest().version) || '', ua: navigator.userAgent.replace(/\s+/g, ' ').slice(0, 110) }, A.diagnose());
    return { info, text: 'Aurora Reply — problem report\n(what happened, in your words: )\n\n--- technical details (no names or comments) ---\n' + JSON.stringify(info, null, 1) };
  }
  function report() { S.open = true; S.view = 'report'; render(); }
  async function reportVia(how) {
    const { info, text } = reportText();
    try { await navigator.clipboard.writeText(text); } catch (_) {}
    if (how === 'tg') { window.open(TG, '_blank', 'noopener'); S.done = 'Telegram is opening. The technical details are copied — paste them in the “Aurora Studios Report” channel and tell us what happened.'; }
    else { const a = document.createElement('a'); a.href = 'mailto:support@getaurorastudios.com?subject=' + encodeURIComponent('Aurora Reply problem on ' + info.platform) + '&body=' + encodeURIComponent(text); a.style.display = 'none'; document.body.appendChild(a); a.click(); a.remove(); S.done = 'Your email app should open. The technical details are also copied — paste them if it does not.'; }
    S.view = 'list'; render();
  }
  async function draft(c) {
    S.sel = c; S.view = 'draft'; S.loading = true; S.error = null; S.drafts = []; S.flag = 'none'; S.note = ''; S.done = ''; render();
    try { c.el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (_) {}
    const post = A.postContext();
    const r = await ask('draft', { platform: A.platformId(), tone: S.tone || undefined, quality: S.quality ? 'best' : 'standard', hint: S.hint, comment: { text: c.text, author: c.author }, post, count: nReplies() });
    S.loading = false;
    if (r.usage) S.usage = r.usage;
    if (r.ok) { S.hid = r.historyId || ''; S.qmark = {}; S.drafts = r.drafts.map((d) => d.text); S.flag = r.flag || 'none'; S.note = r.note || ''; } else S.error = { message: r.message || 'Something went wrong.', status: r.status, upgrade: r.upgrade || '' };
    render();
  }
  function logUse(action, text, i) { if (S.hid) ask('histUpdate', { id: S.hid, action, chosen: text, quick: !!S.qmark[i] }); }
  async function use(i) {
    const text = (root.querySelector(`[data-t="${i}"]`) || {}).value || S.drafts[i];
    const c = S.sel; if (!c) return;
    const box = await A.openReply(c);
    if (box && A.setText(box, text)) {
      logUse('inserted', text, i);
      S.done = '✓ Inserted. Read it, change anything you like, then press Send yourself.'; if (!S.queue) { S.open = false; S.view = 'list'; } render();
      toast(S.done); try { box.focus(); } catch (_) {}
    } else {
      try { await navigator.clipboard.writeText(text); logUse('copied', text, i); S.done = 'Could not find the reply box, so the reply is copied. Click Reply on that comment and paste it (Ctrl+V).'; } catch (_) { S.done = 'Could not find the reply box. Select the text above, copy it, and paste it into the comment yourself.'; }
      render();
    }
  }
  let tt; function toast(msg) {
    let t = root.getElementById('toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.style.cssText = 'font:600 13px system-ui,sans-serif;background:#16120d;border:1px solid rgba(251,191,36,.5);color:#fff;border-radius:12px;padding:10px 14px;box-shadow:0 12px 30px rgba(0,0,0,.25);max-width:340px'; W.appendChild(t); }
    t.textContent = msg; clearTimeout(tt); tt = setTimeout(() => t.remove(), 6000);
  }

  /* pick mode: click a comment on the page */
  function pickOn() {
    S.pick = true; S.open = false; render();
    let last = null;
    const over = (e) => { const c = A.commentFromElement(e.target); if (last && (!c || c.el !== last)) highlight(last, false); last = c ? c.el : null; if (c) highlight(c.el, true); };
    const stop = () => { S.pick = false; document.removeEventListener('mouseover', over, true); document.removeEventListener('click', click, true); document.removeEventListener('keydown', key, true); highlight(last, false); };
    const click = (e) => { if (e.composedPath().includes(host)) return; const c = A.commentFromElement(e.target); e.preventDefault(); e.stopPropagation(); stop(); if (c) { S.open = true; draft(c); } else { S.open = true; render(); } };
    const key = (e) => { if (e.key === 'Escape') { stop(); S.open = true; render(); } };
    document.addEventListener('mouseover', over, true); document.addEventListener('click', click, true); document.addEventListener('keydown', key, true);
  }

  W.addEventListener('click', async (e) => {
    const t = e.target.closest('button, a'); if (!t) return;
    if (t.id === 'open') { S.open = true; scan(); S.view = 'list'; render(); refreshState().then(render); }
    else if (t.id === 'close') { S.open = false; render(); }
    else if (t.id === 'rescan') { scan(); render(); }
    else if (t.id === 'pick') pickOn();
    else if (t.id === 'back') { S.view = 'list'; S.queue = null; S.error = null; render(); }
    else if (t.id === 'again') draft(S.sel);
    else if (t.id === 'upgrade') window.open((S.error && S.error.upgrade) || 'https://getaurorastudios.com/reply/', '_blank', 'noopener');
    else if (t.id === 'report') report();
    else if (t.id === 'repTg') reportVia('tg');
    else if (t.id === 'repMail') reportVia('mail');
    else if (t.id === 'qstart') { S.view = 'qintro'; render(); }
    else if (t.id === 'qgo') { S.queue = { list: unanswered().slice(0, 15), i: -1 }; queueGo(1); }
    else if (t.id === 'qnext' || t.id === 'qskip') queueGo(1);
    else if (t.id === 'qstop') { S.queue = null; S.view = 'list'; S.done = ''; render(); }
    else if (t.id === 'optKey' || t.id === 'optVoice') ask('openOptions');
    else if (t.dataset.draft != null) draft(S.comments[+t.dataset.draft]);
    else if (t.dataset.count) { S.count = +t.dataset.count; ask('setCount', { count: S.count }); render(); }
    else if (t.dataset.tone) { S.tone = t.dataset.tone; render(); if (S.drafts.length || S.error) draft(S.sel); }
    else if (t.dataset.quick != null) { const q = S.quick[+t.dataset.quick]; if (q) { const m = {}; Object.keys(S.qmark).forEach((k) => { m[+k + 1] = S.qmark[k]; }); S.qmark = m; S.qmark[0] = true; S.drafts = [q.text, ...S.drafts]; render(); } }
    else if (t.dataset.use != null) use(+t.dataset.use);
    else if (t.dataset.copy != null) { try { await navigator.clipboard.writeText(root.querySelector(`[data-t="${t.dataset.copy}"]`).value); t.textContent = 'Copied ✓'; logUse('copied', root.querySelector(`[data-t="${t.dataset.copy}"]`).value, +t.dataset.copy); } catch (_) { t.textContent = 'Select & copy'; } }
    else if (t.dataset.save != null) { const r = await ask('addSample', { text: root.querySelector(`[data-t="${t.dataset.save}"]`).value }); t.textContent = r.ok ? `Saved (${r.count}) ✓` : 'Could not save'; }
  });
  W.addEventListener('input', (e) => { if (e.target.id === 'hint') S.hint = e.target.value; if (e.target.classList.contains('dt')) { grow(e.target); const i = +e.target.dataset.t; if (S.drafts[i] != null) S.drafts[i] = e.target.value; } if (e.target.id === 'best') S.quality = e.target.checked; });
  W.addEventListener('change', async (e) => {
    if (e.target.id === 'best') S.quality = e.target.checked;
    if (e.target.id === 'profile') { await ask('setProfile', { id: e.target.value }); await refreshState(); render(); }
  });
  /* keyboard shortcuts — Alt+R open/close, Alt+1/2/3 use a draft, Alt+G write new ones, Alt+N next in the queue, Esc closes (only when the panel has focus) */
  document.addEventListener('keydown', (e) => {
    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      const k = e.code;
      if (k === 'KeyR') { e.preventDefault(); S.open ? (S.open = false, render()) : (S.open = true, scan(), S.view = 'list', render(), refreshState().then(render)); }
      else if (S.open && /^(Digit|Numpad)[123]$/.test(k) && S.view === 'draft' && S.drafts[+k.slice(-1) - 1] != null) { e.preventDefault(); use(+k.slice(-1) - 1); }
      else if (S.open && k === 'KeyG' && S.view === 'draft' && S.sel && !S.loading) { e.preventDefault(); draft(S.sel); }
      else if (S.open && k === 'KeyN' && S.queue) { e.preventDefault(); queueGo(1); }
    } else if (e.key === 'Escape' && S.open && e.composedPath().includes(host)) { S.open = false; render(); }
  }, true);
  W.addEventListener('mouseover', (e) => { const c = e.target.closest('.c'); if (c && S.comments[+c.dataset.i]) highlight(S.comments[+c.dataset.i].el, true); });
  W.addEventListener('mouseout', (e) => { const c = e.target.closest('.c'); if (c && S.comments[+c.dataset.i]) highlight(S.comments[+c.dataset.i].el, false); });

  /* show the launcher only where there are comments to reply to */
  let timer = null;
  const rescanSoon = () => { clearTimeout(timer); timer = setTimeout(() => { if (S.pick) return; const before = S.comments.length; scan(); if (S.view === 'list' || !S.open) { if (!S.open && before === S.comments.length) return; render(); } }, 900); };
  new MutationObserver(rescanSoon).observe(document.body, { childList: true, subtree: true });
  document.documentElement.appendChild(host);
  scan(); render();
  window.__auroraReplyTest = { S, unanswered, scan, render, draft, use, root };
})();
