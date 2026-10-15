<?php
declare(strict_types=1);

function route_checkout(): void
{
    $user = require_user();
    $b = body();
    $plan = (string) ($b['plan'] ?? ''); $provider = (string) ($b['provider'] ?? '');
    if (!in_array($plan, PLANS, true) || !in_array($provider, ['stripe', 'paypal'], true)) fail('Choose a plan and a payment method.');
    rate_limit('checkout:' . $user['id'], 20, 3600);
    try {
        ensure_license($user['id']);
        $url = $provider === 'stripe' ? stripe_checkout_url($user, $plan) : paypal_checkout_url($user, $plan);
        json_out(['ok' => true, 'url' => $url]);
    } catch (Throwable $e) {
        error_log('aurora checkout: ' . $e->getMessage());
        fail('Checkout is temporarily unavailable. Please try again in a moment.', 502);
    }
}

function route_portal(): void
{
    $user = require_user();
    $row = q_one("SELECT provider_customer_id FROM subscriptions WHERE user_id = ? AND provider = 'stripe' AND provider_customer_id IS NOT NULL ORDER BY updated_at DESC", [$user['id']]);
    if (!$row) fail('No card subscription found for this account.', 404);
    try {
        $s = stripe_call('POST', '/v1/billing_portal/sessions', ['customer' => $row['provider_customer_id'], 'return_url' => site_url() . '/account/']);
        json_out(['ok' => true, 'url' => $s['url']]);
    } catch (Throwable $e) { error_log('aurora portal: ' . $e->getMessage()); fail('Could not open billing right now.', 502); }
}

function route_cancel(): void
{
    $user = require_user();
    $row = q_one("SELECT provider_sub_id FROM subscriptions WHERE user_id = ? AND provider = 'paypal' AND status = 'active'", [$user['id']]);
    if (!$row) fail('No active PayPal subscription found.', 404);
    try {
        paypal_call('POST', '/v1/billing/subscriptions/' . rawurlencode($row['provider_sub_id']) . '/cancel', ['reason' => 'Cancelled by customer']);
        paypal_sync_subscription($row['provider_sub_id']);
        json_out(['ok' => true]);
    } catch (Throwable $e) { error_log('aurora cancel: ' . $e->getMessage()); fail('Could not cancel right now.', 502); }
}
