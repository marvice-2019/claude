#!/bin/bash
# Marvice Media — VPS fix + OpenClaw setup for openclaw.marvice.tech
# Run as root in hPanel > VPS > srv1373084 > Browser terminal
set -u
echo "=== 1. STATE BEFORE ==="
df -h / | tail -1; free -h | sed -n 2p
docker ps -a --format '{{.Names}}\t{{.Status}}' | sort

echo "=== 2. FIX 503: start stopped Coolify apps + restart proxy ==="
for c in $(docker ps -aq -f label=coolify.managed=true -f status=exited -f status=created); do
  docker start "$c" >/dev/null && echo "started $(docker inspect -f '{{.Name}}' "$c")"
done
docker restart coolify-proxy >/dev/null && echo "proxy restarted"
sleep 25
docker ps -a --format '{{.Names}}\t{{.Status}}' | grep -viE '\bup ' || echo "all containers up"

echo "=== 3. INSTALL OPENCLAW (wizard comes after) ==="
curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --no-onboard
command -v openclaw && openclaw --version

echo "=== 4. TRAEFIK ROUTE openclaw.marvice.tech -> :18789 ==="
cat > /data/coolify/proxy/dynamic/openclaw.yaml <<'EOF'
http:
  routers:
    openclaw:
      rule: Host(`openclaw.marvice.tech`)
      entryPoints: [https]
      service: openclaw
      tls: { certResolver: letsencrypt }
    openclaw-http:
      rule: Host(`openclaw.marvice.tech`)
      entryPoints: [http]
      middlewares: [redirect-to-https]
      service: openclaw
  services:
    openclaw:
      loadBalancer:
        servers: [{ url: "http://host.docker.internal:18789" }]
EOF
echo "route written"

echo "=== 5. SITE CHECK ==="
for h in marvice.tech n8n.marvice.tech api.marvice.tech delta.marvice.tech fizzology.marvice.tech; do
  printf "%-26s %s\n" "$h" "$(curl -s -o /dev/null -m 10 -w '%{http_code}' "https://$h")"
done
echo "=== DONE. Next: run  openclaw onboard  (Gateway bind: LAN, Auth: token) ==="
