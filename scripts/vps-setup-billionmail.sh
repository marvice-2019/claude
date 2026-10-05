#!/usr/bin/env bash
# BillionMail for email.marvice.tech (Ubuntu 22.04/24.04 or Debian 12, run as root).
#
#   curl -fsSL https://raw.githubusercontent.com/marvice-2019/claude/main/scripts/vps-setup-billionmail.sh | bash
#
# Picks a web mode from whatever owns port 80:
#   traefik     Traefik in Docker (Coolify, Hostinger n8n template, ...): routes the
#               panel through it with Docker labels; Traefik issues the certificate.
#   nginx       nginx on the host: adds a proxy vhost + certbot.
#   standalone  nothing on 80/443: BillionMail binds them itself.
# Mail ports (25/465/587/993/995/143/110) are always published directly.
#
# Optional env: DOMAIN (email.marvice.tech), TZ_NAME (Asia/Kolkata), CERTBOT_EMAIL,
#   TRAEFIK_CONTAINER, TRAEFIK_NETWORK, TRAEFIK_ENTRYPOINT, TRAEFIK_RESOLVER, TRAEFIK_ACME
#   (only needed if auto-detection fails, e.g. Traefik configured via traefik.yml).
#
# Safe to re-run: an existing install is kept and only the proxy wiring is re-applied.
# DNS runbook: docs/billionmail-email-marvice-tech.md
set -euo pipefail

DOMAIN="${DOMAIN:-email.marvice.tech}"
TZ_NAME="${TZ_NAME:-Asia/Kolkata}"
DIR=/opt/BillionMail
REPO=https://github.com/Billionmail/BillionMail.git
SYNC=/usr/local/bin/billionmail-cert-sync

die() { echo "ERROR: $*" >&2; exit 1; }
[ "$(id -u)" -eq 0 ] || die "Run as root (sudo -i first)."
command -v apt-get >/dev/null || die "Needs Ubuntu/Debian (apt-get)."

echo "==> Packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq git curl jq dnsutils netcat-openbsd >/dev/null

echo "==> Resources (want >=2 GB RAM, >=20 GB free disk)"
mem_mb=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
disk_gb=$(df -BG --output=avail / | tail -1 | tr -dc 0-9)
[ "$mem_mb" -ge 1800 ] || die "Only ${mem_mb} MB RAM."
[ "$disk_gb" -ge 20 ] || die "Only ${disk_gb} GB free on /."

