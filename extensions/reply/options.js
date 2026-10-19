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
const S = { voice: {}, history: [], quick: [], prefs: { theme: 'light', history: true }, usage: null, hasKey: false, hshow: 50, hfav: false };
const VERSION = (chrome.runtime && chrome.runtime.getManifest && chrome.runtime.getManifest().version) || '';
const CHANGELOG = [{ v: '1.0.0', title: 'Welcome to Aurora Reply 1.0', items: ['Get your free key from your Aurora account — a 3-day trial, then 10 free replies every month', 'Need more? Reply packs and monthly plans are on getaurorastudios.com', 'Choose 1, 2 or 3 replies per comment, reply to unanswered comments, quick replies, history and voice profiles', 'Report a problem on Telegram or by email, straight from the panel']}];
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
const PLATFORMS = [['facebook', 'Facebook', 'Posts, Pages and Reels comments', 'https://www.facebook.com/'], ['instagram', 'Instagram', 'Post and Reels comments', 'https://www.instagram.com/'], ['tiktok', 'TikTok', 'Video comments', 'https://www.tiktok.com/']];
const MORE = [['Aurora Extract', 'FREE', 'Collect public data from Facebook, Instagram & TikTok to a spreadsheet — plus a free profile health check.', 'https://getaurorastudios.com/extract/', '📥'], ['Aurora for Facebook', '3-day trial', 'React, comment, share and follow at a human pace.', 'https://getaurorastudios.com/products/facebook/', '👍'], ['Aurora for Instagram', '3-day trial', 'Like, comment and follow through profiles, hashtags and more.', 'https://getaurorastudios.com/products/instagram/', '📸'], ['Aurora for TikTok', '3-day trial', 'Like, comment and follow across creators and hashtags.', 'https://getaurorastudios.com/products/tiktok/', '🎵']];
function renderMore() { $('#more').innerHTML = MORE.map(([n, tag, d, url, ic]) => `<a class="plat" href="${url}" target="_blank" rel="noopener"><span style="font-size:26px">${ic}</span><b>${esc(n)} <span class="st ins" style="font-size:10.5px">${esc(tag)}</span></b><span class="note">${esc(d)}</span></a>`).join(''); }
function renderPlatforms() {
  renderMore();
  const by = {}; S.history.forEach((x) => { by[x.platform] = (by[x.platform] || 0) + 1; });
  $('#plats').innerHTML = PLATFORMS.map(([id, n, d, url]) => `<a class="plat" href="${url}" target="_blank" rel="noopener"><span class="badge ${PLAT[id][1]}">${n}</span><b>${d}</b><span class="note">✓ Supported${by[id] ? ` · ${by[id]} draft${by[id] > 1 ? 's' : ''} so far` : ''}</span></a>`).join('');
}
function renderOverview() {
  renderPlatforms();
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
    [S.hasKey, 'Add your Aurora Reply key', 'Create a free account at getaurorastudios.com, copy your key from My account and paste it in Settings & key.', 'settings'],
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
  const PN = { trial: 'Free trial', free: 'Free plan', subscription: 'Subscription' };
  $('#sideUse').textContent = u ? (u.plan ? `${PN[u.plan] || ''} · ${u.plan === 'trial' ? u.dayLeft + ' left today' : u.used + ' of ' + u.limit}` : `${u.used} of ${u.limit} drafts`) + (u.packs ? ` · +${u.packs}` : '') : S.hasKey ? 'Key saved' : 'Not connected';
  const pc = $('#planCard');
  if (u && (u.plan === 'trial' || u.plan === 'free')) {
    pc.hidden = false;
    pc.innerHTML = u.plan === 'trial'
      ? `<div style="font-size:26px">🎁</div><div class="grow"><b>Your free trial ends ${esc(new Date(u.trialEndsAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric' }))}</b>Full features for 3 days (${u.dayLeft} replies left today). After that you keep ${u.freeAfter || 10} free replies every month — or get more.</div><a class="btn p" href="https://getaurorastudios.com/reply/#plans" target="_blank" rel="noopener" style="text-decoration:none">See plans ↗</a>`
      : `<div style="font-size:26px">✦</div><div class="grow"><b>Free plan · ${Math.max(0, u.limit - u.used)} of ${u.limit} replies left this month${u.packs ? ` (+${u.packs} from your packs)` : ''}</b>Need more? Buy a reply pack, or subscribe for heavy use.</div><a class="btn p" href="https://getaurorastudios.com/reply/#plans" target="_blank" rel="noopener" style="text-decoration:none">Get more replies ↗</a>`;
  } else pc.hidden = true;
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
  S.voice = { ...S.voice, name: $('#name').value.trim(), samples, about: $('#about').value.trim(), emoji: $('#emoji').value, count: +$('#count').value || 3, length: $('#length').value, language: $('#language').value.trim() || 'auto', avoid: $('#avoid').value.trim() };
  $('#sampleCount').textContent = samples.length ? `${samples.length} example${samples.length === 1 ? '' : 's'} saved (up to 20).` : 'Add 5–20 of your own replies for the best match.';
}
function fillVoice() {
  const v = S.voice;
  $('#name').value = v.name || ''; $('#samples').value = (v.samples || []).join('\n'); $('#about').value = v.about || '';
  $('#emoji').value = v.emoji || 'few'; $('#count').value = String(v.count || 3); $('#length').value = v.length || 'short'; $('#language').value = v.language && v.language !== 'auto' ? v.language : ''; $('#avoid').value = v.avoid || '';
  readForm(); renderTones();
}
function queueSave() { readForm(); clearTimeout(saveTimer); saveTimer = setTimeout(async () => { await set({ voice: S.voice }); $('#saved').classList.add('on'); setTimeout(() => $('#saved').classList.remove('on'), 1400); renderOverview(); }, 500); }

