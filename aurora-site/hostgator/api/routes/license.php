<?php
declare(strict_types=1);

const MAX_DEVICES = 3;

/**
 * Admin / tester access codes. They live in aurora-master-keys.json next to aurora-config.php (outside public_html), are not tied to an
 * account or a subscription, work on any number of browsers and can be limited to some studios and an end date. Remove the entry to revoke it.
 * Format: { "AUR-XXXX-XXXX-XXXX": { "note": "owner", "until": null | "2027-01-31", "products": null | ["tiktok"] } }
 */
function master_license(string $key): ?array
{
    $path = (string) cfg('master_keys_file', '') ?: dirname(config_path()) . '/aurora-master-keys.json';
    if (!is_file($path)) return null;
    $all = json_decode((string) file_get_contents($path), true);
    $e = is_array($all) ? ($all[$key] ?? null) : null;
    return is_array($e) ? $e : null;
}

/** Called by the browser extensions. Returns a signed token when this license may run this product on this device. */
function route_license_verify(): void
{
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Headers: Content-Type');
    $b = body();
    $key = strtoupper(trim((string) ($b['key'] ?? ''))); $product = (string) ($b['product'] ?? ''); $iid = (string) ($b['installId'] ?? '');
    if (!preg_match('/^AUR-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/', $key) || !in_array($product, PRODUCTS, true) || strlen($iid) < 8 || strlen($iid) > 80)
        json_out(['ok' => false, 'status' => 'invalid', 'message' => 'That license key does not look right. Copy it from your Aurora account page.'], 400);
    rate_limit('lic-ip:' . client_ip(), 120, 3600);
    rate_limit('lic-key:' . $key, 60, 3600);
    if ($master = master_license($key)) {
        $until = !empty($master['until']) ? strtotime((string) $master['until'] . ' 23:59:59 UTC') : null;
        if ($until !== null && ($until === false || $until < time())) json_out(['ok' => false, 'status' => 'expired', 'message' => 'This access code has expired.'], 402);
        $products = isset($master['products']) && is_array($master['products']) ? array_values(array_intersect(PRODUCTS, $master['products'])) : PRODUCTS;
        if (!in_array($product, $products, true)) json_out(['ok' => false, 'status' => 'wrong_plan', 'message' => "This access code does not include Aurora for $product."], 402);
        $renews = $until ? gmdate('Y-m-d\TH:i:s\Z', $until) : null;
        try { $t = sign_license_token($key, $product, ['status' => 'active', 'trialEndsAt' => null], $iid); }
        catch (Throwable $e) { error_log('aurora license: ' . $e->getMessage()); json_out(['ok' => false, 'status' => 'error', 'message' => 'License server is not ready. Try again shortly.'], 500); }
        json_out(['ok' => true, 'status' => 'active', 'token' => $t['token'], 'expiresAt' => $t['expiresAt'], 'trialEndsAt' => null, 'renewsAt' => $renews, 'message' => 'Access code accepted.']);
    }
    $license = q_one('SELECT * FROM licenses WHERE license_key = ?', [$key]);
    if (!$license) json_out(['ok' => false, 'status' => 'invalid', 'message' => 'License key not found. Check it on your Aurora account page.'], 404);
    $subs = q_all('SELECT * FROM subscriptions WHERE user_id = ?', [$license['user_id']]);
    $access = compute_access($license, $subs);
    $devices = q_all('SELECT install_id FROM activations WHERE license_id = ?', [$license['id']]);
    $known = false;
    foreach ($devices as $d) if ($d['install_id'] === $iid) $known = true;
    if (!$known && count($devices) >= MAX_DEVICES)
        json_out(['ok' => false, 'status' => 'device_limit', 'message' => 'This license is already used on ' . MAX_DEVICES . ' browsers. Remove one in your account, or contact support.'], 403);
    if ($known) q('UPDATE activations SET last_seen = ?, product = ? WHERE license_id = ? AND install_id = ?', [now(), $product, $license['id'], $iid]);
    else q('INSERT INTO activations (id, license_id, install_id, product, first_seen, last_seen) VALUES (?,?,?,?,?,?)', [uid(), $license['id'], $iid, $product, now(), now()]);
    if (!in_array($product, $access['products'], true))
        json_out(['ok' => false, 'status' => $access['status'] === 'active' ? 'wrong_plan' : $access['status'], 'trialEndsAt' => $access['trialEndsAt'], 'message' => $access['status'] === 'active' ? "Your plan does not include Aurora for $product. Upgrade on your account page." : $access['message']], 402);
    try { $t = sign_license_token($key, $product, $access, $iid); }
    catch (Throwable $e) { error_log('aurora license: ' . $e->getMessage()); json_out(['ok' => false, 'status' => 'error', 'message' => 'License server is not ready. Try again shortly.'], 500); }
    json_out(['ok' => true, 'status' => $access['status'], 'token' => $t['token'], 'expiresAt' => $t['expiresAt'], 'trialEndsAt' => $access['trialEndsAt'], 'renewsAt' => $access['renewsAt'], 'message' => $access['message']]);
}
