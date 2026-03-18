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
