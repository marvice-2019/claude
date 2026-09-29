# 01 — Inventory and Baseline (Brief §1, Prompt 1)

Source: public WordPress REST API, sitemap probe and page HTML on worxforu.com, pulled 29 Sep 2026. CMS admin access isn't approved yet, so these can't be seen from outside: menu IDs, Elementor data, service/case-study post IDs, form destinations and draft or private records. Confirm them once WPVibe is connected.

## Stack (from public generator tags and REST namespaces)

| Item | Found |
|---|---|
| CMS | WordPress 6.2.13 |
| Theme | Consultio (CaseThemes) + `consultio-child` |
| Builder | Elementor 3.11.5 + Elementor Pro |
| Plugins visible | WooCommerce 7.5.1, Slider Revolution 6.6.10, AIOSEO Pro 4.3.3, Contact Form 7, MC4WP (Mailchimp), Redux, LiteSpeed Cache, Extendify, Font Awesome, Instagram Feed |
| Permalinks | Plain (`?page_id=`). Pretty permalinks are required before the `/services/...` routes in the brief will work. See 03-route-map. |
| Sitemap | `/sitemap.xml` and `/wp-sitemap.xml` return no URLs |
| Cache | LiteSpeed. Purge after every content change. |

## Brand assets (keep)

| Media ID | File | Classification |
|---|---|---|
| 4781, 4782, 4784–4787 | `Asset-14x-8` … `Asset-44x-8` (uploaded 2023/03) | **Genuine Worxforu logo/brand assets.** Keep. |
| 4381–4384 | `p_logo_dark/light/mobile/footer` | Theme demo logos. Check whether the header still references them, then swap to the Asset files. |
| 1558 | `favicon` | Probably the theme favicon. Check it. |

All other media (138 items: team photos, testimonials, clothing, client logos, Envato/ThemeForest icons, demo backgrounds) is theme demo content. **Background images used in the live layout stay** (brief §2: keep current imagery). Only people, testimonial, client-logo and product images get removed from display.

## Pages (45)

Action key: **KEEP-EDIT** = keep the URL and replace its content · **DRAFT** = unpublish and keep in the review inventory · **TEMPLATE** = unpublish, then duplicate it to create the new pages

