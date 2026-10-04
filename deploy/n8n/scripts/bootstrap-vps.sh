#!/usr/bin/env bash
# One-time hardening + Docker install for a fresh Ubuntu 24.04 VPS.
# Run as root:  curl -fsSL <raw-url> | bash   or   bash bootstrap-vps.sh
set -euo pipefail

[[ $EUID -eq 0 ]] || { echo "run as root"; exit 1; }
export DEBIAN_FRONTEND=noninteractive

apt-get update -y
apt-get upgrade -y
apt-get install -y ca-certificates curl git cron ufw fail2ban unattended-upgrades

# Docker (skip if the Hostinger "Ubuntu 24.04 with Docker" template already has it)
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

# Firewall: SSH + HTTP/HTTPS only. n8n/Postgres/Redis are never exposed.
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

# Docker publishes ports through iptables and bypasses ufw — only Caddy publishes ports,
# so this is fine, but never add `ports:` to n8n/postgres/redis.

# Swap (n8n + Postgres spike on large executions)
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -w vm.swappiness=10
  echo 'vm.swappiness=10' > /etc/sysctl.d/99-swappiness.conf
fi

systemctl enable --now fail2ban
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "Done. Next: clone the repo, cd deploy/n8n, cp .env.example .env, fill it, docker compose up -d"
