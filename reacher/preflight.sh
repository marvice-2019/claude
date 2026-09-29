#!/usr/bin/env bash
# Run on the target server before `docker compose up`. Checks the three things
# that silently break Reacher: outbound port 25, DNS for DOMAIN, and PTR/HELO match.
set -uo pipefail
cd "$(dirname "$0")"
[ -f .env ] || { echo "FAIL  .env missing (cp .env.example .env)"; exit 1; }
set -a; . ./.env; set +a

pass() { echo "PASS  $*"; }
fail() { echo "FAIL  $*"; rc=1; }
warn() { echo "WARN  $*"; }
rc=0

[ ${#REACHER_API_KEY} -ge 32 ] && [[ $REACHER_API_KEY =~ ^[0-9a-f]+$ ]] \
  && pass "REACHER_API_KEY is hex, ${#REACHER_API_KEY} chars" \
  || fail "REACHER_API_KEY must be hex, >=32 chars (openssl rand -hex 32)"

if timeout 8 bash -c '</dev/tcp/gmail-smtp-in.l.google.com/25' 2>/dev/null; then
  pass "outbound port 25 open"
else
  fail "outbound port 25 blocked: ask your host to unblock it, or configure a SOCKS5 proxy"
fi

public_ip=$(curl -fsS -4 --max-time 5 https://api.ipify.org || true)
domain_ip=$(getent ahostsv4 "$DOMAIN" | awk 'NR==1{print $1}')
if [ -n "$public_ip" ] && [ "$public_ip" = "$domain_ip" ]; then
  pass "$DOMAIN -> $public_ip (this server)"
else
  fail "$DOMAIN resolves to '${domain_ip:-nothing}', this server is '${public_ip:-unknown}'"
fi

if command -v dig >/dev/null && [ -n "$public_ip" ]; then
  ptr=$(dig +short -x "$public_ip" | sed 's/\.$//')
  [ "$ptr" = "$HELLO_NAME" ] && pass "PTR $public_ip -> $ptr matches HELLO_NAME" \
    || warn "PTR is '${ptr:-none}', HELLO_NAME is '$HELLO_NAME': set rDNS at your host for reliable results"
else
  warn "dig not installed, skipping PTR check (apt install dnsutils)"
fi

[ "${FROM_EMAIL#*@}" = "${HELLO_NAME#*.}" ] || [ "${FROM_EMAIL#*@}" = "$HELLO_NAME" ] \
  && pass "FROM_EMAIL domain aligns with HELLO_NAME" \
  || warn "FROM_EMAIL domain (${FROM_EMAIL#*@}) differs from HELLO_NAME ($HELLO_NAME)"

exit $rc
