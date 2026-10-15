<?php
declare(strict_types=1);

/** Sends a plain-text email through the hosting's sendmail. In tests (mail_driver = file) it appends to a log instead. */
function send_mail(string $to, string $subject, string $text): bool
{
    $from = (string) cfg('mail_from', 'no-reply@' . parse_url(site_url(), PHP_URL_HOST));
    if (cfg('mail_driver') === 'file') {
        file_put_contents((string) cfg('mail_log', sys_get_temp_dir() . '/aurora-mail.log'), json_encode(['to' => $to, 'subject' => $subject, 'text' => $text]) . "\n", FILE_APPEND);
        return true;
    }
    $headers = "From: Aurora <$from>\r\nReply-To: $from\r\nContent-Type: text/plain; charset=UTF-8\r\nX-Mailer: Aurora";
    return @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $text, $headers, '-f' . $from);
}
