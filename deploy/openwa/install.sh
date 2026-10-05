#!/usr/bin/env bash
# OpenWA one-shot installer — Marvice Media
# Usage (as root on Ubuntu 22.04/24.04):
#   curl -fsSL https://raw.githubusercontent.com/marvice-2019/claude/claude/laughing-thompson-63si0a/deploy/openwa/install.sh | \
#     DOMAIN=whatsapp.marvice.tech EMAIL=marvice2019@gmail.com bash
#
# Plugs into whatever already owns :80/:443 so existing sites (n8n etc.) keep running:
#   traefik  (Docker container, e.g. Hostinger n8n template) -> router labels on openwa-api
#   nginx    (host)                                           -> site + certbot
#   caddy    (host)                                           -> site block appended
#   none                                                      -> bundled Caddy container
# Force one with PROXY=traefik|nginx|caddy-host|caddy.
set -euo pipefail

DOMAIN="${DOMAIN:-whatsapp.marvice.tech}"
EMAIL="${EMAIL:?set EMAIL=you@domain for LetsEncrypt}"
DIR="${DIR:-/opt/openwa}"
KIT_RAW="${KIT_RAW:-https://raw.githubusercontent.com/marvice-2019/claude/claude/laughing-thompson-63si0a/deploy/openwa}"
ENGINE="${ENGINE:-}"   # blank = whatsapp-web.js (safer); "baileys" for low-RAM boxes
PROXY="${PROXY:-}"
RESOLVER="${RESOLVER:-}"   # Traefik certresolver name; auto-detected when blank
SUBNET_GW=172.30.0.1   # gateway of the pinned openwa-network (host -> container traffic source)

