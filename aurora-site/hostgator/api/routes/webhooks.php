<?php
declare(strict_types=1);

function seen_event(string $id): bool { return q_one('SELECT id FROM webhook_events WHERE id = ?', [$id]) !== null; }
function mark_event(string $id, string $provider): void { q('INSERT INTO webhook_events (id, provider, received_at) VALUES (?, ?, ?)', [$id, $provider, now()]); }

function route_webhook_stripe(): void
{
    $raw = raw_body();
    if (!stripe_verify_signature($raw, (string) ($_SERVER['HTTP_STRIPE_SIGNATURE'] ?? ''), (string) cfg('stripe_webhook_secret', ''))) fail('Invalid signature.', 400);
    $event = json_decode($raw, true);
    if (!is_array($event) || empty($event['id'])) fail('Bad event.', 400);
    if (seen_event($event['id'])) json_out(['ok' => true, 'duplicate' => true]);
    try {
        $type = (string) ($event['type'] ?? ''); $obj = $event['data']['object'] ?? [];
        if ($type === 'checkout.session.completed' && !empty($obj['subscription'])) stripe_sync_subscription(stripe_call('GET', '/v1/subscriptions/' . rawurlencode($obj['subscription'])));
        elseif (strpos($type, 'customer.subscription.') === 0) stripe_sync_subscription($obj);
        mark_event($event['id'], 'stripe');
        json_out(['ok' => true]);
    } catch (Throwable $e) { error_log('aurora stripe webhook: ' . $e->getMessage()); fail('Webhook handling failed.', 500); }
}

function route_webhook_paypal(): void
{
    $raw = raw_body();
    if (!paypal_verify_webhook($raw)) fail('Invalid signature.', 400);
    $event = json_decode($raw, true);
    if (!is_array($event) || empty($event['id'])) fail('Bad event.', 400);
    if (seen_event($event['id'])) json_out(['ok' => true, 'duplicate' => true]);
    try {
        $type = (string) ($event['event_type'] ?? '');
        $subId = strpos($type, 'BILLING.SUBSCRIPTION.') === 0 ? ($event['resource']['id'] ?? '') : ($event['resource']['billing_agreement_id'] ?? '');
        if ($subId) paypal_sync_subscription((string) $subId);
        mark_event($event['id'], 'paypal');
        json_out(['ok' => true]);
    } catch (Throwable $e) { error_log('aurora paypal webhook: ' . $e->getMessage()); fail('Webhook handling failed.', 500); }
}
