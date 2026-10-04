# Marketing reference workflows: nusquama/n8nworkflows.xyz

These 13 workflows come from [nusquama/n8nworkflows.xyz](https://github.com/nusquama/n8nworkflows.xyz) (commit `56af728`), an archive of the public templates on n8n.io. Each one keeps its original author's license, so see the `url_n8n` link for attribution. Each folder holds `workflow.json` (importable) and the archived `readme.md` walkthrough.

Upstream has about 20,000 workflows. I scored them all for the four use cases, then excluded the ones that would hurt a real business account:
- **Unofficial WhatsApp senders** (Wasender, Rapiwa, MoltFlow and similar): they rely on WhatsApp Web automation, and Meta bans those numbers.
- **Browser automation for Instagram** (Puppeteer, Phantombuster): it breaks Meta's terms of service and gets the account locked.

Everything kept here uses an official API: Meta Graph and WhatsApp Cloud API, WATI, Brevo, Mailchimp or SMTP.

**Treat these as patterns, not production.** Import into a test n8n project, re-bind credentials and validate (`validate_workflow` via n8n-mcp) before anything touches the live account.

## Email marketing — `email-marketing/`

| Workflow | What it does | Use it for | Swap / fix |
|---|---|---|---|
| `4918-restaurant-newsletter-mailchimp-telegram-approval` | AI writes a restaurant newsletter, a manager approves it on Telegram, then it goes out through Mailchimp | Weekly or monthly newsletter (offers, events, new menu) | Uses OpenAI/OpenRouter. Point it at Claude and pull offers from the `BusinessConfig` sheet |
| `19787-win-back-drip-sheets-smtp` | Multi-step win-back drip from Google Sheets over SMTP | Lapsed guests (no visit in 45+ days) | Drive it from the `Customers` sheet's `last_visit`. Use a transactional SMTP (Brevo/SES), not Gmail |
| `7134-brevo-ecrm-campaigns` | Scheduled campaigns with dedupe and waits through Brevo | Segment blasts (VIP, birthdays, event launches) | Replace NocoDB with Google Sheets |

## WhatsApp marketing — `whatsapp-marketing/`

| Workflow | What it does | Use it for | Swap / fix |
|---|---|---|---|
| `13697-wati-reminders-and-rebooking` | WATI reminders, with guest replies (confirm or reschedule) written back to Sheets | **Best fit.** It's on WATI already. Reservation reminders and rebooking | Map it to the `Bookings` sheet. The templates must be approved in WATI |
| `9553-meta-template-broadcasts-from-sheets` | Sheet-driven broadcast dashboard on approved Meta templates | Promo broadcasts (ladies' night, events, festive menus) | Built on the Cloud API directly. Port the send step to WATI `sendTemplateMessages`, or keep it if you move off WATI |
| `6237-bulk-broadcast-official-whatsapp-node` | Batched template broadcast with sent-status write-back | A simple, rate-limited bulk sender | **Fixed upstream bug:** a dangling connection to a missing node is now re-pointed. `phoneNumberId` is hardcoded to the author's number, so replace it |

## Social media publishing — `social-media-publishing/`

| Workflow | What it does | Use it for | Swap / fix |
|---|---|---|---|
| `11964-instagram-autopost-ai-captions` | Content calendar in Sheets plus a Drive image, AI caption, then a scheduled post to Instagram | Daily food and ambience posts | Make Drive files publicly readable, or host them on a CDN. Instagram fetches the image from a URL |
| `11996-sheets-to-instagram-facebook-linkedin` | A new or updated Sheet row posts to Instagram, Facebook and LinkedIn | Multi-platform posting | Remove LinkedIn for F&B venues |
| `15001-facebook-instagram-ai-posts-with-review` | A form brief becomes an AI post, which is approved before it goes to Facebook and Instagram | Staff submit content ideas and a manager approves them | Swap OpenAI for Claude |

## Instagram auto-reply — `instagram-auto-reply/`

| Workflow | What it does | Use it for | Swap / fix |
|---|---|---|---|
| `16300-comment-public-reply-plus-dm` | Meta webhook, then a public comment reply plus a private DM, on Instagram and Facebook | **Start here.** It's real-time and lean | Ignore your own account's comments, or the bot replies to itself in a loop |
| `14026-dm-ai-chatbot-with-history` | DM webhook, an AI agent with conversation history, then a reply | Answering menu, hours and booking questions in DMs | Swap Gemini for Claude and feed it `BusinessConfig` facts so it never invents prices |
| `15206-comment-to-dm-auto-sender` | A keyword comment ("MENU") triggers an automatic DM | "Comment MENU to get our menu" growth posts | Instagram allows one private reply per comment, within 7 days |
| `16659-comment-ai-reply-telegram-approval` | Polls comments, AI drafts replies, Telegram approves, Sheets logs | Brand-safe mode for complaints and the first weeks | Polling, not webhooks. Fine at low volume |

## Rules for every workflow here

- **WhatsApp marketing only works with approved templates**, and only to opted-in numbers. Track `wa_opt_in` / `wa_opt_out` on `Customers` and honour "STOP". Under India's DPDP Act 2023 you need consent records for both email and WhatsApp.
- **Frequency cap:** at most 1–2 promotional WhatsApp messages per week per guest. Above that, block and report rates rise and Meta downgrades the number's quality rating.
- **Instagram DMs** are allowed only within 24h of the user's last message, or as a private reply to a comment. Don't build cold-DM flows.
- **Meta webhooks:** verify `X-Hub-Signature-256` with the app secret, and respond 200 fast so Meta doesn't retry and cause double replies.
- **Credentials and IDs** (`phoneNumberId`, page IDs, Sheet IDs) belong to the original authors. Replace all of them.
