#!/usr/bin/env bash
# OpenWA one-shot installer — Marvice Media
# Usage (as root on a fresh Ubuntu 22.04/24.04 VPS):
#   curl -fsSL https://raw.githubusercontent.com/marvice-2019/claude/claude/laughing-thompson-63si0a/deploy/openwa/install.sh | \
#     DOMAIN=whatsapp.marvice.tech EMAIL=marvice2019@gmail.com bash
set -euo pipefail

DOMAIN="${DOMAIN:-whatsapp.marvice.tech}"
EMAIL="${EMAIL:?set EMAIL=you@domain for LetsEncrypt}"
DIR="${DIR:-/opt/openwa}"
KIT_RAW="${KIT_RAW:-https://raw.githubusercontent.com/marvice-2019/claude/claude/laughing-thompson-63si0a/deploy/openwa}"
ENGINE="${ENGINE:-}"   # blank = whatsapp-web.js (safer); "baileys" for low-RAM boxes

log() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
[ "$(id -u)" -eq 0 ] || { echo "Run as root"; exit 1; }

log "Packages"
apt-get update -qq
apt-get install -y -qq git curl openssl ufw dnsutils >/dev/null
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

log "DNS check"
PUBLIC_IP="$(curl -fsS https://api.ipify.org || true)"
DNS_IP="$(dig +short A "$DOMAIN" | tail -n1 || true)"
echo "VPS public IP: ${PUBLIC_IP:-unknown}   $DOMAIN -> ${DNS_IP:-<none>}"
if [ -n "$PUBLIC_IP" ] && [ "$DNS_IP" != "$PUBLIC_IP" ]; then
  echo "WARNING: $DOMAIN does not resolve to this VPS yet. Add an A record:"
  echo "  whatsapp  A  $PUBLIC_IP  (TTL 300)"
  echo "Caddy will retry certificate issuance automatically once DNS propagates."
fi

log "Firewall"
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw allow 443/udp >/dev/null
ufw --force enable >/dev/null

log "OpenWA source (compose definitions) -> $DIR"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" pull --ff-only
else
  git clone --depth 1 https://github.com/rmyndharis/OpenWA.git "$DIR"
fi
cd "$DIR"
curl -fsSL "$KIT_RAW/docker-compose.override.yml" -o docker-compose.override.yml
curl -fsSL "$KIT_RAW/Caddyfile" -o Caddyfile

if [ ! -f .env ]; then
  log "Generating .env with fresh secrets"
  rnd() { openssl rand -hex "$1"; }
  MASTER_KEY="owa_$(rnd 32)"
  cat > .env <<ENV
# Generated $(date -u +%FT%TZ) — keep this file private (chmod 600). Back it up.
COMPOSE_PROFILES=postgres
OPENWA_VERSION=latest
OPENWA_DOMAIN=$DOMAIN
ACME_EMAIL=$EMAIL

NODE_ENV=production
TZ=Asia/Kolkata
LOG_LEVEL=info
BASE_URL=https://$DOMAIN
DASHBOARD_URL=https://$DOMAIN
CORS_ORIGINS=https://$DOMAIN
TRUSTED_PROXIES=172.30.0.10

DATABASE_TYPE=postgres
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=openwa
DATABASE_USERNAME=openwa_app
DATABASE_PASSWORD=$(rnd 24)

# First-boot admin key. Pepper must NEVER change after first boot (locks out every key).
API_MASTER_KEY=$MASTER_KEY
API_KEY_PEPPER=$(rnd 32)
METRICS_TOKEN=$(rnd 24)

ENGINE_TYPE=$ENGINE
AUTO_START_SESSIONS=true
SEND_PACING_ENABLED=true
SIMULATE_TYPING=true
OPENWA_MEM_LIMIT=2g
ENV
  chmod 600 .env
else
  log ".env exists — keeping existing secrets"
fi

log "Pull + start"
docker compose pull
docker compose up -d --no-build

log "Waiting for API health"
for i in $(seq 1 40); do
  if docker exec openwa-api curl -fsS http://localhost:2785/api/health/ready >/dev/null 2>&1; then
    echo "API ready"; break
  fi
  sleep 5
done
docker compose ps

KEY="$(grep '^API_MASTER_KEY=' .env | cut -d= -f2-)"
cat <<DONE

==========================================================
 OpenWA is live
 Dashboard : https://$DOMAIN
 API base  : https://$DOMAIN/api
 Admin key : $KEY
 (stored in $DIR/.env — rotate it from the dashboard after first login)
 Logs      : cd $DIR && docker compose logs -f openwa-api caddy
==========================================================
DONE
