# Reference workflows: Zie619/n8n-workflows

These are 7 workflows picked from [Zie619/n8n-workflows](https://github.com/Zie619/n8n-workflows) (MIT, see `LICENSE`), commit `94007c1`. Upstream has about 2,000 workflow JSONs (46 MB), and most of them are generic SaaS glue. I kept only the ones that fit this stack (voice gateway, booking, WhatsApp, call logging).

**They are reference material only, not production workflows.** Do not import them into the live instance as they are. Lift the patterns into `workflows/`.

| File | Upstream | What to take from it | Maps to |
|------|----------|----------------------|---------|
| `retell-inbound-phone-agent-calendar.json` | `Telegram/0735` | Inbound AI phone agent: voice platform → n8n webhook → Google Calendar booking → post-call notify | `main-voice-agent.json` booking path |
| `retell-outbound-lead-qualification.json` | `Wait/1362` | Sheet-triggered outbound call, wait for call result, write the qualification back to Sheets, email follow-up | `outbound-campaign.json` |
| `retell-custom-function-webhook.json` | `Respondtowebhook/0900` | Minimal mid-call "custom function" contract (webhook → logic → `respondToWebhook`) | AI-brain tool calls (availability, pricing) |
| `retell-transcripts-to-sheets.json` | `Webhook/0845` | Filter `call_analyzed` events and persist transcript and analysis to Sheets/Airtable/Notion | `feedback-learning-loop.json` input |
| `vapi-slot-lookup-booking.json` | `Webhook/0829` | 92-node slot lookup, availability, booking and cancellation backend for a voice agent | Table reservation logic |
| `whatsapp-cloud-api-starter.json` | `Whatsapp/2030` | Meta Cloud API webhook verification (GET challenge) and inbound handling | Escape hatch off WATI if per-message cost bites |
| `twilio-sms-ai-agent.json` | `Twilio/0841` | Twilio trigger → AI Agent with Airtable tool → SMS reply | SMS fallback channel |

## Known upstream issues

- **Broken links in sticky notes.** Upstream's sanitizer replaced URLs with `{{ $env.WEBHOOK_URL }}`, which affects 6 of the 7 files. Treat the setup notes as hints and get the real URLs from the vendor docs.
- **Credential IDs** point to the original author's instance. Re-bind every credential after import.
- **Old node versions** in some files (e.g. `itemLists`, `cron`). Run `validate_workflow` through n8n-mcp and upgrade the nodes before reusing them.
- The Retell and Vapi flows assume a hosted voice platform. Our stack runs Twilio/Exotel + Deepgram + ElevenLabs directly, so reuse their webhook contracts and booking logic, not their telephony layer.

## Refreshing

```bash
git clone --depth 1 https://github.com/Zie619/n8n-workflows.git /tmp/zie
# browse: https://zie619.github.io/n8n-workflows
```

Before you add another file, check that it fits the stack. Don't bulk-import.
