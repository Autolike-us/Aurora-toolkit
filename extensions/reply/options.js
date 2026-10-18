/* Aurora Reply — dashboard: overview, history, quick replies, voice, settings. Everything except drafting lives in this browser. */
'use strict';
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const get = (k, d) => chrome.storage.local.get(k).then((o) => (o[k] === undefined ? d : o[k]));
const set = (o) => chrome.storage.local.set(o);
const ask = (type, extra) => new Promise((res) => chrome.runtime.sendMessage({ aurora: 'reply', type, ...extra }, (r) => res(r || { ok: false, message: 'No answer from the extension.' })));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TONES = [['friendly', 'Friendly'], ['warm', 'Warm'], ['professional', 'Professional'], ['playful', 'Playful'], ['direct', 'Direct']];
const PLAT = { facebook: ['Facebook', 'fb'], instagram: ['Instagram', 'ig'], tiktok: ['TikTok', 'tt'], test: ['Try it', 'test'] };
const STARTERS = [['Thanks', 'Thank you so much! 💛 It really means a lot.'], ['Shipping', 'We ship worldwide — free over $50! You can order on our website.'], ['Opening hours', 'We are open Tuesday to Sunday, 7am–3pm. See you soon!'], ['Message us', 'Great question! Please send us a message and we will help you right away.'], ['Prices', 'Prices are on our website — and we are happy to give you a quote if you message us.']];
const S = { voice: {}, history: [], quick: [], prefs: { theme: 'auto', history: true }, usage: null, hasKey: false, hshow: 50, hfav: false };
let saveTimer, toastTimer;

function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2200); }
const dayKey = (ts) => { const d = new Date(ts); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
const when = (ts) => new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const monthStart = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); };
const used = (h) => h.action === 'inserted' || h.action === 'copied';

/* ---------- navigation ---------- */
function go(view) {
  if (!$('#view-' + view)) view = 'overview';
  $$('.view').forEach((v) => { v.hidden = v.id !== 'view-' + view; });
  $$('.nav').forEach((n) => n.classList.toggle('on', n.dataset.view === view));
  try { history.replaceState(null, '', '#' + view); } catch (_) {}
  window.scrollTo(0, 0);
}

/* ---------- overview ---------- */
function renderOverview() {
  const h = S.history, u = S.usage, name = (S.voice.name || '').trim();
  const hr = new Date().getHours();
  $('#hello').textContent = (hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening') + (name ? ', ' + name : '') + ' ✦';
  const pct = u ? Math.min(100, Math.round((u.used / Math.max(1, u.limit)) * 100)) : 0;
  $('#ring').style.setProperty('--p', pct); $('#ringNum').textContent = u ? pct + '%' : '–';
  const mo = h.filter((x) => x.ts >= monthStart());
  const inserted = h.filter((x) => x.action === 'inserted'), usedAll = h.filter(used);
  $('#stDrafts').textContent = u ? u.used : mo.length;
  $('#stIns').textContent = usedAll.length;
  const mins = usedAll.length; $('#stTime').textContent = mins >= 90 ? (mins / 60).toFixed(1).replace(/\.0$/, '') + ' hr' : mins + ' min';
  $('#stEdit').textContent = inserted.length ? Math.round((inserted.filter((x) => x.edited).length / inserted.length) * 100) + '%' : '–';
  // setup
  const steps = [
    [S.hasKey, 'Add your Aurora Reply key', 'Paste it once in Settings & key.', 'settings'],
    [!!((S.voice.samples || []).length || (S.voice.about || '').trim()), 'Teach it your voice', 'Add a few of your own replies and your business facts.', 'voice'],
    [h.length > 0 || !!(u && u.used > 0), 'Write your first reply', 'Open a post on Facebook, Instagram or TikTok and press ✦ Reply — or try it in My voice.', 'voice'],
  ];
  const done = steps.filter((s) => s[0]).length;
  $('#setupCard').hidden = done === 3; $('#setupCount').textContent = `· ${done} of 3`;
  $('#setup').innerHTML = steps.map((s, i) => `<li class="${s[0] ? 'ok' : ''}"><span class="dot">${s[0] ? '✓' : i + 1}</span><div><b>${s[1]}</b><small>${s[2]}</small></div>${s[0] ? '' : `<button class="btn sm" data-go="${s[3]}">Open</button>`}</li>`).join('');
  // activity
  const days = [], today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = 13; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); days.push(d); }
  const counts = days.map((d) => h.filter((x) => dayKey(x.ts) === dayKey(d.getTime())).length), mx = Math.max(1, ...counts);
  $('#bars').innerHTML = counts.map((c, i) => `<i class="${c ? '' : 'z'}" style="height:${c ? Math.max(8, Math.round((c / mx) * 100)) : 4}%" title="${days[i].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${c}"></i>`).join('');
  $('#axis').innerHTML = days.map((d, i) => `<span>${i % 2 === 0 || i === 13 ? d.getDate() : ''}</span>`).join('');
  // platform split
  const by = {}; h.forEach((x) => { by[x.platform] = (by[x.platform] || 0) + 1; });
  const rows = Object.entries(by).sort((a, b) => b[1] - a[1]);
  $('#split').innerHTML = rows.length ? rows.map(([p, n]) => `<div class="hbar"><span>${esc((PLAT[p] || [p])[0])}</span><span class="t"><i style="width:${Math.round((n / h.length) * 100)}%"></i></span><b>${n}</b></div>`).join('') : '<div class="note">Nothing yet — your first reply will show up here.</div>';
  // recent
  $('#recent').innerHTML = h.length ? h.slice(0, 4).map((x) => entryHTML(x, true)).join('') : emptyHTML('💬', 'No replies yet', 'Open a post on Facebook, Instagram or TikTok and press ✦ Reply.');
  // side
  $('#sideUse').textContent = u ? `${u.used} of ${u.limit} drafts` : S.hasKey ? 'Key saved' : 'Not connected';
  $('#sideBar').style.width = pct + '%';
  $('#sideNote').textContent = u && u.resetsAt ? 'Renews ' + new Date(u.resetsAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric' }) : S.hasKey ? 'Press “Save & check” to refresh' : 'Add your key in Settings';
}
const emptyHTML = (e, t, s) => `<div class="empty"><div class="e">${e}</div><b>${t}</b>${s}</div>`;

