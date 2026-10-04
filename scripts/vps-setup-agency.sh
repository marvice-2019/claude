#!/usr/bin/env bash
# One-time VPS setup for agency.marvice.tech (Ubuntu/Debian, run as root).
#
#   curl -fsSL https://raw.githubusercontent.com/marvice-2019/claude/main/scripts/vps-setup-agency.sh | bash
#
# Optional env: CERTBOT_EMAIL=you@example.com (expiry notices), DOMAIN, DEPLOY_USER.
#
# Safe to re-run. Adds its own nginx site only; never touches other sites.
# Prints the three GitHub secrets the deploy workflow needs.
set -euo pipefail

DOMAIN="${DOMAIN:-agency.marvice.tech}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
WEBROOT="/var/www/${DOMAIN}"
SITE="/etc/nginx/sites-available/${DOMAIN}"

[ "$(id -u)" -eq 0 ] || { echo "Run as root (sudo -i first)." >&2; exit 1; }
command -v apt-get >/dev/null || { echo "Needs Ubuntu/Debian (apt-get)." >&2; exit 1; }

echo "==> Checking ports 80/443"
if ss -ltnp 2>/dev/null | grep -E ':(80|443)\s' | grep -vq nginx; then
  echo "Something other than nginx is listening on 80/443:" >&2
  ss -ltnp | grep -E ':(80|443)\s' >&2
  echo "Stop it (or put this site behind it) and re-run." >&2
  exit 1
fi

echo "==> Installing nginx, certbot, rsync"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx rsync dnsutils curl >/dev/null

echo "==> Deploy user '${DEPLOY_USER}' and web root ${WEBROOT}"
id "$DEPLOY_USER" >/dev/null 2>&1 || useradd --create-home --shell /bin/bash "$DEPLOY_USER"
mkdir -p "$WEBROOT"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$WEBROOT"
chmod 755 "$WEBROOT"
[ -f "$WEBROOT/index.html" ] || echo "<!doctype html><title>${DOMAIN}</title><p>Deploy pending.</p>" > "$WEBROOT/index.html"

echo "==> nginx site"
# Mirrors landing/.htaccess. Headers live in a snippet because nginx drops
# server-level add_header inside any location that sets its own.
# HSTS is ignored by browsers over plain HTTP, so it is safe before SSL exists.
SNIPPET="/etc/nginx/snippets/${DOMAIN}-headers.conf"
cat > "$SNIPPET" <<'NGINX'
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header X-Frame-Options "SAMEORIGIN" always;
NGINX
# Only write the site once: certbot edits it in place to add the 443 block.
if [ ! -f "$SITE" ]; then
cat > "$SITE" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    root ${WEBROOT};
    index index.html;
    autoindex off;

    location ~ /\. { deny all; }

    location ~* \.(png|ico|css)\$ {
        include ${SNIPPET};
        add_header Cache-Control "public, max-age=604800";
        try_files \$uri =404;
    }

    location / {
        include ${SNIPPET};
        add_header Cache-Control "public, max-age=300, must-revalidate";
        try_files \$uri \$uri/ =404;
    }
}
NGINX
fi
ln -sf "$SITE" "/etc/nginx/sites-enabled/${DOMAIN}"
nginx -t
systemctl enable --now nginx >/dev/null
systemctl reload nginx

if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  echo "==> Opening firewall for nginx"
  ufw allow 'Nginx Full' >/dev/null
fi

echo "==> SSL"
PUBLIC_IP="$(curl -fsS4 --max-time 10 https://api.ipify.org || true)"
DNS_IP="$(dig +short A "$DOMAIN" | tail -n1)"
if [ -n "$PUBLIC_IP" ] && [ "$DNS_IP" = "$PUBLIC_IP" ]; then
  if [ -n "${CERTBOT_EMAIL:-}" ]; then EMAIL_ARGS=(-m "$CERTBOT_EMAIL"); else EMAIL_ARGS=(--register-unsafely-without-email); fi
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --redirect --keep-until-expiring "${EMAIL_ARGS[@]}"
  SSL_OK=1
else
  echo "!! ${DOMAIN} resolves to '${DNS_IP:-nothing}', this server is '${PUBLIC_IP:-unknown}'."
  echo "!! Add DNS A record: agency -> ${PUBLIC_IP:-<this VPS IP>}, wait a few minutes, re-run this script for SSL."
  SSL_OK=0
fi

echo "==> Deploy key"
SSH_DIR="/home/${DEPLOY_USER}/.ssh"
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$SSH_DIR"
touch "$SSH_DIR/authorized_keys"
KEY_COMMENT="github-actions-${DOMAIN}"
TMPKEY="$(mktemp -d)/id_ed25519"
NEW_KEY=0
if ! grep -q "$KEY_COMMENT" "$SSH_DIR/authorized_keys"; then
  ssh-keygen -q -t ed25519 -N "" -C "$KEY_COMMENT" -f "$TMPKEY"
  cat "${TMPKEY}.pub" >> "$SSH_DIR/authorized_keys"
  NEW_KEY=1
fi
chown "$DEPLOY_USER:$DEPLOY_USER" "$SSH_DIR/authorized_keys"
chmod 600 "$SSH_DIR/authorized_keys"

SSH_PORT="$(sshd -T 2>/dev/null | awk '/^port /{print $2; exit}')"
SSH_PORT="${SSH_PORT:-22}"
KNOWN_HOSTS="$(ssh-keyscan -p "$SSH_PORT" -t ed25519 127.0.0.1 2>/dev/null | sed "s/^[^ ]*/${PUBLIC_IP:-HOST}/")"
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
  echo "                  '${KEY_COMMENT}' line in ${SSH_DIR}/authorized_keys and re-run."
fi
[ "$SSL_OK" = 1 ] || echo " SSL NOT issued yet: fix DNS, then re-run this script."
echo "================================================================"
