---
title: "SEO, GEO & AEO Audit — marvice.in"
subtitle: "Scores and assessment after two days of fixes"
client: "Marvice Media Pvt Ltd"
date: "27 September 2026"
---

# SEO, GEO & AEO Audit: marvice.in

**Audit date:** 27 September 2026 · **Pages crawled:** 38 (every sitemap URL) · **Prepared by:** Marvice Media Pvt Ltd

## Overall GEO Score: 66 / 100 Fair

SEO **64/100** · GEO **66/100** · AEO **68/100**

## Scores

| Discipline | What it measures | Score | Grade |
|---|---|---|---|
| **SEO** | Ranking in Google's classic results | **64 / 100** | Fair |
| **GEO** | Being named and cited by ChatGPT, Gemini, Perplexity, Google AI Overviews | **66 / 100** (was 26 → 57) | Fair |
| **AEO** | Being the extracted answer: AI answers, featured snippets, voice | **68 / 100** | Fair |

Rank Math's own site audit now reads **100/100** (was 56). That check covers on-page configuration only. The scores above also weigh speed, links, local listings and brand presence, which is where the remaining gap is.

## Executive summary

The website itself is now in good shape: every page is real Marvice content, correctly titled, described, canonicalised, marked up with valid structured data, listed in a working sitemap, and readable by every major AI crawler. Service pages open with a direct answer and carry 4 FAQs each.

What holds all three scores in the 60s is outside the page templates:

1. **Speed.** Mobile Largest Contentful Paint is about 6–7.5 s (good is under 2.5 s) and desktop layout shift is 1.0 (good is under 0.1), mainly because LiteSpeed delays all JavaScript until the first tap or scroll, so the hero loads blank and then jumps.
2. **Off-site entity.** Search engines and AI summaries still describe the *old* Marvice ("four sector of brands", UVcart, 17 Purasawalkam High Road). The Justdial listing still carries the Purasawalkam address, there are no Google Business Profiles, and Marvice is absent from GoodFirms, Clutch and every "best GEO / digital marketing agency in Bengaluru" list AI engines draw on.
3. **Links.** No measurable link-building yet (plan delivered in `implementation/link-building-plan.md`).

## SEO: 64 / 100

| Area | Weight | Score | Evidence |
|---|---|---|---|
| On-page | 25% | 95 | 38/38 unique titles (30–65 chars), 34/38 descriptions (the 4 without are category archives, now noindexed), 38/38 self-canonical, 38/38 OG image, 37/38 exactly one H1 (blog has 2) |
| Technical | 20% | 70 | All 200, HTTPS, sitemap fixed (was 404 earlier today), robots clean; **no HSTS or security headers**, `http://marvice.in` in header logo / footer links on every page |
| Performance | 15% | 40 | Mobile LCP 6.0–7.6 s, FCP 5.6–7.6 s, TTFB ~1.2 s; desktop CLS 1.0; ~0.6 MB WPChat assets still loaded; icon fonts loaded twice |
| Content | 20% | 75 | Median 662 words/page, 30/38 pages ≥500 words, city named on 33/38, 0 lorem ipsum; thin hub pages: Contact 286, Our Projects 279, Our Services 335 words; no case studies with numbers |
| Off-page & local | 20% | 28 | No Google Business Profile, Justdial shows old Purasawalkam address, no directory/review footprint, backlink data unavailable (Ahrefs plan) |

## GEO: 66 / 100

| Component | Weight | 26 Sep baseline | 26 Sep re-audit | **Today** | Change driver |
|---|---|---|---|---|---|
| AI citability & content | 25% | 25 | 55 | **70** | Answer-first openers on 17 service pages, 72 FAQs, named author |
| AI platform readiness | 25% | 20 | 45 | **60** | Clean llms.txt live, IndexNow → Bing (ChatGPT search, Copilot), Search Console linked, sitemap fixed |
| Technical foundations | 20% | 45 | 72 | **70** | H1 + sitemap fixed, but real-browser speed/CLS measured poor today |
| Structured data | 15% | 5 | 82 | **90** | Service ×22, FAQPage ×19, Chennai office, 3 brand entities, author Person → LinkedIn, 0 invalid |
| Brand authority & entity | 15% | 30 | 35 | **38** | Director-level author; still no GBP, listicles or reviews, stale third-party descriptions |
| **Overall** | | **26** | **57** | **66** | |

AI crawler access: ClaudeBot, PerplexityBot, OAI-SearchBot, ChatGPT-User, Google-Extended, Bingbot, Applebot all 200. **GPTBot received one HTTP 429 (rate-limited)** in testing — check hPanel bot protection.

