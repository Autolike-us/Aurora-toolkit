<?php
declare(strict_types=1);

require __DIR__ . '/lib/bootstrap.php';
foreach (['pricing', 'entitlements', 'token', 'auth', 'mail', 'stripe', 'paypal', 'reply'] as $f) require __DIR__ . "/lib/$f.php";
foreach (['auth', 'account', 'billing', 'webhooks', 'license', 'download', 'reply'] as $f) require __DIR__ . "/routes/$f.php";

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');

set_exception_handler(static function (Throwable $e): void {
    error_log('aurora error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Something went wrong. Please try again.']);
});

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = '/' . trim((string) preg_replace('#^.*?/api/#', '', (string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) . '/', 1), '/');
$path = rtrim($path, '/');

if ($method === 'OPTIONS') {
    if ($path === '/license/verify' || $path === '/reply/draft' || $path === '/reply/status' || $path === '/reply/sync' || $path === '/reply/admin') { header('Access-Control-Allow-Origin: *'); header('Access-Control-Allow-Methods: POST, OPTIONS'); header('Access-Control-Allow-Headers: Content-Type'); }
    http_response_code(204);
    exit;
}

$routes = [
    'POST /auth/signup' => 'route_signup', 'POST /auth/verify' => 'route_verify', 'POST /auth/login' => 'route_login',
    'POST /auth/logout' => 'route_logout', 'POST /auth/forgot' => 'route_forgot', 'POST /auth/reset' => 'route_reset',
    'GET /me' => 'route_me', 'POST /trial' => 'route_trial',
    'GET /billing/providers' => 'route_providers', 'POST /checkout' => 'route_checkout', 'POST /billing/sync' => 'route_billing_sync', 'POST /billing/portal' => 'route_portal', 'POST /billing/cancel' => 'route_cancel',
    'POST /webhooks/stripe' => 'route_webhook_stripe', 'POST /webhooks/paypal' => 'route_webhook_paypal',
    'POST /license/verify' => 'route_license_verify', 'GET /download' => 'route_download',
    'POST /reply/draft' => 'route_reply_draft', 'POST /reply/status' => 'route_reply_status', 'POST /reply/sync' => 'route_reply_sync', 'POST /reply/admin' => 'route_reply_admin', 'GET /reply/plans' => 'route_reply_plans', 'GET /reply/account' => 'route_reply_account', 'POST /checkout/pack' => 'route_checkout_pack',
];
$handler = $routes["$method $path"] ?? null;
if (!$handler) { http_response_code(404); echo json_encode(['ok' => false, 'error' => 'Not found.']); exit; }
$handler();
