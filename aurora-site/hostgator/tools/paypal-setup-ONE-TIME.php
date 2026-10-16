<?php
// ONE-TIME SETUP. Upload to public_html/api/, open it once in your browser, then DELETE it.
// Creates the Aurora product and the 5 monthly PayPal plans in the PayPal account whose credentials are in aurora-config.php,
// and saves the plan IDs back into aurora-config.php (a .bak copy is made first). It never prints your secrets.
declare(strict_types=1);
header('Content-Type: text/plain; charset=utf-8');
require __DIR__ . '/lib/bootstrap.php';
require __DIR__ . '/lib/paypal.php';

$env = cfg('paypal_env') === 'live' ? 'LIVE' : 'SANDBOX';
echo "PayPal environment in your config: $env\n";
if ((string) cfg('paypal_client_id', '') === '' || (string) cfg('paypal_client_secret', '') === '') { echo "STOP: paypal_client_id / paypal_client_secret are empty in aurora-config.php.\n"; exit; }
if ($env === 'LIVE' && ($_GET['live'] ?? '') !== '1') { echo "This will create REAL plans in your live PayPal account. If that is what you want, open this page again with ?live=1 at the end.\n"; exit; }

$cfgPath = getenv('AURORA_CONFIG') ?: dirname(__DIR__, 2) . '/aurora-config.php';
if (!is_writable($cfgPath)) { echo "STOP: cannot write $cfgPath\n"; exit; }

// key => [display name, price per month in USD]
$plans = [
    'paypal_plan_bundle_launch' => ['Aurora - All 3 studios (launch price)', '10.00'],
    'paypal_plan_bundle'        => ['Aurora - All 3 studios', '20.00'],
    'paypal_plan_facebook'      => ['Aurora - Facebook Studio', '10.00'],
    'paypal_plan_instagram'     => ['Aurora - Instagram Studio', '10.00'],
    'paypal_plan_tiktok'        => ['Aurora - TikTok Studio', '10.00'],
];
try {
    $todo = array_filter(array_keys($plans), fn($k) => (string) cfg($k, '') === '');
    if (!$todo) { echo "All 5 plan IDs are already in your config. Nothing to do. Delete this file.\n"; exit; }
    $product = paypal_call('POST', '/v1/catalogs/products', ['name' => 'Aurora Studios', 'description' => 'Aurora engagement studios for Facebook, Instagram and TikTok', 'type' => 'SERVICE', 'category' => 'SOFTWARE']);
    echo "Product created: {$product['id']}\n";
    $src = (string) file_get_contents($cfgPath);
    copy($cfgPath, $cfgPath . '.bak-' . date('Ymd-His'));
    foreach ($todo as $key) {
        [$name, $price] = $plans[$key];
        $plan = paypal_call('POST', '/v1/billing/plans', [
            'product_id' => $product['id'], 'name' => $name, 'description' => $name . ', billed monthly', 'status' => 'ACTIVE',
            'billing_cycles' => [['frequency' => ['interval_unit' => 'MONTH', 'interval_count' => 1], 'tenure_type' => 'REGULAR', 'sequence' => 1, 'total_cycles' => 0,
                'pricing_scheme' => ['fixed_price' => ['value' => $price, 'currency_code' => 'USD']]]],
            'payment_preferences' => ['auto_bill_outstanding' => true, 'setup_fee' => ['value' => '0', 'currency_code' => 'USD'], 'setup_fee_failure_action' => 'CONTINUE', 'payment_failure_threshold' => 3],
        ]);
        $id = (string) $plan['id'];
        $count = 0;
        $src = preg_replace("/('" . preg_quote($key, '/') . "'\s*=>\s*)'[^']*'/", "\${1}'" . $id . "'", $src, 1, $count);
        if ($count === 0) $src = preg_replace('/\];\s*$/', "    '$key' => '$id',\n];\n", $src, 1);
        file_put_contents($cfgPath, $src); // save after each plan so a later failure never loses an ID
        echo "$key = $id   ($name, \$$price/month)\n";
    }
    echo "\nDone. The plan IDs were saved into aurora-config.php.\nNow DELETE paypal-setup-ONE-TIME.php from public_html/api/ and the aurora-config.php.bak-... copies (they hold your secrets).\n";
} catch (Throwable $e) { echo 'FAILED: ' . $e->getMessage() . "\n(Check the Client ID/Secret match the environment above: sandbox keys for sandbox, live keys for live.)\n"; }
