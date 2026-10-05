<?php

/**
 * First-boot install for Krayin without its interactive installer.
 *
 * `krayin-crm:install` runs migrate:fresh and prompts for the admin, so it can't run on every
 * container start. This mirrors its seed + admin steps and only acts on an empty database.
 */

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Webkul\Installer\Database\Seeders\DatabaseSeeder;
use Webkul\Installer\Helpers\DatabaseManager;

require '/var/www/html/vendor/autoload.php';

$app = require '/var/www/html/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$manager = app(DatabaseManager::class);

if ($manager->isInstalled()) {
    touch(storage_path('installed'));
    $manager->markInstallationCompleted();
    fwrite(STDOUT, "worxcrm: already installed\n");

    exit(0);
}

if (DB::table('users')->count() === 0) {
    fwrite(STDOUT, "worxcrm: seeding Krayin base data\n");

    app(DatabaseSeeder::class)->run([
        'locale'   => getenv('APP_LOCALE') ?: 'en',
        'currency' => getenv('APP_CURRENCY') ?: 'INR',
    ]);
}

$email = getenv('ADMIN_EMAIL') ?: 'admin@marvice.tech';
$password = getenv('ADMIN_PASSWORD');

if (! $password) {
    $password = bin2hex(random_bytes(9));
    fwrite(STDOUT, "worxcrm: ADMIN_PASSWORD not set, generated one: {$password}\n");
}

DB::table('users')->updateOrInsert(
    ['id' => 1],
    [
        'name'       => getenv('ADMIN_NAME') ?: 'Marvice Admin',
        'email'      => $email,
        'password'   => password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]),
        'role_id'    => 1,
        'status'     => 1,
        'updated_at' => now(),
    ]
);

file_put_contents(storage_path('installed'), 'Krayin is successfully installed');
$manager->markInstallationCompleted();

fwrite(STDOUT, "worxcrm: installed, admin login {$email}\n");
