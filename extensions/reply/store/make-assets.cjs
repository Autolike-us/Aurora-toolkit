// Chrome Web Store images for Aurora Reply (24-bit PNG): 5 screenshots 1280x800, small tile 440x280, marquee 1400x560.  node store/make-assets.cjs
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ROOT = path.join(__dirname, '..'), OUT = path.join(__dirname, 'assets');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const exe = fs.readdirSync('/opt/pw-browsers').filter((d) => /^chromium-/.test(d)).map((d) => `/opt/pw-browsers/${d}/chrome-linux/chrome`)[0];
const icon = 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'icons/icon128.png')).toString('base64');
const now = Date.now(), H = 3600e3, D = 86400e3;
const HISTORY = [
  { id: 'a', ts: now - 1 * H, platform: 'instagram', author: 'maya.k', comment: 'Do you deliver on Sundays? 🥖', drafts: ['Hi Maya! Sundays are pick-up only 🥖', 'Great question — Tue to Sat we deliver!', 'Thanks Maya, DM us your address.'], chosen: 'Hi Maya! Sundays are pick-up only, but we would love to see you 🥖', action: 'inserted', edited: true, tone: 'warm', fav: true },
  { id: 'b', ts: now - 5 * H, platform: 'facebook', author: 'Tom Becker', comment: 'Love the rye! How much for a whole loaf?', drafts: ['Thanks Tom! A whole rye is $4.', '$4 a loaf — see you soon!', 'Glad you like it! $4 for a whole loaf.'], chosen: 'Thanks Tom! A whole rye is $4.', action: 'inserted', tone: 'friendly' },
  { id: 'c', ts: now - 1 * D, platform: 'tiktok', author: 'chef_ann', comment: 'Recipe please!!', drafts: ['It is in my bio, Ann!', 'Check the link in my bio 💛', 'Posting the full recipe Friday!'], chosen: 'It is in my bio, Ann!', action: 'copied', tone: 'playful' },
  { id: 'd', ts: now - 2 * D, platform: 'instagram', author: 'lucas_b', comment: 'Where are you located?', drafts: ['We are at 12 Harbor St — open Tue–Sun!', 'Harbor Street, right by the market 🥖', 'Come visit us at 12 Harbor St!'], chosen: 'We are at 12 Harbor St, open Tue–Sun 7–3!', action: 'inserted', edited: true, tone: 'friendly' },
  { id: 'e', ts: now - 3 * D, platform: 'facebook', author: 'Priya N', comment: 'Do you have gluten-free options?', drafts: ['Yes! Our seeded loaf is gluten-free.', 'We do — ask for the seeded loaf.', 'Great question, yes we do!'], chosen: '', action: 'drafted', tone: 'professional' },
  { id: 'f', ts: now - 4 * D, platform: 'instagram', author: 'sofia.m', comment: 'Can I order for a party of 20?', drafts: ['Absolutely! DM us the date.', 'Yes — message us your date and we will sort it.', 'We would love to bake for your party!'], chosen: 'Absolutely! Message us the date and we will sort it out 🎉', action: 'inserted', edited: true, tone: 'warm' },
  { id: 'g', ts: now - 6 * D, platform: 'tiktok', author: 'devon', comment: 'What flour do you use?', drafts: ['Local stone-ground wheat and rye!', 'Stone-ground flour from a mill nearby 🌾', 'Local organic flour.'], chosen: 'Local stone-ground wheat and rye!', action: 'inserted', tone: 'friendly' },
];
const QUICK = [{ id: 'q1', title: 'Shipping', text: 'We ship worldwide — free over $50! You can order on our website.' }, { id: 'q2', title: 'Opening hours', text: 'We are open Tuesday to Sunday, 7am–3pm. See you soon!' }, { id: 'q3', title: 'Thanks', text: 'Thank you so much! 💛 It really means a lot.' }];
const VOICE = { name: 'Sunrise Bakery', samples: ['Thank you Sam! See you Saturday 🥖', 'Great question — we are open until 3pm!', 'Aww thank you, that made our day 💛', 'Yes! Sourdough is baked fresh every morning.', 'Hi Lena! Orders close at noon the day before.'], about: 'Open Tue–Sun 7am–3pm. Delivery Tue–Sat only. Order at sunrisebakery.example/order', tone: 'warm', emoji: 'few', length: 'short', language: 'auto', avoid: 'never promise a discount' };
const stub = (cfg) => {
  const store = cfg.store; window.__store = store;
  window.chrome = { storage: { local: { get: async (k) => { const o = {}; [].concat(k).forEach((x) => { if (x in store) o[x] = store[x]; }); return o; }, set: async (o) => Object.assign(store, o) } },
    runtime: { getManifest: () => ({ version: '0.3.0' }), openOptionsPage() {}, sendMessage: (m, cb) => setTimeout(() => cb(m.type === 'getState' ? { ok: true, hasKey: true, voiceReady: true, usage: store.usage, voice: store.voice, profiles: { active: 'default', items: [{ id: 'default', label: 'Sunrise Bakery' }, { id: 'p2', label: 'Harbor Coffee' }] } } : m.type === 'quickList' ? { ok: true, quick: store.quick } : m.type === 'draft' ? { ok: true, drafts: cfg.drafts.map((t) => ({ text: t })), flag: 'none', usage: store.usage } : { ok: true }), 20) } };
};
const mkStore = (extra = {}) => ({ prefs: { onboarded: true, seen: '0.3.0', theme: 'light', history: true }, licenseKey: 'AUR-DEMO-DEMO-DEMO', usage: { used: 142, limit: 1500, resetsAt: new Date(now + 12 * D).toISOString() }, voice: VOICE, history: HISTORY, quick: QUICK, profiles: { default: { label: 'Sunrise Bakery', voice: VOICE }, p2: { label: 'Harbor Coffee', voice: {} } }, activeProfile: 'default', ...extra });

