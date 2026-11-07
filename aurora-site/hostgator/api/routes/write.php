<?php
declare(strict_types=1);

/** Aurora Write: captions, hooks and hashtags for a new post (mode "caption"), or a post that answers a question followers ask (mode "idea"). Costs WRITE_COST replies. */
function route_reply_write(): void
{
    header('Access-Control-Allow-Origin: *');
    [$key, $e, $b] = reply_auth();
    $in = write_input($b);
    if ($in['mode'] === 'idea') { if ($in['question'] === '') json_out(['ok' => false, 'status' => 'empty', 'message' => 'There is no question to write a post about.'], 400); }
    elseif ($in['topic'] === '') json_out(['ok' => false, 'status' => 'empty', 'message' => 'Say what the post is about first.'], 400);
    $avail = reply_allow_left($key, $e) + reply_packs_left($e['userId'] ?? null);
    if ($avail < WRITE_COST) {
        $plan = $e['plan'] ?? 'access'; $renew = gmdate('F j', strtotime(reply_resets_at()));
        $msg = $plan === 'trial' ? 'You have used today\'s trial credits. Come back tomorrow, or get more at getaurorastudios.com/reply.'
            : ($plan === 'free' ? 'You have used your ' . $e['quota'] . ' free credits for this month. They renew on ' . $renew . ' — or get more at getaurorastudios.com/reply.' : 'You have used all ' . $e['quota'] . ' credits for this month. They renew on ' . $renew . '.');
        json_out(['ok' => false, 'status' => 'quota', 'message' => $msg, 'upgrade' => in_array($plan, ['trial', 'free'], true) ? 'https://getaurorastudios.com/reply/#plans' : null, 'usage' => reply_usage_block($key, $e['quota'], $e), 'cost' => WRITE_COST], 402);
    }
    $model = (string) cfg('write_model', cfg('reply_model', 'claude-haiku-5-5'));
    [$system, $user] = write_prompt($in);
    [$ok, $res, $http] = write_call_claude($system, $user, $model);
    if (!$ok) json_out(['ok' => false, 'status' => 'upstream', 'message' => $res], $http);
    reply_charge($key, $e, WRITE_COST);
    reply_log_cost('write', $model, $res['tokens'] ?? [], WRITE_COST);
    json_out(['ok' => true, 'captions' => $res['captions'], 'hooks' => $res['hooks'], 'hashtags' => $res['hashtags'], 'note' => $res['note'], 'cost' => WRITE_COST, 'usage' => reply_usage_block($key, $e['quota'], $e)]);
}
