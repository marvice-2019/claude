# OpenWA × n8n workflows (Marvice Media)

## 1. Upload contacts (CSV) — `wa-contacts-upload.json`

A login-protected form at `https://n8n.marvice.tech/form/wa-contacts-upload` that turns a CSV into a clean, WhatsApp-verified contact list.

**Flow:** Form (list name, CSV, default country code, consent tick) → parse & clean → check every number on WhatsApp via OpenWA → upsert into the `wa_contacts` data table → result page.

| Step | What it does |
|---|---|
| Parse & clean | Detects `,` or `;` CSVs (Excel/Google Sheets exports), finds the phone / name / tags columns by header, keeps every other column as JSON in `extra` for campaign variables |
| Normalize | `98765 43210`, `09876543210`, `+91-98765-43210`, `0091…` all become `919876543210`; anything outside 10–15 digits is rejected |
| De-dupe | Within the file, and across uploads (row key = `list:phone`, re-upload updates in place) |
| Verify | `GET /api/sessions/{id}/contacts/check/{number}` — 5 at a time, 1.5 s apart, so the account isn't hammered |
| Save | `on_whatsapp`, `whatsapp_id`, `check_status`, `opted_in`, `source`, `updated_at` per contact |
| Result | Saved / on WhatsApp / not on WhatsApp / check failed / invalid / duplicates, with invalid examples |

Limit: 5,000 rows per upload (≈25 min of checks at the safe pace). Split bigger files.

### Setup (5 minutes)

1. **n8n → Data tables → Create** `wa_contacts` with columns
   - string: `key`, `list`, `phone`, `name`, `tags`, `extra`, `whatsapp_id`, `check_status`, `source`, `updated_at`, `last_campaign`, `last_sent_at`
   - boolean: `on_whatsapp`, `opted_in`
2. **OpenWA dashboard → API Keys → Create** an **operator** key scoped to your session.
3. **n8n → Credentials → New → Header Auth**, name it `OpenWA API key`: header name `X-API-Key`, value = that key.
4. **Import** `wa-contacts-upload.json` (Workflows → Import from file), open **Check on WhatsApp**, replace `REPLACE_WITH_SESSION_ID` with your session ID (OpenWA dashboard → Sessions), select the credential.
5. **Activate.** Share `https://n8n.marvice.tech/form/wa-contacts-upload` with your team (n8n login required).

### CSV format

```csv
phone,name,tags,city,last_order
9876543210,Rahul,vip,Pune,Cold Brew
+91 98765 00000,Priya,regular,Mumbai,Latte
```

Header names are flexible: `phone` / `mobile` / `whatsapp` / `number`, `name` / `customer`, `tags` / `segment` / `group`. Extra columns become campaign variables, snake_cased: `City` → `{{city}}`, `Last Order` → `{{last_order}}`.

**Only upload people who opted in.** The consent tick is mandatory and every row is stored with `opted_in = true`; cold lists are the fastest way to get the number banned.

## 2. Send campaign — `wa-campaign-send.json`

A login-protected form at `https://n8n.marvice.tech/form/wa-campaign-send`.

**Fields:** contact list · campaign name · message · Test / Live · your number (for Test) · tag filter · messages this run (1–100) · seconds between messages (5–60).

**Flow:** Form → read the list from `wa_contacts` → keep only `opted_in` + `on_whatsapp` (+ tag) and skip anyone already reached by this campaign → build one OpenWA bulk batch → `POST /messages/send-bulk` → mark recipients (`last_campaign`, `last_sent_at`) → result page.

| Behaviour | Why |
|---|---|
| **One batch (≤100) per run** | OpenWA runs separate batches in parallel; one per run keeps the gaps real |
| **Resume by re-running** | Same campaign name skips contacts already reached, so 400 contacts = 4–8 runs spread over the day |
| **Test mode** | Sends the rendered message to your own number using the first contact's variables; marks nothing |
| **Randomized gaps** | `delayBetweenMessages` = your seconds + 0–2 s random (OpenWA `randomizeDelay`) |
| **Fails loud, marks nothing** | Session offline (409), pacing cap or key scope (403) shows the reason on the result page |

**Variables** (OpenWA renders them per recipient): `{{first_name}}`, `{{name}}`, `{{phone}}`, plus every extra CSV column. Missing name falls back to "there".

```
Hi {{first_name}}! 🪔 Our Diwali tasting menu is live this weekend.
Your usual {{last_order}} is on us with any main — show this message.
Reply STOP to opt out.
```

### Setup
1. Add string columns `last_campaign`, `last_sent_at` to `wa_contacts` (already listed above if you're starting fresh).
2. Import `wa-campaign-send.json`, select the `OpenWA API key` credential in **Send Bulk via OpenWA**, replace `REPLACE_WITH_SESSION_ID`, activate.

### Sending rules that keep the number alive
- New number: ≤50/day in week 1, then +25–50/day per week. Keep `SEND_PACING_ENABLED=true` in OpenWA (already on).
- Always include an opt-out line, and honour it (set `opted_in` = false in the data table).
- Personalize (`{{first_name}}` plus one specific detail): identical blasts get reported far more.
- Watch the first 20 sends of every campaign; if replies are "who is this?", stop.
