<?php
declare(strict_types=1);

function paypal_base(): string { return cfg('paypal_env') === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'; }

function paypal_call(string $method, string $path, ?array $json = null): array
{
    static $token = null;
    if ($token === null) {
        $id = (string) cfg('paypal_client_id', ''); $sec = (string) cfg('paypal_client_secret', '');
        if ($id === '' || $sec === '') throw new RuntimeException('PayPal is not configured.');
        $r = http_json('POST', paypal_base() . '/v1/oauth2/token', ['Authorization: Basic ' . base64_encode("$id:$sec"), 'Content-Type: application/x-www-form-urlencoded'], 'grant_type=client_credentials');
        $token = $r['json']['access_token'] ?? null;
        if (!$token) throw new RuntimeException('PayPal sign-in failed.');
    }
    $r = http_json($method, paypal_base() . $path, ['Authorization: Bearer ' . $token, 'Content-Type: application/json'], $json === null ? null : json_encode($json));
    if ($r['status'] >= 400) throw new RuntimeException('PayPal ' . $path . ' failed (' . $r['status'] . ').');
    return $r['json'];
}

function paypal_plan_id(string $plan, bool $launch): string
{
    $map = ['bundle' => $launch ? 'paypal_plan_bundle_launch' : 'paypal_plan_bundle', 'facebook' => 'paypal_plan_facebook', 'instagram' => 'paypal_plan_instagram', 'tiktok' => 'paypal_plan_tiktok'];
    $id = (string) cfg($map[$plan] ?? '', '');
    if ($id === '') throw new RuntimeException('Missing config ' . ($map[$plan] ?? $plan));
    return $id;
}

function paypal_checkout_url(array $user, string $plan): string
{
    $launch = $plan === 'bundle' && offer_active();
    $s = paypal_call('POST', '/v1/billing/subscriptions', [
        'plan_id' => paypal_plan_id($plan, $launch), 'custom_id' => $user['id'] . '|' . $plan . '|' . ($launch ? 'true' : 'false'),
        'application_context' => ['brand_name' => 'Aurora', 'user_action' => 'SUBSCRIBE_NOW', 'return_url' => site_url() . '/account/?checkout=success', 'cancel_url' => site_url() . '/pricing/?checkout=cancelled'],
    ]);
    foreach ($s['links'] ?? [] as $l) if (($l['rel'] ?? '') === 'approve') return $l['href'];
    throw new RuntimeException('PayPal returned no approval link.');
}

function paypal_verify_webhook(string $raw): bool
{
    $h = static fn(string $k): string => (string) ($_SERVER['HTTP_' . strtoupper(str_replace('-', '_', $k))] ?? '');
    try {
        $r = paypal_call('POST', '/v1/notifications/verify-webhook-signature', [
            'auth_algo' => $h('paypal-auth-algo'), 'cert_url' => $h('paypal-cert-url'), 'transmission_id' => $h('paypal-transmission-id'),
            'transmission_sig' => $h('paypal-transmission-sig'), 'transmission_time' => $h('paypal-transmission-time'),
            'webhook_id' => (string) cfg('paypal_webhook_id', ''), 'webhook_event' => json_decode($raw, true),
        ]);
        return ($r['verification_status'] ?? '') === 'SUCCESS';
    } catch (Throwable $e) { return false; }
}

/** Reads the subscription from PayPal (never trusts the webhook body for state) and mirrors it. */
function paypal_sync_subscription(string $subId): void
{
    $s = paypal_call('GET', '/v1/billing/subscriptions/' . rawurlencode($subId));
    [$userId, $plan, $launch] = array_pad(explode('|', (string) ($s['custom_id'] ?? '')), 3, '');
    if ($userId === '' || !plan_products($plan)) return;
    $map = ['ACTIVE' => 'active', 'APPROVAL_PENDING' => 'incomplete', 'APPROVED' => 'incomplete', 'SUSPENDED' => 'suspended', 'CANCELLED' => 'canceled', 'EXPIRED' => 'canceled'];
    $next = $s['billing_info']['next_billing_time'] ?? ($s['status_update_time'] ?? null);
    upsert_subscription('paypal', (string) $s['id'], (string) ($s['subscriber']['payer_id'] ?? ''), $userId, $plan, $map[$s['status'] ?? ''] ?? 'incomplete', $next ? gmdate('Y-m-d H:i:s', strtotime($next)) : null, $launch === 'true', false);
}
