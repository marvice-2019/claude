# Krayin CRM (https://github.com/krayin/laravel-crm, MIT) for worxcrm.marvice.tech.
# Upstream is pinned by tag and pulled at build time; nothing from it is vendored here.
FROM serversideup/php:8.3-fpm-nginx-bookworm

ARG KRAYIN_VERSION=v2.2.6

USER root

# Krayin needs intl (NumberFormatter), gd, calendar, exif and bcmath (mPDF) on top of the
# base image's set (pdo_mysql, zip, opcache, redis).
RUN install-php-extensions intl gd calendar exif bcmath

WORKDIR /var/www/html

RUN rm -rf /var/www/html/* \
 && curl -fsSL "https://github.com/krayin/laravel-crm/archive/refs/tags/${KRAYIN_VERSION}.tar.gz" \
    | tar xz --strip-components=1 \
 # Coolify's Traefik terminates TLS; without this Laravel builds http:// asset and form URLs.
 && sed -i 's|->withMiddleware(function (Middleware \$middleware) {|&\n        $middleware->trustProxies(at: "*");|' bootstrap/app.php \
 && grep -q 'trustProxies(at: "\*")' bootstrap/app.php \
 # Real config comes from container env; the file only has to exist (Krayin's install check needs it).
 && : > .env \
 && composer install --no-dev --optimize-autoloader --no-interaction --no-progress \
 && chown -R www-data:www-data /var/www/html

# Worxforu branding: logos/favicon over Krayin's built assets, footer text via a lang override.
COPY branding/ /tmp/branding/
COPY docker/apply-branding.php /tmp/apply-branding.php
COPY docker/lang/ /var/www/html/lang/
RUN php /tmp/apply-branding.php \
 && rm -rf /tmp/branding /tmp/apply-branding.php \
 && chown -R www-data:www-data /var/www/html/public /var/www/html/lang

COPY --chmod=755 docker/entrypoint.d/ /etc/entrypoint.d/
COPY --chmod=644 docker/worxcrm-init.php /usr/local/share/worxcrm-init.php

USER www-data
