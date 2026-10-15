<?php
declare(strict_types=1);

function new_license_key(): string
{
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $chars = '';
    for ($i = 0; $i < 12; $i++) $chars .= $alphabet[random_int(0, strlen($alphabet) - 1)];
    return 'AUR-' . substr($chars, 0, 4) . '-' . substr($chars, 4, 4) . '-' . substr($chars, 8, 4);
}

/** Returns the user's license row, creating it (and starting the 3-day trial) the first time. */
function ensure_license(string $userId): array
{
    $lic = q_one('SELECT * FROM licenses WHERE user_id = ?', [$userId]);
    if ($lic) return $lic;
    $start = now();
    $end = gmdate('Y-m-d H:i:s', time() + TRIAL_DAYS * 86400);
    q('INSERT INTO licenses (id, user_id, license_key, trial_started_at, trial_ends_at, created_at) VALUES (?, ?, ?, ?, ?, ?)', [uid(), $userId, new_license_key(), $start, $end, $start]);
    return q_one('SELECT * FROM licenses WHERE user_id = ?', [$userId]);
}

/** A subscription grants access while active/trialing, or until its paid period ends if cancelled/overdue. */
function subscription_grants(array $s, ?int $at = null): bool
{
    $at = $at ?? time();
    if (in_array($s['status'], ['active', 'trialing'], true)) return true;
    if (in_array($s['status'], ['canceled', 'cancelled', 'past_due', 'suspended'], true) && !empty($s['current_period_end'])) return ts($s['current_period_end']) > $at;
    return false;
}

function compute_access(?array $license, array $subs, ?int $at = null): array
{
    $at = $at ?? time();
    $paid = [];
    $renews = null; $plan = null;
    foreach ($subs as $s) {
        if (!subscription_grants($s, $at)) continue;
        foreach (plan_products($s['plan']) as $p) $paid[$p] = true;
        $plan = $s['plan']; $renews = $s['current_period_end'] ?? null;
    }
    $trialEnds = $license['trial_ends_at'] ?? null;
    if ($paid) return ['status' => 'active', 'products' => array_keys($paid), 'trialEndsAt' => iso($trialEnds), 'renewsAt' => iso($renews), 'plan' => $plan, 'message' => 'Subscription active.'];
    if ($license && ts($trialEnds) > $at) {
        $left = max(1, (int) ceil((ts($trialEnds) - $at) / 86400));
        return ['status' => 'trial', 'products' => PRODUCTS, 'trialEndsAt' => iso($trialEnds), 'renewsAt' => null, 'plan' => null, 'message' => 'Free trial: ' . $left . ' day' . ($left === 1 ? '' : 's') . ' left.'];
    }
    if ($license) return ['status' => 'expired', 'products' => [], 'trialEndsAt' => iso($trialEnds), 'renewsAt' => null, 'plan' => null, 'message' => 'Your ' . TRIAL_DAYS . '-day trial has ended. Subscribe to keep using Aurora.'];
    return ['status' => 'none', 'products' => [], 'trialEndsAt' => null, 'renewsAt' => null, 'plan' => null, 'message' => 'Start your free trial to get a license.'];
}

function load_access(string $userId): array
{
    $license = ensure_license($userId);
    $subs = q_all('SELECT * FROM subscriptions WHERE user_id = ?', [$userId]);
    return [$license, $subs, compute_access($license, $subs)];
}
