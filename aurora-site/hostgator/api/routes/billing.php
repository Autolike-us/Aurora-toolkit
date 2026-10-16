<?php
declare(strict_types=1);

/** Which payment methods are switched on, so the website only offers the ones that work. */
function route_providers(): void
{
    $has = static fn(string $k): bool => (string) cfg($k, '') !== '';
    json_out(['ok' => true, 'stripe' => $has('stripe_secret') && $has('stripe_price_bundle'), 'paypal' => $has('paypal_client_id') && $has('paypal_client_secret') && $has('paypal_plan_bundle')]);
}

/** After the payment page sends the customer back, ask the provider for the subscription right away instead of waiting for the webhook. */
function route_billing_sync(): void
{
    $user = require_user();
    $b = body();
    $sess = (string) ($b['sessionId'] ?? ''); $id = (string) ($b['subscriptionId'] ?? '');
    rate_limit('billing-sync:' . $user['id'], 40, 3600);
    try {
        if ($sess !== '') {
            if (!preg_match('/^cs_(test|live)_[A-Za-z0-9]{10,200}$/', $sess)) fail('That does not look like a checkout session.');
            $c = stripe_call('GET', '/v1/checkout/sessions/' . rawurlencode($sess));
            if (($c['client_reference_id'] ?? '') !== $user['id']) fail('That checkout belongs to another account.', 403);
            if (empty($c['subscription'])) json_out(['ok' => true, 'status' => 'PENDING']);
            $s = stripe_call('GET', '/v1/subscriptions/' . rawurlencode((string) $c['subscription']));
            stripe_sync_subscription($s);
            json_out(['ok' => true, 'status' => ($s['status'] ?? '') === 'active' ? 'ACTIVE' : strtoupper((string) ($s['status'] ?? ''))]);
        }
        if (!preg_match('/^I-[A-Za-z0-9]{6,40}$/', $id)) fail('Nothing to confirm.');
        $s = paypal_call('GET', '/v1/billing/subscriptions/' . rawurlencode($id));
        if (explode('|', (string) ($s['custom_id'] ?? ''))[0] !== $user['id']) fail('That subscription belongs to another account.', 403);
        paypal_sync_subscription($id);
        json_out(['ok' => true, 'status' => (string) ($s['status'] ?? '')]);
    } catch (Throwable $e) {
        error_log('aurora billing sync: ' . $e->getMessage());
        fail('Could not confirm the payment yet. It will appear shortly.', 502);
    }
}

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
        $p = ['customer' => $row['provider_customer_id'], 'return_url' => site_url() . '/account/'];
        if ((string) cfg('stripe_portal_config', '') !== '') $p['configuration'] = (string) cfg('stripe_portal_config');
        $s = stripe_call('POST', '/v1/billing_portal/sessions', $p);
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
