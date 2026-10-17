'use client';
import { useEffect, useState } from 'react';

/** Light / dark switch. Light is the default; the choice is remembered in this browser (the early script in layout.tsx applies it before first paint). */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.dataset.theme === 'dark'); }, []);
  const flip = () => {
    const next = !dark; setDark(next);
    const root = document.documentElement;
    if (next) root.dataset.theme = 'dark'; else delete root.dataset.theme;
    try { localStorage.setItem('aurora-theme', next ? 'dark' : 'light'); } catch { /* private mode: still works for this visit */ }
  };
  const label = dark ? 'Switch to light theme' : 'Switch to dark theme';
  return (
    <button type="button" className="themebtn" data-theme-toggle onClick={flip} aria-label={label} title={label}>
      <svg className="moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 119.5 4a7 7 0 0010.5 10.5z" /></svg>
      <svg className="sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
    </button>
  );
}
