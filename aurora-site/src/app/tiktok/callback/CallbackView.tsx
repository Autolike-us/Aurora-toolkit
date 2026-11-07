'use client';
import { useEffect, useState } from 'react';

type View = { kind: 'wait' } | { kind: 'code'; code: string; state: string } | { kind: 'error'; error: string; text: string } | { kind: 'none' };

/** Shows the one-time code TikTok put in this page's address so it can be pasted into OpenShorts.
 *  The code stays in this browser tab: it is not stored, logged or sent anywhere, and it is removed from the address bar once read. */
export function CallbackView() {
  const [v, setV] = useState<View>({ kind: 'wait' });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const code = q.get('code') || '', state = q.get('state') || '', error = q.get('error') || '';
    if (error) setV({ kind: 'error', error, text: q.get('error_description') || '' });
    else if (code) setV({ kind: 'code', code, state });
    else setV({ kind: 'none' });
    if (window.location.search) { try { window.history.replaceState(null, '', window.location.pathname); } catch { /* ignore */ } }
  }, []);

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); }
    catch { const el = document.getElementById('tt-code') as HTMLTextAreaElement | null; if (el) { el.focus(); el.select(); try { document.execCommand('copy'); } catch { /* the code is selected: Ctrl+C works */ } } }
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  }

  if (v.kind === 'wait') return <p className="muted" aria-busy="true">One moment…</p>;
  if (v.kind === 'error') return (<div className="step-card" role="alert"><h3>TikTok did not authorize the request</h3>
    <p className="muted">TikTok returned: <b>{v.error}</b>{v.text ? ` — ${v.text}` : ''}.</p><p className="muted">Go back to OpenShorts and start the authorization again.</p></div>);
  if (v.kind === 'none') return (<div className="step-card"><h3>No code found</h3>
    <p className="muted">This page is where TikTok sends you after you approve access. It shows the code only when it arrives from TikTok. Start the authorization again from OpenShorts.</p></div>);
  return (<div className="step-card">
    <p style={{ margin: '0 0 10px' }}><b>Copy this code and paste it into OpenShorts.</b></p>
    <textarea id="tt-code" readOnly rows={3} value={v.code} onFocus={e => e.currentTarget.select()} aria-label="Authorization code" style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid var(--line)', background: 'var(--surface)', color: 'inherit', font: '14px/1.4 ui-monospace,Menlo,Consolas,monospace', resize: 'none' }} />
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
      <button type="button" className="btn primary" onClick={() => copy(v.code)}>Copy code</button>
      <span aria-live="polite" className="muted">{copied ? 'Copied ✓' : ''}</span>
    </div>
    {v.state && <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>State: <code>{v.state}</code></p>}
    <ul className="muted" style={{ fontSize: 14, marginTop: 14, paddingLeft: 18, lineHeight: 1.6 }}>
      <li>The code works once and expires quickly. Paste it into OpenShorts now.</li>
      <li>This page does not store, log or send the code anywhere. It was removed from the address bar. If you reload, start the authorization again.</li>
      <li>Never share this code with anyone else.</li>
    </ul>
  </div>);
}
