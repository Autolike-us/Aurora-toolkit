import { SignJWT, importPKCS8 } from 'jose';
import { env, requireEnv } from './env';
import type { Access } from './entitlements';
import type { ProductId } from './products';

export const TOKEN_HOURS = 72;

/** Short-lived signed token the extensions keep. They verify it offline with the public key and refresh it whenever online. */
export async function signLicenseToken(args: { licenseKey: string; product: ProductId; access: Access; installId: string }): Promise<{ token: string; expiresAt: number }> {
  const key = await importPKCS8(requireEnv('LICENSE_PRIVATE_KEY_PKCS8', env.licensePrivateKey()).replace(/\\n/g, '\n'), 'ES256');
  const exp = Math.floor(Date.now() / 1000) + TOKEN_HOURS * 3600;
  const token = await new SignJWT({ product: args.product, status: args.access.status, trialEndsAt: args.access.trialEndsAt, iid: args.installId })
    .setProtectedHeader({ alg: 'ES256' }).setSubject(args.licenseKey).setIssuedAt().setExpirationTime(exp).sign(key);
  return { token, expiresAt: exp * 1000 };
}
