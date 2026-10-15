<?php
declare(strict_types=1);

function b64u(string $s): string { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }

/** Converts an OpenSSL DER ECDSA signature into the fixed 64-byte R||S form JWTs (and WebCrypto) use. */
function der_to_raw(string $der, int $size = 32): string
{
    $o = 2;
    if (ord($der[1]) & 0x80) $o += ord($der[1]) & 0x7f;
    $o++; $rl = ord($der[$o++]); $r = substr($der, $o, $rl); $o += $rl;
    $o++; $sl = ord($der[$o++]); $s = substr($der, $o, $sl);
    $fix = static fn(string $x): string => str_pad(ltrim($x, "\x00"), $size, "\x00", STR_PAD_LEFT);
    return $fix($r) . $fix($s);
}

/** Short-lived ES256 token the extensions verify offline with the public key. */
function sign_license_token(string $licenseKey, string $product, array $access, string $installId): array
{
    $pem = str_replace('\n', "\n", (string) cfg('license_private_key', ''));
    $key = $pem !== '' ? openssl_pkey_get_private($pem) : false;
    if (!$key) throw new RuntimeException('License signing key is not configured.');
    $exp = time() + 72 * 3600;
    $h = b64u(json_encode(['alg' => 'ES256', 'typ' => 'JWT']));
    $p = b64u(json_encode(['product' => $product, 'status' => $access['status'], 'trialEndsAt' => $access['trialEndsAt'], 'iid' => $installId, 'sub' => $licenseKey, 'iat' => time(), 'exp' => $exp]));
    if (!openssl_sign("$h.$p", $der, $key, OPENSSL_ALGO_SHA256)) throw new RuntimeException('Signing failed.');
    return ['token' => "$h.$p." . b64u(der_to_raw($der)), 'expiresAt' => $exp * 1000];
}
