<?php
// ONE-TIME SETUP. Upload to public_html/api/, open it once in your browser, then DELETE it.
// Using the Stripe secret key already in aurora-config.php, it creates the Aurora product, the 5 monthly prices,
// the webhook endpoint (https://your-site/api/webhooks/stripe) and a customer billing-portal setup, and saves their IDs
// and the webhook secret into aurora-config.php (a .bak copy is made first). It never prints your secrets.
declare(strict_types=1);
header('Content-Type: text/plain; charset=utf-8');
require __DIR__ . '/lib/bootstrap.php';
require __DIR__ . '/lib/stripe.php';

$key = (string) cfg('stripe_secret', '');
if ($key === '') { echo "STOP: stripe_secret is empty in aurora-config.php. Add your Stripe secret key (sk_test_... for testing) first.\n"; exit; }
$live = strpos($key, '_live_') !== false;
echo 'Stripe mode in your config: ' . ($live ? 'LIVE (real money)' : 'TEST') . "\n";
if ($live && ($_GET['live'] ?? '') !== '1') { echo "This will create real products and a real webhook in your LIVE Stripe account. If that is what you want, open this page again with ?live=1 at the end.\n"; exit; }

$cfgPath = getenv('AURORA_CONFIG') ?: dirname(__DIR__, 2) . '/aurora-config.php';
if (!is_writable($cfgPath)) { echo "STOP: cannot write $cfgPath\n"; exit; }

function save_cfg(string $cfgPath, string $key, string $value): void
{
    $src = (string) file_get_contents($cfgPath);
    $count = 0;
    $src = preg_replace("/('" . preg_quote($key, '/') . "'\s*=>\s*)'[^']*'/", "\${1}'" . addslashes($value) . "'", $src, 1, $count);
    if ($count === 0) $src = preg_replace('/\];\s*$/', "    '$key' => '" . addslashes($value) . "',\n];\n", $src, 1);
    file_put_contents($cfgPath, $src);
}

// key => [display name, price in US cents per month]
$prices = [
    'stripe_price_bundle_launch' => ['Aurora - All 3 studios (launch price)', 1000],
    'stripe_price_bundle'        => ['Aurora - All 3 studios', 2000],
    'stripe_price_facebook'      => ['Aurora - Facebook Studio', 1000],
    'stripe_price_instagram'     => ['Aurora - Instagram Studio', 1000],
    'stripe_price_tiktok'        => ['Aurora - TikTok Studio', 1000],
];
try {
    copy($cfgPath, $cfgPath . '.bak-' . date('Ymd-His'));
    $todo = array_filter(array_keys($prices), fn($k) => (string) cfg($k, '') === '');
    if ($todo) {
        $product = stripe_call('POST', '/v1/products', ['name' => 'Aurora Studios', 'description' => 'Aurora engagement studios for Facebook, Instagram and TikTok']);
        echo "Product created: {$product['id']}\n";
        foreach ($todo as $k) {
            [$name, $cents] = $prices[$k];
            $p = stripe_call('POST', '/v1/prices', ['product' => $product['id'], 'currency' => 'usd', 'unit_amount' => $cents, 'recurring[interval]' => 'month', 'nickname' => $name]);
            save_cfg($cfgPath, $k, (string) $p['id']);
            echo "$k = {$p['id']}   ($name, \$" . number_format($cents / 100, 2) . "/month)\n";
        }
    } else echo "All 5 prices are already in your config. Skipping prices.\n";

    if ((string) cfg('stripe_webhook_secret', '') === '') {
        $w = stripe_call('POST', '/v1/webhook_endpoints', ['url' => site_url() . '/api/webhooks/stripe', 'description' => 'Aurora subscriptions',
            'enabled_events' => ['checkout.session.completed', 'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted']]);
        save_cfg($cfgPath, 'stripe_webhook_secret', (string) ($w['secret'] ?? ''));
        echo "Webhook created ({$w['id']}) for " . site_url() . "/api/webhooks/stripe and its signing secret was saved into your config.\n";
    } else echo "A webhook secret is already in your config. Skipping the webhook.\n";

    if ((string) cfg('stripe_portal_config', '') === '') {
        $c = stripe_call('POST', '/v1/billing_portal/configurations', ['business_profile[headline]' => 'Manage your Aurora subscription',
            'business_profile[privacy_policy_url]' => site_url() . '/legal/privacy/', 'business_profile[terms_of_service_url]' => site_url() . '/legal/terms/',
            'features[invoice_history][enabled]' => 'true', 'features[payment_method_update][enabled]' => 'true',
            'features[subscription_cancel][enabled]' => 'true', 'features[subscription_cancel][mode]' => 'at_period_end']);
        save_cfg($cfgPath, 'stripe_portal_config', (string) $c['id']);
        echo "Billing portal set up ({$c['id']}): customers can update their card, see invoices and cancel (access lasts to the period end).\n";
    } else echo "A billing portal is already configured. Skipping.\n";
    echo "\nDone. Now DELETE stripe-setup-ONE-TIME.php from public_html/api/ and the aurora-config.php.bak-... copies (they hold your secrets).\n";
} catch (Throwable $e) { echo 'FAILED: ' . $e->getMessage() . "\n(Check that the secret key is the full secret key, not the publishable key, and that it is for the mode shown above. If it names the customer portal: in Stripe go to Settings > Billing > Customer portal, press Activate/Save once, then open this page again.)\n"; }
