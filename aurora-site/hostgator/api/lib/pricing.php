<?php
declare(strict_types=1);

const PRODUCTS = ['facebook', 'instagram', 'tiktok'];
const PLANS = ['bundle', 'facebook', 'instagram', 'tiktok', 'reply', 'reply_pro'];
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


/** Aurora Reply: what is for sale and what it costs. Change prices here, or override any value with 'reply_catalog' in aurora-config.php.
 *  After changing a subscription price, re-run the PayPal/Stripe setup scripts for the new plan (existing plans keep their old price). */
function reply_catalog(): array
{
    $d = [
        'trialDays' => 3, 'trialDaily' => 50, 'trialTotal' => 150, 'free' => 10,
        'subs' => [
            'reply'     => ['name' => 'Aurora Reply - Standard', 'usd' => 12.00, 'replies' => (int) cfg('reply_monthly_quota', 1500)],
            'reply_pro' => ['name' => 'Aurora Reply - Agency',   'usd' => 29.00, 'replies' => (int) cfg('reply_pro_quota', 5000)],
        ],
        'packs' => [
            'pack150' => ['name' => '150 replies', 'usd' => 5.00,  'replies' => 150],
            'pack600' => ['name' => '600 replies', 'usd' => 15.00, 'replies' => 600],
        ],
    ];
    $o = cfg('reply_catalog', []);
    return is_array($o) && $o ? array_replace_recursive($d, $o) : $d;
}
function reply_cents(float $usd): int { return (int) round($usd * 100); }
