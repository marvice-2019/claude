#!/usr/bin/env bash
# Nightly backup: Postgres dump + workflow/credential export (credentials stay encrypted).
# Cron (as root):  15 3 * * * /opt/n8n/deploy/n8n/scripts/backup.sh >> /var/log/n8n-backup.log 2>&1
set -euo pipefail

STACK_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/n8n}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/$STAMP"

cd "$STACK_DIR"
set -a; source .env; set +a
mkdir -p "$OUT"

docker compose exec -T postgres pg_dump -U "${POSTGRES_USER:-n8n}" -d "${POSTGRES_DB:-n8n}" -Fc > "$OUT/n8n.dump"

# Export fails when a set is empty (fresh install) — the pg_dump above is the source of truth anyway
docker compose exec -T n8n sh -c 'rm -rf /tmp/bk && mkdir -p /tmp/bk/wf /tmp/bk/cred
  n8n export:workflow --all --separate --output=/tmp/bk/wf >/dev/null 2>&1 || echo "no workflows to export"
  n8n export:credentials --all --separate --output=/tmp/bk/cred >/dev/null 2>&1 || echo "no credentials to export"'
docker compose cp n8n:/tmp/bk/. "$OUT/" >/dev/null 2>&1

tar -czf "$OUT.tar.gz" -C "$BACKUP_DIR" "$STAMP"
rm -rf "$OUT"
find "$BACKUP_DIR" -name '*.tar.gz' -mtime +"$KEEP_DAYS" -delete

echo "[$STAMP] backup ok: $OUT.tar.gz ($(du -h "$OUT.tar.gz" | cut -f1))"
# Off-site copy recommended, e.g.: rclone copy "$OUT.tar.gz" gdrive:n8n-backups
