<?php
// Creates a throw-away SQLite database + config for local end-to-end tests.   php setup.php <dir> <siteUrl>
declare(strict_types=1);
[$self, $dir, $site] = $argv;
$root = dirname(__DIR__);
@mkdir($dir, 0777, true); @mkdir("$dir/releases");
$schema = preg_replace(['/\)\s*ENGINE=InnoDB[^;]*;/', '/UNIQUE KEY \w+ \(/'], [');', 'UNIQUE ('], file_get_contents("$root/schema.sql"));
(new PDO("sqlite:$dir/db.sqlite", null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]))->exec($schema);
$key = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
openssl_pkey_export($key, $priv);
file_put_contents("$dir/config.php", '<?php return ' . var_export(['site_url' => $site, 'launch_date' => gmdate('Y-m-d', time() - 86400), 'db_dsn' => "sqlite:$dir/db.sqlite", 'mail_driver' => 'file', 'mail_log' => "$dir/mail.log", 'license_private_key' => $priv, 'releases_dir' => "$dir/releases"], true) . ';');
echo "$dir/config.php\n";
