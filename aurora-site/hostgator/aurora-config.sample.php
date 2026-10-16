<?php
// Copy this file to /home/YOUR_CPANEL_USER/aurora-config.php (one level ABOVE public_html) and fill it in.
// Never put it inside public_html and never commit the real one.
return [
    'site_url'   => 'https://getaurorastudios.com',
    'launch_date' => '2026-10-15',           // the 3-month $10 all-three offer runs from this day
    'mail_from'  => 'no-reply@getaurorastudios.com', // create this mailbox in cPanel > Email Accounts
    // Send through the Titan mailbox (best deliverability). Leave smtp_host empty to use the server's own mail().
    'smtp_host'  => 'smtp.titan.email',
    'smtp_port'  => 465,
    'smtp_user'  => 'no-reply@getaurorastudios.com',
    'smtp_pass'  => '',

    // MySQL: cPanel > MySQL Databases (names are prefixed with your cPanel user)
    'db_dsn'  => 'mysql:host=localhost;dbname=CPANELUSER_aurora;charset=utf8mb4',
    'db_user' => 'CPANELUSER_aurora',
    'db_pass' => '',

    // License signing key (ES256). Generate: node scripts/gen-license-key.mjs  → paste the PRIVATE key, "\n" escaped, on one line.
    'license_private_key' => '',

    // Where the zips live (outside public_html): aurora-facebook-latest.zip, aurora-instagram-latest.zip, aurora-tiktok-latest.zip
    'releases_dir' => '/home/CPANELUSER/aurora-releases',

    'stripe_secret' => '', 'stripe_webhook_secret' => '', 'stripe_portal_config' => '',
    'stripe_price_bundle_launch' => '', 'stripe_price_bundle' => '', 'stripe_price_facebook' => '', 'stripe_price_instagram' => '', 'stripe_price_tiktok' => '',

    'paypal_env' => 'sandbox',               // 'live' when ready
    'paypal_client_id' => '', 'paypal_client_secret' => '', 'paypal_webhook_id' => '',
    'paypal_plan_bundle_launch' => '', 'paypal_plan_bundle' => '', 'paypal_plan_facebook' => '', 'paypal_plan_instagram' => '', 'paypal_plan_tiktok' => '',
];