/* ---------- history ---------- */
function entryHTML(x, compact) {
  const [pl, cls] = PLAT[x.platform] || [x.platform || 'Social', 'test'];
  const st = x.action === 'inserted' ? ['ins', 'Used'] : x.action === 'copied' ? ['cop', 'Copied'] : ['dra', 'Not used'];
  const reply = x.chosen || (x.drafts && x.drafts[0]) || '';
  const others = (x.drafts || []).filter((d) => d !== x.chosen);
  return `<div class="h" data-id="${esc(x.id)}"><div class="hd"><span class="badge ${cls}">${esc(pl)}</span><b>${esc(x.author || 'Someone')}</b><span>${esc(when(x.ts))}</span><span class="st ${st[0]}">${st[1]}${x.edited ? ' · edited' : ''}</span>${x.tone ? `<span>· ${esc(x.tone)}</span>` : ''}${compact ? '' : `<button class="star ${x.fav ? 'on' : ''}" data-act="fav" title="Favourite">★</button>`}</div>
  <div class="q">${esc(x.comment)}</div><div class="a ${x.chosen ? '' : 'none'}">${esc(reply)}</div>
  ${compact ? '' : `${others.length && x.chosen ? `<details><summary>${others.length} other draft${others.length > 1 ? 's' : ''}</summary>${others.map((d) => `<p>${esc(d)}</p>`).join('')}</details>` : ''}${!x.chosen && (x.drafts || []).length > 1 ? `<details><summary>${x.drafts.length - 1} more draft${x.drafts.length > 2 ? 's' : ''}</summary>${x.drafts.slice(1).map((d) => `<p>${esc(d)}</p>`).join('')}</details>` : ''}
  <div class="acts"><button class="btn sm" data-act="copy">Copy reply</button><button class="btn sm" data-act="style" title="Teach it your voice">＋ My style</button><button class="btn sm" data-act="quick">⚡ Save as quick reply</button><button class="btn sm danger" data-act="del">Delete</button></div>`}</div>`;
}
function filtered() {
  const q = $('#hq').value.trim().toLowerCase(), p = $('#hplat').value, s = $('#hstat').value;
  return S.history.filter((x) => (!p || x.platform === p) && (!s || x.action === s) && (!S.hfav || x.fav) && (!q || (x.comment + ' ' + (x.author || '') + ' ' + (x.chosen || '') + ' ' + (x.drafts || []).join(' ')).toLowerCase().includes(q)));
}
function renderHistory() {
  $('#navHist').textContent = S.history.length; $('#navHist').hidden = !S.history.length;
  $('#hfav').classList.toggle('on', S.hfav);
  const list = filtered();
  $('#hlist').innerHTML = list.length ? list.slice(0, S.hshow).map((x) => entryHTML(x)).join('')
    : S.history.length ? emptyHTML('🔍', 'Nothing matches', 'Try a different search or clear the filters.')
    : emptyHTML('🕓', S.prefs.history === false ? 'History is turned off' : 'Your history will appear here', S.prefs.history === false ? 'Turn it on in Settings to keep a private log of your drafts.' : 'Every draft you ask for is saved in this browser, so you can find a reply again, copy it, or reuse it.');
  $('#hmore').innerHTML = list.length > S.hshow ? `<button class="btn" id="hshow">Show ${Math.min(50, list.length - S.hshow)} more</button>` : list.length ? `${list.length} item${list.length === 1 ? '' : 's'}` : '';
}
async function saveHistory() { await set({ history: S.history }); renderAll(); }
async function histAct(id, act) {
  const x = S.history.find((h) => h.id === id); if (!x) return;
  const text = x.chosen || (x.drafts || [])[0] || '';
  if (act === 'fav') { x.fav = !x.fav; await saveHistory(); }
  else if (act === 'del') { S.history = S.history.filter((h) => h.id !== id); await saveHistory(); toast('Deleted'); }
  else if (act === 'copy') { try { await navigator.clipboard.writeText(text); toast('Copied ✓'); } catch (_) { toast('Select the text and copy it'); } }
  else if (act === 'style') { const r = await ask('addSample', { text }); toast(r.ok ? `Added to your style (${r.count}/20) ✓` : 'Could not save'); S.voice = await get('voice', {}); fillVoice(); }
  else if (act === 'quick') { const title = (x.comment || 'Reply').replace(/\s+/g, ' ').slice(0, 32); S.quick = [{ id: 'q' + Date.now(), title, text }, ...S.quick].slice(0, 50); await set({ quick: S.quick }); renderQuick(); toast('Saved in Quick replies ✓'); }
}
function csv() {
  const q = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  return '﻿' + [['Date', 'Platform', 'Author', 'Comment', 'Reply used', 'Status', 'Edited', 'Tone', 'Draft 1', 'Draft 2', 'Draft 3'].map(q).join(',')]
    .concat(filtered().map((x) => [new Date(x.ts).toISOString(), x.platform, x.author, x.comment, x.chosen || '', x.action, x.edited ? 'yes' : '', x.tone || '', ...(x.drafts || []).slice(0, 3)].map(q).join(','))).join('\r\n');
}
function download(name, text, type) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/* ---------- quick replies ---------- */
function renderQuick() {
  $('#qstarters').innerHTML = STARTERS.map(([t], i) => `<button class="chip" data-starter="${i}">${esc(t)}</button>`).join('');
  $('#qlist').innerHTML = S.quick.length ? S.quick.map((q) => `<div class="qr" data-id="${esc(q.id)}"><div class="tx"><b>${esc(q.title)}</b><span>${esc(q.text)}</span></div><button class="btn sm" data-qact="copy">Copy</button><button class="btn sm danger" data-qact="del">Delete</button></div>`).join('')
    : emptyHTML('⚡', 'No quick replies yet', 'Add the answers you give most often. They show up in the ✦ Reply panel on every post.');
}

