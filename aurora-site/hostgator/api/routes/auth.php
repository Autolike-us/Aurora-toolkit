<?php
declare(strict_types=1);

function route_signup(): void
{
    $b = body();
    $email = strtolower(trim((string) ($b['email'] ?? '')));
    $pw = (string) ($b['password'] ?? '');
    if (!valid_email($email)) fail('Enter a valid email address.');
    if (strlen($pw) < 8 || strlen($pw) > 200) fail('Use a password of at least 8 characters.');
    rate_limit('signup:' . client_ip(), 8, 3600);
    $same = ['ok' => true, 'message' => 'Check your email and click the confirmation link — your 3-day trial starts as soon as you are in.'];
    $existing = q_one('SELECT id, email_verified_at FROM users WHERE email = ?', [$email]);
    if ($existing) {
        // Same answer either way, so signup cannot be used to discover who has an account.
        $t = $existing['email_verified_at'] ? null : make_email_token($existing['id'], 'verify', 86400);
        send_mail($email, 'You already have an Aurora account', $t ? "Confirm your email to start your trial:\n" . site_url() . "/verify/?token=$t\n" : "You already have an Aurora account. Log in here: " . site_url() . "/login/\nForgot your password? " . site_url() . "/login/\n");
        json_out($same);
    }
    $id = uid();
    q('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)', [$id, $email, password_hash($pw, PASSWORD_DEFAULT), now()]);
    $t = make_email_token($id, 'verify', 86400);
    send_mail($email, 'Confirm your Aurora email', "Welcome to Aurora!\n\nConfirm your email to start your 3-day free trial:\n" . site_url() . "/verify/?token=$t\n\nThis link works for 24 hours. If you did not sign up, ignore this email.\n");
    json_out($same);
}

function route_verify(): void
{
    $token = (string) (body()['token'] ?? '');
    $uid = $token !== '' ? use_email_token($token, 'verify') : null;
    if (!$uid) fail('This confirmation link is invalid or has expired. Sign up again to get a new one.', 400);
    q('UPDATE users SET email_verified_at = ? WHERE id = ? AND email_verified_at IS NULL', [now(), $uid]);
    ensure_license($uid);
    json_out(['ok' => true, 'token' => create_session($uid)]);
}

function route_login(): void
{
    $b = body();
    $email = strtolower(trim((string) ($b['email'] ?? '')));
    $pw = (string) ($b['password'] ?? '');
    rate_limit('login-ip:' . client_ip(), 30, 900);
    rate_limit('login-email:' . $email, 10, 900);
    $u = q_one('SELECT id, password_hash, email_verified_at FROM users WHERE email = ?', [$email]);
    // Compare against a dummy hash when the user does not exist so timing does not reveal it.
    $hash = $u['password_hash'] ?? '$2y$10$abcdefghijklmnopqrstuuI6Q7bq0qVfXQ0w9E3xqkLw1m6p4mY3e';
    if (!password_verify($pw, $hash) || !$u) fail('Email or password is not right.', 401);
    if (!$u['email_verified_at']) fail('Please confirm your email first — check your inbox for the link.', 403, ['code' => 'unverified']);
    if (password_needs_rehash($hash, PASSWORD_DEFAULT)) q('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash($pw, PASSWORD_DEFAULT), $u['id']]);
    ensure_license($u['id']);
    json_out(['ok' => true, 'token' => create_session($u['id'])]);
}

function route_logout(): void
{
    $t = bearer();
    if ($t) q('DELETE FROM sessions WHERE token_hash = ?', [hash('sha256', $t)]);
    json_out(['ok' => true]);
}

function route_forgot(): void
{
    $email = strtolower(trim((string) (body()['email'] ?? '')));
    rate_limit('forgot-ip:' . client_ip(), 10, 3600);
    $u = valid_email($email) ? q_one('SELECT id FROM users WHERE email = ?', [$email]) : null;
    if ($u) {
        $t = make_email_token($u['id'], 'reset', 3600);
        send_mail($email, 'Reset your Aurora password', "Choose a new password here (valid for 1 hour):\n" . site_url() . "/reset/?token=$t\n\nIf you did not ask for this, ignore this email.\n");
    }
    json_out(['ok' => true, 'message' => 'If that email has an account, a reset link is on its way.']);
}

function route_reset(): void
{
    $b = body();
    $pw = (string) ($b['password'] ?? '');
    if (strlen($pw) < 8 || strlen($pw) > 200) fail('Use a password of at least 8 characters.');
    $uid = use_email_token((string) ($b['token'] ?? ''), 'reset');
    if (!$uid) fail('This reset link is invalid or has expired. Ask for a new one.', 400);
    q('UPDATE users SET password_hash = ?, email_verified_at = COALESCE(email_verified_at, ?) WHERE id = ?', [password_hash($pw, PASSWORD_DEFAULT), now(), $uid]);
    q('DELETE FROM sessions WHERE user_id = ?', [$uid]);
    json_out(['ok' => true, 'token' => create_session($uid)]);
}
