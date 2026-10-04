# Webhook Security & Bot Pause

Applies to the split stack: `n8n-import-call-handler.json`, `n8n-import-ai-brain.json`, `n8n-import-crm-whatsapp.json`. The earlier workflow versions (`main-voice-agent.json`, `n8n-import-complete.json`, `-1-`/`-2-`) don't have these checks. Don't deploy them.

## What changed

| Webhook | Before | Now |
|---|---|---|
| `voice/incoming`, `voice/turn` | Anyone with the URL could start calls, burn Deepgram/ElevenLabs/Claude credits, write fake bookings | `X-Twilio-Signature` verified (HMAC-SHA1 of URL + sorted params). Bad requests get `403` |
| `crm-action` | Anyone could make it save rows and send WhatsApp templates to any number | Requires `X-Internal-Token`. Missing or wrong token gets `401` |
| `ai-brain` | Anyone could spend Claude credits, and trigger booking confirmations through it | Requires `X-Internal-Token`, sent by the call handler. Missing or wrong token gets `401` |
| `voice/outbound-greeting`, `voice/outbound-status` (outbound campaign) | — | Same Twilio signature check as the call handler |

**Bot pause.** When the AI transfers a caller to a human, or a complaint is logged, the guest gets an `active` row in the `Handoffs` sheet for `HANDOFF_PAUSE_HOURS` (default 24). While it's active:

- **Their next call** skips the AI and dials `ESCALATION_PHONE` directly. If no valid number is set, the AI answers as before, so the line never goes dead.
- **Automated lead follow-ups** on WhatsApp are skipped and logged as `followup_skipped_handoff`.
- **Outbound campaign calls** to them are skipped and the queue row is marked `skipped_handoff`. If the `Handoffs` sheet can't be read, that run dials nobody.
- **Booking confirmations** still send, because the guest needs them.

Staff end a pause by setting `status` to `released` in the sheet.

## Setup (in order)

1. **Allow `crypto` in Code nodes.** Start n8n with `N8N_RUNNERS_ALLOWED_BUILT_IN_MODULES=crypto`. On older versions without task runners, use `NODE_FUNCTION_ALLOW_BUILTIN=crypto`. Without it, every call is rejected with `crypto_module_not_allowed`.
2. **Set `N8N_BASE_URL`** to the exact public origin Twilio calls, e.g. `https://n8n.example.com`, with no trailing slash and no `/webhook`. The TwiML action URLs and the signature check both build from it, so they always match.
3. **Point Twilio's Voice webhook** to `${N8N_BASE_URL}/webhook/voice/incoming` (POST). Don't add query parameters, because they change the signed URL.
4. **Set the secrets:** `TWILIO_AUTH_TOKEN` (the primary token from the Twilio console) and `INTERNAL_WEBHOOK_TOKEN` (`openssl rand -hex 32`).
5. **Add the `Handoffs` sheet** with the headers in `configs/google-sheets-schema.md`. Then select your Google Sheets credential on the three new Sheets nodes: `Check Caller Handoff`, `Check Lead Handoff` and `Upsert Handoff`.
6. **Roll out the signature check in two steps:**
   - Set `TWILIO_SIGNATURE_MODE=log` and make two test calls.
   - In each execution, `Verify Twilio Signature` should show `signature_valid: true`. If it shows `signature_mismatch`, compare `signature_url` with the URL in the Twilio console.
   - Once both calls verify, switch to `enforce`.

## Test checklist

- [ ] A genuine call verifies (`signature_reason: ok`).
- [ ] `curl -X POST ${N8N_BASE_URL}/webhook/voice/turn -d From=+911` returns `403`.
- [ ] `curl -X POST ${N8N_BASE_URL}/webhook/crm-action -H 'Content-Type: application/json' -d '{"action":"LEAD_CAPTURE"}'` returns `401`.
- [ ] Booking confirmations still arrive. If one doesn't, check that `INTERNAL_WEBHOOK_TOKEN` is set: the AI brain sends it.
- [ ] Say "I want to speak to a manager". A `Handoffs` row appears with `status = active`.
- [ ] Call again from the same number. You should be connected straight to `ESCALATION_PHONE`.
- [ ] Set the row to `released` and call again. The AI should answer.

## Failure behaviour

| Situation | Result |
|---|---|
| `TWILIO_AUTH_TOKEN`, `N8N_BASE_URL` or `crypto` missing, mode `enforce` | Calls rejected (fails closed). Use `log` while setting up |
| `INTERNAL_WEBHOOK_TOKEN` unset or under 16 chars | `ai-brain` and `crm-action` reject everything. Callers hear "could you repeat that?" on every turn, and nothing reaches Sheets or WhatsApp |
| Sheets error on a handoff lookup | Treated as not paused: the AI answers and follow-ups send |
| Handoff upsert fails | Logged and the request continues, so the complaint and WhatsApp ack aren't lost |
