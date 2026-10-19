<?php
// ONE-TIME, READ-ONLY CHECK. Upload to public_html/api/, open https://getaurorastudios.com/api/payments-check-ONE-TIME.php, then DELETE it.
// Verifies that PayPal and Stripe are really configured for LIVE payments: modes, plan/price IDs exist in the right mode, amounts are right,
// webhooks point at this site and listen for the right events. It changes nothing and never prints keys, secrets or webhook secrets.
declare(strict_types=1);
header('Content-Type: text/plain; charset=utf-8');
ini_set('display_errors', '0');
require __DIR__ . '/lib/bootstrap.php';
foreach (['paypal', 'stripe', 'pricing'] as $f) require __DIR__ . "/lib/$f.php";

$bad = 0;
function line(string $label, bool $ok, string $detail = ''): void { global $bad; if (!$ok) $bad++; echo ($ok ? '[ OK ] ' : '[FAIL] ') . $label . ($detail !== '' ? " — $detail" : '') . "\n"; }
function note(string $s): void { echo "[ i  ] $s\n"; }

$site = rtrim((string) cfg('site_url', ''), '/');
echo "Aurora payments go-live check\n=============================\n";
line('site_url is https and is your real domain', strpos($site, 'https://') === 0 && strpos($site, 'localhost') === false && strpos($site, 'preview') === false, $site);

// ---------- PayPal ----------
echo "\nPayPal\n------\n";
$env = (string) cfg('paypal_env', 'sandbox');
line('paypal_env is "live"', $env === 'live', "currently \"$env\"");
$expect = ['paypal_plan_bundle_launch' => '10.00', 'paypal_plan_bundle' => '20.00', 'paypal_plan_facebook' => '10.00', 'paypal_plan_instagram' => '10.00', 'paypal_plan_tiktok' => '10.00'];
foreach (reply_catalog()['subs'] as $rid => $rx) $expect['paypal_plan_' . $rid] = number_format((float) $rx['usd'], 2, '.', ''); // Aurora Reply plans
if ((string) cfg('paypal_client_id', '') === '' || (string) cfg('paypal_client_secret', '') === '') {
    line('PayPal client ID and secret are set', false, 'missing in aurora-config.php');
} else {
    try {
        paypal_call('GET', '/v1/billing/plans?page_size=1&total_required=false');
        line('PayPal accepts your client ID + secret for this environment', true);
        foreach ($expect as $key => $price) {
            $id = (string) cfg($key, '');
            if ($id === '') { line("$key is set", false, 'empty — run paypal-setup-ONE-TIME.php?live=1'); continue; }
            try {
                $p = paypal_call('GET', '/v1/billing/plans/' . rawurlencode($id));
                $val = $p['billing_cycles'][0]['pricing_scheme']['fixed_price']['value'] ?? '?';
                $ok = ($p['status'] ?? '') === 'ACTIVE' && abs((float) $val - (float) $price) < 0.001 && ($p['billing_cycles'][0]['frequency']['interval_unit'] ?? '') === 'MONTH';
                line("$key exists in this environment, ACTIVE, monthly, \$$price", $ok, 'found: status ' . ($p['status'] ?? '?') . ", \$$val");
            } catch (Throwable $e) { line("$key exists in this environment", false, 'not found — probably a SANDBOX plan ID left in a live config'); }
        }
        $wid = (string) cfg('paypal_webhook_id', '');
        if ($wid === '') line('paypal_webhook_id is set', false, 'create the webhook in the PayPal developer dashboard (live) and paste its ID');
        else {
            try {
                $w = paypal_call('GET', '/v1/notifications/webhooks/' . rawurlencode($wid));
                line('PayPal webhook URL is this site', ($w['url'] ?? '') === $site . '/api/webhooks/paypal', (string) ($w['url'] ?? '?'));
                $types = array_map(fn($e) => $e['name'] ?? '', $w['event_types'] ?? []);
                $all = in_array('*', $types, true);
                foreach (['BILLING.SUBSCRIPTION.ACTIVATED', 'BILLING.SUBSCRIPTION.CANCELLED', 'BILLING.SUBSCRIPTION.SUSPENDED', 'BILLING.SUBSCRIPTION.EXPIRED', 'BILLING.SUBSCRIPTION.PAYMENT.FAILED', 'PAYMENT.SALE.COMPLETED'] as $ev)
                    line("PayPal webhook listens for $ev", $all || in_array($ev, $types, true));
            } catch (Throwable $e) { line('PayPal webhook ID exists in this environment', false, 'not found — is it a sandbox webhook ID?'); }
        }
    } catch (Throwable $e) { line('PayPal accepts your client ID + secret for this environment', false, $e->getMessage() . ' (live keys for live, sandbox keys for sandbox)'); }
}

