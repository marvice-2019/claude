<?php

/**
 * Swaps Krayin's built logo/favicon assets for Worxforu ones. Vite hashes the file names,
 * so each target is looked up in the admin build manifest. Fails the build if one is missing.
 */
$root = '/var/www/html';
$manifest = json_decode(file_get_contents("$root/public/admin/build/manifest.json"), true);

$map = [
    'logo.svg',
    'dark-logo.svg',
    'mobile-light-logo.svg',
    'mobile-dark-logo.svg',
    'favicon.ico',
];

foreach ($map as $name) {
    $key = "src/Resources/assets/images/$name";

    if (! isset($manifest[$key]['file'])) {
        fwrite(STDERR, "branding: $key not in admin manifest\n");
        exit(1);
    }

    $target = "$root/public/admin/build/".$manifest[$key]['file'];

    if (! copy("/tmp/branding/$name", $target)) {
        fwrite(STDERR, "branding: could not write $target\n");
        exit(1);
    }

    echo "branding: $name -> {$manifest[$key]['file']}\n";
}

// Root favicon, used outside the admin panel (e.g. the web form).
copy('/tmp/branding/favicon.ico', "$root/public/favicon.ico");

// Admin footer: Krayin's built-in default for Configuration → General → Settings → Powered By.
// Only the default changes, so a value saved in that screen still wins.
$config = "$root/packages/Webkul/Admin/src/Config/core_config.php";
$source = file_get_contents($config);
$from = "'default' => 'Powered by <span style=\"color: rgb(14, 144, 217);\"><a href=\"http://www.krayincrm.com\" target=\"_blank\">Krayin</a></span>, an open-source project by <span style=\"color: rgb(14, 144, 217);\"><a href=\"https://webkul.com\" target=\"_blank\">Webkul</a></span>.',";
$to = "'default' => 'Worxforu · Software Automations & Development and AI Services',";

if (substr_count($source, $from) !== 1) {
    fwrite(STDERR, "branding: footer default not found in core_config.php\n");
    exit(1);
}

file_put_contents($config, str_replace($from, $to, $source));
echo "branding: admin footer default\n";
