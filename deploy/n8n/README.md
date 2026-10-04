# n8n Production Stack

Self-hosted n8n for the voice agent: **queue mode** (main + scalable workers), **Postgres 17**, **Redis**, **Caddy** (auto HTTPS).
Tested end-to-end on n8n 2.41.6: Twilio-style webhook → Caddy TLS → Redis queue → worker → Code node reading `$env.*` → response.

```
Twilio ──https──▶ Caddy :443 ──▶ n8n main (editor, webhooks) ──▶ Redis queue ──▶ n8n worker(s)
                                         └────────────── Postgres 17 ◀──────────────┘
```

## 1. Server

| Item | Recommendation |
|---|---|
| Provider | Hostinger VPS **KVM 2** (2 vCPU / 8 GB) — enough for ~10 concurrent calls; KVM 4 for multi-venue |
| OS template | **Ubuntu 24.04 with Docker** (template id `1121`) |
| Region | India (Mumbai) if available — lowest latency to Twilio India/Exotel and callers |

Prefer this over Hostinger's one-click "n8n" templates: this stack is versioned in git and already carries the `$env` access, `N8N_BASE_URL` and worker settings these workflows need, so a rebuild is one command.

## 2. DNS

`A` record `n8n.yourdomain.com → <VPS IP>`. Wait until `dig +short n8n.yourdomain.com` returns the IP — Caddy needs it to issue the certificate.

## 3. Install

```bash
ssh root@<VPS IP>
git clone https://github.com/marvice-2019/claude.git /opt/n8n
bash /opt/n8n/deploy/n8n/scripts/bootstrap-vps.sh   # firewall, swap, fail2ban, auto security updates

cd /opt/n8n/deploy/n8n
cp .env.example .env
sed -i "s/^N8N_ENCRYPTION_KEY=.*/N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)/" .env
sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(openssl rand -hex 24)/" .env
nano .env    # N8N_HOST, ACME_EMAIL, all API keys
chmod 600 .env

docker compose up -d
docker compose ps        # all healthy within ~60s
```

Open `https://n8n.yourdomain.com` → create the owner account (do this immediately — the first visitor becomes owner).

**Copy `N8N_ENCRYPTION_KEY` into your password manager now.** Lose it and every stored credential is unrecoverable, backups included.

## 4. Import the workflows

Import **one** set — they share webhook paths, so activating two sets will conflict.

| Set | Files | Twilio Voice URL |
|---|---|---|
| **Complete (recommended)** | `workflows/n8n-import-complete.json` | `https://<host>/webhook/voice-agent/incoming` |
| Split | `n8n-import-call-handler.json` + `n8n-import-ai-brain.json` + `n8n-import-crm-whatsapp.json` | `https://<host>/webhook/voice/incoming` |

Editor → Workflows → **Import from File**. Then attach the Google Sheets credential to each Sheets node and activate.

Don't import `main-voice-agent.json`, `outbound-campaign.json` or `feedback-learning-loop.json`: n8n 2.x rejects them ("Workflow structure is invalid").

## 5. Secrets model

Workflows read keys as `$env.X`, so they live in `.env` (not n8n Settings → Variables, which is `$vars` and a paid feature). After editing `.env`:

```bash
docker compose up -d     # recreates n8n + workers with the new env
```

## 6. Backups

```bash
crontab -e
15 3 * * * /opt/n8n/deploy/n8n/scripts/backup.sh >> /var/log/n8n-backup.log 2>&1
```

Nightly `pg_dump` + per-workflow/credential JSON, 14-day retention in `/var/backups/n8n`. Add an off-site copy (rclone → Google Drive/S3). Also enable Hostinger weekly VPS snapshots.

Restore:
```bash
docker compose exec -T postgres pg_restore -U n8n -d n8n --clean --if-exists < n8n.dump
docker compose restart n8n n8n-worker
```

## 7. Operations

| Task | Command |
|---|---|
| Logs | `docker compose logs -f n8n n8n-worker` |
| Scale workers | `docker compose up -d --scale n8n-worker=3` |
| Upgrade n8n | bump `N8N_VERSION` in `.env` → backup → `docker compose pull && docker compose up -d` |
| Health | `curl https://<host>/healthz` |

Upgrade rule: read the release notes for anything crossing a minor version, back up first, never use `latest` in production.

## Why these settings

| Setting | Reason |
|---|---|
| `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` | n8n 2.x blocks `$env` by default; every workflow here depends on it |
| `N8N_BASE_URL=https://<host>` | 11 Code nodes build Twilio callback URLs from it; unset = calls die after the greeting |
| `WEBHOOK_URL` / `N8N_PROXY_HOPS=1` | Correct public webhook URLs and client IPs behind Caddy |
| `N8N_LISTEN_ADDRESS=0.0.0.0` | n8n 2.x binds IPv6 `::` by default and crash-loops on hosts without container IPv6 |
| Postgres 17 | n8n 2.41 flags Postgres 16 as compatibility-only |
| Queue mode + `OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS` | Long Claude/TTS calls don't block the webhook receiver; scale by adding workers |
| Execution pruning (14 days) | Call logs grow fast; keeps Postgres small |
| `/metrics` → 404 at Caddy | Prometheus metrics stay internal |
