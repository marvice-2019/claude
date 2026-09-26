#!/usr/bin/env bash
# Marvice-branded GEO audit PDF.
# Usage: geo-seo/render-geo-pdf.sh [GEO-AUDIT-REPORT.md] [output.pdf]
# Needs pandoc + Chrome/Chromium, and the geo-seo-claude skill installed in ~/.claude/skills/geo.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRAND="$HERE/branding"
BASE_CSS="$HOME/.claude/skills/geo/templates/geo-report-style.css"

MD="${1:-GEO-AUDIT-REPORT.md}"
OUT="${2:-${MD%.md}.pdf}"
HTML="${OUT%.pdf}.html"

[ -f "$MD" ] || { echo "Report not found: $MD" >&2; exit 1; }
[ -f "$BASE_CSS" ] || { echo "geo-seo-claude not installed (missing $BASE_CSS)" >&2; exit 1; }
command -v pandoc >/dev/null || { echo "pandoc not found (brew install pandoc / apt-get install pandoc)" >&2; exit 1; }

CHROME=""
for c in "${CHROME_BIN:-}" \
         "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
         google-chrome google-chrome-stable chromium chromium-browser \
         /opt/pw-browsers/chromium; do
  [ -n "$c" ] || continue
  if [ -x "$c" ] || command -v "$c" >/dev/null 2>&1; then CHROME="$c"; break; fi
done
[ -n "$CHROME" ] || { echo "Chrome/Chromium not found; set CHROME_BIN" >&2; exit 1; }

# Cover metadata from the standard GEO-AUDIT-REPORT.md header (geo-report-pdf Step 2).
field() { grep -m1 -E "^\*\*$1:\*\*" "$MD" | sed -E "s/^\*\*$1:\*\*[[:space:]]*//" || true; }
brand_name="$(grep -m1 -E '^# ' "$MD" | sed -E 's/^# (GEO( Quick)? Audit( Report)?[[:space:]]*(:|—|–|-)?[[:space:]]*)?//')"
score_line="$(grep -m1 -E '^## .*GEO Score' "$MD" || true)"
geo_score="$(sed -nE 's/.*Score:?[[:space:]]*([0-9]+).*/\1/p' <<<"$score_line")"
score_label="$(sed -nE 's/.*[0-9]+[[:space:]]*\/[[:space:]]*100[^A-Za-z]*([A-Za-z][A-Za-z ]*).*/\1/p' <<<"$score_line")"

# Metadata goes through a UTF-8 JSON/YAML file: pandoc decodes CLI args with the
# system locale, which mangles "·", "—" etc. under C/POSIX locales.
META_FILE="$(mktemp "${TMPDIR:-/tmp}/geo-meta.XXXXXX.yaml")"
trap 'rm -f "$META_FILE"' EXIT
prepared_for="$brand_name"
case "$brand_name" in *[Mm]arvice*) prepared_for="" ;; esac
audit_date="$(field 'Audit Date')"; [ -n "$audit_date" ] || audit_date="$(field Date)"

python3 - "$META_FILE" \
  title="GEO Audit Report — ${brand_name:-Client}" \
  brand_name="$brand_name" \
  prepared_for="$prepared_for" \
  domain="$(field Domain)" \
  geo_score="$geo_score" \
  score_label="$score_label" \
  date="$audit_date" \
  business_type="$(field 'Business Type')" \
  locations="$(field Locations)" \
  platform="$(field CMS)" \
  agency_logo="$BRAND/marvice-logo.png" <<'PY'
import json, sys
meta = {}
for arg in sys.argv[2:]:
    key, _, value = arg.partition("=")
    if value.strip():
        meta[key] = value.strip()
with open(sys.argv[1], "w", encoding="utf-8") as f:
    json.dump(meta, f, ensure_ascii=False)
PY

pandoc "$MD" --to html5 --standalone --embed-resources \
  --resource-path=".:$BRAND" \
  --template "$BRAND/marvice-report-template.html" \
  --css "$BASE_CSS" --css "$BRAND/marvice-report.css" \
  --metadata-file "$META_FILE" -o "$HTML"

"$CHROME" --headless=new --disable-gpu --no-sandbox \
  --print-to-pdf="$(cd "$(dirname "$OUT")" && pwd)/$(basename "$OUT")" \
  --print-to-pdf-no-header --no-pdf-header-footer \
  --virtual-time-budget=8000 \
  "file://$(cd "$(dirname "$HTML")" && pwd)/$(basename "$HTML")" 2>/dev/null

echo "PDF: $OUT ($(du -h "$OUT" | cut -f1))"
