# Scaling Guide — Multi-Business Deployment

## Architecture for Multi-Tenant Support

```
                    ┌─────────────────┐
                    │  Load Balancer   │
                    │  (Nginx/ALB)     │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
       ┌──────▼──────┐ ┌────▼──────┐ ┌────▼──────┐
       │ n8n Instance │ │ n8n Inst. │ │ n8n Inst. │
       │  (Worker 1)  │ │ (Worker 2)│ │ (Worker 3)│
       └──────┬──────┘ └────┬──────┘ └────┬──────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
                    ┌────────▼────────┐
                    │   Redis Cache    │
                    │ (Session Store)  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
       ┌──────▼──────┐ ┌────▼──────┐ ┌────▼──────┐
       │  Business A  │ │Business B │ │Business C │
       │  Config/Data │ │Config/Data│ │Config/Data│
       └─────────────┘ └───────────┘ └───────────┘
```

## Step 1: Multi-Tenant Routing

Map each Twilio phone number to a business:

```json
{
  "+919876543210": {
    "business_id": "blue_lagoon",
    "business_name": "The Blue Lagoon",
    "config_sheet": "sheet_id_1",
    "voice_id": "voice_1",
    "default_language": "en"
  },
  "+919876543211": {
    "business_id": "spice_garden",
    "business_name": "Spice Garden Restaurant",
    "config_sheet": "sheet_id_2",
    "voice_id": "voice_2",
    "default_language": "ta"
  }
}
```

In the webhook trigger, the `To` number determines which business config to load.

## Step 2: Isolated Data per Business

Each business gets:
- Its own Google Sheet (or Airtable base) for bookings, customers, logs
- Its own business config (menu, pricing, timings, offers)
- Its own voice profile in ElevenLabs (customizable per brand)
- Its own system prompt additions (brand-specific personality)

## Step 3: Shared Infrastructure

These are shared across all businesses:
- n8n instance(s) — same workflows handle all businesses
- Deepgram STT — same account, same models
- Claude AI — same API, business context injected per call
- Redis — session management, keyed by CallSid
- Twilio — multiple numbers under one account

## Step 4: Performance Targets at Scale

| Metric | Target | How to Achieve |
|--------|--------|----------------|
| Concurrent calls | 50+ | n8n queue mode + multiple workers |
| Response latency | < 2 seconds | Deepgram streaming + ElevenLabs streaming + Claude Haiku for simple queries |
| Uptime | 99.9% | Redundant n8n instances, multi-region Twilio |
| Cost per call (5 min) | ~₹15-25 | Optimize: use Haiku for simple intents, cache frequent responses |

## Step 5: Cost Optimization

| Service | Cost | Optimization |
|---------|------|--------------|
| Twilio | ~₹1/min | Use Exotel for India-only (cheaper) |
| Deepgram | ~$0.0043/min | Use Nova-2 (cheaper than Whisper) |
| ElevenLabs | ~$0.18/1K chars | Cache common phrases (greeting, goodbye). Use Azure for regional (~$0.016/1K chars) |
| Claude Sonnet | ~$0.003/1K tokens | Use Haiku ($0.00025/1K) for simple intents (greeting, goodbye, simple queries) |
| Google Sheets | Free | Move to PostgreSQL at 1000+ calls/day |

**Cost per 5-minute call (estimated):**
- Twilio: ₹5
- Deepgram: ₹2
- ElevenLabs: ₹8 (or ₹1 with Azure)
- Claude: ₹3
- **Total: ₹13-18 per call**

## Step 6: Migration Path

| Stage | Volume | Stack |
|-------|--------|-------|
| MVP | 0-50 calls/day | n8n Cloud + Google Sheets + all APIs |
| Growth | 50-500 calls/day | n8n self-hosted (Docker) + PostgreSQL + Redis |
| Scale | 500-5000 calls/day | n8n queue mode (3+ workers) + managed PostgreSQL + CDN for audio |
| Enterprise | 5000+ calls/day | Custom Node.js service replacing n8n + Kubernetes + dedicated GPU for local STT/TTS |

## Step 7: Adding a New Business (Checklist)

1. [ ] Get Twilio number → Map to business ID
2. [ ] Create Google Sheet from template → Fill business config
3. [ ] Clone ElevenLabs voice (or select preset) → Get voice_id
4. [ ] Add business entry to routing config
5. [ ] Create WhatsApp templates in WATI for the business
6. [ ] Test with 3 sample calls (booking, enquiry, complaint)
7. [ ] Go live — monitor first 24 hours closely

**Time to onboard a new business: ~2 hours**
