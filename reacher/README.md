# Reacher Email Verification API (self-hosted)

[Reacher](https://github.com/reacherhq/check-if-email-exists) `v0.11.6` behind Caddy, with automatic HTTPS and an API key check. The backend is never published to the host. Only Caddy listens on 80/443.

```
client ──HTTPS──▶ Caddy :443 ──(key check, injects x-reacher-secret)──▶ reacher:8080 ──SMTP :25──▶ MX servers
```

| File | Purpose |
|---|---|
| `docker-compose.yml` | `reacher` + `caddy` services, healthcheck, memory cap, log rotation |
| `Caddyfile` | TLS, API key check, security headers, secret-scrubbed JSON access logs |
| `.env.example` | Every setting you need to fill in |
| `preflight.sh` | Checks port 25, DNS, and rDNS (PTR) on the target server before boot |

## Server requirements

- **Outbound port 25 must be open.** AWS, GCP, Azure, DigitalOcean and Vultr block it by default. Hetzner and OVH unblock it on request. Without it, every real check hangs until `SMTP_TIMEOUT` and comes back `unknown`.
- A PTR (reverse DNS) record for the server IP that matches `HELLO_NAME`. You set this in your host's control panel.
- An A record for `DOMAIN` pointing at the server.
- 2 vCPU / 2 GB RAM is enough to start. The Reacher container is capped at 2 GB.

## Deploy

```bash
git clone <this repo> && cd <repo>/reacher
cp .env.example .env
sed -i "s/^REACHER_API_KEY=.*/REACHER_API_KEY=$(openssl rand -hex 32)/" .env
nano .env                     # DOMAIN, ACME_EMAIL, HELLO_NAME, FROM_EMAIL
./preflight.sh                # every line must say PASS (WARN is fine) before you continue
docker compose up -d
docker compose logs -f caddy  # wait for "certificate obtained successfully"
```

## Use

```bash
curl -X POST https://$DOMAIN/v0/check_email \
  -H "Authorization: Bearer $REACHER_API_KEY" \
  -H "content-type: application/json" \
  -d '{"to_email":"someone@company.com"}'
```

- The key works either as `Authorization: Bearer KEY` or as `x-reacher-secret: KEY`.
- `GET /version` is public, for uptime monitors.
- Everything else without a valid key gets a `401`.
- Read `is_reachable` in the response: `safe`, `risky`, `invalid` or `unknown`. Full schema: https://docs.reacher.email/advanced/openapi

## Security

- **Two layers of auth.** Caddy checks the key, and the backend also enforces `RCH__HEADER_SECRET`. So if someone exposes port 8080 by mistake, it still rejects requests.
- **Logs don't contain the key.** Caddy strips the `Authorization` and `X-Reacher-Secret` headers before writing access logs.
- **Rotating the key:** update `REACHER_API_KEY` in `.env`, then run `docker compose up -d`. Both containers are recreated with the new key.

## Operations

| Task | Command |
|---|---|
| Upgrade | Bump the `reacherhq/backend` tag in compose, then `docker compose pull && docker compose up -d` |
| Health | `docker compose ps` (reacher shows `healthy`) |
| Logs | `docker compose logs -f reacher` |
| Port 25 blocked | Uncomment the `RCH__PROXY__*` lines in compose and fill in `PROXY_*` in `.env` |

## Deliverability notes

- **Throttle yourself.** Gmail and Outlook rate-limit by IP. Send around 60 checks per minute or fewer from one IP, and spread large lists across several IPs using `[overrides.proxies]`.
- **Use a separate domain.** Never run this from the IP or domain you send campaigns from. A blacklisted verifier IP must not take your sending reputation down with it.
- **Catch-all domains.** They return `risky` with `is_catch_all: true`. Treat those as unverifiable, not valid.
