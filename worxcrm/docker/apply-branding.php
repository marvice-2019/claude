<?php

/**
 * Rebrands Krayin as Worxforu at image build time. Every edit is a guarded string swap on
 * upstream files: if Krayin changes one of them, the build fails here instead of shipping a
 * half-branded app.
 */
$root = '/var/www/html';
$src = '/tmp/branding';

function fail(string $message): never
{
    fwrite(STDERR, "branding: $message\n");
    exit(1);
}

/** Replace $from with $to exactly $count times in $file. */
function swap(string $file, string $from, string $to, int $count = 1): void
{
    $source = file_get_contents($file);

    if (substr_count($source, $from) !== $count) {
        fail("expected $count match(es) in $file for: ".substr($from, 0, 80));
    }

    file_put_contents($file, str_replace($from, $to, $source));
}

// 1. Logos and favicon. Krayin serves build assets as immutable for a year, so overwriting a file in
// place leaves browsers on the cached Krayin logo. Write each one under a content-hashed name and
// point the manifest at it: every browser fetches the new file, and future logo changes do too.
$manifestFile = "$root/public/admin/build/manifest.json";
$manifest = json_decode(file_get_contents($manifestFile), true);

foreach (['logo.svg', 'dark-logo.svg', 'mobile-light-logo.svg', 'mobile-dark-logo.svg', 'favicon.ico'] as $name) {
    $key = "src/Resources/assets/images/$name";
    isset($manifest[$key]['file']) || fail("$name not in admin manifest");

    $file = 'assets/wxf-'.pathinfo($name, PATHINFO_FILENAME).'-'.substr(md5_file("$src/$name"), 0, 8).'.'.pathinfo($name, PATHINFO_EXTENSION);
    copy("$src/$name", "$root/public/admin/build/$file") || fail("could not write $file");

    // Old file gets the new content too, for anything that hard-codes its path.
    copy("$src/$name", "$root/public/admin/build/".$manifest[$key]['file']);

    $manifest[$key]['file'] = $file;
    echo "branding: $name -> $file\n";
}

file_put_contents($manifestFile, json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

copy("$src/favicon.ico", "$root/public/favicon.ico");

// Full lockups (with tagline) for the sign-in pages, and a PNG for emails (clients block SVG).
@mkdir("$root/public/brand", 0755, true);

foreach (['worxforu-logo-full.png', 'worxforu-logo-full-white.png', 'worxforu-logo-email.png', 'worxforu-icon.png'] as $name) {
    copy("$src/$name", "$root/public/brand/$name") || fail("could not copy $name");
}

$views = "$root/packages/Webkul/Admin/src/Resources/views";

foreach (['login', 'forgot-password', 'reset-password'] as $page) {
    swap(
        "$views/sessions/$page.blade.php",
        "src=\"{{ vite()->asset('images/logo.svg') }}\"",
        "src=\"{{ asset('brand/worxforu-logo-full.png') }}\" style=\"height: 64px; width: auto;\""
    );
}

swap(
    "$views/emails/layout.blade.php",
    "src=\"{{ vite()->asset('images/logo.svg') }}\"\n                            alt=\"{{ config('app.name') }}\"\n                            style=\"height: 40px; width: 110px;\"",
    "src=\"{{ asset('brand/worxforu-logo-email.png') }}\"\n                            alt=\"{{ config('app.name') }}\"\n                            style=\"height: 53px; width: 180px;\""
);
echo "branding: sign-in and email logos\n";

// 2. Brand colour: Worxforu teal, deepened to #2A8A69 so white button text and dark-mode links
// stay readable (~4.2:1 both ways; the logo's #56B993 is 2.4:1 on white). Still overridable
// under Configuration → General → Settings → Menu Color.
$adminConfig = "$root/packages/Webkul/Admin/src/Config/core_config.php";
swap($adminConfig, "'default' => '#0E90D9',", "'default' => '#2A8A69',");

foreach (['index', 'anonymous'] as $layout) {
    swap("$views/components/layouts/$layout.blade.php", "?? '#0E90D9'", "?? '#2A8A69'");
}

// 3. Admin footer default (a value saved in Configuration still wins).
swap(
    $adminConfig,
    "'default' => 'Powered by <span style=\"color: rgb(14, 144, 217);\"><a href=\"http://www.krayincrm.com\" target=\"_blank\">Krayin</a></span>, an open-source project by <span style=\"color: rgb(14, 144, 217);\"><a href=\"https://webkul.com\" target=\"_blank\">Webkul</a></span>.',",
    "'default' => 'Worxforu · Software Automations & Development and AI Services',"
);
echo "branding: brand colour and footer\n";

// 4. Help & Resources is Krayin's own upsell page (hosting, extensions, support): drop it from the menu.
swap(
    "$root/packages/Webkul/Admin/src/Config/menu.php",
    "    [\n        'key' => 'help',\n        'name' => 'admin::app.layouts.help',\n        'route' => 'admin.help.index',\n        'sort' => 10,\n        'icon-class' => 'icon-help',\n    ],\n",
    ''
);
// The URL still exists; send it to the dashboard instead (route name kept so nothing breaks).
swap(
    "$root/packages/Webkul/Admin/src/Routes/Admin/help-routes.php",
    "Route::get('', 'index')->name('admin.help.index');",
    "Route::get('', fn () => redirect()->route('admin.dashboard.index'))->name('admin.help.index');"
);
echo "branding: removed Help & Resources menu\n";

// 5. Product name in UI strings, every package and locale. Only values change, never keys.
$renamed = 0;

foreach (glob("$root/packages/Webkul/*/src/Resources/lang/*/*.php") as $file) {
    $lines = require $file;

    array_walk_recursive($lines, function (&$value) use (&$renamed) {
        if (is_string($value) && str_contains($value, 'Krayin')) {
            $value = str_replace(['Krayin CRM', 'Krayin'], 'Worxforu', $value);
            $renamed++;
        }
    });

    file_put_contents($file, "<?php\n\nreturn ".var_export($lines, true).";\n");
}

echo "branding: renamed Krayin in $renamed UI strings\n";
