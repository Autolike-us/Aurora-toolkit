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
  A.diagnose = () => ({ platform: A.platformId(), host: location.hostname, area: (location.pathname.split('/')[1] || '').slice(0, 20), lang: document.documentElement.lang || '', replyLabels: replyLabels(document.body).length, comments: A.findComments().length, editableBoxes: A.editables().length, dialog: !!document.querySelector('[role="dialog"]') });

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
  A.editables = (scope) => Array.from((scope || document).querySelectorAll('textarea, input, [contenteditable="true"], [contenteditable=""], [role="textbox"]')).filter((e) => isEditable(e) && visible(e));
  const valOf = (e) => (e.tagName === 'TEXTAREA' || e.tagName === 'INPUT' ? e.value : e.textContent) || '';
  /** Did clicking Reply really switch a box into "replying to this comment"? Never accepts the plain main box. */
  function findBox(c, snap) {
    const act = document.activeElement;
    const fresh = (e) => !snap.before.has(e);
    if (isEditable(act) && visible(act) && fresh(act)) return act;
    for (let el = c.el, i = 0; el && i < 5; el = el.parentElement, i++) { const n = A.editables(el).filter(fresh); if (n.length) return n[n.length - 1]; }
    if (isEditable(act) && visible(act)) {
      const v = valOf(act), hint = (act.getAttribute('placeholder') || '') + ' ' + (act.getAttribute('aria-label') || '') + ' ' + (act.getAttribute('aria-placeholder') || '');
      const mention = /^\s*@\S/.test(v) || (act.querySelector && !!act.querySelector('a, [contenteditable="false"], [data-lexical-mention]'));
      const changed = v !== snap.vals.get(act), focusedNow = snap.active !== act;
      if (mention || /repl/i.test(hint) || (changed && v.trim()) || (focusedNow && A.platformId() === 'tiktok')) return act;
    }
    return null;
  }
  function realClick(el) {
    const r = el.getBoundingClientRect(), o = { bubbles: true, cancelable: true, view: window, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, button: 0 };
    for (const t of ['pointerover', 'pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
      try { el.dispatchEvent(t.startsWith('pointer') ? new PointerEvent(t, { ...o, pointerType: 'mouse', isPrimary: true }) : new MouseEvent(t, o)); } catch (_) {}
    }
  }
  /** Click the comment's own Reply button and wait until that comment's reply box is ready. Returns null when it can't be sure
      (so nothing ever lands in the main comment box by mistake). Never sends anything. */
  A.openReply = async (c, { wait = 3500 } = {}) => {
    const eds = A.editables();
    const snap = { before: new Set(eds), vals: new Map(eds.map((e) => [e, valOf(e)])), active: document.activeElement };
    try { c.el.scrollIntoView({ block: 'center' }); } catch (_) {}
    await sleep(150);
    try { c.btn.click(); } catch (_) {}
    for (let t = 0, retried = false; t < wait; t += 100) {
      await sleep(100);
      const box = findBox(c, snap); if (box) return box;
      if (!retried && t >= 1000) { retried = true; realClick(c.btn); }
    }
    return null;
  };
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
