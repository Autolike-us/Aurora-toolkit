<?php
declare(strict_types=1);

/* Admin dashboard API. Everything here is read-only and needs a signed-in account whose email is listed in 'admin_emails' (aurora-config.php). */

function admin_sub_price(array $s): float
{
    $plan = (string) $s['plan'];
    if ($plan === 'bundle') return !empty($s['launch_price']) ? 10.0 : 20.0;
    if ($plan === 'reply' || $plan === 'reply_pro') return (float) (reply_catalog()['subs'][$plan]['usd'] ?? 0);
    return 10.0;
}
function admin_iso(?string $d): ?string { return $d ? str_replace(' ', 'T', $d) . 'Z' : null; }
function admin_mask_key(string $k): string { return strlen($k) > 4 ? substr($k, 0, 4) . '-····-····-' . substr($k, -4) : '····'; }
function admin_cost_usd(string $model, int $in, int $out): float { [$pi, $po] = reply_price($model); return ($in * $pi + $out * $po) / 1e6; }

function route_admin_overview(): void
{
    require_admin(); reply_ensure_table();
    $day = static fn(int $ago): string => gmdate('Y-m-d H:i:s', time() - $ago * 86400);
    $n = static fn(string $sql, array $p = []): int => (int) (q_one($sql, $p)['c'] ?? 0);

    $byDay = [];
    for ($i = 29; $i >= 0; $i--) $byDay[gmdate('Y-m-d', time() - $i * 86400)] = 0;
    foreach (q_all('SELECT SUBSTR(created_at, 1, 10) AS d, COUNT(*) AS c FROM users WHERE created_at >= ? GROUP BY SUBSTR(created_at, 1, 10)', [$day(29)]) as $r) if (isset($byDay[$r['d']])) $byDay[$r['d']] = (int) $r['c'];
    $users = ['total' => $n('SELECT COUNT(*) AS c FROM users'), 'verified' => $n('SELECT COUNT(*) AS c FROM users WHERE email_verified_at IS NOT NULL'),
        'last7' => $n('SELECT COUNT(*) AS c FROM users WHERE created_at >= ?', [$day(7)]), 'last30' => $n('SELECT COUNT(*) AS c FROM users WHERE created_at >= ?', [$day(30)]),
        'byDay' => array_map(static fn($d, $c) => ['d' => $d, 'n' => $c], array_keys($byDay), array_values($byDay))];
    $nowS = now();
    $trials = ['active' => $n('SELECT COUNT(*) AS c FROM licenses WHERE trial_ends_at > ?', [$nowS]), 'ended' => $n('SELECT COUNT(*) AS c FROM licenses WHERE trial_ends_at <= ?', [$nowS]), 'started7' => $n('SELECT COUNT(*) AS c FROM licenses WHERE trial_started_at >= ?', [$day(7)])];

    $subs = ['active' => 0, 'canceled' => 0, 'problem' => 0, 'mrrUsd' => 0.0, 'byPlan' => [], 'byProvider' => [], 'new30' => 0];
    foreach (q_all('SELECT plan, provider, status, launch_price, created_at FROM subscriptions') as $s) {
        if (in_array($s['status'], ['active', 'trialing'], true)) { $subs['active']++; $subs['mrrUsd'] += admin_sub_price($s); $subs['byPlan'][$s['plan']] = ($subs['byPlan'][$s['plan']] ?? 0) + 1; $subs['byProvider'][$s['provider']] = ($subs['byProvider'][$s['provider']] ?? 0) + 1; }
        elseif (in_array($s['status'], ['canceled', 'cancelled', 'expired'], true)) $subs['canceled']++;
        else $subs['problem']++;
        if ($s['created_at'] >= $day(30)) $subs['new30']++;
    }
    $subs['mrrUsd'] = round($subs['mrrUsd'], 2);

    $ym = gmdate('Y-m'); $months = [];
    foreach (q_all('SELECT SUBSTR(created_at, 1, 7) AS ym, COUNT(*) AS c, SUM(usd) AS usd FROM reply_orders GROUP BY SUBSTR(created_at, 1, 7) ORDER BY ym DESC LIMIT 12') as $r) $months[] = ['ym' => $r['ym'], 'orders' => (int) $r['c'], 'usd' => round((float) $r['usd'], 2)];
    $cost = 0.0; $replies = 0;
    foreach (q_all('SELECT model, replies, tok_in, tok_out FROM reply_cost WHERE ym = ?', [$ym]) as $r) { $cost += admin_cost_usd($r['model'], (int) $r['tok_in'], (int) $r['tok_out']); $replies += (int) $r['replies']; }
    $reply = ['packsByMonth' => $months, 'packRevenueThisMonthUsd' => 0.0, 'month' => $ym, 'repliesThisMonth' => $replies, 'costThisMonthUsd' => round($cost, 4), 'accounts' => $n('SELECT COUNT(*) AS c FROM reply_accounts')];
    foreach ($months as $mo) if ($mo['ym'] === $ym) $reply['packRevenueThisMonthUsd'] = $mo['usd'];

    $installs = [];
    foreach (q_all('SELECT product, COUNT(*) AS c FROM activations GROUP BY product') as $r) $installs[$r['product']] = ['total' => (int) $r['c'], 'active7' => 0];
    foreach (q_all('SELECT product, COUNT(*) AS c FROM activations WHERE last_seen >= ? GROUP BY product', [$day(7)]) as $r) $installs[$r['product']]['active7'] = (int) $r['c'];

    json_out(['ok' => true, 'generatedAt' => gmdate('c'), 'users' => $users, 'trials' => $trials, 'subs' => $subs, 'reply' => $reply, 'installs' => $installs,
        'recentUsers' => array_map(static fn($u) => ['id' => $u['id'], 'email' => $u['email'], 'at' => admin_iso($u['created_at']), 'verified' => $u['email_verified_at'] !== null], q_all('SELECT id, email, created_at, email_verified_at FROM users ORDER BY created_at DESC LIMIT 10')),
        'recentOrders' => array_map(static fn($o) => ['email' => (string) ($o['email'] ?? ''), 'pack' => $o['pack'], 'usd' => (float) $o['usd'], 'provider' => $o['provider'], 'at' => admin_iso($o['created_at'])], q_all('SELECT o.pack, o.usd, o.provider, o.created_at, u.email FROM reply_orders o LEFT JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC LIMIT 10'))]);
}

