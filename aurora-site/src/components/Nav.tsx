'use client';
import Link from 'next/link';
import { useSignedIn } from '@/lib/client';
import { Brand } from './Brand';
import { ThemeToggle } from './ThemeToggle';

export function Nav() {
  const signedIn = useSignedIn();
  return (
    <header className="nav"><div className="wrap">
      <Brand />
      <nav aria-label="Main">
        <Link href="/#studios">The studios</Link><Link href="/#how">How it works</Link><Link href="/pricing">Pricing</Link><Link href="/reply">Aurora Reply <span className="newtag">New</span></Link><Link href="/extract">Free extractor <span className="freetag">Free</span></Link><Link href="/download">Download</Link><Link href="/#faq">Questions</Link>
      </nav>
      <div className="right">
        <ThemeToggle />
        {signedIn ? <Link className="btn sm primary" href="/account">My account</Link> : <>
          <Link className="link" href="/login">Sign in ↗</Link>
          <Link className="btn sm primary" href="/signup">Try Aurora <span className="arrow">↗</span></Link></>}
      </div>
    </div></header>
  );
}
