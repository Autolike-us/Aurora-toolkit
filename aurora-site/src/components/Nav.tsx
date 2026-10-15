'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { browserClient } from '@/lib/supabase-browser';
import { Brand } from './Brand';

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
      <Brand />
      <nav aria-label="Main">
        <Link href="/#studios">The studios</Link><Link href="/#how">How it works</Link><Link href="/pricing">Pricing</Link><Link href="/download">Download</Link><Link href="/#faq">Questions</Link>
      </nav>
      <div className="right">
        {signedIn ? <Link className="btn sm primary" href="/account">My account</Link> : <>
          <Link className="link" href="/login">Sign in ↗</Link>
          <Link className="btn sm primary" href="/signup">Try Aurora <span className="arrow">↗</span></Link></>}
      </div>
    </div></header>
  );
}
