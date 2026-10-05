# Product Marketing Context — Marvice Media Pvt Ltd

**Document version:** v1
**Last updated:** 2026-10-05

> Drafted from the `marvice-2019/claude` repo (voice agent, Agency Agents landing, Dots portal) and the founder brief. `[CONFIRM]` = unverified, fill before using in client-facing copy.

## Product Overview
**One-liner:** Growth agency that builds the marketing *and* the machines — campaigns, sites and AI agents that pick up the phone, book the table and sell the upgrade.
**What it does:** Marvice Media runs full-funnel growth for brands — paid ads, content, SEO/AEO, web builds and automation — with an in-house dev team. Its flagship productised offer is an AI voice agent for hospitality (clubs, restaurants, pubs) that handles reservations, enquiries, complaints and promotions in English, Tamil, Telugu, Kannada and Malayalam.
**Product category:** Performance/growth marketing agency + AI automation studio. Customers search "digital marketing agency [city]", "restaurant marketing agency", "AI voice agent for restaurants", "AI receptionist India".
**Product type:** Service (retainer + project) with a productised SaaS-like layer (AI voice agent, n8n automations).
**Business model:** `[CONFIRM]` Monthly retainers for marketing; setup fee + monthly per-outlet fee for the voice agent (onboarding ~2 hours per new business); project fees for builds.

## Target Audience
**Target companies:**
1. F&B and hospitality in South India — clubs, pubs, restaurants, cafés, multi-outlet groups (core).
2. SMB/mid-market brands needing an outsourced growth team with real dev capability.
**Decision-makers:** Owners/founders, F&B GMs and outlet managers, marketing heads of multi-outlet groups.
**Primary use case:** Fill tables and events predictably — more bookings at lower cost, with no missed calls.
**Jobs to be done:**
- "Answer every booking call, in the caller's language, even at 11pm on a Saturday."
- "Get footfall on slow weekdays and sell out event nights."
- "Give me one partner who does ads, content, site and tech — not four vendors."
**Use cases:**
- AI voice agent: table bookings, VIP upsell, event promos, outbound campaigns, WhatsApp confirmations, escalation to humans.
- Launch/event campaigns: Meta + Google ads, influencer pushes, menu and offer creative.
- Websites, landing pages, booking funnels, tracking (GA4/CAPI).
- Workflow automation (n8n) — CRM in Google Sheets, follow-ups, feedback loops.

## Personas
| Persona | Cares about | Challenge | Value we promise |
|---------|-------------|-----------|------------------|
| Owner / founder (decision maker, financial buyer) | Covers, revenue per outlet, ROI on spend | Paying agencies without seeing bookings move | Bookings and revenue tied to spend, reported weekly |
| GM / outlet manager (user, champion) | Smooth floor ops, no missed calls, happy guests | Phones ring during rush; staff can't upsell or follow up | Every call answered and logged; staff freed for guests |
| Marketing head, multi-outlet group (champion) | Consistent brand, scalable campaigns, attribution | Fragmented vendors, no single view of what works | One team, one dashboard, playbooks that roll out per outlet |
| Ops / IT (technical influencer) | Integrations, data safety, uptime | Fear of brittle tools and lock-in | Built on standard stack (Twilio/Exotel, WhatsApp, Sheets, n8n); data stays theirs |

## Problems & Pain Points
**Core problem:** Hospitality businesses lose revenue at the two ends of the funnel — demand generation is guesswork, and the demand they do generate leaks through missed calls, slow replies and zero follow-up.
**Why alternatives fall short:**
- Generalist agencies post pretty content but can't tie it to covers, and can't build tech.
- Booking platforms (Zomato/Swiggy Dineout, EazyDiner) take commission and own the customer relationship.
- Front-desk staff miss calls at peak, don't upsell, and churn.
- Off-the-shelf IVRs/chatbots are English-first and robotic — fail with Tanglish/Tenglish callers.
**What it costs them:** Missed peak-hour calls, empty weekday tables, aggregator commissions, wasted ad spend with no attribution. `[CONFIRM: quantify — e.g. % calls missed at peak, avg cover value]`
**Emotional tension:** "I'm spending on marketing and still don't know if it works." "Every missed call is a table someone else filled."

## Competitive Landscape
**Direct:** Local digital/social agencies (Bengaluru/Chennai/Hyderabad/Kochi) — falls short because content-led with no dev, automation or booking attribution.
**Direct (voice):** AI voice/receptionist platforms (e.g. Bland, Retell/Vapi-based resellers, Indian conversational AI vendors) — falls short because generic, English/Hindi-first, sold as software with no marketing layer.
**Secondary:** Aggregators and reservation platforms (Zomato, Swiggy Dineout, EazyDiner, District) — falls short because commissions and they own the guest data.
**Indirect:** Hiring an in-house marketer + extra front-desk staff — falls short because expensive, single-skill, high churn, no 24/7 coverage.

