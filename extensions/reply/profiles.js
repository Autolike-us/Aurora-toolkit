/* Aurora Reply — voice profiles (one per brand or account). The active profile's voice is always copied into `voice`, which is what drafting reads. */
(function (root) {
  'use strict';
  const get = (k, d) => chrome.storage.local.get(k).then((o) => (o[k] === undefined ? d : o[k]));
  const set = (o) => chrome.storage.local.set(o);
  async function load() {
    let p = await get('profiles', null), a = await get('activeProfile', 'default'); const v = await get('voice', {});
    if (!p || !Object.keys(p).length) { p = { default: { label: 'Main', voice: v } }; a = 'default'; await set({ profiles: p, activeProfile: a }); }
    if (!p[a]) { a = Object.keys(p)[0]; await set({ activeProfile: a }); }
    return { p, a, v };
  }
  const P = {
    async list() { const { p, a } = await load(); return { active: a, items: Object.entries(p).map(([id, x]) => ({ id, label: x.label })) }; },
    async switchTo(id) { const { p, a, v } = await load(); if (!p[id] || id === a) return; p[a].voice = v; await set({ profiles: p, activeProfile: id, voice: p[id].voice || {} }); },
    async create(label) { const { p, a, v } = await load(); const id = 'p' + Date.now().toString(36); p[a].voice = v; p[id] = { label: String(label || 'New profile').slice(0, 30), voice: {} }; await set({ profiles: p, activeProfile: id, voice: {} }); return id; },
    async rename(id, label) { const { p } = await load(); if (p[id] && String(label || '').trim()) { p[id].label = String(label).trim().slice(0, 30); await set({ profiles: p }); } },
    async remove(id) {
      const { p, a } = await load(); const ids = Object.keys(p); if (ids.length < 2 || !p[id]) return false;
      delete p[id]; const next = id === a ? Object.keys(p)[0] : a; await set({ profiles: p, activeProfile: next, ...(id === a ? { voice: p[next].voice || {} } : {}) }); return true;
    },
    async reset() { await set({ profiles: { default: { label: 'Main', voice: {} } }, activeProfile: 'default', voice: {} }); },
  };
  root.AuroraProfiles = P;
})(typeof globalThis !== 'undefined' ? globalThis : this);
