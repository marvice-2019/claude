# Google Sheets Schema

Row 1 of each sheet holds the column names below. The split stack's Sheets nodes map by header name, so order doesn't matter, but a missing header means that field is silently dropped.

| Sheet | Used by |
|---|---|
| Bookings, Leads, Complaints, ActivityLog, Handoffs | Split stack (`n8n-import-crm-whatsapp.json`, call handler; Handoffs also read by `outbound-campaign.json`) |
| CallTurns | Written by the AI brain every turn, read by `feedback-learning-loop.json` |
| OutboundQueue | `outbound-campaign.json` |
| DailyReports | `feedback-learning-loop.json` |
| BusinessConfig, Customers, ConversationLogs | Earlier workflow versions only. The split stack keeps venue details in the AI brain's `Load Business Config` node |

## Sheet 1: BusinessConfig

| Column | Field | Type | Example |
|--------|-------|------|---------|
| A | business_id | string | `biz_001` |
| B | business_name | string | `The Blue Lagoon` |
| C | business_type | string | `restaurant_club` |
| D | phone_number | string | `+919876543210` |
| E | timings | string | `Mon-Sun: 12 PM - 1 AM` |
| F | menu_highlights | string | `Biryani, Grilled Seafood, Cocktails, Mocktails` |
| G | current_offers | string | `20% off group bookings (5+), Ladies night Wed` |
| H | vip_options | string | `VIP booth ₹2000 extra, private dining ₹5000` |
| I | address | string | `123 MG Road, Bangalore 560001` |
| J | escalation_number | string | `+919876543211` |

## Sheet 2: Customers

| Column | Field | Type | Example |
|--------|-------|------|---------|
| A | phone | string | `+919876543210` |
| B | name | string | `Rahul Sharma` |
| C | language_pref | string | `en` |
| D | total_visits | number | `5` |
| E | last_visit | date | `2026-03-10` |
| F | notes | string | `Prefers corner table, vegetarian` |

## Sheet 3: Bookings

| Column | Field | Type | Example |
|--------|-------|------|---------|
| A | timestamp | datetime | `2026-03-18T14:30:00Z` |
| B | session_id | string | `CA1234567890` |
| C | phone | string | `+919876543210` |
| D | name | string | `Rahul Sharma` |
| E | date | date | `2026-03-22` |
| F | time | time | `20:00` |
| G | guests | number | `6` |
| H | special_requests | string | `Birthday setup` |
| I | intent | string | `booking` |
| J | language | string | `en` |
| K | status | string | `confirmed` |
| L | business_id | string | `biz_001` (written by the split stack) |

## Sheet 4: ConversationLogs

| Column | Field | Type | Example |
|--------|-------|------|---------|
| A | timestamp | datetime | `2026-03-18T14:30:00Z` |
| B | session_id | string | `CA1234567890` |
| C | phone | string | `+919876543210` |
| D | intent | string | `booking` |
| E | language | string | `ta` |
| F | emotion | string | `happy` |
| G | conversation_json | JSON string | `[{"role":"user","content":"..."},...]` |
| H | turns | number | `8` |

## Sheet 5: OutboundQueue

You fill A–H; the outbound workflow fills the rest. `phone` must be in `+<country><number>` format. `purpose` is one of `booking_reminder`, `follow_up`, `event_promo`, `feedback`, `offer`. A blank `scheduled_time` means "as soon as possible". To retry a call, set `status` back to `pending`.

| Column | Field | Type | Example |
|--------|-------|------|---------|
| A | phone | string | `+919876543210` |
| B | name | string | `Rahul Sharma` |
| C | purpose | string | `event_promo` |
| D | language_pref | string | `en` |
| E | scheduled_time | datetime | `2026-03-19T10:00:00Z` |
| F | business_id | string | `biz_001` |
| G | template | string | `event_promo` (unused by the split stack) |
| H | status | string | `pending` → `dialing`/`calling` → `completed`, `voicemail`, `no-answer`, `busy`, `failed`, `canceled`; or `skipped_handoff`, `invalid_phone`, `invalid_schedule`, `dial_failed` |
| I | call_sid | string | `CA0123…` |
| J | last_attempt_at | datetime | `2026-03-19T10:05:12.000+05:30` |
| K | call_duration | number | `95` (seconds) |
| L | error | string | Twilio's message when `dial_failed` |

## Sheet 6: Leads