/** Search and page through accounts. */
function route_admin_users(): void
{
    require_admin();
    $b = body(); $q = trim(reply_clean($b['q'] ?? '', 80)); $page = max(1, (int) ($b['page'] ?? 1)); $per = 25;
    $where = ''; $p = [];
    if ($q !== '') { $where = " WHERE u.email LIKE ? ESCAPE '!'"; $p[] = '%' . str_replace(['!', '%', '_'], ['!!', '!%', '!_'], strtolower($q)) . '%'; }
    $total = (int) (q_one('SELECT COUNT(*) AS c FROM users u' . $where, $p)['c'] ?? 0);
    $rows = q_all('SELECT u.id, u.email, u.created_at, u.email_verified_at, l.trial_ends_at FROM users u LEFT JOIN licenses l ON l.user_id = u.id' . $where . ' ORDER BY u.created_at DESC LIMIT ' . $per . ' OFFSET ' . (($page - 1) * $per), $p);
    $ids = array_column($rows, 'id'); $subs = [];
    if ($ids) {
        $in = implode(',', array_fill(0, count($ids), '?'));
        foreach (q_all("SELECT user_id, plan, status FROM subscriptions WHERE user_id IN ($in)", $ids) as $s) if (in_array($s['status'], ['active', 'trialing'], true)) $subs[$s['user_id']][] = $s['plan'];
    }
    $nowS = now();
    json_out(['ok' => true, 'total' => $total, 'page' => $page, 'per' => $per, 'users' => array_map(static fn($r) => [
        'id' => $r['id'], 'email' => $r['email'], 'createdAt' => admin_iso($r['created_at']), 'verified' => $r['email_verified_at'] !== null,
        'trial' => $r['trial_ends_at'] === null ? 'none' : ($r['trial_ends_at'] > $nowS ? 'running' : 'ended'), 'plans' => $subs[$r['id']] ?? []], $rows)]);
}

