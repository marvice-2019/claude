# Edge Case Handling — Complete Reference

## 1. Silence / No Response

| Scenario | Detection | Action |
|----------|-----------|--------|
| Silence after greeting | Deepgram returns empty transcript | Gentle prompt: "I didn't catch that. Go ahead, I'm listening." |
| Silence 2nd time | Empty transcript count = 2 | "Hello? Are you still there?" |
| Silence 3rd time | Empty transcript count = 3 | End call gracefully + send WhatsApp: "Sorry we couldn't connect. Reply here to chat!" |
| Background noise only | Deepgram returns low-confidence noise | Treat as silence, same flow |

**n8n Implementation:** `check-silence` IF node → `silence-handler` Code node

---

## 2. Language Confusion

| Scenario | Detection | Action |
|----------|-----------|--------|
| Can't detect language | Deepgram confidence < 0.5 on language | Ask explicitly: "Would you prefer English, Tamil, Telugu, Kannada, or Malayalam?" |
| Caller switches language mid-call | Deepgram detects different lang after turn 3 | Follow the new language seamlessly. Update session variable. |
| Unsupported language (Hindi, etc.) | Detected lang not in supported list | Respond in English: "I'm most comfortable in English, Tamil, Telugu, Kannada, or Malayalam. Which would you prefer?" |
| Code-switching (Tanglish, etc.) | Mixed script detected | Mirror the code-switching pattern. AI prompt handles this. |

**n8n Implementation:** `language-detection` Code node with fallback logic

---

## 3. Angry / Aggressive Customers

| Scenario | Detection | Action |
|----------|-----------|--------|
| Mild frustration | Keywords: "disappointed", "not happy" | Empathize → solve: "I understand, let me fix that." |
| Moderate anger | Keywords: "terrible", "unacceptable", "waste" | Deep empathy → apologize → offer concrete solution |
| Severe anger / abuse | Keywords: profanity, threats | "I understand you're very upset. Let me connect you with our manager right away." → Escalate |
| Repeated anger (3+ angry turns) | emotion_state = 'angry' for 3+ consecutive turns | Auto-escalate to human |
| Sarcasm | Hard to detect | AI handles via context. If unsure, stay professional and direct. |

**n8n Implementation:** `emotion-detection` Code node → `check-escalation` IF node

---

## 4. Invalid Inputs

| Scenario | Detection | Action |
|----------|-----------|--------|
| Invalid date ("February 30") | AI validates in response | "I don't think that date exists. Did you mean February 28?" |
| Past date | AI checks against current date | "That date has already passed. Would you like to book for next week instead?" |
| Too many guests (>50) | AI checks against business max capacity | "Our maximum group size is 30. For larger events, let me connect you with our events team." |
| Garbled/nonsensical speech | Low STT confidence (<0.4) | "I'm having a bit of trouble hearing clearly. Could you repeat that?" |
| DTMF tones instead of speech | Twilio detects DTMF | "I can hear you pressing buttons. Could you speak to me instead? I'm here to help!" |

**n8n Implementation:** AI prompt includes validation rules. Code node validates critical fields.

---

## 5. Call Drops / Network Issues

| Scenario | Detection | Action |
|----------|-----------|--------|
| Call drops mid-conversation | Twilio status callback: "completed" early or "failed" | Log partial data. Send WhatsApp: "Sorry, looks like our call got disconnected. Here's where we left off: [summary]" |
| Call drops during booking | Booking incomplete + call ended | Save partial data. WhatsApp: "We were in the middle of your reservation. Reply YES to continue booking." |
| Poor audio quality | Multiple low-confidence STT results | "The connection seems a bit unclear. Could you try calling from a different spot?" |
| n8n timeout | Workflow exceeds timeout | Return TwiML with generic "Please hold" → retry processing |
| TTS service down | ElevenLabs API error | Fall back to Azure TTS. If both fail, use Twilio's built-in Polly voice. |
| AI service down | Claude API error/timeout | Return a generic response: "Let me check on that and get back to you shortly." + log for retry |

**n8n Implementation:** Error handling nodes on every HTTP request. `call-status` webhook handles drops.

---

## 6. Double Bookings

| Scenario | Detection | Action |
|----------|-----------|--------|
| Same person, same date | Check Bookings sheet for phone + date match | "I see you already have a booking on that date. Would you like to modify it or create a separate one?" |
| Table capacity full | Check total guests for date/time slot | "That time slot is quite popular! We have availability at 7:30 PM or 9 PM instead. Which works better?" |
| Conflicting bookings | Same table assigned twice | Real-time lock mechanism in Google Sheets (use Apps Script). Fallback: "Let me confirm availability — one moment please." |

**Prevention:** Before confirming any booking, run an availability check against the Bookings sheet.

---

## 7. Edge Cases in AI Responses

| Scenario | Detection | Action |
|----------|-----------|--------|
| AI generates something inappropriate | Output filter in parse-ai-response | Strip any mentions of AI, inappropriate content. Log for review. |
| AI goes off-topic | Response doesn't relate to business | System prompt strongly constrains to business context only |
| AI hallucinates info (wrong price, timing) | Contradicts business config | Business config is injected into system prompt — AI should ground on it. Log mismatches for prompt tuning. |
| AI gives medical/legal advice | Keyword detection | System prompt explicitly forbids non-business topics |
| AI response too long | Word count > 100 | Humanization engine truncates and adds "Would you like me to continue?" |

---

## 8. Timeout Handling

| Component | Timeout | Fallback |
|-----------|---------|----------|
| Deepgram STT | 5 seconds | Retry once, then use Whisper batch API |
| Claude AI | 8 seconds | Stream filler audio ("One moment…") while waiting. If >15s, use cached generic response. |
| ElevenLabs TTS | 5 seconds | Fall back to Azure TTS |
| Google Sheets | 5 seconds | Queue write, retry in background |
| WhatsApp API | 10 seconds | Queue message, retry in background |
| Full conversation turn | 3 seconds target | Stream filler immediately if >1.5s |

---

## 9. Security & Privacy

| Scenario | Action |
|----------|--------|
| Caller asks for another customer's data | "I'm sorry, I can only share information about your own account for privacy reasons." |
| Caller provides credit card number | Do NOT store. "For your security, please don't share payment details over the phone. We'll send a secure payment link via WhatsApp." |
| Recording consent | Start of call: "This call may be recorded for quality purposes." (Configurable per region) |
| GDPR/data deletion request | "I'll flag this with our data team. You'll receive confirmation within 48 hours." → Trigger data deletion workflow |
