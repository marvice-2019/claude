# Deployment Guide — Step by Step

## Prerequisites

- Node.js 18+ (for companion server if used)
- Docker (for self-hosted n8n)
- Accounts: Twilio, Deepgram, ElevenLabs, Anthropic, Google Cloud, WATI

---

## Step 1: Set Up n8n

### Option A: n8n Cloud (Quickest)
1. Sign up at n8n.io
2. Import workflows from `workflows/` directory
3. Note: these workflows read keys via `$env`, which n8n Cloud restricts. Use Option B for production

### Option B: Self-Hosted (Production — recommended)
Use the tested stack in [`deploy/n8n/`](../deploy/n8n/README.md): n8n in queue mode + Postgres 17 + Redis + Caddy auto-HTTPS, with a VPS hardening script and nightly backups.

```bash
cd deploy/n8n && cp .env.example .env   # fill in N8N_HOST + keys
docker compose up -d
```

The stack derives `N8N_BASE_URL` (used by workflows to build Twilio callback URLs) from `N8N_HOST`. If you run n8n any other way, set it to your public https URL with no trailing slash.

---

## Step 2: Configure Twilio

1. Buy an Indian phone number on Twilio
2. Set the **Voice webhook** URL to: `https://your-n8n.com/webhook/voice-agent/incoming`
3. Set method to `POST`
4. Set **Status callback** to: `https://your-n8n.com/webhook/voice-agent/call-status`
5. Enable recording (for STT processing)

---

## Step 3: Set Up Google Sheets

1. Create a new Google Sheet
2. Add sheets with exact names: `BusinessConfig`, `Customers`, `Bookings`, `ConversationLogs`, `OutboundQueue`, `DailyReports`
3. Add column headers as per `configs/google-sheets-schema.md`
4. Fill in `BusinessConfig` with your business details
5. Create a Google Cloud service account → Share the sheet with it
6. Set up OAuth2 credentials in n8n

---

## Step 4: Configure API Keys

Workflows read keys as `$env.KEY`, so they must be **environment variables of the n8n container**. Do not add them under Settings → Variables (that is `$vars`, a paid feature the workflows don't read).

- Self-hosted: put them in `deploy/n8n/.env`, then `docker compose up -d`
- n8n Cloud: `$env` access is restricted, so use self-hosted for this project

---

## Step 5: Set Up WhatsApp (WATI)

1. Register on WATI and connect your WhatsApp Business number
2. Create message templates:
   - `booking_confirmation` (custom params `customer_name`, `date`, `time`, `guests`, `venue`): "Hi {{customer_name}}! Your reservation at {{venue}} is confirmed. Date: {{date}}, Time: {{time}}, Guests: {{guests}}. See you there!"
   - `call_followup`: "Hi {{1}}! Sorry we couldn't connect on the call. Reply here to continue — we're happy to help!"
   - `daily_report` (custom params `date`, `total_calls`, `booking_rate`, `escalation_rate`): "Daily Report ({{date}}): {{total_calls}} calls, {{booking_rate}} booking rate, {{escalation_rate}} escalation rate."
   - `lead_followup`: "Hi {{1}}! Thanks for calling us earlier. Reply here if you'd like to book a table or ask about our offers."
   - `complaint_acknowledged`: "Hi {{1}}, we're sorry about your experience. Your complaint has been logged and our manager will contact you shortly."
   - `missed_escalation_alert` (category: Utility; custom params `venue`, `caller_name`, `caller_number`, `time`, `reason`): "Missed escalation at {{venue}}: {{caller_name}} ({{caller_number}}) asked for a human at {{time}} but no escalation number is set. Reason: {{reason}}. They were promised a callback within 15 minutes, please call them now."
3. Custom param names must match exactly: the workflows send params by name (`customer_name`, `venue`, …), not by position
4. Get API key from WATI dashboard

---

## Step 6: Import Workflows into n8n

Import **one** set (they share webhook paths), via Editor → Workflows → Import from File:

| Set | Files | Twilio Voice webhook |
|---|---|---|
| **Complete (recommended)** | `workflows/n8n-import-complete.json` | `/webhook/voice-agent/incoming` |
| Split | `n8n-import-call-handler.json`, `n8n-import-ai-brain.json`, `n8n-import-crm-whatsapp.json` | `/webhook/voice/incoming` |

Attach the Google Sheets credential to every Sheets node, then activate.

`main-voice-agent.json`, `outbound-campaign.json` and `feedback-learning-loop.json` are reference designs. n8n 2.x rejects them on import.

---

## Step 7: Test

### Test 1: Inbound Call
Call your Twilio number. Verify:
- [ ] Greeting plays correctly
- [ ] Speech is transcribed
- [ ] AI responds naturally
- [ ] Booking data is saved to Sheets
- [ ] WhatsApp confirmation arrives

### Test 2: Outbound Call
Add a row to `OutboundQueue` sheet with status "pending". Wait for schedule trigger (or trigger manually). Verify:
- [ ] Call is initiated
- [ ] Appropriate greeting plays based on purpose
- [ ] Voicemail detection works
- [ ] Queue status is updated

### Test 3: Edge Cases
- [ ] Stay silent → silence handling works
- [ ] Speak Tamil → language switches
- [ ] Say "I want to speak to a manager" → escalation triggers
- [ ] Hang up mid-booking → WhatsApp follow-up sent

---

## Step 8: Go Live

1. Monitor first 10 calls in real-time (check ConversationLogs)
2. Review Daily Report next morning
3. Tune prompts based on AI analysis suggestions
4. Gradually increase call volume
