# n8n Template References

18 templates curated from [enescingoz/awesome-n8n-templates](https://github.com/enescingoz/awesome-n8n-templates) (369 total, snapshot `8271103`, 2026-09-12). Only the ones that map to this voice-agent system are kept. These are **reference patterns, not production workflows** — lift the pattern into `workflows/`, don't import and run as-is.

## Index

| File | Steal this | Applies to |
|---|---|---|
| **voice/** | | |
| `restaurant-voice-agent-elevenlabs-rag` | ElevenLabs agent → n8n webhook tool → Qdrant RAG over menu/policy docs → answer back to voice | `n8n-import-ai-brain.json` — menu/FAQ grounding instead of stuffing it all in the system prompt |
| `voice-chat-memory-manager` | Memory Manager get/save context keyed per caller, wrapped around an LLM chain | Multi-turn context in `n8n-import-2-conversation-loop.json` |
| `call-logger-sheets` | Minimal webhook → normalize (Code) → Sheets append → 200 | Baseline for call-log row shape; ours is richer, use for sanity diff |
| `elevenlabs-tts-endpoint` | TTS as its own webhook endpoint with input validation + error response | Split TTS into a sub-workflow so Azure fallback (`scripts/azure-tts-fallback.js`) sits behind one interface |
| **whatsapp/** | | |
| `lead-qualify-handoff-followups` | X-Hub-Signature-256 verification, dedupe by message id, human-handoff flag that mutes the bot, scheduled follow-ups, Error Trigger | **Highest value.** Handoff mute + dedupe are gaps in `n8n-import-crm-whatsapp.json` |
| `multimodal-replies-voice-notes` | Switch on message type; voice notes → transcription → agent | Customers replying to WATI confirmations with voice notes |
| `rag-chatbot` | Meta GET verify + POST respond webhooks on one URL; filter status callbacks vs real messages | Only if moving off WATI to Meta Cloud API direct |
| `twilio-redis-message-buffer` | Redis list + Wait → only answer after user stops typing | Stops double-replies when a guest sends 3 messages in a row |
| **ai-routing/** | | |
| `claude-intent-router` | Claude Haiku classifier → JSON parse with safe fallback → Switch | Cheap first-pass intent routing (booking / complaint / event / VIP) before the expensive model |
| `lead-score-reply-book` | Lead normalize + 24h duplicate guard, AI score/intent, hot-lead alert to sales | `outbound-campaign.json` lead prioritisation; call-outcome → sales alert |
| `twilio-appointment-agent-followups` | Agent with HTTP tools for slot check/book/reschedule; follow-up rules (no booking, no STOP, ≤3 tries, 3-day gap) | Booking tools + outbound follow-up eligibility rules |
| **escalation/** | | |
| `ask-human-tool` | Escalation as an agent **tool** (sub-workflow) that collects contact info before paging staff | Cleaner escalation trigger than keyword rules — compare with current escalation path |
| **sheets-crm/** | | |
| `chat-with-google-sheet` | Agent tools that return column list / filtered rows instead of the whole sheet | Staff/manager bot querying bookings & CRM sheets without blowing context |
| `feedback-sentiment-to-sheets` | Form → sentiment → merge → Sheets | Post-visit feedback feed into `feedback-learning-loop.json` |
| **reliability/** | | |
| `webhook-hmac-guard` | HMAC-SHA256 on raw body + timestamp window + replay rejection | Pattern for Twilio `X-Twilio-Signature` validation on call webhooks |
| `resilient-http-retries` | Bounded retries, 10s timeout, required-field validation, credential-safe error record | Deepgram / ElevenLabs / WATI HTTP nodes |
| `silent-workflow-check` | Schedule → n8n API → flag active workflows with no recent executions | Catches a dead Twilio webhook that never errors |
| `failed-execution-doctor` | Sub-workflow that diagnoses a failed execution from workflow + execution JSON | Hang off an Error Trigger workflow for readable alerts |

## Priority adoption order

1. **WhatsApp handoff mute + dedupe** (`lead-qualify-handoff-followups`) — prevents bot replying while a human is handling the guest.
2. **Webhook signature verification** (`webhook-hmac-guard`) — call/WhatsApp webhooks are currently unauthenticated public URLs.
3. **Silent workflow check** — cheapest insurance for a phone line that fails quietly.
4. **Claude intent router** — cut LLM cost on simple intents.
5. **Menu RAG** (`restaurant-voice-agent-elevenlabs-rag`) — once menus/policies outgrow the prompt.

## Before importing any of these

- Credential IDs in the JSON point to the original author's instance — rebind every credential after import.
- Several use OpenAI/Gemini nodes; swap to the Anthropic chat model node to stay on Claude.
- `whatsapp/*` templates target Meta Cloud API, not WATI — payload shapes differ.
- Validate with the `n8n-validation-expert` skill before activating.

## License & attribution

Source: "awesome-n8n-templates" by Enes Cingoz, licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Individual templates retain credit to their original n8n community authors. Changes made here: files renamed and regrouped into folders; workflow JSON content unmodified.
