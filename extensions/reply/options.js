/* Aurora Reply — settings page. */
'use strict';
const $ = (s) => document.querySelector(s);
const get = (k, d) => chrome.storage.local.get(k).then((o) => (o[k] === undefined ? d : o[k]));
const set = (o) => chrome.storage.local.set(o);
const ask = (type, extra) => new Promise((res) => chrome.runtime.sendMessage({ aurora: 'reply', type, ...extra }, (r) => res(r || { ok: false, message: 'No answer from the extension.' })));
const TONES = [['friendly', 'Friendly'], ['warm', 'Warm'], ['professional', 'Professional'], ['playful', 'Playful'], ['direct', 'Direct']];
let voice = {}, saveTimer;

function meter(u) {
  if (!u) { $('#meter').hidden = true; return; }
  $('#meter').hidden = false; $('#meterBar').style.width = Math.min(100, Math.round((u.used / Math.max(1, u.limit)) * 100)) + '%';
  $('#meterText').textContent = `${u.used} of ${u.limit} drafts used this month · renews ${new Date(u.resetsAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`;
}
function status(kind, text) { $('#keyStatus').innerHTML = `<span class="pill ${kind}">${text.replace(/[<>&]/g, '')}</span>`; }
function renderTones() {
  $('#tones').innerHTML = TONES.map(([id, l]) => `<button type="button" class="chip ${(voice.tone || 'friendly') === id ? 'on' : ''}" data-t="${id}">${l}</button>`).join('');
}
function readForm() {
  const samples = $('#samples').value.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 20).map((s) => s.slice(0, 300));
  voice = { ...voice, name: $('#name').value.trim(), samples, about: $('#about').value.trim(), emoji: $('#emoji').value, length: $('#length').value, language: $('#language').value.trim() || 'auto', avoid: $('#avoid').value.trim() };
  $('#sampleCount').textContent = samples.length ? `${samples.length} example${samples.length === 1 ? '' : 's'} saved (up to 20).` : 'Add 5–20 of your own replies for the best match.';
}
function queueSave() { readForm(); clearTimeout(saveTimer); saveTimer = setTimeout(async () => { await set({ voice }); $('#saved').classList.add('on'); setTimeout(() => $('#saved').classList.remove('on'), 1400); }, 500); }

async function checkKey() {
  const key = $('#key').value.trim().toUpperCase();
  await set({ licenseKey: key });
  if (!key) { status('warn', 'Add your key to start'); meter(null); return; }
  status('warn', 'Checking…');
  const r = await ask('status');
  if (r.ok) { status('ok', r.status === 'beta' ? 'Key accepted · beta access' : 'Key accepted ✓'); meter(r.usage); }
  else { status('bad', r.message || 'That key was not accepted.'); meter(r.usage || null); }
}

(async () => {
  voice = await get('voice', {});
  $('#key').value = await get('licenseKey', '');
  $('#name').value = voice.name || ''; $('#samples').value = (voice.samples || []).join('\n'); $('#about').value = voice.about || '';
  $('#emoji').value = voice.emoji || 'few'; $('#length').value = voice.length || 'short'; $('#language').value = voice.language && voice.language !== 'auto' ? voice.language : ''; $('#avoid').value = voice.avoid || '';
  readForm(); renderTones();
  if ($('#key').value) { const u = await get('usage', null); meter(u); status('warn', 'Saved — press “Save & check” to verify'); } else status('warn', 'Add your key to start');
  for (const id of ['name', 'samples', 'about', 'emoji', 'length', 'language', 'avoid']) $('#' + id).addEventListener('input', queueSave);
  $('#tones').addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (!b) return; voice.tone = b.dataset.t; renderTones(); queueSave(); });
  $('#check').addEventListener('click', checkKey);
  $('#try').addEventListener('click', async () => {
    const text = $('#tryText').value.trim(); if (!text) { $('#tryNote').textContent = 'Paste a comment first.'; return; }
    readForm(); await set({ voice });
    $('#try').disabled = true; $('#tryNote').textContent = 'Writing…'; $('#tryOut').innerHTML = '';
    const r = await ask('draft', { platform: 'instagram', comment: { text, author: 'a follower' }, post: { caption: '', author: voice.name || '' } });
    $('#try').disabled = false;
    if (!r.ok) { $('#tryNote').innerHTML = `<span class="bad"></span>`; $('#tryNote').firstChild.textContent = r.message || 'Something went wrong.'; return; }
    $('#tryNote').textContent = r.flag && r.flag !== 'none' ? `Flag: ${r.flag}. ${r.note || ''}` : '';
    $('#tryOut').replaceChildren(...r.drafts.map((d) => { const el = document.createElement('div'); el.className = 'draft'; el.textContent = d.text; return el; }));
    if (r.usage) meter(r.usage);
  });
})();
