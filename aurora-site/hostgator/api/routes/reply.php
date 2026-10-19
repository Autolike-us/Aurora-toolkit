<?php
declare(strict_types=1);

function reply_auth(): array
{
    $b = body();
    $key = strtoupper(trim((string) ($b['key'] ?? ''))); $iid = (string) ($b['installId'] ?? '');
    if (!preg_match('/^AUR-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/', $key) || strlen($iid) < 8 || strlen($iid) > 80)
        json_out(['ok' => false, 'status' => 'invalid', 'message' => 'That key does not look right. Copy it from your Aurora account page.'], 400);
    rate_limit('reply-ip:' . client_ip(), 600, 3600);
    rate_limit('reply-key:' . $key, 40, 60);
    $e = reply_entitlement($key);
    if (!$e['ok']) json_out(['ok' => false, 'status' => $e['status'], 'message' => $e['message']], $e['http']);
    return [$key, $e, $b];
}

/** Checks a key and reports this month's usage. Does not use up a draft. */
function route_reply_status(): void
{
    header('Access-Control-Allow-Origin: *');
    [$key, $e] = reply_auth();
    json_out(['ok' => true, 'status' => $e['status'], 'who' => $e['who'], 'plan' => $e['plan'] ?? 'access', 'usage' => reply_usage_block($key, $e['quota'], $e)]);
}

/** One to three drafts for one comment. Each reply written counts as one draft, and only once it has been written. */
function route_reply_draft(): void
{
    header('Access-Control-Allow-Origin: *');
    [$key, $e, $b] = reply_auth();
    $in = reply_input($b);
    if ($in['comment'] === '') json_out(['ok' => false, 'status' => 'empty', 'message' => 'There is no comment text to reply to.'], 400);
    $avail = reply_allow_left($key, $e) + reply_packs_left($e['userId'] ?? null);
    if ($avail <= 0) {
        $renew = gmdate('F j', strtotime(reply_resets_at()));
        $plan = $e['plan'] ?? 'access';
        $msg = $plan === 'trial' ? 'You have used today\'s ' . $e['dayCap'] . ' trial replies. Come back tomorrow, or get more replies at getaurorastudios.com/reply.'
            : ($plan === 'free' ? 'You have used your ' . $e['quota'] . ' free replies for this month. They renew on ' . $renew . ' — or get more replies at getaurorastudios.com/reply.'
            : 'You have used all ' . $e['quota'] . ' drafts for this month. They renew on ' . $renew . '.');
        json_out(['ok' => false, 'status' => 'quota', 'message' => $msg, 'upgrade' => in_array($plan, ['trial', 'free'], true) ? 'https://getaurorastudios.com/reply/#plans' : null, 'usage' => reply_usage_block($key, $e['quota'], $e)], 402);
    }
    $in['count'] = min($in['count'], $avail); // never write more replies than are left
    $best = ($b['quality'] ?? '') === 'best';
    $model = $best ? (string) cfg('reply_model_best', 'claude-sonnet-5-5') : (string) cfg('reply_model', 'claude-haiku-5-5');
    [$system, $user] = reply_prompt($in);
    [$ok, $res, $http] = reply_call_claude($system, $user, $model, $in['count']);
    if (!$ok) json_out(['ok' => false, 'status' => 'upstream', 'message' => $res], $http);
    $n = count($res['drafts']); reply_charge($key, $e, $n); reply_log_cost($e['plan'] ?? 'access', $model, $res['tokens'] ?? [], $n);
    json_out(['ok' => true, 'drafts' => $res['drafts'], 'flag' => $res['flag'], 'note' => $res['note'], 'model' => $model, 'plan' => $e['plan'] ?? 'access', 'usage' => reply_usage_block($key, $e['quota'], $e)]);
}

/** Owner-only cost report. Needs a key from aurora-master-keys.json with "admin": true. */
function route_reply_admin(): void
{
    header('Access-Control-Allow-Origin: *');
    $b = body(); $key = strtoupper(trim((string) ($b['key'] ?? '')));
    rate_limit('reply-admin:' . client_ip(), 20, 3600);
    $m = preg_match('/^AUR-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/', $key) ? master_license($key) : null;
    if (!$m || empty($m['admin'])) json_out(['ok' => false, 'message' => 'Not allowed.'], 403);
    reply_ensure_table();
    $months = [];
    foreach (q_all('SELECT * FROM reply_cost ORDER BY ym DESC, model ASC') as $r) {
        [$pin, $pout] = reply_price($r['model']);
        $cost = ($r['tok_in'] * $pin + $r['tok_out'] * $pout) / 1e6;
        $m2 = &$months[$r['ym']]; $m2 = $m2 ?? ['ym' => $r['ym'], 'requests' => 0, 'replies' => 0, 'tokensIn' => 0, 'tokensOut' => 0, 'costUsd' => 0.0, 'byPlan' => [], 'byModel' => []];
        $m2['requests'] += (int) $r['reqs']; $m2['replies'] += (int) $r['replies']; $m2['tokensIn'] += (int) $r['tok_in']; $m2['tokensOut'] += (int) $r['tok_out']; $m2['costUsd'] += $cost;
        $m2['byPlan'][$r['plan']] = ($m2['byPlan'][$r['plan']] ?? 0) + (int) $r['replies']; $m2['byModel'][$r['model']] = ($m2['byModel'][$r['model']] ?? 0) + (int) $r['replies'];
        unset($m2);
    }
    foreach ($months as &$mo) { $mo['costUsd'] = round($mo['costUsd'], 4); $mo['costPerReplyUsd'] = $mo['replies'] ? round($mo['costUsd'] / $mo['replies'], 6) : 0; $mo['avgTokensInPerRequest'] = $mo['requests'] ? (int) round($mo['tokensIn'] / $mo['requests']) : 0; $mo['avgTokensOutPerRequest'] = $mo['requests'] ? (int) round($mo['tokensOut'] / $mo['requests']) : 0; }
    json_out(['ok' => true, 'months' => array_values($months)]);
}

