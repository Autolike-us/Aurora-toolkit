<?php
declare(strict_types=1);

/** Settings live in ~/aurora-config.php, ABOVE public_html, so secrets are never web-accessible. Override with AURORA_CONFIG. */
function cfg(string $key, $default = null)
{
    static $c = null;
    if ($c === null) {
        $path = getenv('AURORA_CONFIG') ?: dirname(__DIR__, 3) . '/aurora-config.php';
        $c = is_file($path) ? (require $path) : [];
    }
    return $c[$key] ?? $default;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $dsn = (string) cfg('db_dsn', '');
        if ($dsn === '') throw new RuntimeException('Database is not configured.');
        $pdo = new PDO($dsn, cfg('db_user'), cfg('db_pass'), [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
    return $pdo;
}

function q(string $sql, array $params = []): PDOStatement { $st = db()->prepare($sql); $st->execute($params); return $st; }
function q_one(string $sql, array $params = []): ?array { $r = q($sql, $params)->fetch(); return $r === false ? null : $r; }
function q_all(string $sql, array $params = []): array { return q($sql, $params)->fetchAll(); }

function now(): string { return gmdate('Y-m-d H:i:s'); }
function ts(string $db): int { return (int) strtotime($db . ' UTC'); }
function iso(?string $db): ?string { return $db ? gmdate('Y-m-d\TH:i:s\Z', ts($db)) : null; }
function uid(): string { return bin2hex(random_bytes(16)); }
function site_url(): string { return rtrim((string) cfg('site_url', 'http://localhost'), '/'); }
function client_ip(): string { return substr((string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'), 0, 45); }

function json_out($data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}
function fail(string $message, int $status = 400, array $extra = []): void { json_out(array_merge(['ok' => false, 'error' => $message], $extra), $status); }

function body(): array
{
    static $b = null;
    if ($b === null) {
        $raw = file_get_contents('php://input') ?: '';
        $b = strlen($raw) > 100000 ? [] : (json_decode($raw, true) ?: []);
    }
    return is_array($b) ? $b : [];
}
function raw_body(): string { return file_get_contents('php://input') ?: ''; }

function bearer(): ?string
{
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!$h && function_exists('getallheaders')) { foreach (getallheaders() as $k => $v) if (strtolower($k) === 'authorization') $h = $v; }
    return preg_match('/^Bearer\s+([A-Za-z0-9]{40,100})$/', (string) $h, $m) ? $m[1] : null;
}

/** At most $max hits per $seconds for this key (per IP, email...). Blocks with 429. */
function rate_limit(string $key, int $max, int $seconds): void
{
    $k = hash('sha256', $key);
    $row = q_one('SELECT window_start, hits FROM rate_limits WHERE k = ?', [$k]);
    $t = time();
    if (!$row || ts($row['window_start']) + $seconds < $t) {
        if ($row) q('DELETE FROM rate_limits WHERE k = ?', [$k]);
        q('INSERT INTO rate_limits (k, window_start, hits) VALUES (?, ?, 1)', [$k, now()]);
        return;
    }
    if ((int) $row['hits'] >= $max) fail('Too many attempts. Please wait a few minutes and try again.', 429);
    q('UPDATE rate_limits SET hits = hits + 1 WHERE k = ?', [$k]);
}

function http_json(string $method, string $url, array $headers = [], $body = null): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_CUSTOMREQUEST => $method, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 25, CURLOPT_HTTPHEADER => $headers]);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    $resp = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    return ['status' => $code, 'json' => is_string($resp) ? (json_decode($resp, true) ?: []) : []];
}