## Differentiation
**Key differentiators:**
- Marketing + engineering under one roof — we build the funnel and the tech that converts it.
- Native South Indian multilingual voice agent with code-switching (Tamil, Telugu, Kannada, Malayalam, English).
- Deep F&B operating experience — the team runs menus, platforms, events and promotions, not just ads.
- AI-native delivery: in-house agent tooling lets a small senior team ship at agency-of-50 speed.
- Closed loop: campaign → call/WhatsApp → booking → CRM → daily learning loop.
**How we do it differently:** Treat every campaign as a system with tracking and automation baked in, not a content calendar.
**Why that's better:** More bookings per rupee, fewer leaks, and reporting the owner actually trusts.
**Why customers choose us:** One accountable partner who understands hospitality and ships tech. `[CONFIRM with real client reasons]`

## Objections
| Objection | Response |
|-----------|----------|
| "Guests won't want to talk to a bot." | Speaks their language with natural fillers, mirrors tone, escalates to a human on request or frustration. Pilot on overflow/after-hours calls first. |
| "We've been burned by agencies before." | Bookings-linked KPIs, weekly reporting, short pilot before retainer. `[CONFIRM pilot terms]` |
| "Too expensive vs a receptionist." | Answers 24/7 across outlets, upsells every call; compare per-booking cost, not salary. |
| "Will it integrate with our POS/reservation system?" | Standard webhooks/Sheets/WhatsApp today; custom integrations by our dev team. |

**Anti-persona:** Single-outlet businesses with no budget for ads or setup; brands wanting only cheap post-design; buyers who need enterprise procurement/SOC2 on day one; businesses outside hospitality wanting only the voice agent with no fit to its scripts.

## Switching Dynamics
**Push:** Missed calls at peak, aggregator commissions, agency reports full of likes not covers.
**Pull:** Every call answered in the guest's language; one team for ads, site and automation; numbers tied to bookings.
**Habit:** "Our staff handles calls fine." Existing agency relationship. Aggregators feel safe.
**Anxiety:** AI sounding robotic or saying something wrong to a guest; setup disruption; lock-in; data privacy.

## Customer Language
**How they describe the problem:** `[CONFIRM — capture verbatim from sales calls/WhatsApp]`
- "Weekend-la phone edukka aale illa" (no one to pick up the phone on weekends) — example of the code-switched voice to collect
- "Ads are running but tables aren't filling."
**How they describe us:** `[CONFIRM — pull from client reviews/testimonials]`
**Words to use:** bookings, covers, footfall, tables filled, every call answered, in your guest's language, revenue, pilot, systems
**Words to avoid:** synergy, leverage, cutting-edge, revolutionary, "AI-powered" as a headline claim, "chatbot", "reach and impressions" as outcomes
**Glossary:**
| Term | Meaning |
|------|---------|
| Voice agent / "Priya" | Default persona of the multilingual AI calling agent |
| Covers | Guests served — the core F&B outcome metric |
| Escalation | Live handoff from voice agent to staff |
| Learning loop | Daily AI review of calls to improve scripts |
| Outlet onboarding | ~2-hour setup to launch the agent for a new business |

## Brand Voice
**Tone:** Confident, sharp, warm — senior operator, not salesperson.
**Style:** Direct, numbers-first, plain English; short sentences; show the system, skip the hype.
**Personality:** Operator-minded, inventive, accountable, local-savvy, no-fluff.

## Proof Points
**Metrics:** `[CONFIRM]` — e.g. calls handled, booking conversion rate, % after-hours bookings captured, ROAS on event campaigns.
**Customers:** `[CONFIRM]` — client logos (F&B groups, clubs, brands).
**Testimonials:**
> "[CONFIRM]" — [owner/GM, venue]
**Value themes:**
| Theme | Proof |
|-------|-------|
| Never miss a booking | 24/7 multilingual voice agent, WhatsApp confirmations `[add volume metric]` |
| Spend that shows up as covers | Bookings-linked tracking + CRM `[add case study]` |
| Ships fast | ~2h outlet onboarding; in-house dev + AI agent tooling |
| Speaks the guest's language | 5 languages + Tanglish/Tenglish code-switching |

## Goals
**Business goal:** `[CONFIRM]` Grow retainer revenue in hospitality and productise the voice agent across multi-outlet F&B groups.
**Conversion action:** Book a strategy call / start a voice-agent pilot.
**Current metrics:** `[CONFIRM]`

## Risks to resolve before going to market
- The current voice-agent prompt tells the agent to "NEVER reveal you are AI." Disclosure rules are tightening (India's DPDP Act and telecom/consumer rules; most AI-calling platforms require disclosure), and being caught out damages trust. Recommended: disclose lightly up front ("Hi, I'm Priya, the virtual host at {{business_name}}") and position on how human it sounds, not on deception.

## Changelog
*Newest first. One line per revision: what changed and why.*
- v1 (2026-10-05) — Initial context, auto-drafted from repo + founder brief; proof points, pricing and verbatim language pending.
