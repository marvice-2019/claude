#!/usr/bin/env bash
# One-time setup for dots.marvice.tech on the Marvice VPS, where Docker + Traefik
# (Hostinger's n8n template) already own ports 80/443. Run as root:
#
#   curl -fsSL https://raw.githubusercontent.com/marvice-2019/claude/main/scripts/vps-setup-dots.sh | bash
#
# Runs nginx:alpine as a container behind the existing Traefik, serving /var/www/<domain>.
# Traefik picks it up from labels and issues the certificate itself once DNS points here.
# Reads the cert resolver, entrypoints and network from the running Traefik's flags;
# override with CERT_RESOLVER / ENTRYPOINT / NETWORK if Traefik is configured by file.
#
# Optional env: DOMAIN (default dots.marvice.tech), DEPLOY_USER (default deploy).
# Safe to re-run: recreates the container, never touches Traefik or other containers.
# Prints the GitHub secrets .github/workflows/deploy-dots.yml needs.
set -euo pipefail

DOMAIN="${DOMAIN:-dots.marvice.tech}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
SUBDOMAIN="${DOMAIN%%.*}"
NAME="${DOMAIN//./-}"
WEBROOT="/var/www/${DOMAIN}"
CONF_DIR="/etc/${DOMAIN}"
IMAGE="nginx:1.27-alpine"

[ "$(id -u)" -eq 0 ] || { echo "Run as root (sudo -i first)." >&2; exit 1; }
command -v docker >/dev/null || { echo "Docker not found. This script is for the Traefik/Docker VPS." >&2; exit 1; }

echo "==> Finding Traefik"
TRAEFIK="$(docker ps --format '{{.Names}} {{.Image}}' | awk '$2 ~ /traefik/ {print $1; exit}')"
[ -n "$TRAEFIK" ] || { echo "No running Traefik container found." >&2; exit 1; }
FLAGS="$(docker inspect -f '{{join .Config.Cmd "\n"}}{{"\n"}}{{join .Args "\n"}}' "$TRAEFIK" | sort -u)"
flag() { printf '%s\n' "$FLAGS" | sed -nE "$1" | head -n1; }

CERT_RESOLVER="${CERT_RESOLVER:-$(flag 's/^--certificatesresolvers\.([^.]+)\..*/\1/Ip')}"
ENTRYPOINT="${ENTRYPOINT:-$(flag 's/^--entrypoints\.([^.]+)\.address=:443$/\1/Ip')}"
WEB_ENTRYPOINT="$(flag 's/^--entrypoints\.([^.]+)\.address=:80$/\1/Ip')"
GLOBAL_REDIRECT="$(flag 's/^--entrypoints\.[^.]+\.http\.redirections\.entrypoint\.to=(.*)/\1/Ip')"
NETWORK="${NETWORK:-$(flag 's/^--providers\.docker\.network=(.*)/\1/Ip')}"
if [ -z "$NETWORK" ]; then
  NETWORK="$(docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{"\n"}}{{end}}' "$TRAEFIK" | grep -v '^$' | head -n1)"
fi
for v in CERT_RESOLVER ENTRYPOINT NETWORK; do
  [ -n "${!v}" ] || { echo "Couldn't detect $v from Traefik's flags; re-run with $v=... set." >&2; exit 1; }
done
echo "    traefik=$TRAEFIK network=$NETWORK entrypoint=$ENTRYPOINT resolver=$CERT_RESOLVER"

echo "==> Deploy user '${DEPLOY_USER}' and web root ${WEBROOT}"
if ! command -v rsync >/dev/null || ! command -v ssh-keygen >/dev/null; then
  apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq rsync openssh-client >/dev/null
fi
id "$DEPLOY_USER" >/dev/null 2>&1 || useradd --create-home --shell /bin/bash "$DEPLOY_USER"
mkdir -p "$WEBROOT" "$CONF_DIR"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$WEBROOT"
chmod 755 "$WEBROOT"
[ -f "$WEBROOT/index.html" ] || { echo "<!doctype html><title>${DOMAIN}</title><p>Deploy pending.</p>" > "$WEBROOT/index.html"; chown "$DEPLOY_USER:$DEPLOY_USER" "$WEBROOT/index.html"; }

# TLS terminates at Traefik; this only serves files. Headers are repeated per location
# because nginx drops server-level add_header inside a location that sets its own.
cat > "$CONF_DIR/default.conf" <<'NGINX'
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;
    autoindex off;
    server_tokens off;

    location ~ /\. { deny all; }

    location ~* \.(css|svg|png|ico)$ {
        add_header X-Robots-Tag "noindex, nofollow" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Cache-Control "public, max-age=86400";
        try_files $uri =404;
    }

    location / {
        add_header X-Robots-Tag "noindex, nofollow" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header X-Frame-Options "DENY" always;
        add_header Strict-Transport-Security "max-age=31536000" always;
        add_header Cache-Control "no-cache";
        try_files $uri $uri/ =404;
    }
}
NGINX

