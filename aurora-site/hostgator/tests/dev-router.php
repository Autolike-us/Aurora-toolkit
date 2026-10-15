<?php
// Local stand-in for Apache: /api/* goes to the PHP API, everything else is served as a static file.
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (strpos($path, '/api/') === 0) { require __DIR__ . '/../api/index.php'; return true; }
return false;
