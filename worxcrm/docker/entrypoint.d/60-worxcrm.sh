#!/bin/sh
# Boot steps for Krayin, run by the serversideup entrypoint before nginx/php-fpm start.
# Idempotent: first boot installs, later boots only migrate and re-cache.
# Skipped by the scheduler container (WORXCRM_ROLE=scheduler) so only the web container
# touches the schema.

cd /var/www/html

# APP_KEY: use the env value if Coolify provides one, else generate once and keep it on the
# storage volume. Losing it would make encrypted data (sessions, mail creds) unreadable.
KEY_FILE=storage/app/.app_key
if [ -z "${APP_KEY:-}" ]; then
  if [ ! -s "$KEY_FILE" ]; then
    php -r 'echo "base64:".base64_encode(random_bytes(32));' > "$KEY_FILE"
    chmod 600 "$KEY_FILE"
  fi
  APP_KEY=$(cat "$KEY_FILE")
  export APP_KEY
fi

if [ "${WORXCRM_ROLE:-web}" = "web" ]; then
  echo "worxcrm: waiting for database ${DB_HOST}:${DB_PORT:-3306}"
  i=0
  until php -r 'try { new PDO("mysql:host=".getenv("DB_HOST").";port=".(getenv("DB_PORT") ?: 3306), getenv("DB_USERNAME"), getenv("DB_PASSWORD")); } catch (Throwable $e) { exit(1); }' 2>/dev/null; do
    i=$((i + 1))
    if [ "$i" -ge 60 ]; then
      echo "worxcrm: database not reachable after 120s" >&2
      break
    fi
    sleep 2
  done

  php artisan migrate --force --no-interaction
  php /usr/local/share/worxcrm-init.php
  php artisan vendor:publish --provider='Webkul\Core\Providers\CoreServiceProvider' --force --no-interaction >/dev/null
  php artisan storage:link --force --no-interaction >/dev/null 2>&1 || true
else
  # Let the web container finish migrating before the scheduler boots the app.
  sleep 20
fi

php artisan optimize --no-interaction
