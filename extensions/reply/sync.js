/* Aurora Reply — voice backup. Voice profiles and quick replies are saved under the user's key, so a reinstall or a new computer can restore them. History is never sent. */
(function (root) {
  'use strict';
  const get = (k, d) => chrome.storage.local.get(k).then((o) => (o[k] === undefined ? d : o[k]));
  const set = (o) => chrome.storage.local.set(o);
  const str = (s, n) => String(s == null ? '' : s).slice(0, n);

  async function snapshot() {
    const p = JSON.parse(JSON.stringify(await get('profiles', null) || {}));
    let a = await get('activeProfile', 'default'); const v = await get('voice', {});
    if (!Object.keys(p).length) p.default = { label: 'Main', voice: {} };
    if (!p[a]) a = Object.keys(p)[0];
    p[a].voice = v;
    return { profiles: p, activeProfile: a, quick: await get('quick', []) };
  }
  /* Plain-data copy with sizes capped — used both before sending and before applying what came back. */
  function clean(d) {
    const out = { profiles: {}, activeProfile: '', quick: [] };
    const p = d && typeof d.profiles === 'object' && d.profiles ? d.profiles : {};
    Object.keys(p).slice(0, 12).forEach((id) => {
      const x = p[id] || {}, v = x.voice && typeof x.voice === 'object' ? x.voice : {};
      const o = {};
      ['name', 'about', 'avoid', 'tone', 'emoji', 'length', 'language'].forEach((k) => { if (v[k] != null) o[k] = str(v[k], 2000); });
      if (v.count != null) o.count = Math.max(1, Math.min(3, +v.count || 3));
      if (Array.isArray(v.samples)) o.samples = v.samples.slice(0, 20).map((s) => str(s, 300)).filter(Boolean);
      out.profiles[str(id, 24)] = { label: str(x.label || 'Main', 30), voice: o };
    });
    if (!Object.keys(out.profiles).length) out.profiles.default = { label: 'Main', voice: {} };
    out.activeProfile = out.profiles[d && d.activeProfile] ? d.activeProfile : Object.keys(out.profiles)[0];
    out.quick = (Array.isArray(d && d.quick) ? d.quick : []).slice(0, 50).map((q) => (q && typeof q === 'object' ? { ...q, text: str(q.text, 500), ...(q.label != null ? { label: str(q.label, 60) } : {}), ...(q.title != null ? { title: str(q.title, 60) } : {}) } : null)).filter((q) => q && q.text);
    return out;
  }
  const sig = (d) => JSON.stringify(clean(d));
  function hasContent(d) {
    const ids = Object.keys(d.profiles);
    return ids.length > 1 || (d.quick || []).length > 0 || ids.some((id) => { const v = d.profiles[id].voice || {}; return (v.samples || []).length || ['name', 'about', 'avoid', 'tone'].some((k) => (v[k] || '').toString().trim()); });
  }

  async function call(action, data) {
    const base = (await get('apiBase', 'https://getaurorastudios.com/api')).replace(/\/+$/, '');
    const key = (await get('licenseKey', '')).trim().toUpperCase();
    if (!key) return { ok: false, status: 'no_key' };
    let installId = await get('installId'); if (!installId) { installId = crypto.randomUUID(); await set({ installId }); }
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 20000);
    try {
      const r = await fetch(base + '/reply/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, installId, action, data }), signal: ctl.signal });
      let j = {}; try { j = await r.json(); } catch (_) {}
      return r.ok && j.ok ? j : { ok: false, status: j.status || 'error', message: j.message };
    } catch (_) { return { ok: false, status: 'network' }; } finally { clearTimeout(t); }
  }
  const enabled = async () => (await get('prefs', {})).backup !== false;

  const S = {
    async push() {
      if (!(await enabled())) return { ok: false, status: 'off' };
      const cur = clean(await snapshot());
      if (!hasContent(cur) && !(await get('syncMeta', { sig: '' })).sig) return { ok: true, skipped: true }; // never overwrite a saved backup with a blank start
      const r = await call('put', cur);
      if (r.ok) { await set({ syncMeta: { at: r.updatedAt, sig: sig(cur) }, syncState: { at: Date.now(), ok: true } }); return { ok: true, pushed: true }; }
      await set({ syncState: { at: Date.now(), ok: false, status: r.status } }); return r;
    },
    /* Brings in the saved voices when this browser has none (a reinstall), or when another computer saved newer ones. This browser's own unsaved changes always win. */
    async pull() {
      if (!(await enabled())) return { ok: false, status: 'off' };
      const r = await call('get'); if (!r.ok) { await set({ syncState: { at: Date.now(), ok: false, status: r.status } }); return r; }
      const cur = clean(await snapshot()), meta = await get('syncMeta', { at: 0, sig: '' });
      if (!r.data) { if (hasContent(cur)) return S.push(); await set({ syncState: { at: Date.now(), ok: true } }); return { ok: true }; }
      const rem = clean(r.data), remSig = sig(rem), curSig = sig(cur);
      if (curSig === remSig) { await set({ syncMeta: { at: r.updatedAt, sig: curSig }, syncState: { at: Date.now(), ok: true } }); return { ok: true }; }
      const dirty = curSig !== meta.sig;
      if (hasContent(cur) && dirty) return S.push();
      await set({ profiles: rem.profiles, activeProfile: rem.activeProfile, voice: rem.profiles[rem.activeProfile].voice || {}, quick: rem.quick, syncMeta: { at: r.updatedAt, sig: remSig }, syncState: { at: Date.now(), ok: true, restored: true } });
      return { ok: true, restored: true };
    },
    /* "Delete all my data": removes the saved copy too, or the next start would bring it straight back. */
    async erase() { const r = await call('delete'); await set({ syncMeta: { at: 0, sig: '' } }); return r; },
    /* Runs after any edit to voices or quick replies; waits a moment so typing is saved as one change. */
    schedule() {
      clearTimeout(S._t);
      S._t = setTimeout(async () => { const cur = sig(await snapshot()); const m = await get('syncMeta', { sig: '' }); if (cur !== m.sig && await get('licenseKey', '')) S.push(); }, 2500);
    },
    clean, snapshot, hasContent,
  };
  root.AuroraSync = S;
})(typeof globalThis !== 'undefined' ? globalThis : this);
