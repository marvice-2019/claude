# AI Voice Agent — n8n Workflow System

Production-ready AI voice agent for customer care and sales in hospitality businesses (clubs, restaurants, pubs). Supports English, Tamil, Telugu, Kannada, and Malayalam with human-like conversational ability.

## Tech Stack

| Component | Service | Purpose |
|-----------|---------|---------|
| Automation Engine | **n8n** | Core workflow orchestration |
| Voice Gateway | **Twilio / Exotel** | Inbound + outbound calls |
| Speech-to-Text | **Deepgram Nova-2** | Real-time multilingual transcription |
| Text-to-Speech | **ElevenLabs + Azure TTS** | Human-like voice synthesis |
| AI Brain | **Claude (Anthropic)** | Conversational intelligence |
| Data Storage | **Google Sheets** | Bookings, CRM, logs |
| Messaging | **WhatsApp (WATI)** | Confirmations + follow-ups |

## Project Structure

```
├── workflows/
│   ├── main-voice-agent.json        # Core inbound call workflow (n8n)
│   ├── outbound-campaign.json       # Outbound calling campaign workflow
│   └── feedback-learning-loop.json  # Daily analytics + prompt improvement
├── prompts/
│   ├── system-prompt.md             # Full AI system prompt (multi-language)
│   └── conversation-scripts.md      # Sample scripts in 5 languages
├── scripts/
│   ├── twilio-webhook-handler.js    # Optional real-time streaming server
│   └── azure-tts-fallback.js        # Azure TTS for regional languages
├── configs/
│   ├── env-template.env             # Environment variables template
│   └── google-sheets-schema.md      # Database schema for Google Sheets
└── docs/
    ├── architecture.md              # Full system architecture diagram
    ├── edge-cases.md                # Edge case handling reference
    ├── scaling-guide.md             # Multi-business scaling guide
    └── deployment-guide.md          # Step-by-step deployment instructions
```

## Quick Start

1. Set up n8n (cloud or self-hosted)
2. Import the 3 workflows from `workflows/`
3. Configure API keys from `configs/env-template.env`
4. Set up Google Sheets from `configs/google-sheets-schema.md`
5. Configure Twilio webhook → your n8n URL
6. Test with a phone call

See `docs/deployment-guide.md` for detailed instructions.

## Key Features

- **Human-like conversations** — natural fillers, empathy, tone adaptation
- **5 Indian languages** — English, Tamil, Telugu, Kannada, Malayalam + code-switching
- **Emotion detection** — adapts tone for angry, urgent, confused, happy callers
- **Smart upselling** — VIP tables, events, offers (non-pushy, psychology-driven)
- **Automatic escalation** — transfers to human when needed
- **Learning loop** — daily AI analysis of conversations for continuous improvement
- **Multi-business ready** — onboard a new business in ~2 hours
