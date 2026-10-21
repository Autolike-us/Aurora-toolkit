/** Google Analytics events. Safe to call anywhere: does nothing when analytics is off, blocked or not loaded. Never pass personal data (no emails, keys or typed text). */
type Params = Record<string, unknown>;

export function track(name: string, params: Params = {}): void {
  try {
    const w = window as unknown as { gtag?: (...a: unknown[]) => void; dataLayer?: unknown[] };
    w.dataLayer = w.dataLayer || [];
    // same one-line helper as Google's own snippet, so an event sent before the analytics script finishes loading is queued, not lost
    if (typeof w.gtag !== 'function') w.gtag = function () { (w.dataLayer as unknown[]).push(arguments); };
    w.gtag('event', name, params);
  } catch { /* analytics must never break the site */ }
}

/** Sends the event once per browser for this key (for example a purchase id), so a page reload does not count it twice. */
export function trackOnce(key: string, name: string, params: Params = {}): void {
  const k = 'aurora_ev_' + key;
  try { if (localStorage.getItem(k)) return; localStorage.setItem(k, '1'); } catch { /* private mode: still send once per page view */ }
  track(name, params);
}

const NAMES: Record<string, string> = { bundle: 'All 3 studios', facebook: 'Facebook Studio', instagram: 'Instagram Studio', tiktok: 'TikTok Studio', reply: 'Aurora Reply Standard', reply_pro: 'Aurora Reply Agency', pack150: 'Reply pack 150', pack600: 'Reply pack 600' };
export const itemOf = (id: string, usd: number) => ({ item_id: id, item_name: NAMES[id] || id, price: usd, quantity: 1 });
