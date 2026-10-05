# worxcrm.marvice.tech

[Krayin CRM](https://github.com/krayin/laravel-crm) (MIT, Laravel 12) for Marvice Media, run as a
Coolify Docker Compose app on the Marvice VPS (https://coolify.marvice.tech), same box as `dots/`.

Upstream is pinned by tag (`KRAYIN_VERSION`, currently `v2.2.6`) and downloaded at build time.
Nothing from it is vendored in this repo.

| Service | What it runs |
|---|---|
| `app` | serversideup/php 8.3 (nginx + php-fpm, port 8080). On boot: wait for DB, migrate, first-time install, cache |
| `scheduler` | `artisan schedule:work` (inbound email every 5 min, campaigns daily) |
| `mysql` | MySQL 8.4, volume `krayin-mysql` |

Uploads, logs, the install marker and the generated `APP_KEY` live on the `krayin-storage` volume.

## Go live (one time)

1. **DNS** (Hostinger → marvice.tech → DNS): `A  worxcrm  → <VPS IP>` (same IP as `dots`/`coolify`), TTL 300.
2. **Coolify** → Projects → + New → Public Repository → `https://github.com/marvice-2019/claude`, branch `main`.
   - Build Pack: **Docker Compose** · Base Directory: `/worxcrm` · Compose file: `/docker-compose.yml`
   - After it loads the services: `app` → Domains → `https://worxcrm.marvice.tech`
3. **Environment Variables** (Coolify fills the `SERVICE_PASSWORD_*` ones itself). Set:
   - `ADMIN_EMAIL` (default `admin@marvice.tech`)
   - SMTP if you want outbound mail: `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS`
4. **Deploy.** First boot takes ~1-2 min (migrations + seed). Coolify issues the Let's Encrypt cert once DNS resolves.
5. Log in at `https://worxcrm.marvice.tech/admin/login` with `ADMIN_EMAIL` and the value of
   `SERVICE_PASSWORD_ADMIN` (Coolify → Environment Variables). Change it under Settings → Users.

`ADMIN_*` only apply on the very first install. Afterwards, manage users in the CRM.

## Operate

- **Upgrade Krayin:** bump `KRAYIN_VERSION` in both services of `docker-compose.yml`, read upstream
  `UPGRADE.md`, back up, redeploy. Migrations run on boot.
- **Backup:** Coolify → the `mysql` service → Backups (schedule it to S3), plus the `krayin-storage` volume.
- **Shell:** Coolify → `app` → Terminal → `php artisan ...`
- **Auto-deploy on push:** Coolify → app → Webhooks, or copy `.github/workflows/deploy-dots.yml`.

## Notes

- `krayin-crm:install` is never run: it does `migrate:fresh` and prompts for input.
  `docker/worxcrm-init.php` does its seed + admin steps, and only on an empty database.
- The Dockerfile patches `trustProxies(at: '*')` into `bootstrap/app.php` so URLs are `https://`
  behind Coolify's Traefik. The build fails loudly if upstream changes that line.
- nginx listens on IPv4 only (`NGINX_LISTEN_IP_PROTOCOL`), which is what Coolify's Docker networks use.

Local run: `docker compose up --build` with `SERVICE_PASSWORD_MYSQL`, `SERVICE_PASSWORD_MYSQLROOT`,
`SERVICE_PASSWORD_ADMIN` and `APP_URL=http://localhost:8080` exported, plus a `ports: ["8080:8080"]` override
and `SESSION_SECURE_COOKIE=false`.
