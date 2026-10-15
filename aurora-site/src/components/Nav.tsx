'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { browserClient } from '@/lib/supabase-browser';

export function Nav() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    const c = browserClient();
    if (!c) return;
    c.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data } = c.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => data.subscription.unsubscribe();
  }, []);
  return (
    <header className="nav"><div className="wrap">
      <Link href="/" className="logo">✦ <span>Aurora</span></Link>
      <nav aria-label="Main">
        <Link href="/#products">Extensions</Link><Link href="/pricing">Pricing</Link><Link href="/download">Download</Link><Link href="/#faq">FAQ</Link>
      </nav>
      <div className="right">
        {signedIn ? <Link className="btn sm primary" href="/account">My account</Link> : <>
          <Link className="btn sm" href="/login">Log in</Link>
          <Link className="btn sm primary" href="/signup">Start free trial</Link></>}
      </div>
    </div></header>
  );
}
