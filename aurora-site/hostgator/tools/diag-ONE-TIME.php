<?php
// ONE-TIME CHECK. Upload to public_html/api/, open https://getaurorastudios.com/api/diag-ONE-TIME.php, then DELETE this file.
declare(strict_types=1);
header('Content-Type: text/plain; charset=utf-8');
ini_set('display_errors', '0');
require __DIR__ . '/lib/bootstrap.php';
foreach (['pricing', 'entitlements', 'token', 'auth', 'mail'] as $f) require __DIR__ . "/lib/$f.php";

function line(string $label, bool $ok, string $detail = ''): void { echo ($ok ? '[ OK ] ' : '[FAIL] ') . $label . ($detail !== '' ? " — $detail" : '') . "\n"; }

echo "Aurora server check\n===================\n";
line('PHP version 7.4 or newer', version_compare(PHP_VERSION, '7.4.0', '>='), PHP_VERSION);
foreach (['pdo_mysql', 'openssl', 'curl', 'mbstring', 'json'] as $ext) line("PHP extension $ext", extension_loaded($ext));

$path = getenv('AURORA_CONFIG') ?: dirname(__DIR__, 2) . '/aurora-config.php'; // api -> public_html -> home
line('config file found', is_file($path), $path);
line('config file is readable', is_readable($path));
if (!is_file($path)) {
    echo "\nThe API looks for aurora-config.php in this exact folder: " . dirname($path) . "\n(that folder must CONTAIN public_html; on your account it should be /home2/widchyjo). Move the file there, or tell me this path if it is different from where you put it.\n";
    exit;
}
line('db_dsn set', (string) cfg('db_dsn', '') !== '');
line('db_user set', (string) cfg('db_user', '') !== '');
line('db_pass set', (string) cfg('db_pass', '') !== '');
line('site_url set', cfg('site_url') !== null, (string) cfg('site_url'));

try {
    $n = (int) q_one('SELECT COUNT(*) AS c FROM users')['c'];
    line('database login works and the users table exists', true, "$n users");
    foreach (['sessions', 'email_tokens', 'licenses', 'subscriptions', 'activations', 'webhook_events', 'rate_limits'] as $t) { try { q("SELECT 1 FROM $t LIMIT 1"); line("table $t", true); } catch (Throwable $e) { line("table $t", false, $e->getMessage()); } }
} catch (Throwable $e) {
    line('database login works and the users table exists', false, $e->getMessage());
}

$pem = str_replace('\n', "\n", (string) cfg('license_private_key', ''));
$key = $pem !== '' ? @openssl_pkey_get_private($pem) : false;
line('license signing key is valid', (bool) $key, $pem === '' ? 'license_private_key is empty' : '');
line('mail() function available', function_exists('mail'));
line('releases folder exists', is_dir((string) cfg('releases_dir', dirname(__DIR__, 2) . '/aurora-releases')), (string) cfg('releases_dir', dirname(__DIR__, 2) . '/aurora-releases'));
echo "\nDone. Delete diag-ONE-TIME.php now.\n";
