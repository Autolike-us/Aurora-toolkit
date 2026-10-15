<?php
// Generates the ES256 key pair that signs license tokens. Run once:   php gen-license-key.php
// 1) Paste the license_private_key line into ~/aurora-config.php (keep it secret).
// 2) Give the PUBLIC_KEY_JWK to each extension:  node scripts/configure-license.cjs --api https://getaurorastudios.com --jwk '<that JSON>'
$key = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
openssl_pkey_export($key, $pem);
$ec = openssl_pkey_get_details($key)['ec'];
$b64u = static fn(string $x): string => rtrim(strtr(base64_encode($x), '+/', '-_'), '=');
echo "license_private_key line for aurora-config.php:\n";
echo "    'license_private_key' => '" . str_replace("\n", '\n', trim($pem)) . "',\n\n";
echo "PUBLIC_KEY_JWK=" . json_encode(['kty' => 'EC', 'crv' => 'P-256', 'x' => $b64u($ec['x']), 'y' => $b64u($ec['y'])]) . "\n";
