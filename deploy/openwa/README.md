# OpenWA → whatsapp.marvice.tech

Self-hosted WhatsApp API gateway ([rmyndharis/OpenWA](https://github.com/rmyndharis/OpenWA)) behind Caddy (auto HTTPS), Postgres, published GHCR image.

## Stack

| Piece | Choice | Why |
|---|---|---|
| App | `ghcr.io/rmyndharis/openwa:latest` | No source build on the VPS |
| Proxy/TLS | Caddy 2 in compose, pinned `172.30.0.10` | Auto Let's Encrypt, WebSockets, `TRUSTED_PROXIES` gets real client IPs |
| DB | Postgres 16 (compose profile) | Upstream's production recommendation |
| Engine | whatsapp-web.js (default) | Lower ban risk; ~300–500 MB RAM/session. `ENGINE=baileys` for small boxes |
| docker-proxy | disabled | Upstream's own advice when not using dashboard datastore toggles |

Sizing: KVM 2 (2 vCPU / 8 GB) handles ~8–10 wwebjs sessions. KVM 1 (4 GB) → use baileys.

## Deploy (≈5 min)

1. **DNS** — Hostinger hPanel → Domains → marvice.tech → DNS: `A  whatsapp  <VPS_IP>  TTL 300`.
2. **Run on the VPS as root** (Ubuntu 22.04/24.04):
   ```bash
   curl -fsSL https://raw.githubusercontent.com/marvice-2019/claude/claude/laughing-thompson-63si0a/deploy/openwa/install.sh \
     | DOMAIN=whatsapp.marvice.tech EMAIL=marvice2019@gmail.com bash
   ```
3. Open `https://whatsapp.marvice.tech`, log in with the printed admin key, create a session, scan the QR.

Re-running the installer is safe: it keeps `/opt/openwa/.env` and its secrets.

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