// ---------- Stripe ----------
echo "\nStripe\n------\n";
$sk = (string) cfg('stripe_secret', '');
line('stripe_secret is a LIVE key (sk_live_… or rk_live_…)', ($isLive = preg_match('/^(sk|rk)_live_/', $sk) === 1), $isLive ? '' : ($sk === '' ? 'empty' : (strpos($sk, '_test_') !== false ? 'it is a TEST key' : 'unrecognised key')));
$sexpect = ['stripe_price_bundle_launch' => 1000, 'stripe_price_bundle' => 2000, 'stripe_price_facebook' => 1000, 'stripe_price_instagram' => 1000, 'stripe_price_tiktok' => 1000];
foreach (reply_catalog()['subs'] as $rid => $rx) $sexpect['stripe_price_' . $rid] = reply_cents((float) $rx['usd']); // Aurora Reply prices
if ($sk === '') line('Stripe key is set', false);
else {
    try {
        stripe_call('GET', '/v1/balance');
        line('Stripe accepts your secret key', true);
        foreach ($sexpect as $key => $cents) {
            $id = (string) cfg($key, '');
            if ($id === '') { line("$key is set", false, 'empty — blank all test IDs and run stripe-setup-ONE-TIME.php?live=1'); continue; }
            try {
                $p = stripe_call('GET', '/v1/prices/' . rawurlencode($id));
                $ok = !empty($p['livemode']) && ($p['unit_amount'] ?? 0) === $cents && ($p['recurring']['interval'] ?? '') === 'month' && ($p['currency'] ?? '') === 'usd' && !empty($p['active']);
                line("$key is a LIVE, active, monthly USD price of \$" . number_format($cents / 100, 2), $ok, 'found: ' . (!empty($p['livemode']) ? 'live' : 'TEST MODE') . ', ' . ($p['unit_amount'] ?? '?') . ' cents');
            } catch (Throwable $e) { line("$key exists in live mode", false, 'not found — a test-mode price ID left in a live config?'); }
        }
        try {
            $hooks = stripe_call('GET', '/v1/webhook_endpoints?limit=100')['data'] ?? [];
            $mine = array_values(array_filter($hooks, fn($h) => ($h['url'] ?? '') === $site . '/api/webhooks/stripe'));
            line('a Stripe webhook endpoint points at ' . $site . '/api/webhooks/stripe', count($mine) > 0);
            if ($mine) {
                $ev = $mine[0]['enabled_events'] ?? [];
                foreach (['checkout.session.completed', 'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'] as $e) line("Stripe webhook listens for $e", in_array('*', $ev, true) || in_array($e, $ev, true));
                line('Stripe webhook is enabled', ($mine[0]['status'] ?? '') === 'enabled');
            }
            line('stripe_webhook_secret is set (whsec_…)', strpos((string) cfg('stripe_webhook_secret', ''), 'whsec_') === 0);
        } catch (Throwable $e) { line('Stripe webhooks can be read', false, $e->getMessage() . ' (a restricted key may lack webhook permission — that is fine if the endpoint was created another way)'); }
        $pc = (string) cfg('stripe_portal_config', '');
        if ($pc === '') line('Stripe customer-portal configuration is set', false);
        else { try { $c = stripe_call('GET', '/v1/billing_portal/configurations/' . rawurlencode($pc)); line('customer portal configuration exists in live mode and is active', !empty($c['livemode']) && !empty($c['active'])); } catch (Throwable $e) { line('customer portal configuration exists in live mode', false, 'not found — test-mode ID?'); } }
    } catch (Throwable $e) { line('Stripe accepts your secret key', false, $e->getMessage()); }
}

echo "\n" . ($bad === 0 ? "ALL GOOD — payments look ready for real customers.\nNext: make one real purchase yourself (use the cheapest plan), check the account page shows the subscription, then cancel and refund it.\n" : "$bad item(s) need attention (see [FAIL] lines above). Fix them and open this page again.\n");
echo "\nWhen finished: DELETE payments-check-ONE-TIME.php from public_html/api/.\n";
