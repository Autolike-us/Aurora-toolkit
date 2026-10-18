<?php
declare(strict_types=1);

const PRODUCTS = ['facebook', 'instagram', 'tiktok'];
const PLANS = ['bundle', 'facebook', 'instagram', 'tiktok'];
const TRIAL_DAYS = 3;
const LAUNCH_MONTHS = 3;

function launch_start(): DateTimeImmutable
{
    try { return new DateTimeImmutable((string) cfg('launch_date', '2026-10-15') . ' 00:00:00', new DateTimeZone('UTC')); }
    catch (Throwable $e) { return new DateTimeImmutable('2026-10-15', new DateTimeZone('UTC')); }
}
function launch_end(): DateTimeImmutable { return launch_start()->modify('+' . LAUNCH_MONTHS . ' months'); }
/** The $10 all-three launch price is open for LAUNCH_MONTHS from the launch date. */
function offer_active(?DateTimeImmutable $now = null): bool
{
    $now = $now ?? new DateTimeImmutable('now', new DateTimeZone('UTC'));
    return $now >= launch_start() && $now < launch_end();
}
function plan_products(string $plan): array { return $plan === 'bundle' ? PRODUCTS : (in_array($plan, ['reply', 'reply_pro'], true) ? ['reply'] : (in_array($plan, PRODUCTS, true) ? [$plan] : [])); }