/** Everything about one account. The licence key is masked. */
function route_admin_user(): void
{
    require_admin(); reply_ensure_table();
    $id = preg_replace('/[^a-f0-9]/', '', (string) (body()['id'] ?? ''));
    $u = q_one('SELECT id, email, created_at, email_verified_at FROM users WHERE id = ?', [$id]);
    if (!$u) fail('No such account.', 404);
    $lic = q_one('SELECT * FROM licenses WHERE user_id = ?', [$id]);
    $out = ['ok' => true, 'user' => ['id' => $u['id'], 'email' => $u['email'], 'createdAt' => admin_iso($u['created_at']), 'verified' => $u['email_verified_at'] !== null]];
    $out['license'] = $lic ? ['key' => admin_mask_key((string) $lic['license_key']), 'trialStartedAt' => admin_iso($lic['trial_started_at']), 'trialEndsAt' => admin_iso($lic['trial_ends_at'])] : null;
    $out['subscriptions'] = array_map(static fn($s) => ['plan' => $s['plan'], 'provider' => $s['provider'], 'status' => $s['status'], 'launch' => (bool) $s['launch_price'], 'usd' => admin_sub_price($s), 'periodEnd' => admin_iso($s['current_period_end']), 'createdAt' => admin_iso($s['created_at'])], q_all('SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC', [$id]));
    $reply = ['plan' => null, 'usedThisMonth' => 0, 'limit' => null, 'packsLeft' => reply_packs_left($id), 'trialStartedAt' => null];
    if ($lic) {
        $key = (string) $lic['license_key'];
        $reply['usedThisMonth'] = reply_used($key);
        if (reply_plans_on()) { $e = reply_plan_entitlement($lic, false); $reply['plan'] = $e['plan'] ?? null; $reply['limit'] = $e['quota'] ?? null; }
    }
    $ra = q_one('SELECT trial_started_at FROM reply_accounts WHERE user_id = ?', [$id]); if ($ra) $reply['trialStartedAt'] = admin_iso($ra['trial_started_at']);
    $reply['packs'] = array_map(static fn($p) => ['total' => (int) $p['replies_total'], 'left' => (int) $p['replies_left'], 'source' => $p['source'], 'expiresAt' => admin_iso($p['expires_at'])], q_all('SELECT * FROM reply_packs WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [$id]));
    $out['reply'] = $reply;
    $out['orders'] = array_map(static fn($o) => ['pack' => $o['pack'], 'replies' => (int) $o['replies'], 'usd' => (float) $o['usd'], 'provider' => $o['provider'], 'at' => admin_iso($o['created_at'])], q_all('SELECT * FROM reply_orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [$id]));
    $out['installs'] = $lic ? array_map(static fn($a) => ['product' => $a['product'], 'firstSeen' => admin_iso($a['first_seen']), 'lastSeen' => admin_iso($a['last_seen'])], q_all('SELECT product, first_seen, last_seen FROM activations WHERE license_id = ? ORDER BY last_seen DESC', [$lic['id']])) : [];
    json_out($out);
}

function route_admin_subscriptions(): void
{
    require_admin();
    $rows = q_all('SELECT s.*, u.email FROM subscriptions s LEFT JOIN users u ON u.id = s.user_id ORDER BY s.created_at DESC LIMIT 300');
    json_out(['ok' => true, 'subscriptions' => array_map(static fn($s) => ['userId' => $s['user_id'], 'email' => (string) ($s['email'] ?? ''), 'plan' => $s['plan'], 'provider' => $s['provider'], 'status' => $s['status'], 'launch' => (bool) $s['launch_price'], 'usd' => admin_sub_price($s), 'periodEnd' => admin_iso($s['current_period_end']), 'createdAt' => admin_iso($s['created_at'])], $rows)]);
}

function route_admin_orders(): void
{
    require_admin(); reply_ensure_table();
    $rows = q_all('SELECT o.*, u.email FROM reply_orders o LEFT JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC LIMIT 300');
    $tot = q_one('SELECT COUNT(*) AS c, COALESCE(SUM(usd), 0) AS usd FROM reply_orders');
    json_out(['ok' => true, 'count' => (int) $tot['c'], 'totalUsd' => round((float) $tot['usd'], 2), 'orders' => array_map(static fn($o) => ['userId' => $o['user_id'], 'email' => (string) ($o['email'] ?? ''), 'pack' => $o['pack'], 'replies' => (int) $o['replies'], 'usd' => (float) $o['usd'], 'provider' => $o['provider'], 'at' => admin_iso($o['created_at'])], $rows)]);
}

/** Reply and Audit AI cost by month, from the real token counts. */
function route_admin_cost(): void
{
    require_admin(); reply_ensure_table();
    $months = [];
    foreach (q_all('SELECT * FROM reply_cost ORDER BY ym DESC, model ASC') as $r) {
        $cost = admin_cost_usd($r['model'], (int) $r['tok_in'], (int) $r['tok_out']);
        $m = &$months[$r['ym']]; $m = $m ?? ['ym' => $r['ym'], 'requests' => 0, 'replies' => 0, 'tokensIn' => 0, 'tokensOut' => 0, 'costUsd' => 0.0, 'byPlan' => [], 'byModel' => []];
        $m['requests'] += (int) $r['reqs']; $m['replies'] += (int) $r['replies']; $m['tokensIn'] += (int) $r['tok_in']; $m['tokensOut'] += (int) $r['tok_out']; $m['costUsd'] += $cost;
        $m['byPlan'][$r['plan']] = ($m['byPlan'][$r['plan']] ?? 0) + (int) $r['replies']; $m['byModel'][$r['model']] = ($m['byModel'][$r['model']] ?? 0) + (int) $r['replies'];
        unset($m);
    }
    foreach ($months as &$mo) { $mo['costUsd'] = round($mo['costUsd'], 4); $mo['costPerReplyUsd'] = $mo['replies'] ? round($mo['costUsd'] / $mo['replies'], 6) : 0; }
    json_out(['ok' => true, 'months' => array_values($months)]);
}
