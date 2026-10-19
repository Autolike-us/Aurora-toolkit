<?php
declare(strict_types=1);

function paypal_base(): string { if ((string) cfg('paypal_api_base', '') !== '') return rtrim((string) cfg('paypal_api_base'), '/'); return cfg('paypal_env') === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'; }

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
    $map = ['bundle' => $launch ? 'paypal_plan_bundle_launch' : 'paypal_plan_bundle', 'facebook' => 'paypal_plan_facebook', 'instagram' => 'paypal_plan_instagram', 'tiktok' => 'paypal_plan_tiktok', 'reply' => 'paypal_plan_reply', 'reply_pro' => 'paypal_plan_reply_pro'];
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

/** One-time purchase of a reply pack: creates an order the customer approves on PayPal. The amount always comes from the server's catalog. */
function paypal_pack_checkout_url(array $user, string $packId): string
{
    $pack = reply_catalog()['packs'][$packId] ?? null;
    if (!$pack) throw new RuntimeException('Unknown pack.');
    $o = paypal_call('POST', '/v2/checkout/orders', [
        'intent' => 'CAPTURE',
        'purchase_units' => [['reference_id' => $packId, 'custom_id' => $user['id'] . '|' . $packId, 'description' => 'Aurora Reply - ' . $pack['name'], 'amount' => ['currency_code' => 'USD', 'value' => number_format((float) $pack['usd'], 2, '.', '')]]],
        'payment_source' => ['paypal' => ['experience_context' => ['brand_name' => 'Aurora', 'user_action' => 'PAY_NOW', 'shipping_preference' => 'NO_SHIPPING',
            'return_url' => site_url() . '/account/?checkout=success&pack=1', 'cancel_url' => site_url() . '/reply/?checkout=cancelled#plans']]],
    ]);
    foreach ($o['links'] ?? [] as $l) if (in_array($l['rel'] ?? '', ['payer-action', 'approve'], true)) return $l['href'];
    throw new RuntimeException('PayPal returned no approval link.');
}

/** After the customer approves, capture the payment (only if it is for this user and the right amount) and add the pack. Safe to call twice. */
function paypal_confirm_pack_order(array $user, string $orderId): string
{
    $o = paypal_call('GET', '/v2/checkout/orders/' . rawurlencode($orderId));
    $pu = $o['purchase_units'][0] ?? [];
    [$uid, $packId] = array_pad(explode('|', (string) ($pu['custom_id'] ?? '')), 2, '');
    if ($uid !== $user['id']) throw new RuntimeException('That order belongs to another account.');
    $pack = reply_catalog()['packs'][$packId] ?? null;
    if (!$pack) throw new RuntimeException('Unknown pack in order.');
    if (($pu['amount']['currency_code'] ?? '') !== 'USD' || abs((float) ($pu['amount']['value'] ?? 0) - (float) $pack['usd']) > 0.001) throw new RuntimeException('Order amount does not match.');
    if (($o['status'] ?? '') === 'APPROVED') $o = paypal_call('POST', '/v2/checkout/orders/' . rawurlencode($orderId) . '/capture', null);
    if (($o['status'] ?? '') !== 'COMPLETED') return strtoupper((string) ($o['status'] ?? 'PENDING'));
    reply_grant_order('paypal:' . $orderId, $uid, 'paypal', $packId);
    return 'PACK';
}
