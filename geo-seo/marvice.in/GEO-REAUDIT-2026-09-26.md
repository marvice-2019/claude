# GEO Audit Report: Marvice Media (Re-audit)

**Domain:** marvice.in
**Audit Date:** 2026-09-26 (after fixes)
**Business Type:** Digital marketing, software & events agency
**Locations:** Bengaluru (Koramangala) · Chennai (Nungambakkam) · UK (marvice.co.uk)
**CMS:** WordPress + Elementor + Rank Math PRO

## Overall GEO Score: 57 / 100 Fair

---

## Executive Summary

marvice.in has moved from **26/100 (Critical) to 57/100 (Fair)** in one working session, with no change to the theme or design. The site is no longer mostly demo content: every sitemap URL is a real Marvice page, every key page has a keyword-targeted title, description and share image, and search engines and AI assistants now receive a complete business profile (ProfessionalService, address, phone, email, logo, four social profiles), FAQ schema and Service schema on 21 service pages.

The remaining gap is mostly **off-site authority** (Google Business Profiles, directory listings, reviews, third-party mentions) plus a short list of wp-admin and hosting tasks: a stale `llms.txt` file, the homepage H1, security headers, and the legal pages. Completing those, together with the local-SEO steps, is the realistic path to **75+ within 90 days**.

## Score Breakdown

| Category | Before | Now | Weight | Weighted |
|---|---|---|---|---|
| AI Citability & Content | 25/100 | 55/100 | 25% | 13.8 |
| AI Platform Readiness | 20/100 | 45/100 | 25% | 11.3 |
| Technical Foundations | 45/100 | 72/100 | 20% | 14.4 |
| Structured Data | 5/100 | 82/100 | 15% | 12.3 |
| Brand Authority & Entity | 30/100 | 35/100 | 15% | 5.3 |
| **Overall GEO Score** | **26/100** | **57/100** | | **57.0** |

## What Changed (verified live)

| Check | Before | Now |
|---|---|---|
| Sitemap | 137 URLs, ~107 demo | **35 URLs, 0 demo** |
| Demo pages (hoodies, "Eleanor Pena", lorem posts) | Indexed | **404 / removed** |
| Meta descriptions on key pages | 0 | **14/14** |
| Open Graph share image | Missing | **14/14** |
| Keyword-targeted SEO titles | None | **32 pages & posts** |
| Business schema | None | **ProfessionalService + address, phone, email, logo, 4 sameAs** |
| FAQ / Service schema | None | **FAQPage + Service on 21 pages** |
| Page type markup | Article/Person on pages | **WebPage / AboutPage / ContactPage** |
| Lorem ipsum on core pages | FAQ, blog, homepage | **0** (legal pages still lorem) |
| Old Purasawalkam address | Contact page + description | **Removed; Bengaluru + Chennai listed** |
| Demo-server (themexriver) assets | 22 references | **0** |
| AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, OAI-SearchBot) | Allowed | **Allowed** |
| New GEO service page + 4 real articles | — | **Live** |

## Critical Issues Remaining

### Critical: llms.txt serves stale demo content

`/llms.txt` still lists "Hello world" and lorem-ipsum posts. It is a static file in `public_html/` overriding Rank Math's generated version, which is already configured. **Fix:** delete `public_html/llms.txt` in hPanel File Manager.

### Critical: Legal pages are lorem ipsum

Privacy Policy and Terms still contain placeholder text (the privacy policy names themexriver.com). This hurts trust signals for Google and AI assistants. **Fix:** publish the reviewed drafts in `implementation/legal-pages-draft.md`.

## High Priority Issues

### High: No H1 on the homepage

The theme's widgets hard-code H2 tags. **Fix:** add one Elementor Heading set to H1 (styled like the section title): "Digital Marketing, SEO & Software Company in Bengaluru & Chennai".

### High: No Google Business Profiles

The single biggest lever for local leads and AI "near me" answers. **Fix:** claim and verify profiles for Koramangala and Nungambakkam with identical name, address and phone.

### High: Contact enquiries not delivered

Test submissions return `mail_failed`. FluentSMTP is installed; connect it to yuvarajgs@marvice.in and replace the old Gmail sender in both forms.

## Medium Priority Issues

### Medium: Security headers missing

No HSTS, X-Content-Type-Options, X-Frame-Options or Referrer-Policy (flagged as a FAIL by SEOmator). Add via hPanel or `.htaccess`.

### Medium: Image alt text

64 of 69 homepage images still have no alt text; the theme widgets need alt set per widget in Elementor.

### Medium: Stale optimised CSS on the homepage

LiteSpeed UCSS is not regenerating, so homepage CSS fixes (carousel, colours) don't reach visitors. Turn off *Generate UCSS*, then Purge All.

## Low Priority Issues

### Low: Header/footer links

Logo and copyright links use `http://`; the footer LinkedIn icon points to the admin URL `/mycompany/`.

## Component Score Summary

| Component | Baseline | Now | 90-day target |
|---|---|---|---|
| AI Citability & Content | 25/100 | 55/100 | 70/100 |
| AI Platform Readiness | 20/100 | 45/100 | 70/100 |
| Technical Foundations | 45/100 | 72/100 | 88/100 |
| Structured Data | 5/100 | 82/100 | 90/100 |
| Brand Authority & Entity | 30/100 | 35/100 | 60/100 |
| **Overall** | **26/100** | **57/100** | **75/100** |

## Next 30 Days

1. Delete the stale `llms.txt`; turn off UCSS; add the homepage H1.
2. Connect FluentSMTP and fix the form senders so leads arrive.
3. Claim both Google Business Profiles; list on Justdial, Sulekha, Clutch, GoodFirms, IndiaMART with identical NAP.
4. Publish the legal pages.
5. Create the 6 keyword landing pages in `implementation/keyword-map.md` (e.g. "SEO company in Chennai", "restaurant marketing agency").
6. Collect 10+ Google reviews mentioning the service and city.

## Methodology & Limitations

Live, read-only crawl of marvice.in on 2026-09-26 after fixes (robots.txt, llms.txt, full sitemap, 14 key pages, AI user-agent tests, response headers, JSON-LD parsing), scored with the geo-seo-claude weights used in the baseline (platform 25%, content 25%, technical 20%, schema 15%, brand 15%). Off-site authority (reviews, directories, backlinks) was not re-measured; Ahrefs API access is not included in the current plan. Google re-crawling typically takes 2–6 weeks before ranking changes show.