## AEO: 68 / 100

| Signal | Score | Evidence |
|---|---|---|
| Question-and-answer coverage | 80 | 18 service pages × 4 FAQs + /faqs/ (9); question text on 26/38 pages |
| Answer-first formatting | 75 | 17 service pages open with who/what/where; homepage H1 "Digital" is thin as a statement |
| Answer structured data | 85 | FAQPage on 19 pages, Service on 22, Organization/LocalBusiness complete |
| Snippet-ready format | 60 | Answers 30–60 words (good); few lists/tables/definitions outside the blog |
| Trust behind the answer | 40 | Named author now, but no reviews, ratings, case-study numbers or press mentions |
| Answer-engine indexing | 65 | Search Console linked, IndexNow sent; Bing Webmaster Tools not verified |

## Fixed during this audit

- Category archives (incl. demo "Clock Fly Strategy") → noindex and removed from sitemap.
- Author profile: Director of Marvice Media Pvt Ltd (per MCA records), LinkedIn as sameAs.

## Priority actions

| # | Action | Owner | Effort | Lifts |
|---|---|---|---|---|
| 1 | LiteSpeed → JS: *Load JS Deferred* = **Deferred** (not Delayed); remove WPChat | Marvice (wp-admin) | 5 min | SEO performance, CLS, blank hero |
| 2 | Google Business Profiles for Koramangala + Nungambakkam | Marvice | 1 hr + verification | SEO local, GEO brand, AEO trust |
| 3 | **Update Justdial** (and Sulekha/others) to the Koramangala + Nungambakkam addresses; retire Purasawalkam | Marvice | 30 min | GEO entity consistency |
| 4 | Bing Webmaster Tools (import from GSC), submit sitemap | Marvice | 5 min | GEO/AEO (ChatGPT search, Copilot) |
| 5 | hPanel: stop throttling GPTBot / AI crawlers; add HSTS + security headers | Marvice (hPanel) | 10 min | GEO access, SEO technical |
| 6 | GoodFirms + Clutch listings with 5 client reviews each; pitch 5 "best agency" listicles | Marvice | 2–3 weeks | GEO brand (biggest single lever) |
| 7 | Three case studies with numbers (F&B, events, software) on Our Projects | Marvice + content | 1–2 weeks | AEO trust, SEO content |
| 8 | Fix `http://` logo/copyright links and blog double H1 in the theme header/footer | Marvice (Elementor) | 10 min | SEO technical |

**Projected after actions 1–6:** SEO ~75, GEO ~75, AEO ~76 within 60–90 days (brand and link signals take weeks to be recrawled).

## Methodology

Live crawl of all 38 sitemap URLs (title, description, canonical, robots, H1, word count, images/alt, JSON-LD types incl. nested `subjectOf`, question text, city and phone presence); AI-crawler user-agent tests; Rank Math site audit (33 tests, remote API); Core Web Vitals measured in headless Chromium (mobile: 4× CPU, 1.6 Mbps / 150 ms; desktop unthrottled) because the PageSpeed API quota was exhausted — lab values through a proxy, so treat TTFB as approximate; web search for brand, directory and listicle presence. GEO weights follow the geo-seo methodology (content 25, platform 25, technical 20, schema 15, brand 15). SEO and AEO use the weighted rubrics shown in each table.

## Sources

- Brand search results: [LinkedIn company page](https://in.linkedin.com/company/marvice-media-pvt-ltd), [Justdial listing (old address)](https://www.justdial.com/Chennai/Marvice-Media-Pvt-Ltd-Purasawalkam/044PXX44-XX44-220311083928-C1D2_BZDET), [ZaubaCorp](https://www.zaubacorp.com/MARVICE-MEDIA-PRIVATE-LIMITED-U74999TN2019PTC129233), [CompanyDetails.in](https://www.companydetails.in/company/marvice-media-private-limited), [Tracxn](https://tracxn.com/d/legal-entities/india/marvice-media-private-limited/__yw5MLNXVuld7KzPp7TAzcK5eRLF27QGn95rzszM9wX4)
- GEO competitor lists (Marvice absent): [GoodFirms – GEO companies Bengaluru](https://www.goodfirms.co/generative-engine-optimization/bengaluru), [ZeroAdo – best GEO agencies Bangalore](https://zeroado.com/blog/generative-engine-optimization-agencies-in-bangalore), [AI SEO Solutions – best GEO agencies Bangalore](https://aiseo.solutions/best-geo-agencies-bangalore/), [Laukika](https://www.laukika.com/generative-engine-optimization-company-in-bangalore/)
