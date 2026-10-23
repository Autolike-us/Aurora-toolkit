/* Aurora Reply — Write helpers. Pure functions (no network, no storage) so they can be tested on their own.
   "Ideas from your comments": finds the questions followers keep asking, from the comments you chose to draft replies for (your history, which stays in this browser). */
(function (root) {
  'use strict';
  const STOP = new Set('a an the is are was were be been am do does did can could will would should you your yours i me my we our us it its this that these those to of in on at for with and or but if so just please pls hi hello hey there here what when where which who whom how why any some more much many very really also thanks thank'.split(' '));
  const Q_START = /^(do|does|did|can|could|will|would|is|are|was|were|how|what|when|where|which|who|why|should|have|has|any|anyone)\b/i;

  /** Lowercase words without punctuation, emoji, @mentions and filler words, with light plural folding. */
  function words(text) {
    return String(text || '').toLowerCase().replace(/@\w+/g, ' ').replace(/https?:\/\/\S+/g, ' ').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/)
      .filter((w) => w.length > 1 && !STOP.has(w)).map((w) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w));
  }
  const isQuestion = (t) => { const s = String(t || '').trim(); return s.length >= 8 && (s.includes('?') || Q_START.test(s)); };
  const clean = (t) => String(t || '').replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '').replace(/\s+/g, ' ').trim();
  const jaccard = (a, b) => { let i = 0; a.forEach((x) => { if (b.has(x)) i++; }); const u = a.size + b.size - i; return u ? i / u : 0; };

  /**
   * history: the dashboard's history entries ({ ts, platform, mode, comment }). Only replies to other people's comments count.
   * Returns groups, biggest first: { text, count, platforms: [...], last }.
   */
  function ideas(history, opts) {
    const o = opts || {}, now = o.now || Date.now(), days = o.days == null ? 30 : o.days, min = o.min || 1, max = o.max || 8;
    const since = days > 0 ? now - days * 86400000 : 0;
    const groups = [];
    (history || []).forEach((h) => {
      if (!h || h.mode === 'post' || h.platform === 'test' || !h.comment || (h.ts || 0) < since || !isQuestion(h.comment)) return;
      const set = new Set(words(h.comment)); if (set.size < 2) return;
      let g = groups.find((x) => jaccard(x.set, set) >= 0.5);
      if (!g) { g = { set, text: clean(h.comment).slice(0, 200), count: 0, platforms: {}, last: 0 }; groups.push(g); }
      g.count++; g.platforms[h.platform] = (g.platforms[h.platform] || 0) + 1; g.last = Math.max(g.last, h.ts || 0);
      const c = clean(h.comment);
      if (c.length >= 12 && (g.text.length < 12 || (Q_START.test(c) && !Q_START.test(g.text)) || (Q_START.test(c) === Q_START.test(g.text) && c.length > g.text.length && c.length <= 90))) g.text = c.slice(0, 200); // prefer a clear question wording, then the fuller sentence (up to 90 characters)
    });
    return groups.filter((g) => g.count >= min).sort((a, b) => b.count - a.count || b.last - a.last).slice(0, max)
      .map((g) => ({ text: g.text, count: g.count, platforms: Object.keys(g.platforms).filter((p) => p !== 'test'), last: g.last }));
  }

  const api = { ideas, words, isQuestion };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.AuroraWrite = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
