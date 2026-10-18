/** The Aurora Extract mark: the Aurora sparkle on a teal-to-sky gradient. */
function star(cx: number, cy: number, r: number, n = 64) {
  const k = 3.4, pts: string[] = [];
  for (let i = 0; i < n; i++) { const t = (2 * Math.PI * i) / n, c = Math.cos(t), s = Math.sin(t); pts.push(`${(cx + r * Math.sign(c) * Math.abs(c) ** k).toFixed(1)},${(cy + r * Math.sign(s) * Math.abs(s) ** k).toFixed(1)}`); }
  return 'M' + pts.join(' L') + 'Z';
}
export function ExtractIcon({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Aurora Extract" style={{ borderRadius: size * 0.225, boxShadow: '0 10px 24px -10px rgba(13,148,136,.7)' }}>
      <defs><linearGradient id="ex-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#047857" /><stop offset=".45" stopColor="#0d9488" /><stop offset=".8" stopColor="#0891b2" /><stop offset="1" stopColor="#22b8e8" /></linearGradient></defs>
      <rect width="100" height="100" rx="22.5" fill="url(#ex-g)" />
      <path d={star(45, 56, 38)} fill="#fff" /><path d={star(75, 26, 14, 48)} fill="#fff" />
    </svg>
  );
}
