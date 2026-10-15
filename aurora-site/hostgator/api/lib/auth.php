<?php
declare(strict_types=1);

const SESSION_DAYS = 30;

function valid_email(string $e): bool { return strlen($e) <= 190 && filter_var($e, FILTER_VALIDATE_EMAIL) !== false; }

function create_session(string $userId): string
{
    $token = bin2hex(random_bytes(24));
    q('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)', [hash('sha256', $token), $userId, now(), gmdate('Y-m-d H:i:s', time() + SESSION_DAYS * 86400)]);
    return $token;
}

/** The signed-in user for this request, or a 401. */
function require_user(): array
{
    $t = bearer();
    if (!$t) fail('Please sign in.', 401);
    $row = q_one('SELECT u.id, u.email FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?', [hash('sha256', $t), now()]);
    if (!$row) fail('Please sign in.', 401);
    return $row;
}

/** One-time email token (verify email / reset password). Only its hash is stored. */
function make_email_token(string $userId, string $purpose, int $ttl): string
{
    q('DELETE FROM email_tokens WHERE user_id = ? AND purpose = ?', [$userId, $purpose]);
    $token = bin2hex(random_bytes(24));
    q('INSERT INTO email_tokens (token_hash, user_id, purpose, expires_at) VALUES (?, ?, ?, ?)', [hash('sha256', $token), $userId, $purpose, gmdate('Y-m-d H:i:s', time() + $ttl)]);
    return $token;
}
function use_email_token(string $token, string $purpose): ?string
{
    $h = hash('sha256', $token);
    $row = q_one('SELECT user_id FROM email_tokens WHERE token_hash = ? AND purpose = ? AND expires_at > ?', [$h, $purpose, now()]);
    if (!$row) return null;
    q('DELETE FROM email_tokens WHERE token_hash = ?', [$h]);
    return $row['user_id'];
}
