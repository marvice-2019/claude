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

Get a **dedicated** Hostinger KVM 2 (2 vCPU, 8 GB, ~$7–9/mo), Ubuntu 24.04. Don't share the agency.marvice.tech box. BillionMail needs ports 80 and 443 itself, and a mail server should run on its own IP so its sending reputation stays separate.

Open a Hostinger support ticket on day 1: *"Please unblock outbound SMTP port 25 on VPS <IP> for a transactional/newsletter mail server."* Nothing delivers until they unblock it.

## 2. DNS (Hostinger → Domains → marvice.tech → DNS)

Replace `IP` with the VPS IPv4. Add the A record **before** running the script, because it checks that record.

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
ssh root@IP
curl -fsSL https://raw.githubusercontent.com/marvice-2019/claude/main/scripts/vps-setup-billionmail.sh | bash
```

The script stops early and tells you why if any of these fail: RAM or disk below minimum, a port already in use, or the A record not pointing at the VPS. If outbound port 25 is blocked, it prints a warning and carries on. It then sets the hostname and timezone (Asia/Kolkata), opens UFW for the mail ports, and runs `install.sh --domain email.marvice.tech`. The admin URL (`https://IP/<SafePath>`), username, and password go to `/root/billionmail-install.log`.

## 4. Post-install

1. Log in. Change the password, then go to **Settings** and turn on the IP whitelist for your office and VPN IPs.
2. **Domains → Add** `marvice.tech`. Copy the DKIM value into DNS.
3. **Settings → SSL**: issue Let's Encrypt for `email.marvice.tech`.
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
