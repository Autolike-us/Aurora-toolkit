// A token minted by the PHP server must be accepted by the real extension code (license.js in all three repos).
// Run:  CROSS_OUT=/tmp/cross.json php tests/run.php && node tests/cross.test.cjs /tmp/cross.json
const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path'), { webcrypto } = require('node:crypto');
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const roots = ['ig-growth-v1', 'tk-growth-v1', 'FB-Growth-V1'].map(d => path.join(__dirname, '..', '..', '..', d)).filter(d => fs.existsSync(path.join(d, 'license.js')));
let bad = 0;
(async () => {
  for (const root of roots) {
    const product = /product:\s*'([a-z]+)'/.exec(fs.readFileSync(path.join(root, 'license-config.js'), 'utf8'))[1];
    // The PHP test minted a "facebook" token; for other products only the signature/claims path matters, so re-check the claim mismatch is refused.
    const store = { license: { key: data.key, installId: data.installId, token: data.token } };
    const chrome = { storage: { local: { get: async k => ({ [k]: structuredClone(store[k]) }), set: async o => Object.assign(store, structuredClone(o)) } }, runtime: { getManifest: () => ({ version: '1' }) } };
    const ctx = vm.createContext({ chrome, crypto: webcrypto, atob, TextEncoder, TextDecoder, Date, JSON, console, fetch: async () => { throw new Error('offline'); } });
    vm.runInContext(`globalThis.AuroraLicenseConfig=${JSON.stringify({ product, enforce: true, apiBase: 'https://x.test', publicKeyJwk: data.jwk })};`, ctx);
    vm.runInContext(fs.readFileSync(path.join(root, 'license.js'), 'utf8'), ctx);
    const r = await ctx.AuroraLicense.peek();
    const ok = product === 'facebook' ? r.allowed === true : r.allowed === false;
    console.log((ok ? 'PASS' : 'FAIL') + ` ${path.basename(root)} (${product}): peek -> allowed=${r.allowed}`);
    if (!ok) bad++;
  }
  process.exit(bad ? 1 : 0);
})();
