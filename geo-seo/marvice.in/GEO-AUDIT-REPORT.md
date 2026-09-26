# GEO Audit Report: Marvice Media

**Domain:** marvice.in
**Audit Date:** 2026-09-26
**Business Type:** Digital marketing, software & events agency
**Locations:** Bengaluru (Koramangala) · Chennai (Nungambakkam) · UK (marvice.co.uk)
**CMS:** WordPress 7.0.6 + Elementor 4.1.1 + WooCommerce 10.8.1

## Overall GEO Score: 26 / 100 Critical

---

## Executive Summary

marvice.in is technically reachable: HTTPS, fast LiteSpeed hosting, and no AI crawler is blocked. But search engines and AI models see a site that is **mostly theme demo content, with no machine-readable identity and a conflicting address**. Of the 137 URLs in the sitemap, only about 30 are real Marvice pages. The rest are demo products (hoodies, a Canon camera), demo homepages, a fictional team member ("Eleanor Pena"), lorem-ipsum blog posts and FAQs, and theme header and footer templates.

There is **no schema markup anywhere**, **no meta descriptions**, **no H1 on the homepage**, and **no city on the homepage**. The Contact page lists a Chennai address, the About page mentions Bangalore branches, and the company's registered office is in Thiruvallur. An AI model asked for "digital marketing agencies in Bengaluru" has nothing reliable to cite Marvice with.

The upside is that everything wrong is fixable in-house in about two weeks, and the category Marvice should own (GEO / AI search optimization in Bengaluru) is still young, with roughly seven agencies competing for it.

## Score Breakdown

| Category | Score | Weight | Weighted |
|---|---|---|---|
| AI Citability & Content | 25/100 | 25% | 6.3 |
| AI Platform Readiness | 20/100 | 25% | 5.0 |
| Technical Foundations | 45/100 | 20% | 9.0 |
| Structured Data | 5/100 | 15% | 0.8 |
| Brand Authority & Entity | 30/100 | 15% | 4.5 |
| **Overall GEO Score** | **26/100** | | **25.6** |

## Critical Issues

### Critical: Demo content is indexed as Marvice

The WordPress sitemap exposes 17 demo WooCommerce products, 6 demo homepages, duplicate About, Pricing, Shop, Cart and Checkout pages, 14 theme header and footer templates, demo services and careers, and the demo team member "Eleanor Pena". All five blog posts are theme demo posts or WordPress's default "Hello world" (the one read in full contains lorem ipsum), and the entire FAQ page is lorem ipsum. This dilutes topical relevance, wastes crawl budget, and feeds AI models false facts about the company (a fashion shop with a fictional team).

**Fix:** delete, redirect or noindex per `implementation/cleanup-urls.csv`.

### Critical: No structured data

No JSON-LD at all: no Organization, LocalBusiness, WebSite, Service or FAQPage schema. AI systems and Google's Knowledge Graph can't resolve Marvice as an entity with a name, address, phone, founding date, brands and social profiles.

**Fix:** `implementation/schema-sitewide.jsonld` (sitewide), `schema-faq.jsonld` (/faqs/), `schema-geo-service.jsonld` (new GEO page).

### Critical: Name, address and phone conflict

| Source | Address shown |
|---|---|
| Contact page | 17, Purasawalkam High Rd, Chennai 600007 (old office) |
| About page | "Bangalore & Hyderabad branches" (2019) |
| MCA registration | Thiruvallur, Tamil Nadu (registered office) |
| Target: primary office | No.38, Green Leaf Extension, 80 Feet Rd, 4th Block, Koramangala, Bengaluru 560034 |
| Target: Chennai office | Prestige Palladium Bayan, 8th Floor, 43/1 Greams Road, Nungambakkam, Chennai 600006 |

Local rankings and AI entity resolution both depend on one consistent name, address and phone everywhere.

**Fix:** list exactly two offices (Bengaluru primary, Chennai Nungambakkam) identically on the site, both Google Business Profiles and all directories; remove Purasawalkam everywhere. Keep the registered office for legal pages only.

## High Priority Issues

### High: No meta descriptions, no Open Graph, no homepage H1

Every audited page is missing a meta description. The homepage has no H1 and 13 H2s, several of them duplicates. No `og:` tags exist, so shared links render poorly on LinkedIn and WhatsApp.

**Fix:** install Rank Math and apply `implementation/meta-tags.csv` (27 pages, all within length limits). Apply `homepage-fixes.md`.

### High: Homepage copy errors and missing location

"We Provide a Digital Solutions", "Promiss", "Specific Timelinel Guarantee", "A innovative Brands", "four sector of brands" (three are listed), and two lorem-ipsum blocks. Neither office city (Bengaluru, Chennai) appears on the homepage at all.

