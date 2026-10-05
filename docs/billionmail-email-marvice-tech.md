# BillionMail on email.marvice.tech

Self-hosted mail server and newsletter platform (Postfix, Dovecot, Rspamd, Roundcube, campaign UI), sending as `@marvice.tech`.

## Current state (2026-10-05)

| Item | Status |
|---|---|
| `marvice.tech` DNS | Hostinger (`ns1/ns2.dns-parking.com`) |
| `email.marvice.tech` | No record (NXDOMAIN) |
| `marvice.tech` MX | None, so no existing mailbox to break |
| VPS on Hostinger account | None found |

## 1. Server

Runs on the existing KVM 4 (`srv1373084.hstgr.cloud`, `91.108.110.216`) next to marvice.tech, Coolify and n8n. That VPS fronts its sites with Traefik in Docker. The panel goes behind it; mail ports are published directly.

| Traffic | Path |
|---|---|
| `https://email.marvice.tech` (panel, webmail, campaign tracking) | Traefik → `core-billionmail` container, cert from Traefik's resolver |
| SMTP 25/465/587, IMAP 993, POP 995 | Published straight from the BillionMail containers |
| SMTP/IMAP TLS cert | `billionmail-cert-sync` copies Traefik's cert into `/opt/BillionMail/ssl` (daily cron) |

Trade-off: mail and websites share one IP, so a blocklisting hits both. Fine for transactional mail and opted-in newsletters; use a separate IP for cold outreach.

Before installing:
- **Port 25:** open a Hostinger ticket: *"Please unblock outbound SMTP port 25 on VPS 91.108.110.216 for a mail server."*
- **hPanel → VPS → Firewall:** allow TCP 25, 465, 587, 993 (995/143/110 only if needed).

## 2. DNS (Hostinger → Domains → marvice.tech → DNS)

`IP` = `91.108.110.216`. Add the A record **before** running the script, because it checks that record.

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `email` | `IP` | 300 |
| MX | `@` | `email.marvice.tech` (priority 10) | 3600 |
| TXT | `@` | `v=spf1 ip4:IP mx -all` | 3600 |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@marvice.tech; adkim=s; aspf=s` | 3600 |
| TXT | `default._domainkey` | *copy from BillionMail → Domains after install* | 3600 |
| CNAME | `autoconfig` | `email.marvice.tech` | 3600 |
| CNAME | `autodiscover` | `email.marvice.tech` | 3600 |

**PTR (reverse DNS):** hPanel → VPS → Settings → set the IP to `email.marvice.tech`. Gmail and Outlook reject or spam-folder mail without a matching PTR.

If you already run Google Workspace or Zoho on `marvice.tech`, don't add the MX record. Send from a subdomain instead, such as `news.marvice.tech`, and put the MX, SPF, and DKIM records on that subdomain.

## 3. Install

```bash
ssh root@91.108.110.216
curl -fsSL https://raw.githubusercontent.com/marvice-2019/claude/main/scripts/vps-setup-billionmail.sh | bash
```

The script detects what owns port 80 and picks a mode:

| Mode | When | What it does |
|---|---|---|
| `traefik` | Traefik container (Coolify, Hostinger templates) | Reads entrypoints, cert resolver, acme.json path and network from the Traefik container's args; writes `docker-compose.override.yml` with routing labels and no host web ports |
| `nginx` | nginx on the host | Panel bound to `127.0.0.1`, nginx vhost + certbot, renewal hook syncs mail cert |
| `standalone` | 80/443 free | BillionMail binds them itself |

It stops early and tells you why if any of these fail: RAM or disk below minimum, the A record not pointing at the VPS, a host mail daemon holding port 25, or `docker compose` older than 2.24.4. If outbound port 25 is blocked it prints a warning and carries on. Re-running keeps the existing install and only re-applies the proxy wiring.

If Traefik is configured through `traefik.yml` instead of command-line args, detection fails. Pass the values yourself:

```bash
TRAEFIK_CONTAINER=coolify-proxy TRAEFIK_NETWORK=coolify TRAEFIK_ENTRYPOINT=https \
TRAEFIK_RESOLVER=letsencrypt TRAEFIK_ACME=/traefik/acme.json bash vps-setup-billionmail.sh
```

## 4. Post-install

1. Log in. Change the password, then go to **Settings** and turn on the IP whitelist for your office and VPN IPs.
2. **Domains → Add** `marvice.tech`. Copy the DKIM value into DNS.
3. **Don't** issue SSL for `email.marvice.tech` in the panel: Traefik owns it, and the cert sync job keeps SMTP/IMAP on the same certificate.
4. Create the mailboxes `hello@`, `dmarc@`, and `postmaster@`.
5. Send one email to mail-tester.com. Aim for 10/10 before you send anything else.
6. Webmail is at `https://email.marvice.tech/roundcube`.

## 5. Warm-up (new IP, zero reputation)

| Week | Daily volume | Audience |
|---|---|---|
| 1 | 50–100 | Most engaged contacts only (opened in the last 30 days) |
| 2 | 250–500 | Engaged in the last 90 days |
| 3 | 1,000–2,000 | Full opted-in list, suppress hard bounces |
| 4+ | Double each week while bounces stay under 2% and complaints under 0.1% | |

Register the domain with Google Postmaster Tools and Microsoft SNDS on day 1. Never import scraped or purchased lists: one spam-trap hit can get the IP blocklisted.

## Ops

```bash
cd /opt/BillionMail
bash bm.sh default        # show login info
bash bm.sh restart
bash update.sh            # upgrade
docker compose ps
```

Backups: snapshot `/opt/BillionMail` (holds `.env`, Postgres, mail, and DKIM keys) on top of Hostinger's weekly VPS backup.
