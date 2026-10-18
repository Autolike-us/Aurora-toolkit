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

  const S = { open: false, view: 'list', comments: [], sel: null, drafts: [], flag: 'none', note: '', loading: false, error: null, tone: '', quality: false, hint: '', usage: null, state: null, pick: false, done: '' };

  /* ---------- shell ---------- */
  const host = document.createElement('div');
  host.id = 'aurora-reply-host';
  host.style.cssText = 'all:initial;position:fixed;right:18px;bottom:18px;z-index:2147483646';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>
    :host{all:initial}*{box-sizing:border-box}
    .w{font:14px/1.45 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#1b1838;display:flex;flex-direction:column;align-items:flex-end;gap:10px}
    .pill{display:flex;align-items:center;gap:9px;border:0;cursor:pointer;color:#fff;font:700 14px system-ui,sans-serif;padding:11px 16px 11px 12px;border-radius:999px;background:linear-gradient(120deg,#6d28d9,#4f46e5 55%,#0ea5e9);box-shadow:0 12px 30px rgba(79,70,229,.45)}
    .pill i{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,.22);font-style:normal}
    .pill b{background:#fff;color:#4f46e5;border-radius:99px;padding:1px 8px;font-size:12px}
    .panel{width:392px;max-width:calc(100vw - 24px);max-height:min(78vh,720px);display:flex;flex-direction:column;background:#fff;border:1px solid rgba(40,30,110,.14);border-radius:20px;box-shadow:0 30px 70px rgba(30,20,90,.35);overflow:hidden}
    .hd{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid rgba(40,30,110,.1);background:linear-gradient(120deg,rgba(109,40,217,.08),rgba(14,165,233,.08))}
    .hd .lg{width:30px;height:30px;border-radius:10px;background:linear-gradient(135deg,#6d28d9,#4f46e5 55%,#0ea5e9);display:grid;place-items:center;color:#fff;font-size:16px}
    .hd h1{margin:0;font-size:15px;flex:1}.hd small{display:block;font-weight:500;color:#6c6890;font-size:12px}
    .x{border:0;background:none;font-size:20px;cursor:pointer;color:#6c6890;border-radius:8px;width:30px;height:30px}.x:hover{background:rgba(40,30,110,.08)}
    .bd{padding:14px 16px;overflow:auto;display:grid;gap:12px}
    .bar{display:flex;gap:8px;flex-wrap:wrap}
    button.b{font:600 13px system-ui,sans-serif;border:1px solid rgba(40,30,110,.16);background:#fff;color:#1b1838;border-radius:10px;padding:7px 12px;cursor:pointer}
    button.b:hover{border-color:#6d28d9;color:#6d28d9}button.b.p{border:0;color:#fff;background:linear-gradient(120deg,#6d28d9,#4f46e5 60%,#0ea5e9)}button.b.p:hover{color:#fff;filter:brightness(1.08)}button.b:disabled{opacity:.55;cursor:default}
    .c{border:1px solid rgba(40,30,110,.12);border-radius:14px;padding:11px 12px;display:grid;gap:8px;background:#fbfaff}.c:hover{border-color:#6d28d9}
    .c .a{font-weight:700;font-size:13px}.c .t{color:#3b3763;font-size:13.5px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
    .q{border-left:3px solid #6d28d9;padding:4px 0 4px 10px;color:#3b3763;font-size:13.5px}.q b{display:block;font-size:12px;color:#6c6890}
    .chips{display:flex;flex-wrap:wrap;gap:6px}.chip{border:1px solid rgba(40,30,110,.16);background:#fff;border-radius:99px;padding:4px 11px;font:600 12.5px system-ui,sans-serif;cursor:pointer;color:#3b3763}.chip.on{background:#6d28d9;border-color:#6d28d9;color:#fff}
    .row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:13px;color:#3b3763}.row label{display:flex;gap:6px;align-items:center;cursor:pointer}
    input.h{width:100%;border:1px solid rgba(40,30,110,.18);border-radius:10px;padding:8px 10px;font:13px system-ui,sans-serif}
    .d{border:1.5px solid rgba(40,30,110,.14);border-radius:14px;padding:10px;display:grid;gap:8px}.d:focus-within{border-color:#6d28d9;box-shadow:0 0 0 3px rgba(109,40,217,.14)}
    textarea.dt{width:100%;border:0;resize:none;font:14px/1.45 system-ui,sans-serif;color:#1b1838;outline:none;min-height:46px;background:transparent}
    .note{font-size:12.5px;color:#6c6890}.warn{background:#fff4dd;border:1px solid #f1d28a;border-radius:12px;padding:9px 12px;font-size:13px;color:#5c4400}
    .err{background:#ffe9ea;border:1px solid #f3b4b8;border-radius:12px;padding:9px 12px;font-size:13px;color:#7a1820}.ok{background:#e4f8ee;border:1px solid #a7e3c4;border-radius:12px;padding:9px 12px;font-size:13px;color:#0d5b36}
    .sk{height:62px;border-radius:14px;background:linear-gradient(90deg,#efedf9,#f8f7fe,#efedf9);background-size:200% 100%;animation:sh 1.2s infinite}@keyframes sh{to{background-position:-200% 0}}
    .ft{padding:10px 16px;border-top:1px solid rgba(40,30,110,.1);font-size:12px;color:#6c6890;display:flex;justify-content:space-between;gap:10px}
    a.l{color:#4f46e5;cursor:pointer;text-decoration:underline}
  </style><div class="w" id="w"></div>`;
  const W = root.getElementById('w');

  /* ---------- rendering ---------- */
  function usageText() { const u = S.usage; return u ? `${u.used} of ${u.limit} drafts used this month` : 'Drafts in your voice'; }
  function render() {
    const n = S.comments.length;
    if (!S.open) { host.style.display = n || S.pick ? '' : 'none'; W.innerHTML = `<button class="pill" id="open"><i>✦</i>Reply${n ? ` <b>${n}</b>` : ''}</button>`; return; }
    host.style.display = '';
    let body = '';
    const st = S.state || {};
    if (st.ok && !st.hasKey) body += `<div class="warn"><b>One quick step:</b> add your Aurora Reply key. <a class="l" id="optKey">Open settings</a></div>`;
    else if (st.ok && !st.voiceReady) body += `<div class="note">💡 It writes better when it knows you. <a class="l" id="optVoice">Teach it your voice</a> (30 seconds).</div>`;
    if (S.done) body += `<div class="ok">${esc(S.done)}</div>`;
    if (S.view === 'list') {
      body += `<div class="bar"><button class="b" id="pick">🎯 Pick a comment on the page</button><button class="b" id="rescan">↻ Rescan</button></div>`;
      body += n ? S.comments.map((c, i) => `<div class="c" data-i="${i}"><div class="a">${esc(c.author)}</div><div class="t">${esc(c.text)}</div><div><button class="b p" data-draft="${i}">✦ Draft a reply</button></div></div>`).join('')
        : `<div class="note">No comments found on screen yet. Scroll to the comments (or open a post), then press Rescan.</div>`;
    } else {
      const c = S.sel;
      body += `<div class="bar"><button class="b" id="back">← All comments</button></div><div class="q"><b>${esc(c.author)} wrote</b>${esc(c.text.length > 300 ? c.text.slice(0, 300) + '…' : c.text)}</div>`;
      body += `<div class="chips">${TONES.map(([id, l]) => `<button class="chip ${((S.tone || (S.state && S.state.voice && S.state.voice.tone) || 'friendly') === id) ? 'on' : ''}" data-tone="${id}">${l}</button>`).join('')}</div>`;
      body += `<input class="h" id="hint" maxlength="200" placeholder="Optional: what should the reply say? e.g. thank them and mention Saturday" value="${esc(S.hint)}"><div class="row"><label><input type="checkbox" id="best" ${S.quality ? 'checked' : ''}> Best quality (slower)</label></div>`;
      if (S.loading) body += `<div class="sk"></div><div class="sk"></div><div class="sk"></div><div class="note">Writing three replies in your voice…</div>`;
      else {
        if (S.error) body += `<div class="err">${esc(S.error.message)}${S.error.status === 'no_key' || S.error.status === 'invalid' || S.error.status === 'wrong_plan' ? ' <a class="l" id="optKey">Open settings</a>' : ''}</div>`;
        if (S.flag !== 'none') body += `<div class="warn"><b>${{ spam: 'This looks like spam.', abusive: 'This looks abusive.', sensitive: 'This one may need you personally.' }[S.flag]}</b> ${esc(S.note)}</div>`;
        body += S.drafts.map((d, i) => `<div class="d"><textarea class="dt" data-t="${i}" rows="2">${esc(d)}</textarea><div class="bar"><button class="b p" data-use="${i}">Use this reply</button><button class="b" data-copy="${i}">Copy</button><button class="b" data-save="${i}" title="Add to the examples of how you write">＋ My style</button></div></div>`).join('');
        if (S.drafts.length || S.error) body += `<div class="bar"><button class="b" id="again">↻ Write new ones</button></div>`;
      }
    }
    W.innerHTML = `<div class="panel"><div class="hd"><div class="lg">✦</div><h1>Aurora Reply<small>${esc(usageText())}</small></h1><button class="x" id="close" aria-label="Close">×</button></div><div class="bd">${body}</div><div class="ft"><span>You read, edit and send every reply yourself.</span></div></div>`;
    root.querySelectorAll('textarea.dt').forEach(grow);
  }
  const grow = (t) => { t.style.height = 'auto'; t.style.height = Math.min(220, t.scrollHeight) + 'px'; };

  /* ---------- actions ---------- */
  function scan() { S.comments = A.findComments(); if (S.sel && !document.contains(S.sel.el)) S.sel = null; }
  async function refreshState() { S.state = await ask('getState'); if (S.state && S.state.usage) S.usage = S.state.usage; }
  function highlight(el, on) { if (!el) return; el.style.outline = on ? '2px solid #6d28d9' : ''; el.style.outlineOffset = on ? '2px' : ''; }

  async function draft(c) {
    S.sel = c; S.view = 'draft'; S.loading = true; S.error = null; S.drafts = []; S.flag = 'none'; S.note = ''; S.done = ''; render();
    try { c.el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (_) {}
    const post = A.postContext();
    const r = await ask('draft', { platform: A.platformId(), tone: S.tone || undefined, quality: S.quality ? 'best' : 'standard', hint: S.hint, comment: { text: c.text, author: c.author }, post });
    S.loading = false;
    if (r.usage) S.usage = r.usage;
    if (r.ok) { S.drafts = r.drafts.map((d) => d.text); S.flag = r.flag || 'none'; S.note = r.note || ''; } else S.error = { message: r.message || 'Something went wrong.', status: r.status };
    render();
  }
  async function use(i) {
    const text = (root.querySelector(`[data-t="${i}"]`) || {}).value || S.drafts[i];
    const c = S.sel; if (!c) return;
    const box = await A.openReply(c);
    if (box && A.setText(box, text)) {
      S.done = '✓ Inserted. Read it, change anything you like, then press Send yourself.'; S.open = false; S.view = 'list'; render();
      toast(S.done); try { box.focus(); } catch (_) {}
    } else {
      try { await navigator.clipboard.writeText(text); S.done = 'Could not find the reply box, so the reply is copied. Click Reply on that comment and paste it (Ctrl+V).'; } catch (_) { S.done = 'Could not find the reply box. Select the text above, copy it, and paste it into the comment yourself.'; }
      render();
    }
  }
  let tt; function toast(msg) {
    let t = root.getElementById('toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.style.cssText = 'font:600 13px system-ui,sans-serif;background:#0d5b36;color:#fff;border-radius:12px;padding:10px 14px;box-shadow:0 12px 30px rgba(0,0,0,.25);max-width:340px'; W.appendChild(t); }
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
    else if (t.id === 'back') { S.view = 'list'; S.error = null; render(); }
    else if (t.id === 'again') draft(S.sel);
    else if (t.id === 'optKey' || t.id === 'optVoice') ask('openOptions');
    else if (t.dataset.draft != null) draft(S.comments[+t.dataset.draft]);
    else if (t.dataset.tone) { S.tone = t.dataset.tone; render(); if (S.drafts.length || S.error) draft(S.sel); }
    else if (t.dataset.use != null) use(+t.dataset.use);
    else if (t.dataset.copy != null) { try { await navigator.clipboard.writeText(root.querySelector(`[data-t="${t.dataset.copy}"]`).value); t.textContent = 'Copied ✓'; } catch (_) { t.textContent = 'Select & copy'; } }
    else if (t.dataset.save != null) { const r = await ask('addSample', { text: root.querySelector(`[data-t="${t.dataset.save}"]`).value }); t.textContent = r.ok ? `Saved (${r.count}) ✓` : 'Could not save'; }
  });
  W.addEventListener('input', (e) => { if (e.target.id === 'hint') S.hint = e.target.value; if (e.target.classList.contains('dt')) grow(e.target); if (e.target.id === 'best') S.quality = e.target.checked; });
  W.addEventListener('change', (e) => { if (e.target.id === 'best') S.quality = e.target.checked; });
  W.addEventListener('mouseover', (e) => { const c = e.target.closest('.c'); if (c && S.comments[+c.dataset.i]) highlight(S.comments[+c.dataset.i].el, true); });
  W.addEventListener('mouseout', (e) => { const c = e.target.closest('.c'); if (c && S.comments[+c.dataset.i]) highlight(S.comments[+c.dataset.i].el, false); });

  /* show the launcher only where there are comments to reply to */
  let timer = null;
  const rescanSoon = () => { clearTimeout(timer); timer = setTimeout(() => { if (S.pick) return; const before = S.comments.length; scan(); if (S.view === 'list' || !S.open) { if (!S.open && before === S.comments.length) return; render(); } }, 900); };
  new MutationObserver(rescanSoon).observe(document.body, { childList: true, subtree: true });
  document.documentElement.appendChild(host);
  scan(); render();
  window.__auroraReplyTest = { S, scan, render, draft, use, root };
})();
