# OpenWA → whatsapp.marvice.tech

> **Live deployment runs on Coolify** (the VPS uses Hostinger's "Ubuntu 24.04 with Coolify" template).
> Use `coolify-compose.yml`. `install.sh` is only for a plain Docker VPS without Coolify: on a Coolify box
> its routes are ignored by Coolify's Traefik.

## Coolify deploy (current)

| Item | Value |
|---|---|
| Coolify | https://coolify.marvice.tech, project "My first project" → production, server `localhost` |
| Service | `openwa` (uuid `jgb5zbfk1nxiu4jcywkzv0eq`) + `postgres` |
| Domain | `https://whatsapp.marvice.tech:2785` on the openwa service (`:2785` = internal port) |
| Admin key | Coolify → service → Environment Variables → `SERVICE_PASSWORD_64_MASTERKEY` |

Create via API: `POST /api/v1/services` with base64 `docker_compose_raw`, then
`PATCH /api/v1/services/{uuid}` with `{"urls":[{"name":"openwa","url":"https://whatsapp.marvice.tech:2785"}],"instant_deploy":true}`.
Setting the domain inside the compose env does not take; the `urls` patch does.

Never change `SERVICE_PASSWORD_64_PEPPER` after first boot (locks out every API key).

---

## Legacy: plain-Docker installer

Self-hosted WhatsApp API gateway ([rmyndharis/OpenWA](https://github.com/rmyndharis/OpenWA)) behind Caddy (auto HTTPS), Postgres, published GHCR image.

## Stack

| Piece | Choice | Why |
|---|---|---|
| App | `ghcr.io/rmyndharis/openwa:latest` | No source build on the VPS |
| Proxy/TLS | Auto-detected: existing Traefik container → router labels; host nginx → site + certbot; host Caddy → site block; nothing on :443 → bundled Caddy | Never fights existing sites (n8n etc.) for :80/:443 |
| DB | Postgres 16 (compose profile) | Upstream's production recommendation |
| Engine | whatsapp-web.js (default) | Lower ban risk; ~300–500 MB RAM/session. `ENGINE=baileys` for small boxes |
| docker-proxy | disabled | Upstream's own advice when not using dashboard datastore toggles |

Sizing: current VPS is KVM 4 (16 GB), so ~20 wwebjs sessions alongside n8n. `OPENWA_MEM_LIMIT=4g` by default; raise it in `.env` as sessions grow.

Target VPS: `srv1373084.hstgr.cloud` / `91.108.110.216` (already serves marvice.tech + n8n.marvice.tech).

## Deploy (≈5 min)

1. **DNS** — Hostinger hPanel → Domains → marvice.tech → DNS: `A  whatsapp  91.108.110.216  TTL 300`.
2. **Run on the VPS as root** (Ubuntu 22.04/24.04):
   ```bash
   curl -fsSL https://raw.githubusercontent.com/marvice-2019/claude/claude/laughing-thompson-63si0a/deploy/openwa/install.sh \
     | DOMAIN=whatsapp.marvice.tech EMAIL=marvice2019@gmail.com bash
   ```
3. Open `https://whatsapp.marvice.tech`, log in with the printed admin key, create a session, scan the QR.

Re-running the installer is safe: it keeps `/opt/openwa/.env` and its secrets. It never enables UFW or touches other containers. Overrides: `PROXY=traefik|nginx|caddy-host|caddy`, `RESOLVER=<traefik certresolver>`, `ENGINE=baileys`.

## Ops

```bash
cd /opt/openwa
docker compose logs -f openwa-api caddy            # logs
git pull && docker compose pull && docker compose up -d --no-build   # upgrade
docker exec openwa-postgres pg_dump -U openwa_app openwa | gzip > ~/openwa-$(date +%F).sql.gz  # DB backup
```

Back up `/opt/openwa/.env` plus volumes `openwa_openwa-data` (WhatsApp session auth) and `openwa_postgres-data`. **Never change `API_KEY_PEPPER`** after first boot: doing so locks out every API key.

## Using it (n8n / apps)

```bash
curl -X POST https://whatsapp.marvice.tech/api/sessions/<id>/messages/send-text \
  -H "X-API-Key: <key>" -H "Content-Type: application/json" \
  -d '{"chatId":"91XXXXXXXXXX@c.us","text":"Hi"}'
```
Check exact routes at `/api/docs` (set `ENABLE_SWAGGER=true` in `.env` to expose it) or in upstream `openapi.json`. Issue scoped operator keys per client/integration, never the admin key.

## Risk

This uses an unofficial client, so a ban is always possible. Use dedicated, warmed-up numbers. Don't cold-blast. Keep pacing on (it's enabled). For client OTP/transactional at scale, use Meta Cloud API.
