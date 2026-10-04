# n8n on n8n.marvice.tech

This deploys n8n with a Postgres 17 database. Traefik sits in front and handles Let's Encrypt TLS. It runs on any Ubuntu/Debian VPS.

## Deploy

1. **DNS:** point an `A` record for `n8n.marvice.tech` at the VPS IP. Today it points to `91.108.110.216`.
2. **On the VPS, as root:**
   ```bash
   git clone -b claude/deploy-n8n https://github.com/marvice-2019/claude.git /opt/marvice && cd /opt/marvice/deploy/n8n
   ./deploy.sh
   ```
3. Open https://n8n.marvice.tech and create the owner account right away. Until you do, the instance is unclaimed.

## What `deploy.sh` does

- Installs Docker if it's missing.
- Generates `.env` with a random Postgres password and `N8N_ENCRYPTION_KEY` (file mode 600, git-ignored).
- Stops early if DNS doesn't point at this host. Without that, Let's Encrypt would fail.
- **If a Traefik container is already running** (Hostinger n8n template, Coolify, Dokploy), it joins that Traefik's network and reuses its entrypoint and cert resolver. Otherwise it starts its own Traefik on ports 80/443.
- If the existing Traefik predates v3.6.1 and this host runs Docker Engine 29+, the script upgrades it. Old Traefik can't read Docker's API on that version, so it silently serves 404 and a self-signed certificate for every domain. The old compose file is backed up as `*.bak-<timestamp>`.
- Waits for `/healthz` over HTTPS.

Also open TCP 80 and 443 in the Hostinger VPS firewall (hPanel → VPS → Security → Firewall), if a firewall is enabled.

## Ops

| Task | Command |
|---|---|
| Upgrade | `docker compose pull && docker compose up -d` (add `--profile proxy` if using the bundled Traefik) |
| Logs | `docker compose logs -f n8n` |
| DB backup | `docker compose exec postgres pg_dump -U n8n n8n \| gzip > n8n-$(date +%F).sql.gz` |
| Pin a version | set `N8N_VERSION=<tag>` in `.env` |
| Skip DNS pre-check | `SKIP_DNS_CHECK=1 ./deploy.sh` (e.g. while DNS is propagating) |

**Back up `N8N_ENCRYPTION_KEY` offline.** If you lose it, every saved credential is unreadable.

After deploy, set `N8N_BASE_URL=https://n8n.marvice.tech` in `configs/env-template.env`. Twilio webhooks then go to `https://n8n.marvice.tech/webhook/voice-agent/incoming`.