echo "==> DNS: ${DOMAIN} must point at this server"
my_ip=$(curl -4fsS https://api.ipify.org)
dns_ip=$(dig +short A "$DOMAIN" @1.1.1.1 | tail -1)
[ "$dns_ip" = "$my_ip" ] || die "${DOMAIN} resolves to '${dns_ip:-nothing}', this server is ${my_ip}. Add A record 'email' -> ${my_ip}, wait, re-run."

echo "==> Outbound port 25"
if ! timeout 8 nc -z gmail-smtp-in.l.google.com 25 2>/dev/null; then
  echo "WARNING: outbound 25 is blocked. Ask Hostinger support to unblock SMTP port 25 on ${my_ip}."
fi

# ---------------------------------------------------------------- web mode
port_owner() { ss -ltnpH "sport = :$1" 2>/dev/null | grep -o 'users:(("[^"]*' | head -1 | cut -d'"' -f2 || true; }
owner80=$(port_owner 80); owner443=$(port_owner 443)
MODE=standalone; TC=""
if [ -n "${TRAEFIK_CONTAINER:-}" ]; then
  MODE=traefik; TC=$TRAEFIK_CONTAINER
elif [ -n "$owner80$owner443" ]; then
  if command -v docker >/dev/null; then
    TC=$(docker ps --filter publish=443 --format '{{.Names}} {{.Image}}' | awk '/traefik/{print $1; exit}')
    [ -n "$TC" ] || TC=$(docker ps --format '{{.Names}} {{.Image}}' | awk '/traefik/{print $1; exit}')
  fi
  if [ -n "$TC" ]; then MODE=traefik
  elif [ "$owner80" = nginx ]; then MODE=nginx
  else die "Port 80/443 is held by '${owner80:-?}/${owner443:-?}', which this script doesn't know how to proxy through. Supported: Traefik in Docker, host nginx."
  fi
fi
echo "==> Web mode: ${MODE}${TC:+ (container ${TC})}"

if [ "$MODE" = traefik ]; then
  args=$(docker inspect -f '{{join .Args "\n"}}' "$TC")
  EP_HTTPS=${TRAEFIK_ENTRYPOINT:-$(sed -nE 's/^--entry[pP]oints\.([^.]+)\.address=:443.*/\1/p' <<<"$args" | head -1)}
  EP_HTTP=$(sed -nE 's/^--entry[pP]oints\.([^.]+)\.address=:80$/\1/p' <<<"$args" | head -1)
  RESOLVER=${TRAEFIK_RESOLVER:-$(sed -nE 's/^--certificates[rR]esolvers\.([^.]+)\.acme\..*/\1/p' <<<"$args" | head -1)}
  ACME=${TRAEFIK_ACME:-$(sed -nE "s/^--certificates[rR]esolvers\.${RESOLVER}\.acme\.storage=(.*)/\1/p" <<<"$args" | head -1)}
  NET=${TRAEFIK_NETWORK:-$(docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{println $k}}{{end}}' "$TC" | grep -vxE 'bridge|host|none' | head -1 || true)}
  for v in EP_HTTPS RESOLVER ACME NET; do
    [ -n "${!v}" ] || die "Couldn't detect Traefik ${v} from ${TC}'s args (static traefik.yml?). Set TRAEFIK_ENTRYPOINT / TRAEFIK_RESOLVER / TRAEFIK_ACME / TRAEFIK_NETWORK and re-run."
  done
  echo "    entrypoint=${EP_HTTPS} http=${EP_HTTP:-none} resolver=${RESOLVER} acme=${ACME} network=${NET}"
fi

if [ "$MODE" != standalone ]; then
  need=2.24.4; have=$(docker compose version --short 2>/dev/null | tr -d v)
  [ "$(printf '%s\n%s\n' "$need" "$have" | sort -V | head -1)" = "$need" ] \
    || die "docker compose ${have:-missing} is too old (need >= ${need}): apt-get install docker-compose-plugin"
fi

echo "==> Mail ports must be free"
busy=$(ss -ltnpH 2>/dev/null | grep -E ':(25|110|143|465|587|993|995)\s' | grep -v docker-proxy || true)
[ -z "$busy" ] || die "Mail ports in use (host postfix/exim?):
${busy}"

# ---------------------------------------------------------------- install
cd /opt
if [ -f "$DIR/.env" ]; then
  echo "==> ${DIR} exists, keeping install, re-applying proxy wiring"
else
  echo "==> Installing BillionMail (installer moves the panel off 80/443 if they're taken)"
  timedatectl set-timezone "$TZ_NAME" || true
  rm -rf "$DIR"; git clone -q "$REPO" "$DIR"
  cd "$DIR"
  # 2+ dots: used verbatim as Postfix myhostname (no "mail." prefix).
  bash install.sh --domain "$DOMAIN" --TZ "$TZ_NAME" 2>&1 | tee /root/billionmail-install.log
fi
cd "$DIR"
envval() { grep -E "^$1=" .env | tail -1 | cut -d= -f2- || true; }
HTTP_PORT=$(envval HTTP_PORT); SAFE=$(envval SafePath)
[ -n "$HTTP_PORT" ] || die "HTTP_PORT missing from ${DIR}/.env"

# ---------------------------------------------------------------- proxy wiring
case "$MODE" in
traefik)
  echo "==> Routing ${DOMAIN} through Traefik; panel no longer published on the host"
  {
    echo "# Generated by vps-setup-billionmail.sh"
    echo "services:"
    echo "  core-billionmail:"
    echo "    ports: !reset []"
    echo "    networks:"
    echo "      traefik-public: {}"
    echo "    labels:"
    echo "      - traefik.enable=true"
    echo "      - traefik.docker.network=${NET}"
    echo "      - traefik.http.services.billionmail.loadbalancer.server.port=${HTTP_PORT}"
    echo "      - traefik.http.routers.billionmail.rule=Host(\`${DOMAIN}\`)"
    echo "      - traefik.http.routers.billionmail.entrypoints=${EP_HTTPS}"
    echo "      - traefik.http.routers.billionmail.tls=true"
    echo "      - traefik.http.routers.billionmail.tls.certresolver=${RESOLVER}"
    echo "      - traefik.http.routers.billionmail.service=billionmail"
    if [ -n "$EP_HTTP" ]; then
      echo "      - traefik.http.routers.billionmail-http.rule=Host(\`${DOMAIN}\`)"
      echo "      - traefik.http.routers.billionmail-http.entrypoints=${EP_HTTP}"
      echo "      - traefik.http.routers.billionmail-http.middlewares=billionmail-https"
      echo "      - traefik.http.routers.billionmail-http.service=billionmail"
      echo "      - traefik.http.middlewares.billionmail-https.redirectscheme.scheme=https"
    fi
    echo "networks:"
    echo "  traefik-public:"
    echo "    external: true"
    echo "    name: ${NET}"
  } > docker-compose.override.yml
  docker compose up -d --remove-orphans

  # Postfix/Dovecot read ssl/cert.pem + key.pem; copy Traefik's cert there.
  cat > "$SYNC" <<EOF
#!/usr/bin/env bash
# Copies the ${DOMAIN} cert from Traefik's acme.json into BillionMail (SMTP/IMAP TLS).
set -euo pipefail
tmp=\$(mktemp -d); trap 'rm -rf "\$tmp"' EXIT
docker cp "${TC}:${ACME}" "\$tmp/acme.json" >/dev/null
q='.[\$r].Certificates[]? | select(.domain.main == \$d)'
jq -r --arg r "${RESOLVER}" --arg d "${DOMAIN}" "\$q | .certificate" "\$tmp/acme.json" | base64 -d > "\$tmp/cert.pem"
jq -r --arg r "${RESOLVER}" --arg d "${DOMAIN}" "\$q | .key" "\$tmp/acme.json" | base64 -d > "\$tmp/key.pem"
[ -s "\$tmp/cert.pem" ] || { echo "No cert for ${DOMAIN} in acme.json yet"; exit 1; }
cmp -s "\$tmp/cert.pem" ${DIR}/ssl/cert.pem && exit 0
install -m 644 "\$tmp/cert.pem" ${DIR}/ssl/cert.pem
install -m 600 "\$tmp/key.pem" ${DIR}/ssl/key.pem
cd ${DIR} && docker compose restart postfix-billionmail dovecot-billionmail >/dev/null
echo "Mail TLS cert updated for ${DOMAIN}"
EOF
  chmod 755 "$SYNC"
  echo "17 4 * * * root $SYNC >/var/log/billionmail-cert-sync.log 2>&1" > /etc/cron.d/billionmail-cert-sync
  echo "==> Waiting for Traefik to issue the certificate (up to 3 min)"
  synced=0
  for _ in $(seq 18); do if "$SYNC" 2>/dev/null; then synced=1; break; fi; sleep 10; done
  [ "$synced" = 1 ] || echo "WARNING: cert not issued yet. Check: docker logs ${TC} 2>&1 | grep -i acme ; then run ${SYNC}"
  ;;
nginx)
  echo "==> nginx vhost -> 127.0.0.1:${HTTP_PORT}; panel bound to localhost only"
  printf '# Generated by vps-setup-billionmail.sh\nservices:\n  core-billionmail:\n    ports: !override\n      - "127.0.0.1:%s:%s"\n' \
    "$HTTP_PORT" "$HTTP_PORT" > docker-compose.override.yml
  docker compose up -d --remove-orphans
  apt-get install -y -qq certbot python3-certbot-nginx >/dev/null
  site=/etc/nginx/sites-available/$DOMAIN
  [ -d /etc/nginx/sites-available ] || site=/etc/nginx/conf.d/$DOMAIN.conf
  cat > "$site" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    client_max_body_size 50m;
    location / {
        proxy_pass http://127.0.0.1:${HTTP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF
  [ -d /etc/nginx/sites-enabled ] && ln -sf "$site" /etc/nginx/sites-enabled/
  nginx -t && systemctl reload nginx
  mkdir -p /etc/letsencrypt/renewal-hooks/deploy
  cat > "$SYNC" <<EOF
#!/usr/bin/env bash
# Copies the ${DOMAIN} Let's Encrypt cert into BillionMail (SMTP/IMAP TLS).
set -euo pipefail
live=/etc/letsencrypt/live/${DOMAIN}
cmp -s \$live/fullchain.pem ${DIR}/ssl/cert.pem && exit 0
install -m 644 \$live/fullchain.pem ${DIR}/ssl/cert.pem
install -m 600 \$live/privkey.pem ${DIR}/ssl/key.pem
cd ${DIR} && docker compose restart postfix-billionmail dovecot-billionmail >/dev/null
EOF
  chmod 755 "$SYNC"; ln -sf "$SYNC" /etc/letsencrypt/renewal-hooks/deploy/billionmail
  if [ -n "${CERTBOT_EMAIL:-}" ]; then acct=(-m "$CERTBOT_EMAIL"); else acct=(--register-unsafely-without-email); fi
  certbot --nginx -d "$DOMAIN" --redirect --non-interactive --agree-tos "${acct[@]}"
  "$SYNC"
  ;;
standalone)
  echo "==> Standalone: BillionMail serves 80/443 itself (issue SSL in its panel)"
  ;;
esac

if ufw status 2>/dev/null | grep -q "Status: active"; then
  for p in 25 465 587 993 995 143 110; do ufw allow "${p}/tcp" >/dev/null; done
fi

url="https://${DOMAIN}/${SAFE}"
[ "$MODE" = standalone ] && [ "$HTTP_PORT" != 80 ] && url="https://${my_ip}:$(envval HTTPS_PORT)/${SAFE}"
cat <<EOF

==> Done.
    Panel:    ${url}
    Login:    cd ${DIR} && bash bm.sh default   (also in /root/billionmail-install.log)
    Webmail:  https://${DOMAIN}/roundcube

Next:
  1. hPanel > VPS > Firewall: allow TCP 25, 465, 587, 993 (and 995/143/110 if you use POP/IMAP plain)
  2. hPanel > VPS > Settings > PTR: ${my_ip} -> ${DOMAIN}
  3. Panel > Domains: add marvice.tech, copy its DKIM TXT into DNS
  4. Don't issue SSL for ${DOMAIN} inside the BillionMail panel; ${MODE} handles it
  5. Score 10/10 at https://www.mail-tester.com before any campaign
EOF
