/* Aurora Reply — service worker. The only place that talks to the Aurora server; the page scripts just ask it for drafts. */
'use strict';
const DEFAULT_API = 'https://getaurorastudios.com/api';
const get = (k, d) => chrome.storage.local.get(k).then((o) => (o[k] === undefined ? d : o[k]));
const set = (o) => chrome.storage.local.set(o);

chrome.runtime.onInstalled.addListener(async (info) => {
  if (!(await get('installId'))) await set({ installId: crypto.randomUUID() });
  if (info.reason === 'install') chrome.runtime.openOptionsPage();
});

async function api(path, body) {
  const base = (await get('apiBase', DEFAULT_API)).replace(/\/+$/, '');
  const key = (await get('licenseKey', '')).trim().toUpperCase();
  let installId = await get('installId');
  if (!installId) { installId = crypto.randomUUID(); await set({ installId }); }
  if (!key) return { ok: false, status: 'no_key', message: 'Add your Aurora Reply key in the settings first.' };
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 45000);
  try {
    const r = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, key, installId }), signal: ctl.signal });
    let j = {}; try { j = await r.json(); } catch (_) {}
    if (j && j.usage) await set({ usage: j.usage, usageAt: Date.now() });
    if (r.ok && j.ok) return j;
    return { ok: false, status: j.status || 'error', message: j.message || j.error || 'Something went wrong. Please try again.', usage: j.usage };
  } catch (e) {
    return { ok: false, status: 'network', message: e && e.name === 'AbortError' ? 'That took too long. Please try again.' : 'Could not reach Aurora. Check your internet connection and try again.' };
  } finally { clearTimeout(timer); }
}

const clip = (s, n) => String(s == null ? '' : s).slice(0, n);

/* History lives only in this browser (newest 500). The server never sees it. */
const HIST_MAX = 500;
let histQueue = Promise.resolve();
const withHistory = (fn) => (histQueue = histQueue.then(async () => { const h = await get('history', []); const out = await fn(h); await set({ history: h.slice(0, HIST_MAX) }); return out; }).catch(() => {}));
const historyOn = async () => ((await get('prefs', {})).history !== false);

chrome.runtime.onMessage.addListener((msg, _sender, send) => {
  if (!msg || msg.aurora !== 'reply') return;
  (async () => {
    if (msg.type === 'draft') {
      const voice = await get('voice', {});
      const comment = { text: clip(msg.comment && msg.comment.text, 1000), author: clip(msg.comment && msg.comment.author, 80) };
      const r = await api('/reply/draft', {
        platform: msg.platform, tone: msg.tone, quality: msg.quality, hint: clip(msg.hint, 200),
        comment, post: { caption: clip(msg.post && msg.post.caption, 800), author: clip(msg.post && msg.post.author, 80) }, voice,
      });
      if (r && r.ok && (r.drafts || []).length && await historyOn()) {
        const id = 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        await withHistory((h) => { h.unshift({ id, ts: Date.now(), platform: clip(msg.platform, 20), author: comment.author, comment: comment.text, drafts: r.drafts.map((d) => clip(d.text, 700)), chosen: '', action: 'drafted', tone: msg.tone || voice.tone || '', flag: r.flag || 'none' }); });
        r.historyId = id;
      }
      send(r);
    } else if (msg.type === 'status') send(await api('/reply/status', {}));
    else if (msg.type === 'openOptions') { chrome.runtime.openOptionsPage(); send({ ok: true }); }
    else if (msg.type === 'getState') send({ ok: true, hasKey: !!(await get('licenseKey', '')).trim(), voiceReady: !!(((await get('voice', {})).samples || []).length || ((await get('voice', {})).about || '').trim()), usage: await get('usage', null), voice: await get('voice', {}) });
    else if (msg.type === 'addSample') {
      const v = await get('voice', {}); const s = clip(msg.text, 300).trim();
      if (s) { v.samples = [...(v.samples || []).filter((x) => x !== s), s].slice(-20); await set({ voice: v }); }
      send({ ok: true, count: (v.samples || []).length });
    } else send({ ok: false });
  })();
  return true;
});
