# Google Sheets Schema

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
| G | email | string | `rahul@example.com` |
| H | birthday | date | `1992-03-24` (or `24-03`) |
| I | wa_opt_in | boolean | `TRUE` — explicit WhatsApp marketing consent |
| J | wa_opt_out | boolean | `TRUE` once they reply STOP (wins over opt-in) |
| K | email_opt_in | boolean | `TRUE` — explicit email marketing consent |
| L | last_promo_at | datetime | `2026-10-01T13:30:00Z` (frequency cap; set by the WhatsApp broadcast) |
| M | consent_source | string | `booking_form` / `qr_table_card` / `whatsapp_reply` |
| N | consent_updated_at | datetime | `2026-09-28T19:04:00Z` |

> Store `phone` as `+<country code><number>` (e.g. `+919876543210`). WATI webhooks match on that format.
> Consent columns are your DPDP Act record. Never set opt-in without a source.

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

| Column | Field | Type | Example |
|--------|-------|------|---------|
| A | phone | string | `+919876543210` |
| B | name | string | `Rahul Sharma` |
| C | purpose | string | `event_promo` |
| D | language_pref | string | `en` |
| E | scheduled_time | datetime | `2026-03-19T10:00:00Z` |
| F | business_id | string | `biz_001` |
| G | template | string | `event_promo` |
| H | status | string | `pending` |

## Sheet 6: Campaigns (email + WhatsApp marketing)

| Column | Field | Type | Example |
|--------|-------|------|---------|
| A | campaign_id | string | `wa_2026_10_diwali` (unique) |
| B | channel | string | `whatsapp` / `email` |
| C | name | string | `Diwali brunch launch` |
| D | segment | string | `all` / `vip` / `regular` / `new` / `lapsed` / `birthday` |
| E | brief | string | Email only: what Claude should write about |
| F | offer | string | `Flat 20% off brunch, Sun 26 Oct` |
| G | image_url | string | Email hero image (public https) |
| H | send_at | datetime | `2026-10-20 18:30` (venue-local IST unless an offset is given) |
| I | template_name | string | WhatsApp only: approved WATI template, e.g. `festive_offer` |
| J | template_params | JSON | `[{"name":"name","value":"{first_name}"},{"name":"offer","value":"{offer}"}]` |
| K | auto_send | boolean | Email only: `TRUE` schedules in Brevo, otherwise a draft for review |
| L | status | string | `draft` → **`approved`** → `processing` → `sent` / `partially_sent` / `scheduled` / `draft_created` / `failed` |
| M | provider_ref | string | Brevo campaign id |
| N | subject | string | Written back after Claude drafts the email |
| O | sent_count | number | `412` |
| P | failed_count | number | `0` |
| Q | processed_at | datetime | set by workflow |
| R | completed_at | datetime | set by workflow |
| S | notes | string | errors / skip reasons |

## Sheet 7: SocialPosts (content calendar)

| Column | Field | Type | Example |
|--------|-------|------|---------|
| A | post_id | string | `ig_2026_10_14_a` (unique) |
| B | publish_at | datetime | `2026-10-14 19:00` (IST) |
| C | platforms | string | `instagram,facebook` |
| D | format | string | `image` / `reel` / `text` (text = Facebook only) |
| E | media_url | string | Public https URL (JPEG for images, MP4 for reels) |
| F | brief | string | `New smoked old-fashioned, Friday DJ night` |
| G | caption | string | Optional. Leave empty and Claude writes it |
| H | status | string | `draft` → **`approved`** → `processing` → `posted` / `partially_posted` / `failed` |
| I | ig_media_id | string | set by workflow |
| J | fb_post_id | string | set by workflow |
| K | caption_used | string | set by workflow |
| L | posted_at | datetime | set by workflow |
| M | error | string | set by workflow |

## Sheet 8: InstagramLog

| Column | Field | Type |
|--------|-------|------|
| A | timestamp | datetime |
| B | event_id | string |
| C | kind | `comment` / `dm` |
| D | username | string |
| E | sender_id | string |
| F | text | string |
| G | intent | string |
| H | language | string |
| I | public_reply | string |
| J | dm_reply | string |
| K | hidden | boolean |
| L | escalated | boolean |
| M | status | `handled` / `api_error:<action>` |
| N | error | string |

## Sheet 9: MarketingLog

| Column | Field | Type | Example |
|--------|-------|------|---------|
| A | timestamp | datetime | `2026-10-20T13:05:00Z` |
| B | workflow | string | `whatsapp_broadcast` / `email_sync` |
| C | campaign_id | string | `wa_2026_10_diwali` |
| D | event | string | `sent` / `brevo_contact_sync` |
| E | count | number | `412` |
| F | details | string | JSON / error text |
