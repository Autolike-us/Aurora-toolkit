import Link from 'next/link';
import { daysLeftInOffer, offerActive } from '@/lib/pricing';

export function Announcement() {
  const now = new Date(), launch = offerActive(now);
  return (
    <div className="announcement">
      <span className="dot" />
      <b>{launch ? 'LAUNCH OFFER' : 'FREE 3-DAY TRIAL'}</b>
      <span className="detail">{launch ? `All three studios for $10/month — price locked while you stay. ${daysLeftInOffer(now)} days left.` : 'Try all three studios free for 3 days. No card needed.'}</span>
      <Link href="/pricing">See pricing</Link>
    </div>
  );
}