/* ---------- settings ---------- */
function meter(u) {
  if (u) S.usage = u;
  if (!u) { $('#meter').hidden = true; return; }
  $('#meter').hidden = false; $('#meterBar').style.width = Math.min(100, Math.round((u.used / Math.max(1, u.limit)) * 100)) + '%';
  $('#meterText').textContent = `${u.plan ? (u.plan === 'trial' ? u.dayLeft + ' trial replies left today · ' : '') + u.used + ' of ' + u.limit + ' replies used' : u.used + ' of ' + u.limit + ' drafts used this month'}${u.packs ? ' · +' + u.packs + ' pack replies' : ''} · renews ${new Date(u.resetsAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`;
  renderOverview();
}
function status(kind, text) { $('#keyStatus').innerHTML = `<span class="pill ${kind}">${text.replace(/[<>&]/g, '')}</span>`; }
function applyPrefs() {
  const th = S.prefs.theme || 'light';
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


/* ---------- tour ---------- */
const TOUR = [
  { t: 'Welcome to Aurora Reply ✦', d: 'It writes replies to your comments in your own voice. You stay in charge: you read, edit and send every reply yourself. Your free key comes from your Aurora account.', art: '<div style="font-size:84px;filter:drop-shadow(0 8px 14px rgba(0,0,0,.25))">💬✨</div>' },
  { t: 'Open a post, then look bottom-right', d: 'On any Facebook, Instagram or TikTok post with comments, a black <b>✦ Reply</b> button appears in the corner of the page. Click it — or press <kbd>Alt</kbd>+<kbd>R</kbd>.', art: '<div class="mockpage"><div class="cm"><b></b><div style="flex:1"><i style="width:40%"></i><i style="width:85%"></i></div></div><div class="cm"><b style="background:#fb923c"></b><div style="flex:1"><i style="width:32%"></i><i style="width:70%"></i></div></div><div class="mockpill"><u>✦</u>Reply <em>2</em></div></div>' },
  { t: 'Pick a comment, pick a draft', d: 'Press <b>Draft a reply</b> next to a comment and get three options in your voice. Edit the one you like, then <b>Use this reply</b> — it lands in that comment’s reply box.', art: '<div class="mockpanel"><div class="h">✦ Aurora Reply</div><div class="x"><div class="d">Do you deliver on Sundays?</div><div class="d s">Sundays are pick-up only 🥖</div><div class="u">Use this reply</div></div></div>' },
  { t: 'You press Send', d: 'Aurora never posts anything. Read it, change what you like, and press Send yourself. Got many comments? Try <b>Reply to unanswered comments</b> and approve them one by one.', art: '<div style="font-size:84px;filter:drop-shadow(0 8px 14px rgba(0,0,0,.25))">✅</div>' },
];
let tourI = 0;
function showTour(i) {
  tourI = i; const t = TOUR[i], last = i === TOUR.length - 1;
  const m = $('#tour'); m.hidden = false;
  m.innerHTML = `<div class="tour"><div class="art">${t.art}</div><div class="body"><h2>${t.t}</h2><p>${t.d}</p></div><div class="foot"><div class="dots">${TOUR.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>${i ? '<button class="btn" data-tour="back">Back</button>' : '<button class="btn" data-tour="skip">Skip</button>'}<button class="btn p" data-tour="${last ? 'done' : 'next'}">${last ? 'Got it ✓' : 'Next'}</button></div></div>`;
}
async function endTour() { $('#tour').hidden = true; S.prefs.onboarded = true; S.prefs.seen = VERSION; await set({ prefs: S.prefs }); renderOverview(); }
function renderWhatsNew() {
  const el = $('#whatsNew'), c = CHANGELOG[0];
  const show = !!VERSION && S.prefs.onboarded && S.prefs.seen !== VERSION && c;
  el.hidden = !show; if (!show) return;
  el.innerHTML = `<div style="font-size:26px">🎉</div><div class="grow"><b>What’s new in Aurora Reply ${esc(VERSION)} — ${esc(c.title)}</b><ul>${c.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div><button class="btn sm" id="wnDismiss">Got it</button>`;
}

/* ---------- voice profiles ---------- */
async function renderProfiles() {
  const l = await AuroraProfiles.list();
  $('#profile').innerHTML = l.items.map((p) => `<option value="${esc(p.id)}" ${p.id === l.active ? 'selected' : ''}>${esc(p.label)}</option>`).join('');
  $('#pdel').disabled = l.items.length < 2; S.profiles = l;
}
async function afterProfileChange() { S.voice = await get('voice', {}); fillVoice(); await renderProfiles(); renderOverview(); }

function renderAll() { renderOverview(); renderHistory(); renderQuick(); renderWhatsNew(); }
async function load() {
  S.voice = await get('voice', {}); S.history = await get('history', []); S.quick = await get('quick', []); S.prefs = { theme: 'light', history: true, ...(await get('prefs', {})) };
  S.usage = await get('usage', null); const key = await get('licenseKey', ''); S.hasKey = !!key; return key;
}

(async () => {
  const key = await load();
  $('#key').value = key; fillVoice(); applyPrefs(); renderAll(); meter(S.usage);
  if (key) status('warn', 'Saved — press “Save & check” to verify'); else status('warn', 'Add your key to start');
  await renderProfiles();
  go(location.hash.slice(1) || 'overview');
  if (!S.prefs.onboarded && !S.hasKey && !S.history.length) showTour(0); else if (!S.prefs.onboarded) { S.prefs.onboarded = true; S.prefs.seen = VERSION; await set({ prefs: S.prefs }); }
  setInterval(renderOverview, 60000); document.addEventListener('visibilitychange', () => { if (!document.hidden) renderOverview(); });

  document.addEventListener('click', async (e) => {
    const n = e.target.closest('[data-view], [data-go]'); if (n) { go(n.dataset.view || n.dataset.go); return; }
    const tb = e.target.closest('[data-tour]');
    if (tb) { const a = tb.dataset.tour; if (a === 'next') showTour(tourI + 1); else if (a === 'back') showTour(tourI - 1); else endTour(); return; }
    if (e.target.id === 'wnDismiss') { S.prefs.seen = VERSION; await set({ prefs: S.prefs }); renderWhatsNew(); }
  });
  $('#tourBtn').addEventListener('click', () => showTour(0));
  $('#diagBtn').addEventListener('click', async () => {
    const info = { extension: VERSION, browser: navigator.userAgent.replace(/\s+/g, ' ').slice(0, 110), keySaved: S.hasKey, usage: S.usage ? `${S.usage.used}/${S.usage.limit}` : null, profiles: (S.profiles && S.profiles.items.length) || 1, history: S.history.length, quickReplies: S.quick.length, theme: S.prefs.theme };
    try { await navigator.clipboard.writeText('Aurora Reply — problem details (no comments or names)\n' + JSON.stringify(info, null, 1)); $('#diagNote').textContent = 'Copied ✓ — paste it in your email so we can help faster.'; } catch (_) { $('#diagNote').textContent = JSON.stringify(info); }
  });
  $('#profile').addEventListener('change', async (e) => { readForm(); await set({ voice: S.voice }); await AuroraProfiles.switchTo(e.target.value); await afterProfileChange(); toast('Switched voice profile'); });
  $('#pnew').addEventListener('click', async () => { const n = prompt('Name for the new profile (for example the brand name):', ''); if (!n || !n.trim()) return; readForm(); await set({ voice: S.voice }); await AuroraProfiles.create(n.trim()); await afterProfileChange(); toast('Profile created — fill in its voice below'); });
  $('#pren').addEventListener('click', async () => { const cur = S.profiles.items.find((p) => p.id === S.profiles.active); const n = prompt('Rename profile:', cur ? cur.label : ''); if (!n || !n.trim()) return; await AuroraProfiles.rename(S.profiles.active, n.trim()); await renderProfiles(); });
  $('#pdel').addEventListener('click', async () => { if (!confirm('Delete this voice profile?')) return; await AuroraProfiles.remove(S.profiles.active); await afterProfileChange(); toast('Profile deleted'); });
  for (const id of ['name', 'samples', 'about', 'emoji', 'count', 'length', 'language', 'avoid']) $('#' + id).addEventListener('input', queueSave);
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
    const r = await ask('draft', { platform: 'test', comment: { text, author: 'Try it' }, post: { caption: '', author: S.voice.name || '' }, count: S.voice.count || 3 });
    $('#try').disabled = false;
    if (!r.ok) { $('#tryNote').innerHTML = `<span class="bad"></span>`; $('#tryNote').firstChild.textContent = r.message || 'Something went wrong.'; return; }
    $('#tryNote').textContent = r.flag && r.flag !== 'none' ? `Flag: ${r.flag}. ${r.note || ''}` : '';
    $('#tryOut').replaceChildren(...r.drafts.map((d) => { const el = document.createElement('div'); el.className = 'draft'; el.textContent = d.text; return el; }));
    if (r.usage) meter(r.usage);
  });

  // settings
  $('#theme').addEventListener('click', async (e) => { const b = e.target.closest('[data-th]'); if (!b) return; S.prefs.theme = b.dataset.th; await set({ prefs: S.prefs }); applyPrefs(); });
  $('#histToggle').addEventListener('click', async (e) => { const b = e.target.closest('[data-h]'); if (!b) return; S.prefs.history = b.dataset.h === 'on'; await set({ prefs: S.prefs }); applyPrefs(); renderHistory(); toast(S.prefs.history ? 'History is on' : 'History is off — nothing new will be saved'); });
  $('#export').addEventListener('click', async () => { const all = { exportedAt: new Date().toISOString(), voice: S.voice, profiles: (await get('profiles', {})), quickReplies: S.quick, history: S.history }; download('aurora-reply-data.json', JSON.stringify(all, null, 2), 'application/json'); toast('Downloaded'); });
  $('#wipe').addEventListener('click', async () => {
    if (!confirm('Delete your voice, history and quick replies from this browser? Your key stays.')) return;
    S.history = []; S.quick = []; S.voice = {}; await set({ history: [], quick: [] }); await AuroraProfiles.reset(); fillVoice(); await renderProfiles(); renderAll(); toast('Everything deleted');
  });

  // live updates when drafts are written on a post in another tab
  if (chrome.storage.onChanged) chrome.storage.onChanged.addListener((ch) => {
    if (ch.history) S.history = ch.history.newValue || [];
    if (ch.quick) S.quick = ch.quick.newValue || [];
    if (ch.usage) S.usage = ch.usage.newValue || null;
    if (ch.history || ch.quick || ch.usage) { renderAll(); if (S.usage) meter(S.usage); }
  });
})();
