<?php
declare(strict_types=1);

/* The Uncle Toussaint "AI Character Playbook" (a one-time PDF). Guest checkout through Stripe: no account needed.
   The SERVER decides the price (so a visitor cannot change it): $9 until playbook_special_ends, then $29.
   A paid order is recorded once (from the signed webhook or from the thank-you page, whichever comes first), the buyer is emailed a private
   download link, and the PDF itself lives outside public_html. */

const PLAYBOOK_PRODUCT = 'playbook';

function playbook_ensure_table(): void
{
    static $done = false;
    if ($done) return;
    q('CREATE TABLE IF NOT EXISTS playbook_orders (ref VARCHAR(120) NOT NULL PRIMARY KEY, email VARCHAR(190) NOT NULL, amount_cents INT NOT NULL, kind VARCHAR(10) NOT NULL, token_hash CHAR(64) NOT NULL UNIQUE, downloads INT NOT NULL DEFAULT 0, expires_at DATETIME NOT NULL, emailed_at DATETIME NULL, created_at DATETIME NOT NULL)');
    $done = true;
}

function playbook_site(): string { return rtrim((string) cfg('playbook_site_url', 'https://toussaint.getaurorastudios.com'), '/'); }

/** Prices in cents. Config keys playbook_special_cents / playbook_regular_cents override the defaults. */
function playbook_cents(string $kind): int { return $kind === 'special' ? (int) cfg('playbook_special_cents', 900) : (int) cfg('playbook_regular_cents', 2900); }

/** 'special' until the launch special ends (UTC), then 'regular'. */
function playbook_kind(?int $now = null): string
{
    $end = strtotime((string) cfg('playbook_special_ends', '2026-11-22T23:59:59Z'));
    return $end !== false && ($now ?? time()) <= $end ? 'special' : 'regular';
}

/** Creates the Stripe Checkout page for the price that applies right now and returns its URL. */
function playbook_checkout_url(): string
{
    $kind = playbook_kind();
    $s = stripe_call('POST', '/v1/checkout/sessions', [
        'mode' => 'payment', 'line_items[0][quantity]' => 1, 'line_items[0][price_data][currency]' => 'usd',
        'line_items[0][price_data][unit_amount]' => playbook_cents($kind),
        'line_items[0][price_data][product_data][name]' => 'The AI Character Playbook (Uncle Toussaint)',
        'line_items[0][price_data][product_data][description]' => 'PDF playbook: how Uncle Toussaint was designed, prompted, posted and tracked.',
        'allow_promotion_codes' => 'true',
        'metadata[product]' => PLAYBOOK_PRODUCT, 'metadata[kind]' => $kind,
        'success_url' => playbook_site() . '/thanks.html?cs={CHECKOUT_SESSION_ID}', 'cancel_url' => playbook_site() . '/#buy',
    ]);
    if (empty($s['url'])) throw new RuntimeException('Stripe returned no checkout URL.');
    return $s['url'];
}

/** The private download token for an order. It is derived from the order with a server secret, so nothing readable is stored and the
 *  thank-you page can show the same link again. Only its hash is kept in the database. */
function playbook_token(string $ref): string
{
    $secret = (string) cfg('playbook_secret', '') ?: ((string) cfg('stripe_webhook_secret', '') . (string) cfg('stripe_secret', ''));
    if ($secret === '') throw new RuntimeException('Playbook download secret is not configured.');
    return substr(hash_hmac('sha256', 'playbook-download|' . $ref, $secret), 0, 48);
}
function playbook_download_url(string $ref): string { return site_url() . '/api/playbook/download?t=' . playbook_token($ref); }

/** Records a paid Checkout Session once and emails the download link. Returns null if the session is not a paid playbook order. */
function playbook_fulfil(array $c): ?array
{
    if (($c['mode'] ?? '') !== 'payment' || ($c['payment_status'] ?? '') !== 'paid' || ($c['metadata']['product'] ?? '') !== PLAYBOOK_PRODUCT) return null;
    $kind = ($c['metadata']['kind'] ?? '') === 'special' ? 'special' : 'regular';
    $amount = (int) ($c['amount_total'] ?? -1);
    if ($amount !== playbook_cents($kind) && empty($c['total_details']['amount_discount'])) return null; // a promo code may lower it; anything else must match the price
    $email = strtolower(trim((string) ($c['customer_details']['email'] ?? ($c['customer_email'] ?? ''))));
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || empty($c['id'])) return null;
    playbook_ensure_table();
    $ref = 'stripe:' . (string) $c['id'];
    $token = playbook_token($ref);
    $new = false;
    try {
        q('INSERT INTO playbook_orders (ref, email, amount_cents, kind, token_hash, expires_at, created_at) VALUES (?,?,?,?,?,?,?)', [$ref, $email, max(0, $amount), $kind, hash('sha256', $token), gmdate('Y-m-d H:i:s', time() + 90 * 86400), now()]);
        $new = true;
    } catch (Throwable $e) { /* already recorded: a repeated webhook or a reloaded page */ }
    if ($new) {
        $ok = send_mail($email, 'Your AI Character Playbook', "Thank you for your order!\n\nDownload your playbook here (private link, please don't share it):\n" . playbook_download_url($ref) . "\n\nThe link works for 90 days. If you have any trouble, email " . (string) cfg('playbook_support', 'support@getaurorastudios.com') . ".\n\n- Uncle Toussaint Playbook");
        if ($ok) q('UPDATE playbook_orders SET emailed_at = ? WHERE ref = ?', [now(), $ref]);
    }
    return ['ref' => $ref, 'email' => $email, 'new' => $new, 'url' => playbook_download_url($ref), 'amount' => max(0, $amount) / 100, 'kind' => $kind];
}
