#!/usr/bin/env bash
# Finds BillionMail's DKIM public key for a domain and publishes it to Hostinger DNS.
#
#   curl -fsSL https://raw.githubusercontent.com/marvice-2019/claude/main/scripts/billionmail-dkim.sh | bash
#
# Asks for a Hostinger API token (hidden input, stays on this server).
# Ends with one line: RESULT: PASS ... or RESULT: FAIL ...
set -uo pipefail

DOMAIN="${DOMAIN:-marvice.tech}"
SELECTOR="${SELECTOR:-default}"
DIR=/opt/BillionMail
fail() { echo; echo "RESULT: FAIL - $*"; exit 1; }

# Candidate key files: host side first, then inside the rspamd container.
cands=$(find "$DIR" -path '*dkim*' \( -name "${SELECTOR}.pub" -o -name '*.pub' -o -name "${SELECTOR}.txt" \) 2>/dev/null)
RS=$(docker ps -qf name=rspamd | head -1)
if [ -n "$RS" ]; then
  inner=$(docker exec "$RS" sh -c "find /var/lib/rspamd/dkim /etc/rspamd -path '*dkim*' -name '*.pub' 2>/dev/null" || true)
fi
echo "==> DKIM key files found:"
printf '    %s\n' $cands ${inner:+$(sed 's/^/[rspamd]/' <<<"$inner")}

pick() { grep -m1 "/${DOMAIN}/" <<<"$1" || grep -m1 "${DOMAIN}" <<<"$1" || head -1 <<<"$1"; }
raw=""
if [ -n "$cands" ]; then f=$(pick "$cands"); raw=$(cat "$f"); src=$f; fi
if [ -z "$raw" ] && [ -n "${inner:-}" ]; then f=$(pick "$inner"); raw=$(docker exec "$RS" cat "$f"); src="[rspamd]$f"; fi
[ -n "$raw" ] || fail "no DKIM key file found. In BillionMail: Domains -> ${DOMAIN} -> regenerate DKIM, then re-run"

# Normalise BIND-style output ("p=..." split across quoted chunks) into one string.
P=$(tr -d '\n\t"() ' <<<"$raw" | grep -o 'p=[A-Za-z0-9+/=]*' | head -1)
[ ${#P} -gt 100 ] || fail "key in ${src} looks wrong (p= length ${#P})"
VALUE="v=DKIM1; k=rsa; ${P}"
echo "==> Using ${src} (${#VALUE} chars): ${VALUE:0:40}...${VALUE: -12}"

read -rsp 'Hostinger API token (hidden): ' T </dev/tty; echo
[ -n "$T" ] || fail "no token entered"
body=$(python3 -c 'import json,sys;print(json.dumps({"overwrite":True,"zone":[{"name":sys.argv[1]+"._domainkey","type":"TXT","ttl":3600,"records":[{"content":sys.argv[2]}]}]}))' "$SELECTOR" "$VALUE")
resp=$(curl -sS -m 30 -X PUT -H "Authorization: Bearer $T" -H 'Content-Type: application/json' \
  --data "$body" "https://developers.hostinger.com/api/dns/v1/zones/${DOMAIN}" -w ' [%{http_code}]')
echo "    Hostinger: $resp"
case "$resp" in *"[200]") echo; echo "RESULT: PASS - ${SELECTOR}._domainkey.${DOMAIN} updated (${#VALUE} chars)";; *) fail "Hostinger API rejected the update";; esac