/* ---------- voice ---------- */
function renderTones() { $('#tones').innerHTML = TONES.map(([id, l]) => `<button type="button" class="chip ${(S.voice.tone || 'friendly') === id ? 'on' : ''}" data-t="${id}">${l}</button>`).join(''); }
function readForm() {
  const samples = $('#samples').value.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 20).map((s) => s.slice(0, 300));
  S.voice = { ...S.voice, name: $('#name').value.trim(), samples, about: $('#about').value.trim(), emoji: $('#emoji').value, length: $('#length').value, language: $('#language').value.trim() || 'auto', avoid: $('#avoid').value.trim() };
  $('#sampleCount').textContent = samples.length ? `${samples.length} example${samples.length === 1 ? '' : 's'} saved (up to 20).` : 'Add 5–20 of your own replies for the best match.';
}
function fillVoice() {
  const v = S.voice;
  $('#name').value = v.name || ''; $('#samples').value = (v.samples || []).join('\n'); $('#about').value = v.about || '';
  $('#emoji').value = v.emoji || 'few'; $('#length').value = v.length || 'short'; $('#language').value = v.language && v.language !== 'auto' ? v.language : ''; $('#avoid').value = v.avoid || '';
  readForm(); renderTones();
}
function queueSave() { readForm(); clearTimeout(saveTimer); saveTimer = setTimeout(async () => { await set({ voice: S.voice }); $('#saved').classList.add('on'); setTimeout(() => $('#saved').classList.remove('on'), 1400); renderOverview(); }, 500); }

