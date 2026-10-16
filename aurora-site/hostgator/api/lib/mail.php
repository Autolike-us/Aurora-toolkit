<?php
declare(strict_types=1);

/**
 * Sends a plain-text email. If smtp_host is set in the config it goes through that SMTP server
 * (recommended: the Titan mailbox), otherwise through the hosting's sendmail.
 * In tests (mail_driver = file) it appends to a log instead.
 */
function send_mail(string $to, string $subject, string $text): bool
{
    $from = (string) cfg('mail_from', 'no-reply@' . parse_url(site_url(), PHP_URL_HOST));
    if (cfg('mail_driver') === 'file') {
        file_put_contents((string) cfg('mail_log', sys_get_temp_dir() . '/aurora-mail.log'), json_encode(['to' => $to, 'subject' => $subject, 'text' => $text]) . "\n", FILE_APPEND);
        return true;
    }
    $encSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    if (cfg('smtp_host')) {
        try {
            smtp_send($from, $to, $encSubject, $text);
            return true;
        } catch (Throwable $e) {
            error_log('Aurora SMTP failed: ' . $e->getMessage());
            return false;
        }
    }
    $headers = "From: Aurora <$from>\r\nReply-To: $from\r\nContent-Type: text/plain; charset=UTF-8\r\nX-Mailer: Aurora";
    return @mail($to, $encSubject, $text, $headers, '-f' . $from);
}

/** Minimal SMTP client: implicit TLS (port 465) or STARTTLS (port 587), AUTH LOGIN. */
function smtp_send(string $from, string $to, string $encSubject, string $text): void
{
    $host = (string) cfg('smtp_host');
    $port = (int) cfg('smtp_port', 465);
    $user = (string) cfg('smtp_user', $from);
    $pass = (string) cfg('smtp_pass', '');
    $secure = (string) cfg('smtp_secure', $port === 465 ? 'ssl' : 'tls'); // ssl | tls (STARTTLS) | none (tests only)
    $implicit = $secure === 'ssl';
    $fp = @stream_socket_client(($implicit ? 'ssl://' : 'tcp://') . "$host:$port", $errno, $errstr, 15);
    if (!$fp) throw new RuntimeException("connect $host:$port failed: $errstr");
    stream_set_timeout($fp, 20);

    $read = function () use ($fp): string {
        $all = '';
        while (($line = fgets($fp, 1024)) !== false) {
            $all .= $line;
            if (strlen($line) < 4 || $line[3] !== '-') break;
        }
        return $all;
    };
    $cmd = function (string $c, array $ok) use ($fp, $read): string {
        if ($c !== '') fwrite($fp, $c . "\r\n");
        $r = $read();
        if (!in_array((int) substr($r, 0, 3), $ok, true)) throw new RuntimeException('SMTP error after "' . (str_starts_with($c, 'AUTH') ? 'AUTH' : substr($c, 0, 20)) . '": ' . trim($r));
        return $r;
    };

    try {
        $cmd('', [220]);
        $helo = parse_url(site_url(), PHP_URL_HOST) ?: 'localhost';
        $cmd("EHLO $helo", [250]);
        if ($secure === 'tls') {
            $cmd('STARTTLS', [220]);
            if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) throw new RuntimeException('STARTTLS failed');
            $cmd("EHLO $helo", [250]);
        }
        $cmd('AUTH LOGIN', [334]);
        $cmd(base64_encode($user), [334]);
        $cmd(base64_encode($pass), [235]);
        $cmd("MAIL FROM:<$from>", [250]);
        $cmd("RCPT TO:<$to>", [250, 251]);
        $cmd('DATA', [354]);
        $msg = "Date: " . date('r') . "\r\n"
            . "From: Aurora <$from>\r\nTo: <$to>\r\nReply-To: $from\r\n"
            . "Subject: $encSubject\r\nMessage-ID: <" . bin2hex(random_bytes(12)) . '@' . $helo . ">\r\n"
            . "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n"
            . preg_replace('/^\./m', '..', str_replace(["\r\n", "\r"], "\n", $text)) . "\r\n.";
        $msg = str_replace("\n", "\r\n", str_replace("\r\n", "\n", $msg));
        $cmd($msg, [250]);
        $cmd('QUIT', [221]);
    } finally {
        fclose($fp);
    }
}
