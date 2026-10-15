import type { ProductId } from '@/lib/products';

const SIZES = { xs: 22, sm: 30, md: 36, lg: 46, xl: 56 } as const;

/** The three platform badges used everywhere on the site, so each studio looks the same top to bottom. */
export function PlatformIcon({ id, size = 'md' }: { id: ProductId; size?: keyof typeof SIZES }) {
  const px = SIZES[size];
  const glyph = {
    facebook: <path fill="#fff" d="M13.6 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.6-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H8v3h2.6V21h3z" />,
    instagram: <g fill="none" stroke="#fff" strokeWidth="2"><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.1" cy="6.9" r="1" fill="#fff" stroke="none" /></g>,
    tiktok: <g><path transform="translate(-.7 .7)" fill="#25f4ee" d="M16.2 3c.3 2.2 1.6 3.6 3.8 3.8v3c-1.4 0-2.7-.4-3.8-1.2v5.6c0 3-2.4 5.3-5.4 5.3S5.4 18.2 5.4 15.2s2.4-5.3 5.4-5.3c.3 0 .6 0 .9.1v3.1a2.3 2.3 0 0 0-.9-.2 2.3 2.3 0 1 0 2.3 2.3V3h3.1z" /><path transform="translate(.7 -.7)" fill="#fe2c55" d="M16.2 3c.3 2.2 1.6 3.6 3.8 3.8v3c-1.4 0-2.7-.4-3.8-1.2v5.6c0 3-2.4 5.3-5.4 5.3S5.4 18.2 5.4 15.2s2.4-5.3 5.4-5.3c.3 0 .6 0 .9.1v3.1a2.3 2.3 0 0 0-.9-.2 2.3 2.3 0 1 0 2.3 2.3V3h3.1z" /><path fill="#fff" d="M16.2 3c.3 2.2 1.6 3.6 3.8 3.8v3c-1.4 0-2.7-.4-3.8-1.2v5.6c0 3-2.4 5.3-5.4 5.3S5.4 18.2 5.4 15.2s2.4-5.3 5.4-5.3c.3 0 .6 0 .9.1v3.1a2.3 2.3 0 0 0-.9-.2 2.3 2.3 0 1 0 2.3 2.3V3h3.1z" /></g>,
  }[id];
  return (
    <span className={'pmini ' + { facebook: 'fb', instagram: 'ig', tiktok: 'tk' }[id]} style={{ width: px, height: px, borderRadius: Math.round(px * 0.3) }} aria-hidden>
      <svg viewBox="0 0 24 24" width={Math.round(px * 0.62)} height={Math.round(px * 0.62)}>{glyph}</svg>
    </span>
  );
}

export function PlatformRow({ size = 'sm' }: { size?: keyof typeof SIZES }) {
  return <span style={{ display: 'inline-flex', gap: 6 }}><PlatformIcon id="facebook" size={size} /><PlatformIcon id="instagram" size={size} /><PlatformIcon id="tiktok" size={size} /></span>;
}