/* ---------- settings ---------- */
function meter(u) {
  if (u) S.usage = u;
  if (!u) { $('#meter').hidden = true; return; }
  $('#meter').hidden = false; $('#meterBar').style.width = Math.min(100, Math.round((u.used / Math.max(1, u.limit)) * 100)) + '%';
  $('#meterText').textContent = `${u.used} of ${u.limit} drafts used this month · renews ${new Date(u.resetsAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`;
  renderOverview();
}
function status(kind, text) { $('#keyStatus').innerHTML = `<span class="pill ${kind}">${text.replace(/[<>&]/g, '')}</span>`; }
function applyPrefs() {
  const th = S.prefs.theme || 'auto';
  if (th === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.dataset.theme = th;
  $$('#theme button').forEach((b) => b.classList.toggle('on', b.dataset.th === th));
  $$('#histToggle button').forEach((b) => b.classList.toggle('on', (b.dataset.h === 'on') === (S.prefs.history !== false)));
}
async function checkKey() {
  const key = $('#key').value.trim().toUpperCase();
  await set({ licenseKey: key }); S.hasKey = !!key;
  if (!key) { status('warn', 'Add your key to start'); meter(null); renderOverview(); return; }
  status('warn', 'Checking…');
  const r = await ask('status');
  if (r.ok) { status('ok', r.status === 'beta' ? 'Key accepted · beta access' : 'Key accepted ✓'); meter(r.usage); }
  else { status('bad', r.message || 'That key was not accepted.'); meter(r.usage || null); }
  renderOverview();
}

function renderAll() { renderOverview(); renderHistory(); renderQuick(); }
async function load() {
  S.voice = await get('voice', {}); S.history = await get('history', []); S.quick = await get('quick', []); S.prefs = { theme: 'auto', history: true, ...(await get('prefs', {})) };
  S.usage = await get('usage', null); const key = await get('licenseKey', ''); S.hasKey = !!key; return key;
}

(async () => {
  const key = await load();
  $('#key').value = key; fillVoice(); applyPrefs(); renderAll(); meter(S.usage);
  if (key) status('warn', 'Saved — press “Save & check” to verify'); else status('warn', 'Add your key to start');
  go(location.hash.slice(1) || 'overview');

  document.addEventListener('click', (e) => {
    const n = e.target.closest('[data-view], [data-go]'); if (n) { go(n.dataset.view || n.dataset.go); return; }
  });
  for (const id of ['name', 'samples', 'about', 'emoji', 'length', 'language', 'avoid']) $('#' + id).addEventListener('input', queueSave);
  $('#tones').addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (!b) return; S.voice.tone = b.dataset.t; renderTones(); queueSave(); });
  $('#check').addEventListener('click', checkKey);

  // history
  for (const id of ['hq', 'hplat', 'hstat']) $('#' + id).addEventListener('input', () => { S.hshow = 50; renderHistory(); });
  $('#hfav').addEventListener('click', () => { S.hfav = !S.hfav; S.hshow = 50; renderHistory(); });
  $('#hmore').addEventListener('click', (e) => { if (e.target.id === 'hshow') { S.hshow += 50; renderHistory(); } });
  $('#hlist').addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); const c = e.target.closest('.h'); if (b && c) histAct(c.dataset.id, b.dataset.act); });
  $('#hcsv').addEventListener('click', () => { download('aurora-reply-history.csv', csv(), 'text/csv;charset=utf-8'); toast('Downloaded'); });
  $('#hclear').addEventListener('click', async () => { if (!S.history.length || !confirm('Delete your whole reply history from this browser?')) return; S.history = []; await saveHistory(); toast('History cleared'); });

  // quick replies
  $('#qstarters').addEventListener('click', (e) => { const b = e.target.closest('[data-starter]'); if (!b) return; const [t, x] = STARTERS[+b.dataset.starter]; $('#qtitle').value = t; $('#qtext').value = x; $('#qtext').focus(); });
  $('#qadd').addEventListener('click', async () => {
    const title = $('#qtitle').value.trim(), text = $('#qtext').value.trim();
    if (!text) { $('#qnote').textContent = 'Write the reply first.'; return; }
    S.quick = [{ id: 'q' + Date.now(), title: title || text.slice(0, 28), text }, ...S.quick].slice(0, 50); await set({ quick: S.quick });
    $('#qtitle').value = ''; $('#qtext').value = ''; $('#qnote').textContent = 'Added ✓'; renderQuick();
  });
  $('#qlist').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-qact]'); const c = e.target.closest('.qr'); if (!b || !c) return;
    const q = S.quick.find((x) => x.id === c.dataset.id); if (!q) return;
    if (b.dataset.qact === 'del') { S.quick = S.quick.filter((x) => x !== q); await set({ quick: S.quick }); renderQuick(); }
    else { try { await navigator.clipboard.writeText(q.text); toast('Copied ✓'); } catch (_) { toast('Select the text and copy it'); } }
  });

  // try it
  $('#try').addEventListener('click', async () => {
    const text = $('#tryText').value.trim(); if (!text) { $('#tryNote').textContent = 'Paste a comment first.'; return; }
    readForm(); await set({ voice: S.voice });
    $('#try').disabled = true; $('#tryNote').textContent = 'Writing…'; $('#tryOut').innerHTML = '';
    const r = await ask('draft', { platform: 'test', comment: { text, author: 'Try it' }, post: { caption: '', author: S.voice.name || '' } });
    $('#try').disabled = false;
    if (!r.ok) { $('#tryNote').innerHTML = `<span class="bad"></span>`; $('#tryNote').firstChild.textContent = r.message || 'Something went wrong.'; return; }
    $('#tryNote').textContent = r.flag && r.flag !== 'none' ? `Flag: ${r.flag}. ${r.note || ''}` : '';
    $('#tryOut').replaceChildren(...r.drafts.map((d) => { const el = document.createElement('div'); el.className = 'draft'; el.textContent = d.text; return el; }));
    if (r.usage) meter(r.usage);
  });

  // settings
  $('#theme').addEventListener('click', async (e) => { const b = e.target.closest('[data-th]'); if (!b) return; S.prefs.theme = b.dataset.th; await set({ prefs: S.prefs }); applyPrefs(); });
  $('#histToggle').addEventListener('click', async (e) => { const b = e.target.closest('[data-h]'); if (!b) return; S.prefs.history = b.dataset.h === 'on'; await set({ prefs: S.prefs }); applyPrefs(); renderHistory(); toast(S.prefs.history ? 'History is on' : 'History is off — nothing new will be saved'); });
  $('#export').addEventListener('click', async () => { const all = { exportedAt: new Date().toISOString(), voice: S.voice, quickReplies: S.quick, history: S.history }; download('aurora-reply-data.json', JSON.stringify(all, null, 2), 'application/json'); toast('Downloaded'); });
  $('#wipe').addEventListener('click', async () => {
    if (!confirm('Delete your voice, history and quick replies from this browser? Your key stays.')) return;
    S.history = []; S.quick = []; S.voice = {}; await set({ history: [], quick: [], voice: {} }); fillVoice(); renderAll(); toast('Everything deleted');
  });

  // live updates when drafts are written on a post in another tab
  if (chrome.storage.onChanged) chrome.storage.onChanged.addListener((ch) => {
    if (ch.history) S.history = ch.history.newValue || [];
    if (ch.quick) S.quick = ch.quick.newValue || [];
    if (ch.usage) S.usage = ch.usage.newValue || null;
    if (ch.history || ch.quick || ch.usage) { renderAll(); if (S.usage) meter(S.usage); }
  });
})();