const PAGE = `<!doctype html><title>demo</title><style>body{margin:0;background:#e9eaee;font:15px system-ui,sans-serif;color:#1c1e21}.wrap{width:560px;margin:0 auto;padding:36px 0}
.post{background:#fff;border-radius:16px;box-shadow:0 2px 10px #0002;overflow:hidden}.ph{height:250px;background:linear-gradient(135deg,#fbbf24,#f97316 60%,#c2410c);display:grid;place-items:center;font-size:96px}
.in{padding:14px 18px}.hd{display:flex;gap:10px;align-items:center;margin-bottom:8px}.av{width:38px;height:38px;border-radius:50%;background:#16120d;color:#fbbf24;display:grid;place-items:center;font-weight:800}
ul{list-style:none;margin:0;padding:0}li{display:flex;gap:10px;margin:14px 0}li .a{width:32px;height:32px;border-radius:50%;flex:none}li .b{background:#f0f2f5;border-radius:16px;padding:8px 12px}li a{font-weight:700;color:inherit;text-decoration:none}li .act{font-size:12.5px;color:#65676b;margin:3px 0 0 8px}li .act span{margin-right:12px;font-weight:700}
.box{border-top:1px solid #e4e6eb;padding:12px 18px}.box textarea{width:100%;border:0;background:#f0f2f5;border-radius:18px;padding:10px 14px;font:inherit;resize:none;height:42px}</style>
<div class="wrap"><div class="post"><div class="ph">🥖</div><div class="in"><div class="hd"><div class="av">SB</div><div><b>sunrisebakery</b></div></div><h1 style="font-size:15px;font-weight:500;margin:0 0 10px">Fresh sourdough, out of the oven at 7am! #bread</h1>
<ul>
<li><div class="a" style="background:#fb923c"></div><div><div class="b"><a href="/maya.k">maya.k</a> <span dir="auto">Do you deliver on Sundays? 🥖</span></div><div class="act"><span>2h</span><span>Like</span><span role="button">Reply</span></div></div></li>
<li><div class="a" style="background:#fbbf24"></div><div><div class="b"><a href="/tom_b">tom_b</a> <span dir="auto">Love the rye! How much for a whole loaf?</span></div><div class="act"><span>3h</span><span>Like</span><span role="button">Reply</span></div></div></li>
<li><div class="a" style="background:#a3a3a3"></div><div><div class="b"><a href="/priya">priya_n</a> <span dir="auto">Do you have gluten-free options?</span></div><div class="act"><span>5h</span><span>Like</span><span role="button">Reply</span></div></div></li></ul></div>
<div class="box"><form><textarea placeholder="Add a comment…"></textarea></form></div></div></div>`;

