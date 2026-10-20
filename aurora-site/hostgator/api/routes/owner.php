<?php
declare(strict_types=1);

/** Monthly price of one subscription row, in USD (the launch price is flagged on the row). */
function owner_sub_price(array $s): float
{
    $plan = (string) $s['plan'];
    if ($plan === 'bundle') return !empty($s['launch_price']) ? 10.0 : 20.0;
    if ($plan === 'reply' || $plan === 'reply_pro') return (float) (reply_catalog()['subs'][$plan]['usd'] ?? 0);
    return 10.0;
}

/** Owner-only business overview: sign-ups, trials, subscriptions, pack sales, installs and Reply cost. Needs an admin key from aurora-master-keys.json. */
function route_owner_overview(): void
{
    $b = body(); $key = strtoupper(trim((string) ($b['key'] ?? '')));
    rate_limit('owner-overview:' . client_ip(), 30, 3600);
    $m = preg_match('/^AUR-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/', $key) ? master_license($key) : null;
    if (!$m || empty($m['admin'])) json_out(['ok' => false, 'message' => 'Not allowed.'], 403);
    reply_ensure_table();
    $day = static fn(int $ago): string => gmdate('Y-m-d H:i:s', time() - $ago * 86400);
    $n = static fn(string $sql, array $p = []): int => (int) (q_one($sql, $p)['c'] ?? 0);

    // People
    $byDay = [];
    for ($i = 29; $i >= 0; $i--) $byDay[gmdate('Y-m-d', time() - $i * 86400)] = 0;
    foreach (q_all('SELECT SUBSTR(created_at, 1, 10) AS d, COUNT(*) AS c FROM users WHERE created_at >= ? GROUP BY SUBSTR(created_at, 1, 10)', [$day(29)]) as $r) if (isset($byDay[$r['d']])) $byDay[$r['d']] = (int) $r['c'];
    $users = ['total' => $n('SELECT COUNT(*) AS c FROM users'), 'verified' => $n('SELECT COUNT(*) AS c FROM users WHERE email_verified_at IS NOT NULL'),
        'last7' => $n('SELECT COUNT(*) AS c FROM users WHERE created_at >= ?', [$day(7)]), 'last30' => $n('SELECT COUNT(*) AS c FROM users WHERE created_at >= ?', [$day(30)]),
        'byDay' => array_map(static fn($d, $c) => ['d' => $d, 'n' => $c], array_keys($byDay), array_values($byDay))];

    // Studios trials
    $nowS = now();
    $trials = ['active' => $n('SELECT COUNT(*) AS c FROM licenses WHERE trial_ends_at > ?', [$nowS]), 'ended' => $n('SELECT COUNT(*) AS c FROM licenses WHERE trial_ends_at <= ?', [$nowS]),
        'started7' => $n('SELECT COUNT(*) AS c FROM licenses WHERE trial_started_at >= ?', [$day(7)])];

    // Subscriptions
    $subs = ['active' => 0, 'canceled' => 0, 'problem' => 0, 'mrrUsd' => 0.0, 'byPlan' => [], 'byProvider' => [], 'new30' => 0];
    foreach (q_all('SELECT plan, provider, status, launch_price, created_at FROM subscriptions') as $s) {
        if (in_array($s['status'], ['active', 'trialing'], true)) {
            $subs['active']++; $subs['mrrUsd'] += owner_sub_price($s);
            $subs['byPlan'][$s['plan']] = ($subs['byPlan'][$s['plan']] ?? 0) + 1; $subs['byProvider'][$s['provider']] = ($subs['byProvider'][$s['provider']] ?? 0) + 1;
        } elseif (in_array($s['status'], ['canceled', 'cancelled', 'expired'], true)) $subs['canceled']++;
        else $subs['problem']++;
        if ($s['created_at'] >= $day(30)) $subs['new30']++;
    }
    $subs['mrrUsd'] = round($subs['mrrUsd'], 2);

    // Reply packs and cost
    $ym = gmdate('Y-m');
    $months = [];
    foreach (q_all('SELECT SUBSTR(created_at, 1, 7) AS ym, COUNT(*) AS c, SUM(usd) AS usd FROM reply_orders GROUP BY SUBSTR(created_at, 1, 7) ORDER BY ym DESC LIMIT 12') as $r)
        $months[] = ['ym' => $r['ym'], 'orders' => (int) $r['c'], 'usd' => round((float) $r['usd'], 2)];
    $cost = 0.0; $replies = 0;
    foreach (q_all('SELECT model, replies, tok_in, tok_out FROM reply_cost WHERE ym = ?', [$ym]) as $r) { [$pi, $po] = reply_price($r['model']); $cost += ($r['tok_in'] * $pi + $r['tok_out'] * $po) / 1e6; $replies += (int) $r['replies']; }
    $reply = ['packsByMonth' => $months, 'packRevenueThisMonthUsd' => 0.0, 'month' => $ym, 'repliesThisMonth' => $replies, 'costThisMonthUsd' => round($cost, 4),
        'accounts' => $n('SELECT COUNT(*) AS c FROM reply_accounts')];
    foreach ($months as $mo) if ($mo['ym'] === $ym) $reply['packRevenueThisMonthUsd'] = $mo['usd'];

    // Installs (an install is one activation of a licensed extension)
    $installs = [];
    foreach (q_all('SELECT product, COUNT(*) AS c FROM activations GROUP BY product') as $r) $installs[$r['product']] = ['total' => (int) $r['c'], 'active7' => 0];
    foreach (q_all('SELECT product, COUNT(*) AS c FROM activations WHERE last_seen >= ? GROUP BY product', [$day(7)]) as $r) $installs[$r['product']]['active7'] = (int) $r['c'];

    $recentUsers = array_map(static fn($u) => ['email' => $u['email'], 'at' => $u['created_at'] . 'Z', 'verified' => $u['email_verified_at'] !== null], q_all('SELECT email, created_at, email_verified_at FROM users ORDER BY created_at DESC LIMIT 12'));
    $recentOrders = array_map(static fn($o) => ['email' => (string) ($o['email'] ?? ''), 'pack' => $o['pack'], 'usd' => (float) $o['usd'], 'provider' => $o['provider'], 'at' => $o['created_at'] . 'Z'],
        q_all('SELECT o.pack, o.usd, o.provider, o.created_at, u.email FROM reply_orders o LEFT JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC LIMIT 12'));

    json_out(['ok' => true, 'generatedAt' => gmdate('c'), 'users' => $users, 'trials' => $trials, 'subs' => $subs, 'reply' => $reply, 'installs' => $installs, 'recentUsers' => $recentUsers, 'recentOrders' => $recentOrders]);
}
