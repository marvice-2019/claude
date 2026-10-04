# Deployment Guide — Step by Step

## Prerequisites

- Node.js 18+ (for companion server if used)
- Docker (for self-hosted n8n)
- Accounts: Twilio, Deepgram, ElevenLabs, Anthropic, Google Cloud, WATI

## Which workflows to deploy

Deploy the **split stack**. These three workflows call each other over webhooks and are the ones kept up to date:

| File | Webhook | Role |
|---|---|---|
| `workflows/n8n-import-call-handler.json` | `voice/incoming`, `voice/turn` | Twilio calls: greeting, speech-to-text, TTS, TwiML, transfers |
| `workflows/n8n-import-ai-brain.json` | `ai-brain` | Claude conversation logic, booking detection |
| `workflows/n8n-import-crm-whatsapp.json` | `crm-action` | Sheets writes, WATI messages, bot pause |

**Optional:**
- `outbound-campaign.json` places outbound calls from `OutboundQueue`.
- `feedback-learning-loop.json` sends the daily report. It reads `ConversationLogs`, which the split stack doesn't write yet, so its reports come out empty until that's added.

**Don't import alongside the split stack:** `main-voice-agent.json`, `n8n-import-complete.json`, `n8n-import-1-greeting-flow.json` and `n8n-import-2-conversation-loop.json` are earlier versions. They reuse `voice-agent/*` webhook paths (they'd collide with `outbound-campaign.json`) and lack the webhook security and bot pause.

---

## Step 1: Set Up n8n

The workflows read configuration through `$env`, so run n8n **self-hosted**. On n8n Cloud, `$env` isn't available to workflows, and Settings → Variables are exposed as `$vars`, which these workflows don't read.

### Self-Hosted
```bash
docker run -d \
  --name n8n \
  --restart always \
  -p 5678:5678 \
  -e N8N_ENCRYPTION_KEY=your-secret-key \
  -e EXECUTIONS_MODE=queue \
  -e QUEUE_BULL_REDIS_HOST=redis \
  -e GENERIC_TIMEZONE=Asia/Kolkata \
  -e N8N_RUNNERS_ALLOWED_BUILT_IN_MODULES=crypto \
  --env-file .env \
  -v n8n_data:/home/node/.n8n \
  n8nio/n8n:latest
```

`N8N_RUNNERS_ALLOWED_BUILT_IN_MODULES=crypto` is required: the Twilio signature check runs in a Code node. `--env-file .env` passes in the values from Step 4.

---

## Step 2: Configure Twilio

1. Buy an Indian phone number on Twilio
2. Set the **Voice webhook** URL to `${N8N_BASE_URL}/webhook/voice/incoming`, e.g. `https://n8n.example.com/webhook/voice/incoming`. Use no query parameters: the URL must match exactly for the signature check
3. Set method to `POST`
4. Leave the number's **Status callback** empty. `outbound-campaign.json` sets its own per call
5. Recording needs no setting: the call handler's TwiML uses `<Record>` on every turn

---

## Step 3: Set Up Google Sheets

1. Create a new Google Sheet
2. Add sheets with exact names: `Bookings`, `Leads`, `Complaints`, `ActivityLog`, `Handoffs` (split stack), plus `OutboundQueue`, `ConversationLogs` and `DailyReports` if you use the optional workflows
3. Add column headers in row 1 as per `configs/google-sheets-schema.md`. Writes map by header name, so column order doesn't matter, but a missing header means that field is silently dropped
4. Venue details (name, timings, offers) live in the AI brain's `Load Business Config` node. Edit them there
5. Create a Google Cloud service account → Share the sheet with it
6. Set up the Google Sheets credential in n8n, then select it on every Google Sheets node after import (Step 6)

---

## Step 4: Configure API Keys

Copy `configs/env-template.env` to `.env` and fill in all values. n8n reads them as environment variables via `--env-file` (Step 1). Restart n8n after changing them.

The split stack needs at least: `N8N_BASE_URL`, `TWILIO_AUTH_TOKEN`, `TWILIO_SIGNATURE_MODE`, `INTERNAL_WEBHOOK_TOKEN`, `DEEPGRAM_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `ANTHROPIC_API_KEY`, `GSHEET_ID`, `WATI_API_KEY`, `WATI_BASE_URL`, `ESCALATION_PHONE`, `BUSINESS_NAME`.

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

1. Open n8n editor
2. Click "Import from File"
3. Import the split stack:
   - `workflows/n8n-import-call-handler.json`
   - `workflows/n8n-import-ai-brain.json`
   - `workflows/n8n-import-crm-whatsapp.json`
   - Optional: `workflows/outbound-campaign.json`, `workflows/feedback-learning-loop.json`
4. Select your Google Sheets credential on each Sheets node: in CRM + WhatsApp, the four writes plus `Upsert Handoff` and `Check Lead Handoff`; in the call handler, `Check Caller Handoff`
5. Activate all three workflows. They call each other at `${N8N_BASE_URL}/webhook/...`, so each must be active, not just open in the editor

Then finish the webhook security and bot pause setup in [`webhook-security-and-handoff.md`](webhook-security-and-handoff.md). Start with `TWILIO_SIGNATURE_MODE=log` for the test calls below.

---

## Step 7: Test

### Test 1: Inbound Call
Call your Twilio number. Verify:
- [ ] Greeting plays correctly
- [ ] Speech is transcribed
- [ ] AI responds naturally
- [ ] Booking data is saved to `Bookings`, with a row in `ActivityLog`
- [ ] WhatsApp confirmation arrives
- [ ] `Verify Twilio Signature` shows `signature_valid: true` in both executions (incoming + turn)

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

1. Switch `TWILIO_SIGNATURE_MODE` to `enforce` and restart n8n
2. Monitor first 10 calls in real-time (n8n Executions + `ActivityLog`)
3. Review Daily Report next morning (only if `ConversationLogs` is being written, see "Which workflows to deploy")
4. Tune prompts based on AI analysis suggestions
5. Gradually increase call volume
