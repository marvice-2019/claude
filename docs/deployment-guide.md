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
3. Set environment variables in n8n Settings → Variables

### Option B: Self-Hosted (Production)
```bash
docker run -d \
  --name n8n \
  --restart always \
  -p 5678:5678 \
  -e N8N_ENCRYPTION_KEY=your-secret-key \
  -e EXECUTIONS_MODE=queue \
  -e QUEUE_BULL_REDIS_HOST=redis \
  -e GENERIC_TIMEZONE=Asia/Kolkata \
  -v n8n_data:/home/node/.n8n \
  n8nio/n8n:latest
```

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

Copy `configs/env-template.env` to `.env` and fill in all values.

In n8n, add each as a variable:
- Settings → Variables → Add each key

---

## Step 5: Set Up WhatsApp (WATI)

1. Register on WATI and connect your WhatsApp Business number
2. Create message templates:
   - `booking_confirmation`: "Hi {{1}}! Your reservation at {{5}} is confirmed. Date: {{2}}, Time: {{3}}, Guests: {{4}}. See you there!"
   - `call_followup`: "Hi {{1}}! Sorry we couldn't connect on the call. Reply here to continue — we're happy to help!"
   - `daily_report`: "Daily Report ({{1}}): {{2}} calls, {{3}} booking rate, {{4}} escalation rate."
3. Get API key from WATI dashboard

---

## Step 6: Import Workflows into n8n

1. Open n8n editor
2. Click "Import from File"
3. Import in this order:
   - `workflows/main-voice-agent.json` (core workflow)
   - `workflows/outbound-campaign.json` (outbound calls)
   - `workflows/feedback-learning-loop.json` (daily analytics)
4. Activate all three workflows

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
