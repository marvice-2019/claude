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

## 3. AI auto-reply bot — `wa-ai-autoreply.json`

OpenWA webhook → n8n → Claude → reply on WhatsApp, with human handoff and opt-out built in.

| Situation | What happens |
|---|---|
| Customer DM (text) | Claude replies from the business facts in the system prompt, in the customer's language, remembering the last 20 turns per chat |
| Voice note / image / document | Polite ask to type it, or handoff (Claude can't open attachments) |
| Asks for *human / agent / manager / call me*, or Claude can't answer, or a booking/refund/order change needs confirming | Bot pauses in that chat for 12 h, tells the customer a person will take over, and WhatsApps the owner an alert |
| Claude API fails | Same as handoff: no silent chats |
| *STOP* / *unsubscribe* | `opted_in = false` in `wa_contacts` (campaigns skip them) + confirmation |
| Staff types `#bot off` / `#bot on` from the business phone inside a chat | Pauses the bot there for 30 days / resumes |
| Groups, status, channels, own messages, backlog older than 5 min, duplicate deliveries | Ignored |

**Model:** Claude Opus 5.5 (`claude-opus-5-5`) at `effort: low` (right for short chat replies) with 5-minute prompt caching on the system prompt. List price $4 / $20 per million input/output tokens; a typical exchange is a few thousand cached-prompt input tokens and under 200 output tokens. To trade quality for cost, switch the model ID to `claude-sonnet-5-5` ($2 / $10) or `claude-haiku-4-5` ($1 / $5) in the **Claude Opus 5.5** node; no other change needed.

### Setup
1. **Data table** `wa_bot_state`, string columns: `chat_id`, `paused_until`, `last_msg_id`, `updated_at`.
2. **Credentials**
   - `OpenWA webhook token`: Header Auth, name `X-Bot-Token`, value = a long random string (`openssl rand -hex 32`).
   - `OpenWA API key`: the operator key from the campaign setup.
   - `Anthropic account`: your Anthropic API key.
3. Import `wa-ai-autoreply.json`. Replace `REPLACE_WITH_SESSION_ID` (**Send WhatsApp Reply**) and `REPLACE_WITH_OWNER_NUMBER` (**Handoff Messages**, digits only, e.g. `919876543210`). Fill the **Business facts** block in the agent's system message; it is the bot's only source of truth.
4. Activate, then in the **OpenWA dashboard → Webhooks → Add**:
   - URL `https://n8n.marvice.tech/webhook/openwa-inbound`
   - Events `message.received`, `message.sent`
   - Custom header `X-Bot-Token` = the same random string
5. Test from a second phone: ask the hours, then say "talk to a human", then type `#bot on` from the business phone in that chat.

## 4. Chatwoot assignment → AI bot pause — `wa-chatwoot-assignment-sync.json`

Keeps the AI bot quiet while a human owns the conversation in Chatwoot.

**Flow:** Chatwoot webhook (Basic Auth in the URL; Chatwoot can't send custom headers) → keep only assignee/status changes → **re-read the conversation from Chatwoot's API** (the payload is never trusted) → pause the bot for that WhatsApp chat if a human is assigned and it isn't resolved, else resume → upsert `wa_bot_state` for both the contact's WhatsApp JID and its `<phone>@c.us` form.

### Setup
1. Add a string column `note` to `wa_bot_state`.
2. Credentials:
   - `Chatwoot webhook basic auth`: Basic Auth, user `chatwoot`, password = long random string (letters and digits only, so it's URL-safe).
   - `Chatwoot API token`: Header Auth, name `api_access_token`, value = your Chatwoot profile access token.
3. Import, replace `REPLACE_WITH_ACCOUNT_ID` (**Fetch Conversation**) and `REPLACE_WITH_INBOX_ID` (**Decide Bot Pause**), activate.
4. Chatwoot → Settings → Integrations → Webhooks → **Add new** (separate from the OpenWA one):
   - URL `https://chatwoot:<password>@n8n.marvice.tech/webhook/chatwoot-assignment`
   - Events: `conversation_created`, `conversation_updated`, `conversation_status_changed`
5. Test: assign a WhatsApp conversation to yourself, message the business number from that phone (no bot reply), unassign, message again (bot replies).
