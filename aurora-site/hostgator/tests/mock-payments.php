<?php
// Stand-in for Stripe and PayPal in tests. State lives in files under $MOCK_DIR; the test flips "paid"/"approved" flags to act like the customer.
$dir = getenv('MOCK_DIR') ?: sys_get_temp_dir();
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH); $method = $_SERVER['REQUEST_METHOD'];
$raw = file_get_contents('php://input') ?: ''; parse_str($raw, $form); $json = json_decode($raw, true);
$load = fn($f) => is_file("$dir/$f.json") ? json_decode(file_get_contents("$dir/$f.json"), true) : [];
$save = fn($f, $d) => file_put_contents("$dir/$f.json", json_encode($d));
header('Content-Type: application/json');
file_put_contents("$dir/payments.log", json_encode(['m' => $method, 'p' => $path, 'form' => $form, 'json' => $json]) . "\n", FILE_APPEND);
// ---- Stripe
if ($method === 'POST' && $path === '/v1/checkout/sessions') { $id = 'cs_test_' . bin2hex(random_bytes(8)); $all = $load('stripe'); $all[$id] = ['id' => $id, 'mode' => $form['mode'] ?? '', 'client_reference_id' => $form['client_reference_id'] ?? '', 'metadata' => ['user_id' => $form['metadata']['user_id'] ?? '', 'pack' => $form['metadata']['pack'] ?? ''], 'amount_total' => (int) ($form['line_items'][0]['price_data']['unit_amount'] ?? 0), 'payment_status' => 'unpaid', 'subscription' => null]; $save('stripe', $all); echo json_encode(['id' => $id, 'url' => 'https://stripe.test/pay/' . $id]); return; }
if ($method === 'GET' && preg_match('#^/v1/checkout/sessions/(cs_test_\w+)$#', $path, $m)) { $all = $load('stripe'); if (!isset($all[$m[1]])) { http_response_code(404); echo '{}'; return; } $c = $all[$m[1]]; if (is_file("$dir/paid-" . $m[1])) $c['payment_status'] = 'paid'; echo json_encode($c); return; }
// ---- PayPal
if ($method === 'POST' && $path === '/v1/oauth2/token') { echo json_encode(['access_token' => 'tok_test']); return; }
if ($method === 'POST' && $path === '/v2/checkout/orders') { $id = 'ORD' . strtoupper(bin2hex(random_bytes(6))); $all = $load('paypal'); $all[$id] = ['id' => $id, 'status' => 'CREATED', 'purchase_units' => $json['purchase_units']]; $save('paypal', $all); echo json_encode(['id' => $id, 'status' => 'CREATED', 'links' => [['rel' => 'payer-action', 'href' => 'https://paypal.test/approve/' . $id]]]); return; }
if (preg_match('#^/v2/checkout/orders/(ORD\w+)(/capture)?$#', $path, $m)) {
    $all = $load('paypal'); if (!isset($all[$m[1]])) { http_response_code(404); echo '{}'; return; }
    $o = $all[$m[1]]; if (is_file("$dir/approved-" . $m[1]) && $o['status'] === 'CREATED') $o['status'] = 'APPROVED';
    if ($method === 'POST' && !empty($m[2])) { if ($o['status'] !== 'APPROVED') { http_response_code(422); echo '{}'; return; } $o['status'] = 'COMPLETED'; $all[$m[1]] = $o; $save('paypal', $all); }
    echo json_encode($o); return;
}
if ($method === 'POST' && $path === '/v1/notifications/verify-webhook-signature') { echo json_encode(['verification_status' => 'SUCCESS']); return; }
if ($method === 'POST' && $path === '/v1/billing/subscriptions') { echo json_encode(['id' => 'I-TESTSUB123', 'links' => [['rel' => 'approve', 'href' => 'https://paypal.test/sub']]]); return; }
if ($method === 'POST' && $path === '/v1/catalogs/products') { echo json_encode(['id' => 'PROD-' . bin2hex(random_bytes(3))]); return; }
if ($method === 'POST' && $path === '/v1/billing/plans') { echo json_encode(['id' => 'P-' . bin2hex(random_bytes(4)), 'price' => $json['billing_cycles'][0]['pricing_scheme']['fixed_price']['value'] ?? '']); return; }
if ($method === 'POST' && $path === '/v1/products') { echo json_encode(['id' => 'prod_' . bin2hex(random_bytes(3))]); return; }
if ($method === 'POST' && $path === '/v1/prices') { echo json_encode(['id' => 'price_' . bin2hex(random_bytes(4))]); file_put_contents(getenv('MOCK_DIR') . '/prices.log', ($form['unit_amount'] ?? '') . ' ' . ($form['nickname'] ?? '') . "\n", FILE_APPEND); return; }
if ($method === 'POST' && $path === '/v1/webhook_endpoints') { echo json_encode(['id' => 'we_1', 'secret' => 'whsec_x']); return; }
if ($method === 'POST' && $path === '/v1/billing_portal/configurations') { echo json_encode(['id' => 'bpc_1']); return; }
http_response_code(404); echo '{}';
