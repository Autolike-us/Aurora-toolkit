import Link from 'next/link';
export default function NotFound() { return <main><div className="auth center"><h1 style={{ fontSize: 40 }}>Page not found</h1><p className="muted" style={{ margin: '10px 0 20px' }}>That page drifted away.</p><Link className="btn primary" href="/">Back home</Link></div></main>; }
