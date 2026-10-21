<?php
// Stand-in for api.anthropic.com in tests. Logs every request (headers + body) to $MOCK_LOG and answers by keyword.
$raw = file_get_contents('php://input') ?: '';
$h = [];
foreach ($_SERVER as $k => $v) if (strpos($k, 'HTTP_') === 0) $h[strtolower(str_replace('_', '-', substr($k, 5)))] = $v;
file_put_contents(getenv('MOCK_LOG') ?: '/dev/null', json_encode(['path' => parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), 'headers' => $h, 'body' => json_decode($raw, true)]) . "\n", FILE_APPEND);
header('Content-Type: application/json');
if (parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) !== '/v1/messages') { http_response_code(404); echo '{}'; return; }
$req = json_decode($raw, true) ?: [];
$user = (string) ($req['messages'][0]['content'] ?? '');
if (strpos($user, 'MAKE-429') !== false) { http_response_code(429); echo json_encode(['type' => 'error', 'error' => ['type' => 'rate_limit_error', 'message' => 'slow down']]); return; }
if (strpos($user, 'MAKE-AUTHFAIL') !== false) { http_response_code(401); echo json_encode(['type' => 'error', 'error' => ['type' => 'authentication_error']]); return; }
$ans = ['id' => 'msg_test', 'type' => 'message', 'role' => 'assistant', 'model' => $req['model'] ?? '', 'stop_reason' => 'end_turn', 'usage' => ['input_tokens' => 640, 'output_tokens' => 90]];
if (strpos($user, 'MAKE-REFUSE-FIRST') !== false && strpos($user, 'sympathy or support') === false) { $ans['stop_reason'] = 'refusal'; $ans['content'] = []; echo json_encode($ans); return; }
if (strpos($user, 'MAKE-REFUSAL') !== false) { $ans['stop_reason'] = 'refusal'; $ans['content'] = []; echo json_encode($ans); return; }
if (strpos($user, 'MAKE-BADJSON') !== false) { $ans['content'] = [['type' => 'text', 'text' => 'Sure! Here are some replies']]; echo json_encode($ans); return; }
if (strpos((string) ($req['system'] ?? ''), 'social media profile coach') !== false) {
    $out = ['platform' => 'instagram', 'bios' => [['text' => 'Handmade, ethical sneakers. Shop the new drop below.'], ['text' => "Comfy sneakers made by hand.\x07 Tap the link."], ['text' => 'Ethical. Comfy. Yours. DM "size".']],
        'fixes' => [['title' => 'Add a public contact', 'detail' => 'Show an email or contact button.', 'priority' => 'high'], ['title' => 'End the bio with a next step', 'detail' => 'Say "Shop below".', 'priority' => 'urgent'], ['title' => '', 'detail' => 'dropped because it has no title', 'priority' => 'low']],
        'captions' => [['text' => 'Which colour should we restock?'], ['text' => 'A 30-second look at how one pair is made.'], ['text' => 'c3'], ['text' => 'c4'], ['text' => 'c5'], ['text' => 'c6 is over the limit']], 'note' => ''];
    $ans['content'] = [['type' => 'text', 'text' => json_encode($out)]]; echo json_encode($ans); return;
}
$flag = strpos($user, 'MAKE-SPAM') !== false ? 'spam' : 'none';
$out = ['drafts' => [['text' => "Thanks so much! 😊"], ['text' => "Glad you liked it — see you soon!"], ['text' => "  We appreciate you!  \x07"]], 'flag' => $flag, 'note' => $flag === 'spam' ? 'Looks like a scam link.' : ''];
$ans['content'] = [['type' => 'thinking', 'thinking' => ''], ['type' => 'text', 'text' => json_encode($out)]];
echo json_encode($ans);