### High: No llms.txt

`/llms.txt` returns 404. **Fix:** upload `implementation/llms.txt` to the web root.

### High: Image accessibility

67 of 69 homepage images have no alt text.

## Medium Priority Issues

### Medium: Thin service pages

Service pages run 270–410 words, with no FAQs, no pricing signals, no proof (case studies, client logos with names, numbers) and no internal links between related services. AI models prefer self-contained, fact-dense answer passages.

### Medium: No GEO service page

Marvice now sells GEO but has no page for it, so it cannot rank or be cited for "generative engine optimization agency Bengaluru". **Fix:** publish `implementation/geo-service-page.md`.

### Medium: robots.txt points at the default WordPress sitemap

**Fix:** replace it with `implementation/robots.txt` after Rank Math generates `/sitemap_index.xml`.

## Low Priority Issues

### Low: Author archives and plugin pages exposed

`wp-sitemap-users-1.xml` publishes admin usernames. `/wp-file-download-search/` and `/privacy-policy-2/` are indexed.

## What's Working

- HTTPS with a clean `http` → `https` redirect; fast LiteSpeed server.
- GPTBot, ClaudeBot, PerplexityBot and Google-Extended all receive HTTP 200: nothing blocks AI crawlers.
- Clear three-brand service architecture (Onscreens, Worxforu, Conxyou) with dedicated URLs per service.
- Existing entity footprint to build on: LinkedIn company page, Instagram, Facebook, UK sister site, and third-party company profiles (ZaubaCorp, Tracxn, RocketReach).

## Competitive Context

Bengaluru "digital marketing agency" searches are dominated by directories (Justdial, Sulekha) and agencies with dedicated location pages (BrandStory, Amydro, Digitech Solution). The GEO niche is newer: BrandStory, Laukika, Hashtag Media, ZeroAdo and a few others hold "GEO agency Bangalore", and AI engines lean on "best GEO agencies in Bangalore" listicles to answer. Getting into those listicles is the fastest route into AI answers.

## 90-Day Roadmap

### Week 1–2: Foundations

1. Delete, redirect or noindex demo content (`cleanup-urls.csv`); disable WooCommerce if nothing is sold.
2. Install Rank Math; apply titles, meta and H1s (`meta-tags.csv`); enable Local SEO and paste the sitewide schema.
3. Upload `llms.txt` and the new `robots.txt`; submit `sitemap_index.xml` in Google Search Console and Bing Webmaster Tools.
4. Put both offices on the Contact page and footer; claim and verify Google Business Profiles for Koramangala and Nungambakkam, and retire the Purasawalkam listing.
5. Replace the FAQ lorem ipsum (`faq-content.md` plus FAQ schema); fix homepage copy and add the "who we are" block.

### Week 3–6: Content & entity

6. Publish the GEO service page and link it from the homepage, Onscreens and Digital Marketing.
7. Rewrite the top 6 service pages to 800+ words, each with an answer-first intro, a process, FAQs and one proof point.
8. Replace the demo team with real people (photo, role, LinkedIn) and add Person schema for the founder.
9. Create consistent listings: Google Business Profile, Bing Places, Justdial, Sulekha, IndiaMART, Clutch, GoodFirms, DesignRush, Crunchbase.
10. Add a Wikidata item for Marvice Media (official website, founding date, headquarters, CIN).

### Week 7–12: Authority & citations

11. Pitch inclusion in "best GEO / digital marketing agencies in Bangalore" listicles (the ones AI engines cite).
12. Publish 4 real case studies with numbers (F&B, events, software) and 4 answer-style articles on GEO for Indian businesses.
13. Collect 15+ Google reviews that mention the service and the city.
14. Monthly: re-run the GEO audit, track 20 buyer prompts across ChatGPT, Gemini and Perplexity, and report the change.

## Component Score Summary

| Component | Current | 90-day target |
|---|---|---|
| AI Citability & Content | 25/100 | 65/100 |
| AI Platform Readiness | 20/100 | 60/100 |
| Technical Foundations | 45/100 | 85/100 |
| Structured Data | 5/100 | 85/100 |
| Brand Authority & Entity | 30/100 | 55/100 |
| **Overall** | **26/100** | **68/100** |

## Methodology & Limitations

Live crawl of marvice.in on 2026-09-26 (homepage, sitemap, 12 key pages, robots.txt, llms.txt, response headers, AI user-agent tests) plus web search for SERP and brand presence. Keyword volumes and backlink data were not available because the Ahrefs plan lacks API access. Google Business Profile status was not verifiable externally. Scores follow the geo-seo-claude methodology: platform 25%, content 25%, technical 20%, schema 15%, brand 15%.