/** What is for sale, straight from the server's catalog (the website draws its pricing from this). */
function route_reply_plans(): void
{
    $c = reply_catalog();
    $sub = static fn($id, $x) => ['id' => $id, 'name' => $x['name'], 'usd' => (float) $x['usd'], 'replies' => (int) $x['replies']];
    json_out(['ok' => true, 'enabled' => reply_plans_on(), 'trialDays' => (int) $c['trialDays'], 'trialDaily' => (int) $c['trialDaily'], 'trialTotal' => (int) $c['trialTotal'], 'free' => (int) $c['free'],
        'subs' => array_map(fn($id) => $sub($id, $c['subs'][$id]), array_keys($c['subs'])), 'packs' => array_map(fn($id) => $sub($id, $c['packs'][$id]), array_keys($c['packs']))]);
}

/** The signed-in customer's Reply key, plan and replies left (shown on the account page). Looking does not start the trial. */
function route_reply_account(): void
{
    $user = require_user();
    $license = ensure_license($user['id']);
    $key = (string) $license['license_key'];
    $out = ['ok' => true, 'enabled' => reply_plans_on(), 'licenseKey' => $key];
    if (reply_plans_on()) {
        $e = reply_plan_entitlement($license, false);
        $out['plan'] = $e['plan']; $out['tier'] = $e['tier'] ?? null;
        $out['usage'] = $e['plan'] === 'trial_waiting' ? ['used' => 0, 'limit' => $e['quota'], 'packs' => reply_packs_left($user['id']), 'resetsAt' => reply_resets_at()] : reply_usage_block($key, $e['quota'], $e);
        $out['orders'] = array_map(static fn($o) => ['pack' => $o['pack'], 'replies' => (int) $o['replies'], 'usd' => (float) $o['usd'], 'at' => iso($o['created_at'])], q_all('SELECT pack, replies, usd, created_at FROM reply_orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [$user['id']]));
    }
    json_out($out);
}

/** Voice backup: the voice profiles and quick replies (never the history) are kept under the key so a reinstall can restore them.
    Works for any real key, even one with no replies left, so people can always get their voices back. */
function route_reply_sync(): void
{
    header('Access-Control-Allow-Origin: *');
    $b = body();
    $key = strtoupper(trim((string) ($b['key'] ?? ''))); $iid = (string) ($b['installId'] ?? '');
    if (!preg_match('/^AUR-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/', $key) || strlen($iid) < 8 || strlen($iid) > 80)
        json_out(['ok' => false, 'status' => 'invalid', 'message' => 'That key does not look right.'], 400);
    rate_limit('reply-sync-ip:' . client_ip(), 600, 3600);
    rate_limit('reply-sync-key:' . $key, 60, 3600);
    if (!master_license($key) && !q_one('SELECT license_key FROM licenses WHERE license_key = ?', [$key]))
        json_out(['ok' => false, 'status' => 'invalid', 'message' => 'License key not found.'], 404);
    reply_ensure_table();
    $h = hash('sha256', $key);
    $row = q_one('SELECT data, updated_ms FROM reply_sync WHERE k = ?', [$h]);
    if (($b['action'] ?? 'get') === 'delete') { q('DELETE FROM reply_sync WHERE k = ?', [$h]); json_out(['ok' => true]); }
    if (($b['action'] ?? 'get') === 'put') {
        $d = $b['data'] ?? null;
        if (!is_array($d)) json_out(['ok' => false, 'status' => 'bad_data', 'message' => 'Nothing to save.'], 400);
        $d = array_intersect_key($d, array_flip(['profiles', 'activeProfile', 'quick']));
        $json = json_encode($d, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($json === false || strlen($json) > 90000) json_out(['ok' => false, 'status' => 'too_big', 'message' => 'Your voices are too large to back up. Shorten some samples.'], 413);
        $ms = (int) round(microtime(true) * 1000);
        if ($row) q('UPDATE reply_sync SET data = ?, updated_ms = ?, updated_at = ? WHERE k = ?', [$json, $ms, now(), $h]);
        else q('INSERT INTO reply_sync (k, data, updated_ms, updated_at) VALUES (?,?,?,?)', [$h, $json, $ms, now()]);
        json_out(['ok' => true, 'updatedAt' => $ms]);
    }
    if (!$row) json_out(['ok' => true, 'data' => null, 'updatedAt' => 0]);
    json_out(['ok' => true, 'data' => json_decode((string) $row['data'], true), 'updatedAt' => (int) $row['updated_ms']]);
}
