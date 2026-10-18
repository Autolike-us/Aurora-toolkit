/* Aurora Reply — reading comments and filling the reply box. No network, no UI: just the page.
   Every comment on Facebook, Instagram and TikTok has a "Reply" action, so comments are found from that instead of from
   site-specific class names (which change every few weeks). Site-specific code is limited to the post caption and the box. */
(function (root) {
  'use strict';
  const A = {};
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const txt = (el) => (el ? String(el.innerText || el.textContent || '').trim() : '');
  const ACTION = /^(like|liked|reply|replied|share|hide|edit|edited|delete|report|pin|pinned|see translation|translate|view( all)? \d+ (more )?repl(y|ies)|view more repl(y|ies)|hide repl(y|ies)|author|top fan|creator|follow|following|verified|just now|yesterday|·|\d+[smhdwy]|\d+\s*(sec|secs|min|mins|hr|hrs|hour|hours|day|days|week|weeks|month|months|year|years)( ago)?|\d+ likes?|\d+ repl(y|ies)|liked by creator|more|\.\.\.|…|[\d.,]+[kKmM]?)$/i;

  A.platformId = () => { const h = location.hostname; return /facebook\.com$/.test(h) ? 'facebook' : /instagram\.com$/.test(h) ? 'instagram' : /tiktok\.com$/.test(h) ? 'tiktok' : 'other'; };
  const visible = (el) => { if (!el || !el.getBoundingClientRect) return false; const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none'; };

  /* ---------- finding comments ---------- */
  function replyLabels(scope) {
    const out = [];
    for (const el of scope.querySelectorAll('span, div, a, button, [role="button"]')) {
      if (el.children.length > 1) continue;
      const t = (el.textContent || '');
      if (t.length > 12 || !/^\s*reply\s*$/i.test(t) || !visible(el)) continue;
      // keep the outermost element that is only the label
      let top = el; while (top.parentElement && /^\s*reply\s*$/i.test(top.parentElement.textContent || '') && top.parentElement !== scope) top = top.parentElement;
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
    for (const lab of replyLabels(scope).slice(0, 120)) {
      const el = containerFor(lab, scope); if (!el) continue;
      const { author, text } = parse(el, lab);
      const key = author + '|' + text.slice(0, 60);
      if (seen.has(key)) continue; seen.add(key);
      out.push({ el, btn: lab.closest('[role="button"], button, a') || lab, author, text, key });
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
  const GLOBAL = { instagram: ['form textarea', 'textarea[placeholder*="comment" i]'], tiktok: ['[data-e2e="comment-input"] [contenteditable="true"]', '[class*="CommentInput"] [contenteditable="true"]'], facebook: ['[contenteditable="true"][role="textbox"]'] };
  function findBox(c, before) {
    const act = document.activeElement;
    if (isEditable(act) && visible(act) && !before.has(act)) return act;
    for (let el = c.el, i = 0; el && i < 5; el = el.parentElement, i++) { const n = A.editables(el).filter((e) => !before.has(e)); if (n.length) return n[n.length - 1]; }
    if (isEditable(act) && visible(act)) return act;
    for (const s of GLOBAL[A.platformId()] || []) { const e = Array.from(document.querySelectorAll(s)).filter(visible); if (e.length) return e[e.length - 1]; }
    return null;
  }
  /** Click the comment's own Reply button and wait for the box to appear. Never sends anything. */
  A.openReply = async (c, { wait = 3000 } = {}) => {
    const before = new Set(A.editables());
    try { c.el.scrollIntoView({ block: 'center' }); } catch (_) {}
    try { c.btn.click(); } catch (_) {}
    for (let t = 0; t < wait; t += 100) { await sleep(100); const box = findBox(c, before); if (box) return box; }
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
