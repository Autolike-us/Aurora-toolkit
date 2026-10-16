<?php
declare(strict_types=1);

function account_payload(array $user): array
{
    [$license, $subs, $access] = load_access($user['id']);
    return ['ok' => true, 'email' => $user['email'], 'licenseKey' => $license['license_key'], 'access' => $access, 'subscriptions' => array_map(static fn($s) => ['id' => $s['id'], 'provider' => $s['provider'], 'plan' => $s['plan'], 'status' => $s['status'], 'renewsAt' => iso($s['current_period_end'] ?? null), 'launchPrice' => (bool) $s['launch_price'], 'cancelAtPeriodEnd' => (bool) $s['cancel_at_period_end']], $subs)];
}
function route_me(): void { json_out(account_payload(require_user())); }
function route_trial(): void { json_out(account_payload(require_user())); }
