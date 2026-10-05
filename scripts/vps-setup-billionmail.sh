#!/usr/bin/env bash
# One-time BillionMail install for email.marvice.tech (fresh Ubuntu 22.04/24.04 or Debian 12, run as root).
#
#   curl -fsSL https://raw.githubusercontent.com/marvice-2019/claude/main/scripts/vps-setup-billionmail.sh | bash
#
# Optional env: DOMAIN (default email.marvice.tech), TZ_NAME (default Asia/Kolkata).
#
# Use a dedicated VPS: BillionMail binds 25/80/443/465/587/993/995 itself and
# needs a clean IP for deliverability. Do not run it on the agency.marvice.tech box.
# DNS runbook: docs/billionmail-email-marvice-tech.md
set -euo pipefail

DOMAIN="${DOMAIN:-email.marvice.tech}"
TZ_NAME="${TZ_NAME:-Asia/Kolkata}"
INSTALL_DIR=/opt/BillionMail
REPO=https://github.com/Billionmail/BillionMail.git

[ "$(id -u)" -eq 0 ] || { echo "Run as root (sudo -i first)." >&2; exit 1; }
command -v apt-get >/dev/null || { echo "Needs Ubuntu/Debian (apt-get)." >&2; exit 1; }

echo "==> Checking resources (BillionMail wants >=2 GB RAM, >=20 GB disk)"
mem_mb=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
disk_gb=$(df -BG --output=avail / | tail -1 | tr -dc 0-9)
[ "$mem_mb" -ge 1800 ] || { echo "Only ${mem_mb} MB RAM; use a KVM 2 or larger." >&2; exit 1; }
[ "$disk_gb" -ge 20 ] || { echo "Only ${disk_gb} GB free on /." >&2; exit 1; }

echo "==> Checking ports are free"
busy=$(ss -ltnH 2>/dev/null | awk '{print $4}' | grep -E ':(25|80|110|143|443|465|587|993|995)$' | grep -v docker-proxy || true)
if [ -n "$busy" ]; then
  echo "These ports are already in use (nginx/apache/postfix?):" >&2
  echo "$busy" >&2
  echo "BillionMail needs them all. Use a dedicated VPS, or stop those services and re-run." >&2
  exit 1
fi

echo "==> Checking outbound port 25 (Hostinger and most clouds block it by default)"
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq git curl dnsutils netcat-openbsd ufw >/dev/null
if ! timeout 8 nc -z gmail-smtp-in.l.google.com 25 2>/dev/null; then
  echo "WARNING: outbound 25 is blocked. Install continues, but nothing will deliver"
  echo "         until you open a ticket with Hostinger to unblock SMTP port 25 on this VPS."
fi

echo "==> Checking DNS: ${DOMAIN} must point at this server"
my_ip=$(curl -4fsS https://api.ipify.org)
dns_ip=$(dig +short A "$DOMAIN" @1.1.1.1 | tail -1)
if [ "$dns_ip" != "$my_ip" ]; then
  echo "${DOMAIN} resolves to '${dns_ip:-nothing}', this server is ${my_ip}." >&2
  echo "Add: A  email  ${my_ip}  (TTL 300) in Hostinger DNS, wait a few minutes, re-run." >&2
  exit 1
fi

echo "==> Hostname + timezone"
hostnamectl set-hostname "$DOMAIN"
grep -q " ${DOMAIN}$" /etc/hosts || echo "${my_ip} ${DOMAIN}" >> /etc/hosts
timedatectl set-timezone "$TZ_NAME" || true

echo "==> Firewall"
ufw allow 22/tcp >/dev/null
for p in 25 80 443 465 587 993 995 143 110; do ufw allow "${p}/tcp" >/dev/null; done
ufw --force enable >/dev/null

echo "==> Installing BillionMail into ${INSTALL_DIR}"
if [ -d "$INSTALL_DIR/.git" ]; then
  echo "${INSTALL_DIR} already exists. To reinstall, back it up and remove it first." >&2
  exit 1
fi
git clone -q "$REPO" "$INSTALL_DIR"
cd "$INSTALL_DIR"
# --domain with 2+ dots is used verbatim as Postfix myhostname (no "mail." prefix).
bash install.sh --domain "$DOMAIN" --TZ "$TZ_NAME" 2>&1 | tee /root/billionmail-install.log

cat <<EOF

==> Done. Admin URL / username / password are printed above and saved in
    /root/billionmail-install.log (also: cd ${INSTALL_DIR} && bash bm.sh default).

Next, in order:
  1. Hostinger hPanel > VPS > Settings > PTR: set ${my_ip} -> ${DOMAIN}
  2. Panel > Domains: add marvice.tech, copy the DKIM TXT it shows
  3. Add the DNS records from docs/billionmail-email-marvice-tech.md
  4. Panel > Settings: apply Let's Encrypt SSL for ${DOMAIN}
  5. Test at https://www.mail-tester.com before any campaign
EOF
