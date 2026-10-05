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
   - string: `key`, `list`, `phone`, `name`, `tags`, `extra`, `whatsapp_id`, `check_status`, `source`, `updated_at`
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

Header names are flexible: `phone` / `mobile` / `whatsapp` / `number`, `name` / `customer`, `tags` / `segment` / `group`. Extra columns (`city`, `last_order`) become `{{city}}`, `{{last_order}}` variables in campaigns.

**Only upload people who opted in.** The consent tick is mandatory and every row is stored with `opted_in = true`; cold lists are the fastest way to get the number banned.
