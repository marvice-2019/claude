#!/usr/bin/env bash
# Fresh n8n install on a Hostinger (or any Ubuntu 24.04) VPS.
# WIPES every existing Docker container, volume and image, then deploys deploy/n8n.
#
#   curl -fsSL https://raw.githubusercontent.com/marvice-2019/claude/feat/n8n-production-stack/deploy/n8n/scripts/install.sh \
#     | bash -s -- n8n.marvice.tech you@marvice.tech
set -euo pipefail

DOMAIN="${1:?usage: install.sh <domain> <acme-email>}"
EMAIL="${2:?usage: install.sh <domain> <acme-email>}"
REPO="${REPO:-https://github.com/marvice-2019/claude.git}"
REF="${REF:-feat/n8n-production-stack}"
DIR="${DIR:-/opt/n8n}"
STACK="$DIR/deploy/n8n"

log() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
[[ $EUID -eq 0 ]] || { echo "run as root"; exit 1; }

# 1. DNS sanity — Let's Encrypt fails if the domain doesn't point here
MYIP="$(curl -4fsS --max-time 10 https://api.ipify.org || true)"
DNSIP="$(getent ahostsv4 "$DOMAIN" | awk 'NR==1{print $1}')"
if [[ "${SKIP_DNS_CHECK:-0}" != 1 && -n "$MYIP" && "$DNSIP" != "$MYIP" ]]; then
  echo "DNS: $DOMAIN -> ${DNSIP:-nothing}, this server is $MYIP. Fix the A record first."; exit 1
fi

# 2. Wipe old setup (template containers, Traefik, volumes)
if [[ "${SKIP_WIPE:-0}" != 1 ]] && command -v docker >/dev/null; then
  log "Removing all existing Docker containers, volumes and images"
  docker ps -aq | xargs -r docker rm -f
  docker system prune -af --volumes
  docker network prune -f
fi
for svc in nginx apache2 caddy traefik; do
  systemctl disable --now "$svc" 2>/dev/null || true
done

# 3. Harden + Docker
if [[ "${SKIP_BOOTSTRAP:-0}" != 1 ]]; then
  log "Bootstrapping server"
  apt-get update -y && apt-get install -y git curl python3
  TMPB="$(mktemp)"; curl -fsSL "https://raw.githubusercontent.com/marvice-2019/claude/$REF/deploy/n8n/scripts/bootstrap-vps.sh" -o "$TMPB"
  bash "$TMPB"; rm -f "$TMPB"
fi

# 4. Fresh code
log "Fetching stack ($REF)"
rm -rf "$DIR"
git clone --depth 1 --branch "$REF" "$REPO" "$DIR"

# 5. Secrets
log "Generating .env"
cd "$STACK"
cp .env.example .env
sed -i "s|^N8N_HOST=.*|N8N_HOST=$DOMAIN|; s|^ACME_EMAIL=.*|ACME_EMAIL=$EMAIL|" .env
sed -i "s|^N8N_ENCRYPTION_KEY=.*|N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)|" .env
sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 24)|" .env
chmod 600 .env

# 6. Up
log "Starting n8n"
for i in 1 2 3 4 5; do docker compose pull -q && break; echo "pull failed, retry $i in $((i*20))s"; sleep $((i*20)); done
docker compose up -d
for i in $(seq 1 60); do
  [[ "$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose ps -q n8n)" 2>/dev/null)" == healthy ]] && break
  sleep 3
done
docker compose ps

# 7. Workflow (imported inactive — needs Google Sheets credential + API keys first)
log "Importing n8n-import-complete.json"
python3 - "$DIR/workflows/n8n-import-complete.json" /tmp/wf.json <<'EOF'
import json, sys
d = json.load(open(sys.argv[1])); d["id"] = "voiceAgentMain01"; d["active"] = False
json.dump(d, open(sys.argv[2], "w"))
EOF
docker compose cp /tmp/wf.json n8n:/tmp/wf.json >/dev/null 2>&1
docker compose exec -T n8n n8n import:workflow --input=/tmp/wf.json || echo "import failed — import manually from the editor"
rm -f /tmp/wf.json

# 8. Backups
( crontab -l 2>/dev/null | grep -v n8n/scripts/backup.sh
  echo "15 3 * * * $STACK/scripts/backup.sh >> /var/log/n8n-backup.log 2>&1" ) | crontab -

# 9. TLS check
if [[ "${SKIP_TLS_CHECK:-0}" != 1 ]]; then
  log "Waiting for Let's Encrypt certificate"
  for i in $(seq 1 40); do
    curl -fsS --max-time 10 "https://$DOMAIN/healthz" >/dev/null 2>&1 && { echo "TLS OK"; break; }
    sleep 5
  done
  curl -fsS --max-time 10 "https://$DOMAIN/healthz" >/dev/null || echo "TLS not ready yet — check: docker compose logs caddy"
fi

cat <<EOF

────────────────────────────────────────────────────────────
 n8n is live:  https://$DOMAIN
 1. Open it NOW and create the owner account (first visitor becomes owner)
 2. Save N8N_ENCRYPTION_KEY from $STACK/.env in your password manager
 3. Add API keys:  nano $STACK/.env  &&  cd $STACK && docker compose up -d
 4. In n8n: attach Google Sheets credential, activate "AI Voice Agent — Complete System"
 5. Twilio Voice webhook: https://$DOMAIN/webhook/voice-agent/incoming
 Backups: nightly 03:15 → /var/backups/n8n
────────────────────────────────────────────────────────────
EOF