echo "==> Container ${NAME}"
LABELS=(
  --label "traefik.enable=true"
  --label "traefik.docker.network=${NETWORK}"
  --label "traefik.http.routers.${NAME}.rule=Host(\`${DOMAIN}\`)"
  --label "traefik.http.routers.${NAME}.entrypoints=${ENTRYPOINT}"
  --label "traefik.http.routers.${NAME}.tls=true"
  --label "traefik.http.routers.${NAME}.tls.certresolver=${CERT_RESOLVER}"
  --label "traefik.http.services.${NAME}.loadbalancer.server.port=80"
)
# Hostinger's template redirects :80 → :443 globally; add a per-site redirect only if it doesn't.
if [ -z "$GLOBAL_REDIRECT" ] && [ -n "$WEB_ENTRYPOINT" ]; then
  LABELS+=(
    --label "traefik.http.routers.${NAME}-http.rule=Host(\`${DOMAIN}\`)"
    --label "traefik.http.routers.${NAME}-http.entrypoints=${WEB_ENTRYPOINT}"
    --label "traefik.http.routers.${NAME}-http.middlewares=${NAME}-https"
    --label "traefik.http.middlewares.${NAME}-https.redirectscheme.scheme=https"
  )
fi
docker pull -q "$IMAGE" >/dev/null
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" --restart unless-stopped \
  --network "$NETWORK" \
  -v "$WEBROOT:/usr/share/nginx/html:ro" \
  -v "$CONF_DIR/default.conf:/etc/nginx/conf.d/default.conf:ro" \
  "${LABELS[@]}" \
  "$IMAGE" >/dev/null
sleep 2
docker exec "$NAME" wget -q -O /dev/null http://127.0.0.1/ || { echo "nginx container isn't serving; check: docker logs $NAME" >&2; exit 1; }

echo "==> DNS"
PUBLIC_IP="$(curl -fsS4 --max-time 10 https://api.ipify.org || true)"
DNS_IP="$( (getent ahostsv4 "$DOMAIN" || true) | awk 'NR==1{print $1}')"
if [ -n "$PUBLIC_IP" ] && [ "$DNS_IP" = "$PUBLIC_IP" ]; then
  DNS_OK=1
else
  echo "!! ${DOMAIN} resolves to '${DNS_IP:-nothing}', this server is '${PUBLIC_IP:-unknown}'."
  echo "!! Add DNS A record: ${SUBDOMAIN} -> ${PUBLIC_IP:-<this VPS IP>}. Traefik issues SSL on the first HTTPS request after that."
  DNS_OK=0
fi

echo "==> Deploy key"
SSH_DIR="/home/${DEPLOY_USER}/.ssh"
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$SSH_DIR"
touch "$SSH_DIR/authorized_keys"
KEY_COMMENT="github-actions-${DOMAIN}"
TMPKEY="$(mktemp -d)/id_ed25519"
NEW_KEY=0
# One key per deploy user: any earlier github-actions-* key (e.g. another site's) already covers it.
if ! grep -q "github-actions-" "$SSH_DIR/authorized_keys"; then
  ssh-keygen -q -t ed25519 -N "" -C "$KEY_COMMENT" -f "$TMPKEY"
  cat "${TMPKEY}.pub" >> "$SSH_DIR/authorized_keys"
  NEW_KEY=1
fi
chown "$DEPLOY_USER:$DEPLOY_USER" "$SSH_DIR/authorized_keys"
chmod 600 "$SSH_DIR/authorized_keys"

SSH_PORT="$( (sshd -T 2>/dev/null || true) | awk '/^port /{print $2; exit}')"
SSH_PORT="${SSH_PORT:-22}"
KNOWN_HOSTS="$( (ssh-keyscan -p "$SSH_PORT" -t ed25519 127.0.0.1 2>/dev/null || true) | sed "s/^[^ ]*/${PUBLIC_IP:-HOST}/")"
[ -n "$KNOWN_HOSTS" ] || KNOWN_HOSTS="<sshd not reachable on port ${SSH_PORT}; check: systemctl status ssh>"
[ "$SSH_PORT" = 22 ] || KNOWN_HOSTS="$(echo "$KNOWN_HOSTS" | sed "s/^[^ ]*/[${PUBLIC_IP:-HOST}]:${SSH_PORT}/")"

cat <<EOF

================================================================
 Done. Add these at:
 https://github.com/marvice-2019/claude/settings/secrets/actions
----------------------------------------------------------------
 VPS_HOST         ${PUBLIC_IP:-<this VPS public IP>}
 VPS_USER         ${DEPLOY_USER}
 VPS_KNOWN_HOSTS  ${KNOWN_HOSTS}
EOF
[ "$SSH_PORT" = 22 ] || echo " VPS_PORT         ${SSH_PORT}   (add under the Variables tab, not Secrets)"
if [ "$NEW_KEY" = 1 ]; then
  echo " VPS_SSH_KEY      (everything between the lines below, including BEGIN/END)"
  echo "----------------------------------------------------------------"
  cat "$TMPKEY"
  echo "----------------------------------------------------------------"
  rm -rf "$(dirname "$TMPKEY")"
  echo " This private key is NOT stored on the server. Copy it now."
else
  echo " VPS_SSH_KEY      already issued on an earlier run. If you lost it, delete the"
  echo "                  github-actions-* line in ${SSH_DIR}/authorized_keys and re-run."
fi
[ "$DNS_OK" = 1 ] || echo " DNS not pointing here yet: add the A record above."
echo "================================================================"