async function shot(b, name, w, h, setup) { const pg = await b.newPage({ viewport: { width: w, height: h } }); pg.on('pageerror', (e) => console.log('PAGEERR', name, e.message)); await setup(pg); await pg.screenshot({ path: path.join(OUT, name + '.png') }); await pg.close(); }
async function dash(b, name, view, theme, extra) {
  await shot(b, name, 1280, 800, async (pg) => {
    await pg.route('**/*', (r) => r.fulfill({ contentType: 'text/html; charset=utf-8', body: read('options.html').replace(/<link rel="stylesheet" href="ui.css">/, '<style>' + read('ui.css') + '</style>').replace(/<script src="[^"]*"><\/script>/g, '').replace(/<img src="icons\/[^"]*"/g, `<img src="${icon}"`) }));
    await pg.goto('https://x.test/options.html#' + view);
    await pg.evaluate(stub, { store: mkStore({ prefs: { onboarded: true, seen: '0.3.0', theme } , ...extra }), drafts: [] });
    await pg.addScriptTag({ content: read('profiles.js') }); await pg.addScriptTag({ content: read('options.js') }); await pg.waitForTimeout(400);
  });
}
const tile = (w, h, big) => `<style>*{margin:0;box-sizing:border-box}body{width:${w}px;height:${h}px;font-family:Inter,system-ui,sans-serif;background:radial-gradient(circle at 90% 0%,rgba(249,115,22,.55),transparent 50%),radial-gradient(circle at 0% 110%,rgba(251,191,36,.25),transparent 45%),#14110d;color:#fff;position:relative;overflow:hidden}
.ic{position:absolute;border-radius:${big ? 30 : 20}px;overflow:hidden;box-shadow:0 12px 30px #0008}.ic img{width:100%;display:block}h1{position:absolute;font-weight:800;letter-spacing:-.03em;line-height:1}h1 b{background:linear-gradient(120deg,#f97316,#fbbf24);-webkit-background-clip:text;color:transparent}p{position:absolute;color:#e7dccd;line-height:1.35}
.card{position:absolute;background:#fff;color:#1a1612;border-radius:${big ? 22 : 16}px;box-shadow:0 20px 50px #0009;padding:${big ? 20 : 12}px;font-size:${big ? 18 : 11.5}px}.card .c{background:#f4efe8;border-radius:12px;padding:8px 10px;margin-bottom:8px}.card .d{border:1.5px solid #f97316;background:#fff4e6;border-radius:12px;padding:8px 10px;margin-bottom:8px}.card .u{background:linear-gradient(120deg,#f97316,#fbbf24);border-radius:12px;text-align:center;font-weight:800;padding:7px;color:#1a1209}</style>`;
const SMALL = tile(440, 280, false) + `<div class="ic" style="left:26px;top:26px;width:62px"><img src="${icon}"></div><h1 style="left:26px;top:106px;font-size:36px">Aurora <b>Reply</b></h1><p style="left:26px;top:152px;width:230px;font-size:15px">Comment replies in your own voice. You press Send.</p><div class="card" style="right:-24px;top:50px;width:190px;transform:rotate(4deg)"><div class="c">Do you deliver on Sundays?</div><div class="d">Sundays are pick-up only 🥖</div><div class="u">Use this reply</div></div>`;
const MARQ = tile(1400, 560, true) + `<div class="ic" style="left:96px;top:96px;width:104px"><img src="${icon}"></div><h1 style="left:96px;top:236px;font-size:92px">Aurora <b>Reply</b></h1><p style="left:98px;top:352px;width:640px;font-size:31px">Answer Facebook, Instagram &amp; TikTok comments in your own voice — in seconds. You read, edit and press Send.</p><div class="card" style="right:110px;top:70px;width:430px;transform:rotate(3deg)"><div class="c">Love the rye! How much for a whole loaf? 😍</div><div class="d">Thanks Tom! A whole rye is $4 🥖</div><div class="d" style="opacity:.6;border-color:#eadfd0;background:#fff">$4 a loaf — see you soon!</div><div class="u">Use this reply</div></div>`;

(async () => {
  const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  // 1 panel on a post
  await shot(b, 'screenshot-1-reply-panel', 1280, 800, async (pg) => {
    await pg.route('**/*', (r) => r.fulfill({ contentType: 'text/html; charset=utf-8', body: PAGE }));
    await pg.goto('https://www.instagram.com/p/DEMO/'); await pg.evaluate(stub, { store: mkStore(), drafts: ['Hi Maya! Sundays are pick-up only 🥖', 'Great question — Tue to Sat we deliver, Sundays you can collect!', 'Thanks Maya, DM us your address and we will sort it 💛'] });
    await pg.addScriptTag({ content: read('content/adapters.js') }); await pg.addScriptTag({ content: read('content/panel.js') }); await pg.waitForTimeout(200);
    await pg.click('button.pill'); await pg.waitForTimeout(250); await pg.locator('[data-draft="0"]').click(); await pg.waitForSelector('textarea.dt'); await pg.waitForTimeout(200);
  });
  await dash(b, 'screenshot-2-dashboard', 'overview', 'light');
  await dash(b, 'screenshot-3-history', 'history', 'light');
  await dash(b, 'screenshot-4-voice-and-quick-replies', 'quick', 'light');
  await dash(b, 'screenshot-5-dark-theme', 'overview', 'dark');
  for (const [n, html, w, h] of [['promo-small-440x280', SMALL, 440, 280], ['promo-marquee-1400x560', MARQ, 1400, 560]]) { const pg = await b.newPage({ viewport: { width: w, height: h } }); await pg.setContent(html); await pg.screenshot({ path: path.join(OUT, n + '.png') }); await pg.close(); }
  await b.close(); console.log('store assets written');
})();
