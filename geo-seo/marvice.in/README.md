# marvice.in: GEO + SEO implementation kit

Audit: `GEO-AUDIT-REPORT.md` / `marvice-geo-audit.pdf`. **Score 26/100 (Critical) → 90-day target 68/100.**
Everything in `implementation/` is paste-ready. Work top to bottom. Items 1–6 are about a day of WordPress work and move the score the most.

| # | Task | File | Where in WordPress |
|---|---|---|---|
| 1 | **Back up** the site (UpdraftPlus / host snapshot) | — | — |
| 2 | Delete, redirect or noindex demo content; disable WooCommerce if nothing is sold | `cleanup-urls.csv` | Pages / Posts / Products → Trash; Rank Math → Redirections (301 / 410) |
| 3 | Install **Rank Math SEO** (free); run the setup wizard as *Company*, Local SEO on | — | Plugins → Add New |
| 4 | Titles, meta descriptions, H1s for 27 pages | `meta-tags.csv` | Rank Math box on each page; H1 in Elementor heading → HTML tag |
| 5 | Sitewide Organization / brand / WebSite schema | `schema-sitewide.jsonld` | Rank Math → Titles & Meta → Local SEO (fill the same values), **or** WPCode → header snippet `<script type="application/ld+json">…</script>` on all pages. Pick one, not both. |
| 6 | Upload `llms.txt` and replace `robots.txt` | `llms.txt`, `robots.txt` | File Manager → web root (`public_html/`); robots via Rank Math → General → Edit robots.txt |
| 7 | Fix the homepage: H1, typos, lorem ipsum, "who we are" block, alt text, NAP footer | `homepage-fixes.md` | Elementor |
| 8 | Contact page + footer → Bengaluru address (drop Chennai unless it's still an active office) | `homepage-fixes.md` §5 | Elementor global footer + Contact page |
| 9 | Replace FAQ lorem ipsum + FAQ schema | `faq-content.md`, `schema-faq.jsonld` | /faqs/ in Elementor; schema via Rank Math custom schema on that page |
| 10 | Publish the GEO service page + its schema | `geo-service-page.md`, `schema-geo-service.jsonld` | New page under /our-services/onscreens/ |
| 11 | Submit `https://marvice.in/sitemap_index.xml` | — | Google Search Console + Bing Webmaster Tools |
| 12 | Claim and verify **Google Business Profile** at the Koramangala address: category "Internet marketing service", secondary "Website designer", "Software company", "Event management company" | — | business.google.com |

Then weeks 3–12 per the roadmap in the report: service-page rewrites, real team, directory listings, Wikidata, listicle outreach, case studies and reviews.

## Validate after publishing

- Schema: https://validator.schema.org and https://search.google.com/test/rich-results (enter the live URL)
- llms.txt: `curl https://marvice.in/llms.txt` returns 200 with plain text
- Demo cleanup: `site:marvice.in product` and `site:marvice.in eleanor` in Google return nothing (allow 2–4 weeks)
- Re-audit: `/geo audit https://marvice.in`, then `geo-seo/render-geo-pdf.sh`, and compare with `/geo compare`

## Decisions needed

- **Chennai office:** if Purasawalkam is still active, list it as a second location (separate GBP and `department` schema). If not, remove it everywhere.
- **Public email:** schema, llms.txt and page copy use `info@marvice.in` (already on the site). `yuvarajgs@marvice.in` is in the proposal/report branding. Swap if you'd rather publish the personal address.
- **Founder/leadership:** add Person schema (name, role, LinkedIn) once the team page has real people.
- **FAQ claims:** check the industries list and the "free initial GEO and SEO visibility check" offer in `faq-content.md` before publishing.
