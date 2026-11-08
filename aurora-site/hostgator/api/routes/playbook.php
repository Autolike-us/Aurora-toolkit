<?php
declare(strict_types=1);

/** The "Buy" button on the playbook site points here. Redirects the visitor to Stripe's payment page for the current price. */
function route_playbook_buy(): void
{
    rate_limit('playbook-buy:' . client_ip(), 40, 3600);
    try {
        $url = playbook_checkout_url();
    } catch (Throwable $e) {
        error_log('aurora playbook checkout: ' . $e->getMessage());
        $url = playbook_site() . '/?checkout=error#buy';
    }
    header('Location: ' . $url, true, 303);
    exit;
}

/** The thank-you page asks: did this Checkout Session get paid? If so, it gets the download link (and the order is recorded if the webhook has not yet). */
function route_playbook_order(): void
{
    header('Access-Control-Allow-Origin: ' . playbook_site());
    header('Vary: Origin');
    $cs = (string) ($_GET['cs'] ?? '');
    if (!preg_match('/^cs_(test|live)_[A-Za-z0-9]{10,200}$/', $cs)) fail('That does not look like a checkout session.');
    rate_limit('playbook-order:' . client_ip(), 60, 3600);
    try {
        $c = stripe_call('GET', '/v1/checkout/sessions/' . rawurlencode($cs));
    } catch (Throwable $e) {
        error_log('aurora playbook order: ' . $e->getMessage());
        fail('Could not confirm the payment yet. Please refresh in a moment.', 502);
    }
    if (($c['metadata']['product'] ?? '') !== PLAYBOOK_PRODUCT) fail('That is not a playbook order.', 404);
    $o = playbook_fulfil($c);
    if (!$o) json_out(['ok' => true, 'status' => 'PENDING']);
    json_out(['ok' => true, 'status' => 'PAID', 'email' => $o['email'], 'downloadUrl' => $o['url'], 'orderId' => (string) $c['id'], 'amountUsd' => $o['amount'], 'kind' => $o['kind']]);
}

/** Streams the PDF for a valid private link. The file lives outside public_html. */
function route_playbook_download(): void
{
    $t = (string) ($_GET['t'] ?? '');
    rate_limit('playbook-dl:' . client_ip(), 60, 3600);
    if (!preg_match('/^[a-f0-9]{48}$/', $t)) fail('This download link is not valid.', 404);
    playbook_ensure_table();
    $o = q_one('SELECT * FROM playbook_orders WHERE token_hash = ?', [hash('sha256', $t)]);
    if (!$o) fail('This download link is not valid.', 404);
    if (ts($o['expires_at']) < time()) fail('This download link has expired. Please email support and we will send a new one.', 410);
    if ((int) $o['downloads'] >= (int) cfg('playbook_max_downloads', 10)) fail('This link has reached its download limit. Please email support and we will help.', 429);
    $file = (string) cfg('playbook_file', rtrim((string) cfg('releases_dir', dirname(__DIR__, 3) . '/aurora-releases'), '/') . '/uncle-toussaint-playbook.pdf');
    if (!is_file($file)) fail('The playbook is not available yet. Please email support.', 404);
    q('UPDATE playbook_orders SET downloads = downloads + 1 WHERE ref = ?', [$o['ref']]);
    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="The-AI-Character-Playbook.pdf"');
    header('Content-Length: ' . filesize($file));
    header('Cache-Control: private, no-store');
    http_response_code(200);
    readfile($file);
    exit;
}
