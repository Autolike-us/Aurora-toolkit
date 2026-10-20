// Renders promo.html to frames and stitches an MP4 (no audio). Usage: node store/video/render.cjs [out.mp4]
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('node:path'), fs = require('node:fs'), cp = require('node:child_process');
const OUT = path.resolve(process.argv[2] || path.join(__dirname, 'aurora-reply-promo.mp4'));
const FR = fs.mkdtempSync('/tmp/claude-0/-home-user/5ac6f80b-39de-5588-a183-0c8b927192a2/scratchpad/frames-');
const FPS = 30, DUR = 15;
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const pg = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  pg.on('pageerror', (e) => { console.error(e); process.exit(1); });
  await pg.goto('file://' + path.join(__dirname, 'promo.html')); await pg.waitForTimeout(400);
  await pg.evaluate(() => window.init());
  const N = FPS * DUR;
  for (let i = 0; i < N; i++) { await pg.evaluate((t) => window.setT(t), i / FPS); await pg.screenshot({ path: path.join(FR, String(i).padStart(4, '0') + '.png') }); }
  await b.close();
  cp.execFileSync('ffmpeg', ['-y', '-framerate', String(FPS), '-i', path.join(FR, '%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-movflags', '+faststart', OUT], { stdio: 'inherit' });
  console.log('frames in', FR, '→', OUT);
})();
