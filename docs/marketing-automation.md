# Marketing Automation

Four n8n workflows. Each one is driven from the same Google Sheet as the voice agent, uses Claude for copy, and alerts the manager on WhatsApp when something needs a human.

| Workflow | Trigger | What it does |
|---|---|---|
| `marketing-whatsapp-broadcast.json` | Every 15 min + WATI webhook | `Campaigns` row → opted-in guests in a segment → WATI template broadcast (chunks of 100, throttled) → results back to the sheet. Handles STOP/START. |
| `marketing-email-campaigns.json` | Nightly 3 AM + every 15 min | Syncs consented guests into Brevo lists by segment. Claude writes the email, which Brevo schedules or saves as a draft for review. |
| `marketing-social-publisher.json` | Every 30 min | `SocialPosts` calendar → Claude captions (if empty) → Instagram (image/reel) + Facebook Page → IDs back to the sheet. |
| `marketing-instagram-auto-reply.json` | Meta webhook | Comments and DMs → Claude decides → public reply / private DM / hide spam → log + escalate to the manager. |

Segments are computed from `Customers`: **lapsed** = visited before, but not in 45+ days. **vip** = 5+ visits. **new** = 0–1 visits. **regular** = everyone else. **birthday** = birthday in the next 7 days.

## Rollout order (fastest ROI first)

1. **Instagram auto-reply.** It runs 24/7 and catches the booking intent hiding in comments and DMs. Run it with `IG_AUTOREPLY_ENABLED=true` and watch `InstagramLog` daily for the first week.
2. **WhatsApp broadcasts.** These have the highest-converting channel for Indian F&B. Start with `lapsed` and `birthday` segments, not `all`.
3. **Social publisher.** Batch a week of content on Monday, approve it, and let it run.
4. **Email.** It's the cheapest channel, but has the slowest payback. Run it monthly or on events, with `auto_send=FALSE` until you trust the copy.

## One-time setup

### n8n
- Env vars from `configs/env-template.env` (Marketing block). Two are required for these workflows to run at all: `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` and `NODE_FUNCTION_ALLOW_BUILTIN=crypto`.
- Import the four JSONs, bind the **Google Sheets** credential on every Sheets node, then activate.
- Add the new columns and sheets from `configs/google-sheets-schema.md` (Customers G–N, Campaigns, SocialPosts, InstagramLog, MarketingLog). Header names must match exactly.

### WATI
- Get these templates approved (Marketing category for promos, Utility for alerts):
  - `staff_alert` (Utility). Body: `⚠️ {{1}}`. Used by all four workflows for manager alerts.
  - Your promo templates, e.g. `festive_offer` with `{{name}}` and `{{offer}}`. Add a **"Reply STOP to unsubscribe"** footer.
- Webhooks → *Message Received* → `https://<n8n>/webhook/wati-inbound`.

### Brevo
- Authenticate your sending domain (SPF, DKIM, DMARC). Without it, Gmail and Yahoo bulk-sender rules will junk you.
- Create the lists (all, vip, regular, new, lapsed) and put their IDs in `BREVO_LISTS`.
- Create the contact attributes `SEGMENT` (text), `TOTAL_VISITS` (number) and `LAST_VISIT` (text).

### Meta (Instagram + Facebook)
- Instagram account must be **Business or Creator**. Create a Meta app → *Instagram API with Instagram Login*.
- Permissions: `instagram_business_basic`, `instagram_business_content_publish`, `instagram_business_manage_comments`, `instagram_business_manage_messages`. Submit for App Review before going live with real customers.
- Webhooks: callback `https://<n8n>/webhook/instagram-webhook`, verify token = `META_VERIFY_TOKEN`, subscribe to `comments` and `messages`.
- Long-lived IG token lasts 60 days. Refresh it monthly with `GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=…`.
- Facebook: a Page access token with `pages_manage_posts`.

## Daily operation

- **Campaign:** add a `Campaigns` row with status `draft`. When it's ready, change it to `approved`. The workflow takes it from there and writes back `sent_count` / `status`.
- **Social:** add `SocialPosts` rows with a public `media_url` and `brief`, then set `approved`.
- **Stuck in `processing`?** The run crashed mid-way, so check n8n → Executions. Fix it, then set the row back to `approved`. WhatsApp broadcasts only resend to guests without a fresh `last_promo_at`.

## Guardrails built in

| Risk | Guardrail |
|---|---|
| Messaging people without consent (DPDP Act 2023, Meta policy) | Only `wa_opt_in=TRUE` / `email_opt_in=TRUE`. STOP sets `wa_opt_out`, which always wins. Email opt-outs are blacklisted in Brevo. |
| WhatsApp number quality drop or ban | Approved templates only. Frequency cap (`MARKETING_FREQUENCY_CAP_DAYS`). One campaign per 15-min run. 100-recipient chunks, 5s apart. |
| Double sends | Rows are locked to `processing` before sending. Meta webhook retries are deduped on event ID. |
| AI inventing offers or prices | Prompts are restricted to `BusinessConfig` facts. Claude can never confirm a booking. Unknowns → escalate. |
| Bot replying to itself | Our own comments, echoes and DMs are filtered out by `IG_USER_ID`. |
| Forged webhooks | HMAC-SHA256 check against `META_APP_SECRET`. Fails closed. |
| Instagram policy | DMs only within 24h of the user's message, or one private reply per comment (7 days). No cold DMs. |
| Runaway bot | `IG_AUTOREPLY_ENABLED=false` stops all Instagram replies instantly. |

## KPIs to watch (weekly)

- **WhatsApp:** delivered → read → replies → bookings within 72h (`Bookings.timestamp` vs `Customers.last_promo_at`). Target block rate under 1%.
- **Email:** open rate above 25% and click rate above 2.5% for a local F&B list. Unsubscribes below 0.5% per send.
- **Instagram:** share of comments/DMs that were `booking` intent, escalations per week, and median reply time (should be under 1 min).
- **Social:** saves and shares per post beat likes for reach. Watch which `brief` themes win and double down.