log()  { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33mWARN: %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31mERROR: %s\033[0m\n' "$*"; exit 1; }
[ "$(id -u)" -eq 0 ] || die "Run as root"

log "Packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq git curl openssl dnsutils iproute2 >/dev/null
command -v docker >/dev/null || curl -fsSL https://get.docker.com | sh
systemctl enable --now docker >/dev/null 2>&1 || true
docker compose version >/dev/null || die "docker compose plugin missing"

log "DNS check"
PUBLIC_IP="$(curl -fsS -4 https://api.ipify.org || true)"
DNS_IP="$(dig +short A "$DOMAIN" @1.1.1.1 | tail -n1 || true)"
echo "VPS public IP: ${PUBLIC_IP:-unknown}   $DOMAIN -> ${DNS_IP:-<none>}"
if [ -n "$PUBLIC_IP" ] && [ "$DNS_IP" != "$PUBLIC_IP" ]; then
  warn "$DOMAIN does not resolve here yet. Add in hPanel DNS:  A  ${DOMAIN%%.*}  $PUBLIC_IP  TTL 300"
  warn "The certificate is issued automatically once DNS propagates."
fi

# ---------------------------------------------------------------- proxy detection
port_owner() { ss -ltnpH "( sport = :$1 )" 2>/dev/null | grep -oP 'users:\(\("\K[^"]+' | head -n1 || true; }
TRAEFIK_CTR="$(docker ps --format '{{.Names}} {{.Image}}' | awk 'tolower($2) ~ /traefik/ {print $1; exit}' || true)"
if [ -z "$PROXY" ]; then
  OWNER443="$(port_owner 443 || true)"
  if [ -n "$TRAEFIK_CTR" ]; then PROXY=traefik
  elif [ "$OWNER443" = "nginx" ]; then PROXY=nginx
  elif [ "$OWNER443" = "caddy" ]; then PROXY=caddy-host
  elif [ -z "$OWNER443" ] && [ -z "$(port_owner 80 || true)" ]; then PROXY=caddy
  else die ":443 is held by '${OWNER443}' which this script doesn't know. Rerun with PROXY=... or share 'ss -ltnp' output."
  fi
fi
log "Reverse proxy mode: $PROXY"

# ---------------------------------------------------------------- source + override
log "OpenWA compose definitions -> $DIR"
if [ -d "$DIR/.git" ]; then git -C "$DIR" pull --ff-only; else git clone --depth 1 https://github.com/rmyndharis/OpenWA.git "$DIR"; fi
cd "$DIR"

# openwa-api must stay LAST: traefik mode appends its networks/labels directly below it.
COMMON_OVERRIDE="services:
  # Not needed: Postgres runs via compose profile. Upstream advises disabling it otherwise.
  docker-proxy:
    profiles: ['disabled']
  openwa-api:
    image: ghcr.io/rmyndharis/openwa:\${OPENWA_VERSION:-latest}"

PINNED_NET="networks:
  openwa-network:
    ipam:
      config:
        - subnet: 172.30.0.0/24"

case "$PROXY" in
  traefik)
    ARGS="$(docker inspect -f '{{join .Args "\n"}}' "$TRAEFIK_CTR")"
    CFG="$( (docker exec "$TRAEFIK_CTR" sh -c 'cat /etc/traefik/traefik.y*ml /traefik.y*ml 2>/dev/null') || true)"
    EP="$(printf '%s\n' "$ARGS" | grep -oiP -- '--entrypoints\.\K[^.]+(?=\.address=:443)' | head -n1 || true)"
    [ -z "$EP" ] && EP="$(printf '%s\n' "$CFG" | grep -B2 -iP 'address:\s*"?:443' | grep -oP '^\s*\K[A-Za-z0-9_-]+(?=:\s*$)' | tail -n1 || true)"
    EP="${EP:-websecure}"
    [ -z "$RESOLVER" ] && RESOLVER="$(printf '%s\n' "$ARGS" | grep -oiP -- '--certificatesresolvers\.\K[^.]+' | head -n1 || true)"
    [ -z "$RESOLVER" ] && RESOLVER="$(printf '%s\n' "$CFG" | grep -A1 -i 'certificatesResolvers:' | tail -n1 | grep -oP '^\s*\K[A-Za-z0-9_-]+' || true)"
    [ -n "$RESOLVER" ] || die "Could not find Traefik's certresolver. Rerun with RESOLVER=<name>"
    NET="$(docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{"\n"}}{{end}}' "$TRAEFIK_CTR" | grep -v '^$' | grep -vx host | head -n1 || true)"
    [ -n "$NET" ] || die "Traefik container has no attachable network"
    TRAEFIK_IP="$(docker inspect -f "{{(index .NetworkSettings.Networks \"$NET\").IPAddress}}" "$TRAEFIK_CTR")"
    echo "Traefik: container=$TRAEFIK_CTR network=$NET ip=$TRAEFIK_IP entrypoint=$EP resolver=$RESOLVER"
    TRUSTED="$TRAEFIK_IP"
    cat > docker-compose.override.yml <<YML
# Generated by install.sh (traefik mode) — re-run the installer to regenerate.
$COMMON_OVERRIDE
    networks:
      $NET: {}
    labels:
      - traefik.enable=true
      - traefik.docker.network=$NET
      - traefik.http.routers.openwa.rule=Host(\`$DOMAIN\`)
      - traefik.http.routers.openwa.entrypoints=$EP
      - traefik.http.routers.openwa.tls=true
      - traefik.http.routers.openwa.tls.certresolver=$RESOLVER
      - traefik.http.services.openwa.loadbalancer.server.port=2785

networks:
  $NET:
    external: true
YML
    ;;
  caddy)
    curl -fsSL "$KIT_RAW/docker-compose.override.yml" -o docker-compose.override.yml
    curl -fsSL "$KIT_RAW/Caddyfile" -o Caddyfile
    TRUSTED=172.30.0.10
    ;;
  nginx|caddy-host)
    TRUSTED="$SUBNET_GW"
    printf '# Generated by install.sh (%s mode)\n%s\n\n%s\n' "$PROXY" "$COMMON_OVERRIDE" "$PINNED_NET" > docker-compose.override.yml
    ;;
  *) die "Unknown PROXY=$PROXY" ;;
esac

# ---------------------------------------------------------------- .env
if [ ! -f .env ]; then
  log "Generating .env with fresh secrets"
  rnd() { openssl rand -hex "$1"; }
  cat > .env <<ENV
# Generated $(date -u +%FT%TZ) — keep private. Back it up. NEVER change API_KEY_PEPPER.
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
TRUSTED_PROXIES=$TRUSTED

DATABASE_TYPE=postgres
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=openwa
DATABASE_USERNAME=openwa_app
DATABASE_PASSWORD=$(rnd 24)

API_MASTER_KEY=owa_$(rnd 32)
API_KEY_PEPPER=$(rnd 32)
METRICS_TOKEN=$(rnd 24)

ENGINE_TYPE=$ENGINE
AUTO_START_SESSIONS=true
SEND_PACING_ENABLED=true
SIMULATE_TYPING=true
OPENWA_MEM_LIMIT=4g
ENV
  chmod 600 .env
else
  log ".env exists — keeping secrets, refreshing proxy-dependent values"
  sed -i "s|^TRUSTED_PROXIES=.*|TRUSTED_PROXIES=$TRUSTED|" .env
fi

# ---------------------------------------------------------------- start
log "Pull + start"
docker compose pull --quiet
docker compose up -d --no-build --remove-orphans

log "Waiting for API health"
ok=0
for _ in $(seq 1 48); do
  if docker exec openwa-api curl -fsS http://localhost:2785/api/health/ready >/dev/null 2>&1; then ok=1; echo "API ready"; break; fi
  sleep 5
done
[ "$ok" = 1 ] || { docker compose logs --tail 60 openwa-api; die "API not healthy after 4 min"; }

# ---------------------------------------------------------------- host proxies
case "$PROXY" in
  nginx)
    log "nginx site + certificate"
    apt-get install -y -qq certbot python3-certbot-nginx >/dev/null
    cat > /etc/nginx/sites-available/openwa.conf <<NGX
map \$http_upgrade \$openwa_conn { default upgrade; '' close; }
server {
    listen 80;
    server_name $DOMAIN;
    client_max_body_size 30m;
    location / {
        proxy_pass http://127.0.0.1:2785;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$openwa_conn;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }
}
NGX
    ln -sf /etc/nginx/sites-available/openwa.conf /etc/nginx/sites-enabled/openwa.conf
    nginx -t && systemctl reload nginx
    certbot --nginx -d "$DOMAIN" -m "$EMAIL" --agree-tos -n --redirect || warn "certbot failed (DNS not propagated?). Re-run: certbot --nginx -d $DOMAIN"
    ;;
  caddy-host)
    log "Host Caddy site block"
    CF=/etc/caddy/Caddyfile
    if ! grep -q "^$DOMAIN" "$CF"; then
      cp "$CF" "$CF.bak.$(date +%s)"
      printf '\n%s {\n\treverse_proxy 127.0.0.1:2785\n}\n' "$DOMAIN" >> "$CF"
    fi
    caddy validate --config "$CF" --adapter caddyfile && systemctl reload caddy
    ;;
esac

docker compose ps
KEY="$(grep '^API_MASTER_KEY=' .env | cut -d= -f2-)"
cat <<DONE

==========================================================
 OpenWA is live  (proxy: $PROXY)
 Dashboard : https://$DOMAIN
 API base  : https://$DOMAIN/api
 Admin key : $KEY
 (stored in $DIR/.env — rotate from the dashboard after first login)
 Logs      : cd $DIR && docker compose logs -f openwa-api
==========================================================
DONE
