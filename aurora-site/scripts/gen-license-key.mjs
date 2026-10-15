// Generates the ES256 key pair used to sign license tokens.
// Put the PRIVATE key (single line, \n escaped) in LICENSE_PRIVATE_KEY_PKCS8 on the server,
// and paste the PUBLIC key JWK into each extension's license.js (PUBLIC_KEY_JWK).
import { generateKeyPair, exportPKCS8, exportJWK } from 'jose';
const { publicKey, privateKey } = await generateKeyPair('ES256', { extractable: true });
console.log('LICENSE_PRIVATE_KEY_PKCS8=' + JSON.stringify((await exportPKCS8(privateKey)).trim()).slice(1, -1));
console.log('\nPUBLIC_KEY_JWK=' + JSON.stringify(await exportJWK(publicKey)));