| ID | Slug | Class | Action | Final destination |
|---|---|---|---|---|
| 9 | home | Live homepage | KEEP-EDIT | `/` |
| 26 | about | Live | KEEP-EDIT | `/about/` |
| 24 | contact | Live | KEEP-EDIT | `/contact/` |
| 407 | services-v-1 | Live services listing | KEEP-EDIT → becomes the Services hub | `/services/` |
| 409 | services-v-2 | Demo variant | TEMPLATE (inner service page base) | draft |
| 30 | faq | Demo | KEEP-EDIT (use for the general FAQ) | `/faq/` |
| 132 | blog-standard | Demo | KEEP-EDIT → Insights archive | `/insights/` |
| 1972 | careers | Demo | DRAFT (publish only if you're hiring) | — |
| 4632 | home-onepage | Demo | DRAFT | — |
| 28, 3516, 3518, 3520, 362 | team, team-v-2/3/4, team-details | Demo people | DRAFT | — |
| 367, 3497, 3500, 3502 | testimonials, v-2/3/4 | Demo quotes | DRAFT | — |
| 32, 3504, 3506, 3508 | pricing, v-2/3/4 | Demo prices | DRAFT (brief §5: no invented pricing) | — |
| 3491, 3493, 3495 | about-v-2/3/4 | Demo variants | DRAFT | — |
| 3510, 3512, 3514 | contact-v-2/3/4 | Demo variants | DRAFT | — |
| 415, 417, 4355, 4357, 4359 | portfolio-* | Demo | DRAFT | — |
| 123, 125, 127, 129, 134, 136 | blog-* variants | Demo | DRAFT | — |
| 748, 749, 750, 751, 783 | shop, cart, checkout, my-account, shop-wishlist | WooCommerce demo | DRAFT; deactivate WooCommerce after review (brief §8: no buy/login) | — |
| 2269 | shortcode | Demo | DRAFT | — |

## Posts (6): all demo, set to DRAFT

156 reasons-to-explan-fast-business-builder · 159 how-to-go-about-intiating-an-start-up · 161 food-industry-leaders… · 164 what-we-are-capable… · 166 strategy-for-norways-peion… · 169 "Blackpool polices hunt for David Schwimmer"

Categories: Business & Strategy, Human Resorce [sic], Tax & Home Loan → rename to **AI & Automation**, **Business Software**, **Digital Delivery**.

## Services CPT (`?service=`): all six are demo

The brief (§1) asks me to check these before removing anything. None of them match any Worxforu or Marvice capability listed on marvice.in.

| Slug | Class | Action |
|---|---|---|
| tax-and-consultancy-services | Demo | DRAFT, keep in review |
| audit-and-assurance-services | Demo | DRAFT, keep in review |
| life-health-insurance-consulting | Demo | DRAFT, keep in review |
| market-research-and-advertising | Demo (marketing belongs to Marvice, per §12) | DRAFT, keep in review |
| seo-optimization | Demo (search belongs to Marvice) | DRAFT, keep in review |
| legal-assessment-and-hr-management | Demo | DRAFT, keep in review |

**Owner check needed:** confirm whether any of these six is a real Worxforu offering. By default none is retained.

## Case studies CPT (`?case-study=`): all four are demo, DRAFT

international-business-development · supporting-a-unique-global-public-private-partnership · on-behalf-of-world-bank-an-advocom-group-2 · developing-a-program-to-be-alleviate-poverty

Keep the case-study grid component on the homepage and refill it with the Products and Solutions catalogue (brief §2).

## Portfolio CPT: `business-management`, demo, DRAFT

## WooCommerce products (12): all demo clothing, DRAFT

758, 771–778, 780–782 (blazers, dresses, shoes, ties, shirts).

## Global demo strings to remove (every place they appear)

| String | Where | Replace with |
|---|---|---|
| (210) 123-451 | Top bar, sidebar panel | `+91 80562 91930` → `tel:+918056291930` |
| (281) 476-0713 | Home CTA band | same |
| (734) 697-2907, (843) 971-1906 | Contact page | same |
| 1-888-452-1505 | Footer | same |
| noreply@envato.com, noreply@consultio.com | Contact page | `info@marvice.in` → `mailto:info@marvice.in` |
| 30 Commercial Road, Fratton, Australia | Footer | Remove from the footer (compact fields only). Full offices go on Contact. |
| 380 St Kilda Road, Melbourne | Sidebar panel | Remove |
| 3556 Hartford Way Vlg, Mount Pleasant, SC… Australia | Contact page | Marvice offices (Bengaluru, Chennai) |
| Mon-Fri 8am-6pm / Mon–Sat 8–5 / Sat–Thursday 10–5 | Top bar, footer, sidebar | **Remove.** The brief says not to invent opening hours. Show the email in the top bar instead. |
| "2019 © All rights reserved by CaseThemes" | Footer | `© 2026 Worxforu — a brand of Marvice Media Pvt Ltd.` |
| 113 × demo.casethemes.net | Header mega-menu (Demos / Multi Pages / One Page / Pages / Portfolio / Blog / Elements) | New menu (03-route-map) |
| Instagram Feed "No feed found" | Footer widget | Remove the widget; use the social icon slot with the Worxforu Instagram URL |
| Sidebar lorem ipsum widget ("At vero eos…") | Off-canvas panel | Replace with the footer brand line |
| Newsletter popup | Site-wide | Disable (§8: newsletter must be a separate opt-in) |
| Cart icon / "No products in the cart" | Header | Hide in Consultio theme options |

## Backup and restore (do before editing)

1. Hosting panel or UpdraftPlus: full backup of the database, `wp-content/uploads`, themes and plugins. Download a copy off-server.
2. Tools → Export → All content (XML) as a secondary backup.
3. Elementor → Tools → Version control: note the current version.
4. **Restore:** restore the UpdraftPlus DB and uploads, then purge the LiteSpeed cache and regenerate Elementor CSS (Elementor → Tools → Regenerate CSS).
5. Use a staging copy if the host offers one (LiteSpeed/Hostinger/cPanel staging). The brief says to edit staging before production.

## Design baseline (to capture once access is live)

Screenshot `/`, `/about`, `/contact` and `/services` at 1440, 1024, 768 and 390 px, with the menu open and closed. Headless Chromium can do this from this environment against the public URLs. Repeat after the edits and compare.