| Column | Field | Type | Example |
|--------|-------|------|---------|
| A | timestamp | datetime | `2026-03-18T14:30:00Z` |
| B | session_id | string | `CA1234567890` |
| C | business_id | string | `biz_001` |
| D | phone | string | `+919876543210` |
| E | name | string | `Rahul Sharma` |
| F | interest | string | `private_dining` |
| G | notes | string | `Anniversary, 10 guests in May` |
| H | language | string | `en` |
| I | status | string | `new` |

## Sheet 7: Complaints

| Column | Field | Type | Example |
|--------|-------|------|---------|
| A | timestamp | datetime | `2026-03-18T14:30:00Z` |
| B | session_id | string | `CA1234567890` |
| C | business_id | string | `biz_001` |
| D | phone | string | `+919876543210` |
| E | complaint | string | `Waited 40 minutes for a confirmed table` |
| F | language | string | `ta` |
| G | status | string | `open` |
| H | priority | string | `high` |

## Sheet 8: ActivityLog

| Column | Field | Type | Example |
|--------|-------|------|---------|
| A | timestamp | datetime | `2026-03-18T14:30:00Z` |
| B | action | string | `CONFIRM_BOOKING`, `LEAD_CAPTURE`, `COMPLAINT`, `HANDOFF` |
| C | session_id | string | `CA1234567890` |
| D | business_id | string | `biz_001` |
| E | phone | string | `+919876543210` |
| F | status | string | `completed`, `followup_skipped_handoff` |
| G | details | JSON string | `{"action":"COMPLAINT",...}` |

## Sheet 9: Handoffs

One row per guest per venue. Written by `n8n-import-crm-whatsapp.json` (action `HANDOFF`, and every `COMPLAINT`), read by the call handler and the lead follow-up. While a row is `active` and `paused_until` is in the future, the bot is paused for that guest: their next call goes straight to `ESCALATION_PHONE`, and automated lead follow-ups are skipped. Booking confirmations still send.

| Column | Field | Type | Example |
|--------|-------|------|---------|
| A | handoff_key | string | `biz_001:919876543210` (business_id + `:` + phone digits only) |
| B | business_id | string | `biz_001` |
| C | phone | string | `+919876543210` |
| D | status | string | `active` / `released` |
| E | reason | string | `complaint`, `caller asked for a human` |
| F | source | string | `voice_transfer`, `complaint`, `manual` |
| G | started_at | datetime | `2026-03-18T14:30:00.000Z` |
| H | paused_until | datetime | `2026-03-19T14:30:00.000Z` |
| I | released_by | string | `Anita (manager)` |

Staff end a pause early by setting `status` to `released`. A blank or unreadable `paused_until` keeps the pause on until released. To pause a guest by hand, add a row with `handoff_key` in the exact format above.

## Sheet 10: CallTurns

One row per conversation turn, appended by the AI brain after it replies (so it never slows the call). The daily report groups rows by `session_id`. Each logged turn costs about three Sheets API requests, and Google's default quota is 60 requests a minute per user, shared with every other Sheets node. Expect trouble above roughly 15 turns a minute across all live calls (about 3 busy calls at once); move this log to a database before that volume. Logging failures never affect the call.

| Column | Field | Type | Example |
|--------|-------|------|---------|
| A | timestamp | datetime | `2026-03-18T14:30:00.000Z` |
| B | session_id | string | `CA1234567890` (Twilio CallSid) |
| C | business_id | string | `biz_001` |
| D | phone | string | `+919876543210` |
| E | language | string | `ta` |
| F | caller_text | string | `Table for four tomorrow at 8` |
| G | reply_text | string | `Sure! May I have your name?` |
| H | intent | string | `booking` |
| I | emotion | string | `happy` |
| J | action | string | `continue`, `transfer`, `end_call`, `confirm_booking` |
| K | booking_complete | string | `yes` / `no` |
| L | escalated | string | `yes` / `no` |

## Sheet 11: DailyReports

| Column | Field | Type | Example |
|--------|-------|------|---------|
| A | date | date | `2026-03-18` (the day covered, venue timezone) |
| B | total_calls | number | `42` |
| C | bookings_completed | number | `11` |
| D | booking_rate | string | `61.1%` (completed bookings / calls with booking intent) |
| E | escalation_rate | string | `7.1%` |
| F | metrics_json | JSON string | intent, language and emotion breakdowns |
| G | ai_analysis | string | Claude's review of the day's transcripts |
| H | status | string | `pending_review` |
