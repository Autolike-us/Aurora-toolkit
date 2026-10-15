import Link from 'next/link';

/** The official Aurora wordmark: a four-point sparkle and "Aurora" in the violet-to-orange gradient. */
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Aurora home">
      <span className="spark" aria-hidden>✦</span> <span className="word">Aurora</span>
    </Link>
  );
}
