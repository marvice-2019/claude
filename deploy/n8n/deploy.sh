#!/usr/bin/env bash
# One-shot deploy of n8n to the current host. Idempotent: re-run to upgrade.
# Usage (as root on the VPS):  ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

log() { printf '\033[1;32m==>\033[0m %s\n' "$*"; }
die() { printf '\033[1;31mxx\033[0m %s\n' "$*" >&2; exit 1; }

command -v docker >/dev/null || { log "Installing Docker"; curl -fsSL https://get.docker.com | sh; }
docker compose version >/dev/null 2>&1 || die "docker compose v2 plugin missing"

# --- .env with generated secrets (never overwritten once created) ---
if [[ ! -f .env ]]; then
  cp .env.example .env
  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 24)|" .env
  sed -i "s|^N8N_ENCRYPTION_KEY=.*|N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)|" .env
  chmod 600 .env
  log "Created .env with fresh secrets. Back up N8N_ENCRYPTION_KEY now."
fi
setenv() { export "$1=$2"; if grep -q "^$1=" .env; then sed -i "s|^$1=.*|$1=$2|" .env; else echo "$1=$2" >> .env; fi; }
set -a; source .env; set +a
if [[ -z "${ACME_EMAIL:-}" ]]; then
  ACME_EMAIL="admin@$(awk -F. '{print $(NF-1)"."$NF}' <<<"$N8N_DOMAIN")"; setenv ACME_EMAIL "$ACME_EMAIL"
fi

# --- DNS sanity check ---
public_ip=$(curl -fsS4 --max-time 5 https://api.ipify.org || true)
dns_ip=$(getent ahostsv4 "$N8N_DOMAIN" | awk 'NR==1{print $1}' || true)
if [[ -z "${SKIP_DNS_CHECK:-}" && -n "$public_ip" && "$dns_ip" != "$public_ip" ]]; then
  die "$N8N_DOMAIN resolves to '${dns_ip:-nothing}', this host is $public_ip. Fix the A record first (Let's Encrypt will fail otherwise)."
fi

# --- Reuse an existing Traefik, or bring our own ---
existing=$(docker ps --format '{{.Names}} {{.Image}}' | awk 'tolower($2) ~ /traefik/ {print $1; exit}')
args=""
if [[ -n "$existing" ]]; then args=$(docker inspect "$existing" --format '{{join .Config.Cmd " "}} {{join .Args " "}}'); fi

# Docker Engine 29 dropped API <1.44; Traefik <3.6.1 then silently loses every route (404 + self-signed cert).
fix_stale_traefik() {
  local c=$1 img dir files
  img=$(docker inspect "$c" --format '{{.Config.Image}}')
  docker logs --tail 300 "$c" 2>&1 | grep -qiE 'client version [0-9.]+ is too old' || return 0
  log "Traefik '$c' ($img) can't talk to this Docker Engine — upgrading it to traefik:v3.6"
  dir=$(docker inspect "$c" --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}')
  files=$(docker inspect "$c" --format '{{index .Config.Labels "com.docker.compose.project.config_files"}}')
  [[ -n "$dir" && -n "$files" ]] || die "'$c' isn't compose-managed. Change its image to traefik:v3.6 and recreate it, then re-run."
  local f; IFS=, read -ra fl <<<"$files"
  for f in "${fl[@]}"; do
    [[ -f "$f" ]] || continue
    cp "$f" "$f.bak-$(date +%s)"
    sed -Ei 's#(image:[[:space:]]*["'"'"']?)(docker\.io/)?(library/)?traefik(:[^"'"'"'[:space:]]*)?#\1traefik:v3.6#' "$f"
  done
  local svc proj
  svc=$(docker inspect "$c" --format '{{index .Config.Labels "com.docker.compose.service"}}')
  proj=$(docker inspect "$c" --format '{{index .Config.Labels "com.docker.compose.project"}}')
  (cd "$dir" && docker compose -p "$proj" $(printf -- '-f %s ' "${fl[@]}") up -d "$svc")
  sleep 5
}

if [[ -n "$existing" && "$existing" != n8n-traefik-* ]]; then
  log "Found existing Traefik container: $existing — attaching n8n to it"
  fix_stale_traefik "$existing"
  net=$(docker inspect "$existing" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' | tr ' ' '\n' | grep -v '^bridge$' | grep -v '^$' | head -1)
  [[ -n "$net" ]] || die "Could not determine $existing's docker network"
  ep=$(grep -oE 'entrypoints\.[A-Za-z0-9_-]+\.address=:443' <<<"$args" | head -1 | cut -d. -f2 || true)
  hep=$(grep -oE 'entrypoints\.[A-Za-z0-9_-]+\.address=:80' <<<"$args" | head -1 | cut -d. -f2 || true)
  cr=$(grep -oE 'certificatesresolvers\.[A-Za-z0-9_-]+\.' <<<"$args" | head -1 | cut -d. -f2 || true)
  [[ -n "$ep" && -n "$cr" ]] || die "Traefik '$existing' is configured via file, not CLI flags. Set TRAEFIK_ENTRYPOINT / TRAEFIK_CERTRESOLVER in .env to match its config, set TRAEFIK_NETWORK=$net, and re-run."
  setenv TRAEFIK_NETWORK "$net"; setenv TRAEFIK_ENTRYPOINT "$ep"; setenv TRAEFIK_CERTRESOLVER "$cr"; setenv TRAEFIK_HTTP_ENTRYPOINT "${hep:-web}"
  cat > docker-compose.override.yml <<YML
networks:
  edge:
    external: true
YML
  profile_args=()
else
  if [[ -z "$existing" ]] && ss -ltnH '( sport = :80 or sport = :443 )' | grep -q .; then
    die "Ports 80/443 are held by a non-Traefik process: $(ss -ltnpH '( sport = :80 or sport = :443 )' | awk '{print $NF}' | sort -u | tr '\n' ' '). Stop it or put n8n behind it manually."
  fi
  log "Using bundled Traefik (ports 80/443)"
  setenv TRAEFIK_NETWORK n8n_edge; setenv TRAEFIK_ENTRYPOINT websecure; setenv TRAEFIK_CERTRESOLVER le; setenv TRAEFIK_HTTP_ENTRYPOINT web
  rm -f docker-compose.override.yml
  profile_args=(--profile proxy)
fi

log "Pulling and starting"
docker compose "${profile_args[@]}" pull
docker compose "${profile_args[@]}" up -d --remove-orphans

log "Waiting for https://$N8N_DOMAIN/healthz (cert issuance can take ~30s)"
for i in $(seq 1 40); do
  if curl -fsS --max-time 5 "https://$N8N_DOMAIN/healthz" >/dev/null 2>&1; then
    log "Live: https://$N8N_DOMAIN — open it and create the owner account immediately."
    exit 0
  fi
  sleep 5
done
docker compose logs --tail=60 n8n
die "Health check did not pass in 200s. Check: docker compose logs traefik n8n"
