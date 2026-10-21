<?php
declare(strict_types=1);

/** Signed-in customer pastes an Aurora Audit summary and gets bio options, a fix plan and caption ideas. Costs AUDIT_AI_COST replies from the Reply balance. */
function route_audit_ai(): void
{
    $user = require_user();
    rate_limit('audit-ai-ip:' . client_ip(), 120, 3600);
    rate_limit('audit-ai-user:' . $user['id'], 20, 3600);
    $in = audit_input(body());
    if (strlen($in['text']) < 40) json_out(['ok' => false, 'status' => 'empty', 'message' => 'Paste the Aurora Audit summary you copied from Aurora Extract.'], 400);
    $license = ensure_license($user['id']);
    $key = (string) $license['license_key'];
    $e = reply_entitlement($key);
    if (!$e['ok']) json_out(['ok' => false, 'status' => $e['status'], 'message' => $e['message']], $e['http']);
    $avail = reply_allow_left($key, $e) + reply_packs_left($e['userId'] ?? null);
    if ($avail < AUDIT_AI_COST) {
        json_out(['ok' => false, 'status' => 'quota', 'message' => 'A profile check uses ' . AUDIT_AI_COST . ' replies and you have ' . $avail . ' left. Get more replies to continue.', 'upgrade' => 'https://getaurorastudios.com/reply/#plans', 'usage' => reply_usage_block($key, $e['quota'], $e), 'cost' => AUDIT_AI_COST], 402);
    }
    $model = (string) cfg('audit_model', cfg('reply_model', 'claude-haiku-5-5'));
    [$system, $prompt] = audit_prompt($in);
    [$ok, $res, $http] = audit_call_claude($system, $prompt, $model);
    if (!$ok) json_out(['ok' => false, 'status' => 'upstream', 'message' => $res], $http);
    reply_charge($key, $e, AUDIT_AI_COST);
    reply_log_cost('audit', $model, $res['tokens'] ?? [], AUDIT_AI_COST);
    json_out(['ok' => true, 'platform' => $res['platform'], 'bios' => $res['bios'], 'fixes' => $res['fixes'], 'captions' => $res['captions'], 'note' => $res['note'], 'cost' => AUDIT_AI_COST, 'usage' => reply_usage_block($key, $e['quota'], $e)]);
}
