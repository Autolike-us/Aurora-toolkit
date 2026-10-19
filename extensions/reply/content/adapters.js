/* Aurora Reply — reading comments and filling the reply box. No network, no UI: just the page.
   Every comment on Facebook, Instagram and TikTok has a "Reply" action, so comments are found from that instead of from
   site-specific class names (which change every few weeks). Site-specific code is limited to the post caption and the box. */
(function (root) {
  'use strict';
  const A = {};
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const txt = (el) => (el ? String(el.innerText || el.textContent || '').trim() : '');
  // "Reply" / "Like" in the languages Facebook, Instagram and TikTok are used in. Matched as the whole label, never inside a comment.
  const REPLY_WORDS = ['reply', 'répondre', 'responder', 'responder', 'antworten', 'rispondi', 'antwoorden', 'reageer', 'svara', 'svar', 'odpowiedz', 'odpowiedź', 'odpovědět', 'odpovedať', 'ответить', 'відповісти', 'yanıtla', 'cevapla', 'balas', 'trả lời', 'ตอบกลับ', 'vastaa', 'răspunde', 'απάντηση', 'válasz', 'valasz', '回复', '回覆', '回應', '返信', '返信する', '답글', '답글 달기', 'ردّ', 'رد', 'الرد', 'השב', 'उत्तर दें', 'जवाब दें', 'উত্তর দিন', 'tanggapi', 'responde', 'respondre', 'répondre', 'reply to', 'respuesta'];
  const LIKE_WORDS = ['like', 'liked', "j'aime", 'me gusta', 'gefällt mir', 'mi piace', 'curtir', 'curtiu', 'gostar', 'vind ik leuk', 'gilla', 'lubię to', 'нравится', 'подобається', 'beğen', 'suka', 'thích', 'ถูกใจ', 'tykkää', 'μου αρέσει', '赞', '讚', 'いいね', '좋아요', 'أعجبني', 'लाइक'];
  const escRe = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const REPLY_RE = new RegExp('^\\s*(?:' + REPLY_WORDS.map(escRe).join('|') + ')\\s*$', 'i');
  const ACTION_BASE = /^(like|liked|reply|replied|share|hide|edit|edited|delete|report|pin|pinned|see translation|translate|view( all)? \d+ (more )?repl(y|ies)|view more repl(y|ies)|hide repl(y|ies)|author|top fan|creator|follow|following|verified|just now|yesterday|·|\d+[smhdwy]|\d+\s*(sec|secs|min|mins|hr|hrs|hour|hours|day|days|week|weeks|month|months|year|years)( ago)?|\d+ likes?|\d+ repl(y|ies)|liked by creator|more|\.\.\.|…|[\d.,]+[kKmM]?)$/i;
  const ACTION = { test: (t) => ACTION_BASE.test(t) || REPLY_RE.test(t) || LIKE_WORDS.includes(String(t).trim().toLowerCase().replace(/[’‘`]/g, "'").replace(/[!！.。]+$/, '')) || /^\d+\s*\p{L}{1,6}\.?$/u.test(t) };

  A.platformId = () => { const h = location.hostname; return /facebook\.com$/.test(h) ? 'facebook' : /instagram\.com$/.test(h) ? 'instagram' : /tiktok\.com$/.test(h) ? 'tiktok' : 'other'; };
  const visible = (el) => { if (!el || !el.getBoundingClientRect) return false; const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none'; };

  /* ---------- finding comments ---------- */
  function replyLabels(scope) {
    const out = [];
    for (const el of scope.querySelectorAll('span, div, a, button, [role="button"]')) {
      if (el.children.length > 1) continue;
      const t = (el.textContent || '');
      if (t.length > 14 || !REPLY_RE.test(t) || !visible(el)) continue;
      // keep the outermost element that is only the label
      let top = el; while (top.parentElement && REPLY_RE.test(top.parentElement.textContent || '') && top.parentElement !== scope) top = top.parentElement;
      if (!out.includes(top)) out.push(top);
    }
    return out;
  }
  /** The comment's own words: walk the text, skipping nested replies (parts that hold a different Reply button). */
  function parse(container, lab) {
    const others = replyLabels(container).filter((l) => l !== lab && !l.contains(lab) && !lab.contains(l));
    const foreign = (el) => !el.contains(lab) && others.some((o) => el.contains(o));
    const pieces = [];
    (function walk(n) {
      for (const ch of n.childNodes) {
        if (ch.nodeType === 3) { const t = ch.nodeValue.replace(/\s+/g, ' ').trim(); if (t) pieces.push({ t, node: ch }); }
        else if (ch.nodeType === 1) {
          if (/^(SCRIPT|STYLE|SVG|NOSCRIPT|TEXTAREA)$/i.test(ch.tagName) || foreign(ch) || getComputedStyle(ch).display === 'none') continue;
          walk(ch);
        }
      }
    })(container);
    const authorEl = Array.from(container.querySelectorAll('a[href]')).find((a) => { const t = txt(a); return t && t.length <= 80 && !ACTION.test(t) && !/^(https?:|www\.)/i.test(t) && !/^@/.test(t) && !(a.parentElement && Array.from(function* () { let p = a; while (p && p !== container) { yield p; p = p.parentElement; } }()).some(foreign)); });
    const author = txt(authorEl).replace(/\s+/g, ' ');
    const body = pieces.filter((p) => !(authorEl && authorEl.contains(p.node)) && p.t !== author && !ACTION.test(p.t)).map((p) => p.t);
    return { author, text: body.join(' ').replace(/\s+/g, ' ').trim() };
  }
  function containerFor(btn, scope) {
    for (let el = btn.parentElement, i = 0; el && el !== scope.parentElement && i < 10; el = el.parentElement, i++) {
      const p = parse(el, btn);
      if (p.author && p.text.length >= 2) return el;
    }
    return null;
  }
  /** All comments currently on screen with their reply buttons. */
  A.findComments = (scope) => {
    scope = scope || document.body;
    const seen = new Set(), out = [];
    const me = (A.postContext().author || '').toLowerCase();
    for (const lab of replyLabels(scope).slice(0, 120)) {
      const el = containerFor(lab, scope); if (!el) continue;
      const { author, text } = parse(el, lab);
      const key = author + '|' + text.slice(0, 60);
      if (seen.has(key)) continue; seen.add(key);
      const replied = replyLabels(el).length > 1 || /\b(view|see|show|voir|afficher|ver|mostrar|anzeigen|visualizza)\b[^\n]{0,24}\b(repl|rép|resp|antwort|risposte)/i.test(el.textContent || '');
      out.push({ el, btn: lab.closest('[role="button"], button, a') || lab, author, text, key, replied });
      out[out.length - 1].own = !!me && author.toLowerCase() === me;
      if (out.length >= 80) break;
    }
    return out;
  };
  /** The comment under a click (for "pick a comment"). */
  A.commentFromElement = (target) => {
    for (let el = target, i = 0; el && el !== document.body && i < 14; el = el.parentElement, i++) {
      const labs = replyLabels(el);
      if (labs.length === 1) { const c = A.findComments(el)[0]; if (c) return c; }
      if (labs.length > 1) return null;
    }
    return null;
  };

  /** Facts about the page's shape (no names, no comment text) for a "report a problem" message. */
  A.diagnose = () => ({ platform: A.platformId(), host: location.hostname, area: (location.pathname.split('/')[1] || '').slice(0, 20), lang: document.documentElement.lang || '', replyLabels: replyLabels(document.body).length, comments: A.findComments().length, editableBoxes: A.editables().length, dialog: !!document.querySelector('[role="dialog"]'), lastReplyAttempt: A.lastTrace });

  /* ---------- the post ---------- */
  A.postContext = () => {
    const p = A.platformId(); let caption = '', author = '';
    const first = (sels, scope) => { for (const s of sels) { const e = (scope || document).querySelector(s); const t = txt(e); if (t) return t; } return ''; };
    if (p === 'tiktok') { caption = first(['[data-e2e="browse-video-desc"]', '[data-e2e="video-desc"]']); author = first(['[data-e2e="browse-username"]', '[data-e2e="video-author-uniqueid"]']); }
    else if (p === 'instagram') { caption = first(['article h1', 'main article ul li h1', 'div[role="dialog"] h1']); author = first(['article header a[href^="/"]', 'div[role="dialog"] header a[href^="/"]']); }
    else if (p === 'facebook') {
      const posts = Array.from(document.querySelectorAll('[role="article"]')).filter((a) => !/^comment/i.test(a.getAttribute('aria-label') || '') && !a.parentElement.closest('[role="article"]'));
      const post = posts[0] || document;
      caption = first(['[data-ad-preview="message"]', '[data-ad-comet-preview="message"]'], post); author = first(['h2 a', 'h3 a', 'strong a'], post);
    }
    if (!caption) { const m = document.querySelector('meta[property="og:description"]'); caption = (m && m.content) || ''; }
    return { caption: caption.replace(/\s+/g, ' ').trim().slice(0, 800), author: author.replace(/\s+/g, ' ').trim().slice(0, 80) };
  };

  /* ---------- the reply box ---------- */
  const isEditable = (el) => !!el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && /^(text|search|)$/i.test(el.type || '')) || el.isContentEditable);
  A.editables = (scope) => Array.from((scope || document).querySelectorAll('textarea, input, [contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"], [role="textbox"], [data-lexical-editor="true"]')).filter((e) => isEditable(e) && visible(e));
  const valOf = (e) => (e.tagName === 'TEXTAREA' || e.tagName === 'INPUT' ? e.value : e.textContent) || '';
  const hintOf = (e) => (e.getAttribute('placeholder') || '') + ' ' + (e.getAttribute('aria-label') || '') + ' ' + (e.getAttribute('aria-placeholder') || '') + ' ' + (e.getAttribute('data-placeholder') || '');
  const hasMention = (e) => /^\s*@\S/.test(valOf(e)) || (!!e.querySelector && !!e.querySelector('a, [contenteditable="false"], [data-lexical-mention], [data-text="true"] a'));
  /** How likely is this box "the reply box of that comment, just opened by our click"? The plain main comment box scores low. */
  function score(e, c, snap) {
    const act = document.activeElement; let s = 0;
    const isAct = act === e || (e.contains && e.contains(act));
    const isNew = !snap.before.has(e), focusNow = isAct && snap.active !== act && snap.active !== e;
    const replHint = /repl|répon|respon|antwort|rispond/i.test(hintOf(e)), mention = hasMention(e);
    const v = valOf(e), changed = !!v.trim() && v !== snap.vals.get(e);
    if (!(isNew || focusNow || mention || changed || (replHint && isAct))) return 0; // nothing says our click did anything to this box
    if (isNew) s += 4;
    if (isAct) s += 3; if (focusNow) s += (A.platformId() === 'tiktok' ? 3 : 1);
    if (replHint) s += 3;
    if (mention) s += 3;
    if (changed) s += 2;
    for (let el = c.el, i = 0; el && i < 8; el = el.parentElement, i++) if (el.contains(e)) { s += i < 5 ? 2 : 1; break; }
    try { const r = e.getBoundingClientRect(), cr = c.el.getBoundingClientRect(); if (Math.abs(r.top - cr.bottom) < 420) s += 1; } catch (_) {}
    return s;
  }
  function findBox(c, snap) {
    let best = null, bs = 0;
    for (const e of A.editables()) { const s = score(e, c, snap); if (s > bs) { bs = s; best = e; } }
    return bs >= 5 ? best : null;
  }
  function realClick(el) {
    const r = el.getBoundingClientRect(), o = { bubbles: true, cancelable: true, composed: true, view: window, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, button: 0 };
    for (const t of ['pointerover', 'pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
      try { el.dispatchEvent(t.startsWith('pointer') ? new PointerEvent(t, { ...o, pointerType: 'mouse', isPrimary: true }) : new MouseEvent(t, o)); } catch (_) {}
    }
  }
  /** What a person would really be clicking: the innermost thing under the Reply label first, then the button around it, then the outer wrapper.
      (Clicking a wrapper does nothing when the site's click handler sits on the button inside it.) */
  function clickTargets(c) {
    const out = []; const add = (e) => { if (e && e.nodeType === 1 && !out.includes(e)) out.push(e); };
    const r = c.btn.getBoundingClientRect();
    let at = null; try { at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); } catch (_) {}
    if (at && (c.btn.contains(at) || at.contains(c.btn))) add(at);
    let leaf = c.btn; while (leaf.children && leaf.children.length === 1) leaf = leaf.firstElementChild; add(leaf);
    add(((at && c.btn.contains(at) ? at : leaf)).closest('[role="button"], button, a')); add(c.btn);
    return out;
  }
  const kind = (e) => (e ? { tag: e.tagName.toLowerCase(), role: e.getAttribute('role') || '', ce: !!e.isContentEditable, hint: /repl/i.test(hintOf(e)), mention: hasMention(e), inDialog: !!(e.closest && e.closest('[role="dialog"]')) } : null);
  /** Click the comment's own Reply button and wait until that comment's reply box is ready. Returns null when it can't be sure
      (so nothing ever lands in the main comment box by mistake). Never sends anything. */
  A.lastTrace = null;
  A.openReply = async (c, { wait = 1500 } = {}) => {
    const eds = A.editables();
    const snap = { before: new Set(eds), vals: new Map(eds.map((e) => [e, valOf(e)])), active: document.activeElement };
    const trace = A.lastTrace = { platform: A.platformId(), editablesBefore: eds.length, btn: { tag: c.btn.tagName.toLowerCase(), role: c.btn.getAttribute('role') || '', w: Math.round(c.btn.getBoundingClientRect().width), h: Math.round(c.btn.getBoundingClientRect().height) }, tries: [], result: 'none' };
    try { c.el.scrollIntoView({ block: 'center' }); } catch (_) {}
    await sleep(200);
    const targets = clickTargets(c).slice(0, 4);
    for (let i = 0; i < targets.length; i++) {
      const tg = targets[i]; const t = { target: tg.tagName.toLowerCase() + (tg.getAttribute('role') ? '[' + tg.getAttribute('role') + ']' : ''), box: null };
      trace.tries.push(t);
      try { tg.click(); } catch (_) {}
      for (let ms = 0; ms < wait; ms += 100) {
        await sleep(100);
        if (ms === 500) realClick(tg);
        const box = findBox(c, snap);
        if (box) { t.box = kind(box); t.box.isNew = !snap.before.has(box); trace.result = 'found'; return box; }
      }
      t.after = { editables: A.editables().length, active: kind(document.activeElement && isEditable(document.activeElement) ? document.activeElement : null) };
    }
    return null;
  };
  /** Last resort: the person clicks inside the reply box themselves and we fill the first box they focus. */
  A.waitForBox = (ms = 30000) => new Promise((res) => {
    let done = false; const finish = (v) => { if (done) return; done = true; document.removeEventListener('focusin', on, true); clearTimeout(tm); A._cancelWait = null; res(v); };
    const on = (e) => { const el = e.target; if (isEditable(el) && visible(el)) finish(el); };
    const tm = setTimeout(() => finish(null), ms);
    if (A._cancelWait) A._cancelWait();
    A._cancelWait = () => finish(null);
    document.addEventListener('focusin', on, true);
  });
  /** Put text in the box the way a person typing would (frameworks listen for input events). Keeps an @mention the site added. */
  A.setText = (el, text) => {
    el.focus();
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      const m = String(el.value || '').match(/^((?:@[\w.]+\s)+)/);
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, (m ? m[1] : '') + text);
      el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
      el.setSelectionRange && el.setSelectionRange(el.value.length, el.value.length);
      return el.value.indexOf(text) >= 0;
    }
    const sel = getSelection(), range = document.createRange(); range.selectNodeContents(el); range.collapse(false); sel.removeAllRanges(); sel.addRange(range);
    const had = (el.textContent || '').trim();
    const ins = had && !/\s$/.test(el.textContent || '') ? ' ' + text : text;
    let ok = false; try { ok = document.execCommand('insertText', false, ins); } catch (_) {}
    if (!ok || (el.textContent || '').indexOf(text) < 0) {
      try { el.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: ins, bubbles: true, cancelable: true })); } catch (_) {}
      if ((el.textContent || '').indexOf(text) < 0) { el.textContent = (had ? el.textContent : '') + ins; el.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: ins, bubbles: true })); }
    }
    return (el.textContent || '').indexOf(text) >= 0;
  };

  root.AuroraReplyAdapters = A;
})(typeof globalThis !== 'undefined' ? globalThis : this);
