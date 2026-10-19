<?php
declare(strict_types=1);

function stripe_call(string $method, string $path, array $params = []): array
{
    $key = (string) cfg('stripe_secret', '');
    if ($key === '') throw new RuntimeException('Stripe is not configured.');
    $r = http_json($method, rtrim((string) cfg('stripe_api_base', 'https://api.stripe.com'), '/') . $path, ['Authorization: Bearer ' . $key, 'Content-Type: application/x-www-form-urlencoded'], $params ? http_build_query($params) : null);
    if ($r['status'] >= 400) throw new RuntimeException('Stripe error ' . $r['status'] . ': ' . ($r['json']['error']['message'] ?? ''));
    return $r['json'];
}

function stripe_price_id(string $plan, bool $launch): string
{
    $map = ['bundle' => $launch ? 'stripe_price_bundle_launch' : 'stripe_price_bundle', 'facebook' => 'stripe_price_facebook', 'instagram' => 'stripe_price_instagram', 'tiktok' => 'stripe_price_tiktok', 'reply' => 'stripe_price_reply', 'reply_pro' => 'stripe_price_reply_pro'];
    $id = (string) cfg($map[$plan] ?? '', '');
    if ($id === '') throw new RuntimeException('Missing config ' . ($map[$plan] ?? $plan));
    return $id;
}

function stripe_checkout_url(array $user, string $plan): string
{
    $launch = $plan === 'bundle' && offer_active();
    $s = stripe_call('POST', '/v1/checkout/sessions', [
        'mode' => 'subscription', 'line_items[0][price]' => stripe_price_id($plan, $launch), 'line_items[0][quantity]' => 1,
        'customer_email' => $user['email'], 'client_reference_id' => $user['id'], 'allow_promotion_codes' => 'true',
        'success_url' => site_url() . '/account/?checkout=success&cs={CHECKOUT_SESSION_ID}', 'cancel_url' => site_url() . '/pricing/?checkout=cancelled',
        'subscription_data[metadata][user_id]' => $user['id'], 'subscription_data[metadata][plan]' => $plan, 'subscription_data[metadata][launch]' => $launch ? 'true' : 'false',
    ]);
    if (empty($s['url'])) throw new RuntimeException('Stripe returned no checkout URL.');
    return $s['url'];
}

/** Verifies the Stripe-Signature header (HMAC-SHA256 of "t.payload", 5-minute tolerance). */
function stripe_verify_signature(string $payload, string $header, string $secret, ?int $now = null): bool
{
    $now = $now ?? time();
    $t = null; $sigs = [];
    foreach (explode(',', $header) as $part) {
        [$k, $v] = array_pad(explode('=', trim($part), 2), 2, '');
        if ($k === 't') $t = (int) $v; elseif ($k === 'v1') $sigs[] = $v;
    }
    if (!$t || !$sigs || abs($now - $t) > 300 || $secret === '') return false;
    $expected = hash_hmac('sha256', $t . '.' . $payload, $secret);
    foreach ($sigs as $s) if (hash_equals($expected, $s)) return true;
    return false;
}

function stripe_sync_subscription(array $sub): void
{
    $meta = $sub['metadata'] ?? [];
    $userId = $meta['user_id'] ?? ''; $plan = $meta['plan'] ?? '';
    if ($userId === '' || !plan_products($plan)) return;
    $end = $sub['current_period_end'] ?? ($sub['items']['data'][0]['current_period_end'] ?? null);
    upsert_subscription('stripe', (string) $sub['id'], (string) ($sub['customer'] ?? ''), $userId, $plan, (string) $sub['status'], $end ? gmdate('Y-m-d H:i:s', (int) $end) : null, ($meta['launch'] ?? '') === 'true', !empty($sub['cancel_at_period_end']));
}

/** Insert or update a subscription row, keyed by (provider, provider_sub_id). */
function upsert_subscription(string $provider, string $subId, string $customer, string $userId, string $plan, string $status, ?string $periodEnd, bool $launch, bool $cancelAtEnd): void
{
    $row = q_one('SELECT id FROM subscriptions WHERE provider = ? AND provider_sub_id = ?', [$provider, $subId]);
    if ($row) q('UPDATE subscriptions SET provider_customer_id = ?, user_id = ?, plan = ?, status = ?, current_period_end = ?, launch_price = ?, cancel_at_period_end = ?, updated_at = ? WHERE id = ?', [$customer ?: null, $userId, $plan, $status, $periodEnd, $launch ? 1 : 0, $cancelAtEnd ? 1 : 0, now(), $row['id']]);
    else q('INSERT INTO subscriptions (id, user_id, provider, provider_sub_id, provider_customer_id, plan, status, current_period_end, launch_price, cancel_at_period_end, updated_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', [uid(), $userId, $provider, $subId, $customer ?: null, $plan, $status, $periodEnd, $launch ? 1 : 0, $cancelAtEnd ? 1 : 0, now(), now()]);
}

/** One-time purchase of a reply pack through Stripe Checkout (the price is built from the server's catalog, no Stripe price ID needed). */
function stripe_pack_checkout_url(array $user, string $packId): string
{
    $pack = reply_catalog()['packs'][$packId] ?? null;
    if (!$pack) throw new RuntimeException('Unknown pack.');
    $s = stripe_call('POST', '/v1/checkout/sessions', [
        'mode' => 'payment', 'line_items[0][quantity]' => 1, 'line_items[0][price_data][currency]' => 'usd', 'line_items[0][price_data][unit_amount]' => reply_cents((float) $pack['usd']),
        'line_items[0][price_data][product_data][name]' => 'Aurora Reply - ' . $pack['name'],
        'customer_email' => $user['email'], 'client_reference_id' => $user['id'], 'allow_promotion_codes' => 'true',
        'metadata[user_id]' => $user['id'], 'metadata[pack]' => $packId,
        'success_url' => site_url() . '/account/?checkout=success&pack=1&cs={CHECKOUT_SESSION_ID}', 'cancel_url' => site_url() . '/reply/?checkout=cancelled#plans',
    ]);
    if (empty($s['url'])) throw new RuntimeException('Stripe returned no checkout URL.');
    return $s['url'];
}

/** Adds the pack for a paid one-time Checkout Session (from a signed webhook or a session fetched from Stripe). Returns true when a pack was granted or already had been. */
function stripe_grant_pack_session(array $c): bool
{
    if (($c['mode'] ?? '') !== 'payment' || ($c['payment_status'] ?? '') !== 'paid') return false;
    $uid = (string) ($c['metadata']['user_id'] ?? ($c['client_reference_id'] ?? '')); $packId = (string) ($c['metadata']['pack'] ?? '');
    $pack = reply_catalog()['packs'][$packId] ?? null;
    if ($uid === '' || !$pack) return false;
    if ((int) ($c['amount_total'] ?? -1) !== reply_cents((float) $pack['usd']) && empty($c['total_details']['amount_discount'])) return false; // a discount code may lower the amount; anything else must match
    reply_grant_order('stripe:' . (string) $c['id'], $uid, 'stripe', $packId);
    return true;
}
