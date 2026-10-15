import Link from 'next/link';

export function Brand({ series = true }: { series?: boolean }) {
  return (
    <Link href="/" className="brand" aria-label="Aurora home">
      <svg viewBox="0 0 36 36" aria-hidden="true"><path d="M18 3 32 30H4L18 3Z" /><path d="m18 14 8 16H10l8-16Z" /></svg>aurora
      {series && <span className="brand-series">SERIES / 01</span>}
    </Link>
  );
}
