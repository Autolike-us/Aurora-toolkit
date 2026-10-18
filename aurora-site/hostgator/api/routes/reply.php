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
    json_out(['ok' => true, 'status' => $e['status'], 'who' => $e['who'], 'usage' => reply_usage_block($key, $e['quota'])]);
}

/** Three drafts for one comment. A draft only counts once it has been written. */
function route_reply_draft(): void
{
    header('Access-Control-Allow-Origin: *');
    [$key, $e, $b] = reply_auth();
    $in = reply_input($b);
    if ($in['comment'] === '') json_out(['ok' => false, 'status' => 'empty', 'message' => 'There is no comment text to reply to.'], 400);
    if (reply_used($key) >= $e['quota']) json_out(['ok' => false, 'status' => 'quota', 'message' => 'You have used all ' . $e['quota'] . ' drafts for this month. They renew on ' . gmdate('F j', strtotime(reply_resets_at())) . '.', 'usage' => reply_usage_block($key, $e['quota'])], 402);
    $best = ($b['quality'] ?? '') === 'best';
    $model = $best ? (string) cfg('reply_model_best', 'claude-sonnet-5-5') : (string) cfg('reply_model', 'claude-haiku-5-5');
    [$system, $user] = reply_prompt($in);
    [$ok, $res, $http] = reply_call_claude($system, $user, $model);
    if (!$ok) json_out(['ok' => false, 'status' => 'upstream', 'message' => $res], $http);
    reply_count_one($key);
    json_out(['ok' => true, 'drafts' => $res['drafts'], 'flag' => $res['flag'], 'note' => $res['note'], 'model' => $model, 'usage' => reply_usage_block($key, $e['quota'])]);
}
