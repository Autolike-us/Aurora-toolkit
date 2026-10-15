import { describe, expect, it } from 'vitest';
import { exportJWK, exportPKCS8, generateKeyPair } from 'jose';
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { webcrypto } from 'node:crypto';
import { signLicenseToken } from '../src/lib/token';
import { computeAccess } from '../src/lib/entitlements';

const EXT = ['ig-growth-v1', 'tk-growth-v1', 'FB-Growth-V1'].map(d => path.join(__dirname, '..', '..', d)).filter(d => fs.existsSync(path.join(d, 'license.js')));

describe('license token <-> extension compatibility', () => {
  it.skipIf(!EXT.length)('a token signed by the site is accepted by the extension code, and a different key is rejected', async () => {
    const { publicKey, privateKey } = await generateKeyPair('ES256', { extractable: true });
    process.env.LICENSE_PRIVATE_KEY_PKCS8 = (await exportPKCS8(privateKey)).replace(/\n/g, '\\n');
    const other = await generateKeyPair('ES256', { extractable: true });
    const license = { id: 'l', user_id: 'u', license_key: 'AUR-AAAA-BBBB-CCCC', trial_started_at: new Date().toISOString(), trial_ends_at: new Date(Date.now() + 86400000).toISOString() };
    const access = computeAccess(license, []);
    for (const dir of EXT) {
      const product = /product:\s*'([a-z]+)'/.exec(fs.readFileSync(path.join(dir, 'license-config.js'), 'utf8'))![1] as 'facebook';
      const { token } = await signLicenseToken({ licenseKey: license.license_key, product, access, installId: 'install-123' });
      for (const [jwk, expected] of [[await exportJWK(publicKey), true], [await exportJWK(other.publicKey), false]] as const) {
        const data: Record<string, any> = { license: { key: license.license_key, installId: 'install-123', token } };
        const chrome = { storage: { local: { get: async (k: string) => ({ [k]: structuredClone(data[k]) }), set: async (o: any) => Object.assign(data, structuredClone(o)) } }, runtime: { getManifest: () => ({ version: '1' }) } };
        const ctx = vm.createContext({ chrome, crypto: webcrypto, atob, TextEncoder, TextDecoder, Date, JSON, console, fetch: async () => { throw new Error('offline'); } });
        vm.runInContext(`globalThis.AuroraLicenseConfig=${JSON.stringify({ product, enforce: true, apiBase: 'https://x.test', publicKeyJwk: { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y } })};`, ctx);
        vm.runInContext(fs.readFileSync(path.join(dir, 'license.js'), 'utf8'), ctx);
        expect((await ctx.AuroraLicense.peek()).allowed, `${path.basename(dir)} with ${expected ? 'the right' : 'a wrong'} key`).toBe(expected);
      }
    }
  });
});
