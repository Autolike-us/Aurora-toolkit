<?php
// ONE-TIME admin/tester access-code maker. Upload to public_html/api/, open it ONCE (see usage below), then it DELETES ITSELF.
// An access code works on any number of browsers and is not tied to an account or a subscription. It is stored in
// aurora-master-keys.json next to aurora-config.php (outside public_html). Never share it with customers.
declare(strict_types=1);
header('Content-Type: text/plain; charset=utf-8');
require __DIR__ . '/lib/bootstrap.php';

$file = (string) cfg('master_keys_file', '') ?: dirname(config_path()) . '/aurora-master-keys.json';
$all = is_file($file) ? json_decode((string) file_get_contents($file), true) : [];
if (!is_array($all)) { echo "STOP: $file exists but is not valid JSON.\n"; exit; }

if (($_GET['go'] ?? '') !== '1') {
    echo "Aurora access codes (admin / tester)\n====================================\n"
       . "Make a code for yourself (all studios, never expires):\n  ?go=1&note=owner\n"
       . "Make a tester code for 30 days, TikTok only:\n  ?go=1&note=friend&days=30&products=tiktok\n"
       . "Make a code for the Chrome Web Store reviewer (Aurora Reply only, 60 days, 100 replies):\n  ?go=1&note=chrome-reviewer&days=60&products=reply&quota=100\n"
       . "Make a code that can also open the cost page (\"Aurora Reply — what it costs\"):\n  ?go=1&note=owner&admin=1\n"
       . "Turn an EXISTING code into a cost-page (admin) code:\n  ?go=1&makeadmin=AUR-XXXX-XXXX-XXXX\n"
       . "Revoke a code:\n  ?go=1&revoke=AUR-XXXX-XXXX-XXXX\n"
       . "List the codes (last 4 characters only):\n  ?go=1&list=1\n\n"
       . "Add one of these to the end of the address in your browser. This script deletes itself after it runs.\n";
    exit;
}

function done(): void { if (@unlink(__FILE__)) echo "\nThis script has deleted itself. Upload it again if you need another code.\n"; else echo "\nDELETE this script from public_html/api/ now.\n"; }
function save(string $file, array $all): void { file_put_contents($file, json_encode($all, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)); @chmod($file, 0600); }

if (isset($_GET['list'])) {
    if (!$all) echo "No access codes yet.\n";
    foreach ($all as $k => $e) echo '…' . substr((string) $k, -4) . '  ' . str_pad((string) ($e['note'] ?? ''), 20) . ' until ' . ($e['until'] ?? 'never') . '  studios ' . (isset($e['products']) ? implode(',', $e['products']) : 'all') . "\n";
    done(); exit;
}
if (!empty($_GET['makeadmin'])) {
    $k = strtoupper(trim((string) $_GET['makeadmin']));
    if (!isset($all[$k])) { echo "That code is not in the list. Check it, or make a new one with &admin=1.\n"; done(); exit; }
    $all[$k]['admin'] = true; save($file, $all); echo "Done: …" . substr($k, -4) . " can now open the cost page. Paste it there as before.\n";
    done(); exit;
}
if (!empty($_GET['revoke'])) {
    $k = strtoupper(trim((string) $_GET['revoke']));
    if (isset($all[$k])) { unset($all[$k]); save($file, $all); echo "Revoked. Browsers that already have a token keep working for up to 72 hours.\n"; } else echo "That code is not in the list.\n";
    done(); exit;
}

if (!is_dir(dirname($file)) || (!is_file($file) && !is_writable(dirname($file))) || (is_file($file) && !is_writable($file))) { echo "STOP: cannot write $file\n"; exit; }
$alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
do { $parts = []; for ($g = 0; $g < 3; $g++) { $s = ''; for ($i = 0; $i < 4; $i++) $s .= $alphabet[random_int(0, strlen($alphabet) - 1)]; $parts[] = $s; } $code = 'AUR-' . implode('-', $parts); } while (isset($all[$code]));
$days = max(0, (int) ($_GET['days'] ?? 0));
$p = strtolower(trim((string) ($_GET['products'] ?? 'all')));
$products = $p === 'all' || $p === '' ? null : array_values(array_intersect(['facebook', 'instagram', 'tiktok', 'reply'], array_map('trim', explode(',', $p))));
if ($products !== null && !$products) { echo "STOP: products must be all, or a mix of facebook,instagram,tiktok,reply.\n"; exit; }
$all[$code] = ['note' => substr(preg_replace('/[^\w .@-]/u', '', (string) ($_GET['note'] ?? '')), 0, 40), 'until' => $days ? gmdate('Y-m-d', time() + 86400 * $days) : null, 'products' => $products, 'created' => gmdate('Y-m-d')] + (isset($_GET['quota']) ? ['quota' => max(1, (int) $_GET['quota'])] : []) + (!empty($_GET['admin']) ? ['admin' => true] : []);
save($file, $all);
echo "Your new access code (copy it now, it is not shown again):\n\n    $code\n\n"
   . 'Products: ' . ($products ? implode(', ', $products) : 'all studios and Aurora Reply') . '   Valid until: ' . ($days ? $all[$code]['until'] : 'never') . "   Browsers: unlimited\n"
   . "Paste it into the License box of any Aurora extension.\n";
done();
