<?php
declare(strict_types=1);

/** Streams the private release zip, only for users whose trial or plan includes that product. Zips live outside public_html. */
function route_download(): void
{
    $user = require_user();
    $product = (string) ($_GET['product'] ?? '');
    if (!in_array($product, PRODUCTS, true)) fail('Unknown product.');
    [, , $access] = load_access($user['id']);
    if (!in_array($product, $access['products'], true)) fail($access['message'], 402);
    $dir = rtrim((string) cfg('releases_dir', dirname(__DIR__, 3) . '/aurora-releases'), '/');
    $file = "$dir/aurora-$product-latest.zip";
    if (!is_file($file)) fail('That download is not published yet. Please check back soon.', 404);
    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="aurora-' . $product . '.zip"');
    header('Content-Length: ' . filesize($file));
    http_response_code(200);
    readfile($file);
    exit;
}
