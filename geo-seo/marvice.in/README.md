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
| 8 | Contact page + footer → both offices (Bengaluru + new Chennai address); remove Purasawalkam everywhere | `homepage-fixes.md` §5 | Elementor global footer + Contact page |
| 9 | Replace FAQ lorem ipsum + FAQ schema | `faq-content.md`, `schema-faq.jsonld` | /faqs/ in Elementor; schema via Rank Math custom schema on that page |
| 10 | Publish the GEO service page + its schema | `geo-service-page.md`, `schema-geo-service.jsonld` | New page under /our-services/onscreens/ |
| 11 | Submit `https://marvice.in/sitemap_index.xml` | — | Google Search Console + Bing Webmaster Tools |
| 12 | Claim and verify **two Google Business Profiles** (Koramangala and Prestige Palladium Bayan, Nungambakkam); move or close any existing Purasawalkam listing: category "Internet marketing service", secondary "Website designer", "Software company", "Event management company" | — | business.google.com |

Then weeks 3–12 per the roadmap in the report: service-page rewrites, real team, directory listings, Wikidata, listicle outreach, case studies and reviews.

## Validate after publishing

- Schema: https://validator.schema.org and https://search.google.com/test/rich-results (enter the live URL)
- llms.txt: `curl https://marvice.in/llms.txt` returns 200 with plain text
- Demo cleanup: `site:marvice.in product` and `site:marvice.in eleanor` in Google return nothing (allow 2–4 weeks)
- Re-audit: `/geo audit https://marvice.in`, then `geo-seo/render-geo-pdf.sh`, and compare with `/geo compare`

## Decisions needed

- **Primary office:** Bengaluru is set as the head office and Chennai (Prestige Palladium Bayan) as a second office in schema, llms.txt and page copy. Swap if Chennai is HQ.
- **Public email:** schema, llms.txt and page copy use `info@marvice.in` (already on the site). `yuvarajgs@marvice.in` is in the proposal/report branding. Swap if you'd rather publish the personal address.
- **Founder/leadership:** add Person schema (name, role, LinkedIn) once the team page has real people.
- **FAQ claims:** check the industries list and the "free initial GEO and SEO visibility check" offer in `faq-content.md` before publishing.

## Live changes log

| Date | Change | Rollback |
|---|---|---|
| 2026-09-26 | Full content backup via REST (pages, posts, products, Elementor templates incl. `_elementor_data`) | `backups/content-backup-2026-09-26.json.gz` |
| 2026-09-26 | Installed + activated **Rank Math SEO 1.0.279**. Live: `sitemap_index.xml` (200), robots.txt now points to it, meta description / Open Graph / JSON-LD output on every page | Plugins → Rank Math → Deactivate |

| 2026-09-26 | Unpublished (→ draft) 30 demo pages incl. home-02/03, onepage variants, about-two/three, price-*, shop/cart/checkout/my-account (+ "-2" copies), sample-page, our-teams, career, job-apply, testimonial, process, clients, our-portfolio, wp-file-download-search | Pages → Drafts → Publish |
| 2026-09-26 | Unpublished 18 demo WooCommerce products and 8 demo theme CPT entries (teams/eleanor-pena, careers/3d-animation-designer, services/proven-marketing, projects/experience-design + "-2" copies) | Products / CPT → Drafts → Publish |
| 2026-09-26 | Contact page: Purasawalkam → Bengaluru + Chennai offices (info list + map address) | backup JSON |
| 2026-09-26 | Homepage text: hero "We Provide a" → "We Provide"; about paragraphs with both cities; "Transparent Pricing" / "On-Time Delivery"; "Our Innovative Brands" cards → Onscreens/Worxforu/Conxyou pages; "Explore Our Wide Range of Services"; blog cards retitled | backup JSON |
| 2026-09-26 | FAQ page: 8 lorem items → 9 real Q&As (`faq-content.md`) | backup JSON |
| 2026-09-26 | Meta descriptions (page excerpts, read by Rank Math) on 27 pages | clear excerpt |
| 2026-09-26 | Brand pages: featured image set (2031/2032/2033) so homepage brand cards keep their logos; verified no visual change | set featured image to none |
| 2026-09-26 | **New page** /our-services/onscreens/generative-engine-optimization/ (Digital Marketing layout) + link in Primary menu and in the Onscreens sidebar on 6 service pages | Trash page 4265 / menu item 4266 |
| 2026-09-26 | 4 demo blog posts rewritten as real articles (GEO guide, GEO vs SEO, getting recommended by AI assistants, social media for SMBs); "Hello world" → draft; old slugs 301 automatically | backup JSON |
| 2026-09-26 | **Incident + fix:** clearing Elementor's CSS cache after edits let LiteSpeed rebuild its optimized stylesheet (UCSS) while Elementor CSS files were missing, so dark section backgrounds (brands, testimonial, footer, "Our Journey") disappeared for visitors. Fixed with a full LiteSpeed purge (via the WordPress MCP adapter; the REST ability crashes). For future edits: after `DELETE /elementor/v1/cache`, always purge all LiteSpeed caches too. | — |
| 2026-09-26 | Testimonial carousel (home widget 9701105): scoped Custom CSS restoring overflow clipping and full-width slides (Elementor Pro 3.22 `.swiper-container` markup vs Elementor 4.1 Swiper). In `post-2169.css`; reaches visitors once LiteSpeed UCSS regenerates or UCSS is turned off | remove widget Custom CSS |
| 2026-09-26 | Tried Elementor Floating Buttons for WhatsApp (post 4298) — not rendered because Elementor Pro 3.22 takes over floating-button rendering and predates the feature; left as **draft** | trash post 4298 |
| 2026-09-26 | Homepage: "View All More" → "View All Services" linking /our-services/ (was themexriver demo contact page); blog button → /blog/; phone "+91 80562 91930" (fixes tel: link) | backup JSON |
| 2026-09-26 | Replaced 22 images/links still loading from themexriver.com demo server (home, about, conxyou, our-projects, SaaS page, Global Footer shapes) with local media-library copies / real marvice.in pages | backup JSON |
| 2026-09-26 | Site-wide Custom CSS (Elementor kit #11): breadcrumb current page bronze, hero "Get Started" readable, feature icons bronze, phone no-wrap, footer links + testimonial name contrast | clear kit Custom CSS |
| 2026-09-26 | Footer Links menu: Help → /faqs/, Support → /contact-us/, Clients → /our-projects/ (were all Brand Consultancy) | edit menu "Links" |
| 2026-09-26 | **SEOmator audit follow-up (Rank Math API, no theme/design change):** knowledge graph → ProfessionalService "Marvice Media" (address, phone, email, logo, 4 sameAs, description); default OG image (office photo) — fixes og:image FAIL; pages no longer typed Article/Person; About/Contact pages → AboutPage/ContactPage; theme CPTs (tf-header/footer, services, projects, careers, teams, products, floating buttons) noindex + removed from sitemap; author archives off; Local SEO module on | Rank Math settings |
| 2026-09-26 | Keyword titles / descriptions / focus keywords on 32 pages & posts (`implementation/keyword-map.md`); FAQPage schema on /faqs/; Service schema on 21 service pages; Rank Math llms.txt module configured (served once the stale physical file is deleted) | Rank Math per-page SEO box |
| 2026-09-26 | Re-audit: GEO 26 → 57/100 (`GEO-REAUDIT-2026-09-26.md`, `marvice-geo-reaudit.pdf`). Fixed missing schema on /our-services/ (Service) and /our-projects/ (CollectionPage) — Rank Math output no JSON-LD there | Rank Math schema tab |
| 2026-09-27 | Privacy Policy + Terms: lorem ipsum / themexriver text replaced with Marvice text (DPDP Act 2023 privacy policy) in the existing Elementor layout — **have a lawyer/CA review** | backup JSON |
| 2026-09-27 | Alt text added to 25 media items (client logos, office/team photos, service photos) → homepage 43/69 images with alt (was 5/69); remaining are decorative theme shapes | clear media alt |
| 2026-09-27 | Hostinger "llms.txt generation" switched OFF (Rank Math module owns llms.txt). Stale static `public_html/llms.txt` still needs deleting by hand | Hostinger plugin setting |
| 2026-09-27 | Tried a visually-hidden homepage H1 (screen-reader-text) — **reverted**: stale LiteSpeed UCSS lacked the hiding CSS so it showed on screen. Re-apply only after UCSS is turned off | — |
| 2026-09-27 | Site tagline set: "Digital Marketing, SEO, GEO & Software Agency in Bengaluru & Chennai" (Rank Math *Site Tagline* warning) | Settings → General |
| 2026-09-27 | Trashed 3 demo comments (lorem ipsum by "choicy"/wabidullahsharif@gmail.com and "A WordPress Commenter") | Comments → Trash → Restore |
| 2026-09-27 | Terms + Privacy: WebPage schema and focus keywords (both pages output no JSON-LD) | Rank Math schema tab |
| 2026-09-27 | Deactivated GoSMTP + GoSMTP Pro (conflicted with FluentSMTP); user then switched to GoSMTP and deactivated FluentSMTP | Plugins |
| 2026-09-27 | Static `public_html/llms.txt` deleted by owner → Rank Math llms.txt now live. Rank Math site audit 56 → 85/100 | — |
| 2026-09-27 | Google Search Console verified (HTML file uploaded by owner); cleared an invalid Rank Math google_verify value (file name pasted as meta code) | Rank Math → General → Webmaster Tools |
| 2026-09-27 | **Homepage H1:** hero slide 1 title tag h2 → h1 (per-slide `title_tag`, widget 912e7a5). Verified with Playwright: same 0px margins, 90px size, same position desktop + mobile. (An inline `<style>` attempt in the slide description was stripped by kses and showed as text for ~1 min — removed.) | set slide 1 `title_tag` back to h2; backup `home_2169_before_h1.json` in session scratchpad |
| 2026-09-27 | Per-post noindex on the 18 tf-header / tf-footer templates (Rank Math "Focus Keywords" test only skips posts with per-post noindex) | Rank Math meta `rank_math_robots` |
| 2026-09-27 | Primary focus keyword on 32 pages/posts set to the topic phrase contained in each page name (e.g. "digital marketing"); all long-tail city keywords kept as secondary. Homepage primary = "home" (page name is "Home"; renaming it changes the theme breadcrumb on every page — tried and reverted within a minute) | previous keywords in session `fk_backup.json` |
| 2026-09-27 | **Rank Math site audit: 100/100** (33 ok, 0 fail, 1 warning = mobile speed) | — |
| 2026-09-27 | **Sitemap 404 fixed:** /sitemap_index.xml and all child sitemaps returned 404 (rewrite rules lost after today's plugin activations/deactivations; LiteSpeed then cached the 404). Scheduled a Rank Math rewrite flush, triggered it via admin-ajax, purged LiteSpeed → all 200 | Settings → Permalinks → Save |
| 2026-09-27 | Homepage meta description now carries the page's top on-page words (services, solutions, development, software) — SEOptimer "keywords across HTML tags" | Rank Math SEO box |
| 2026-09-27 | `implementation/link-building-plan.md` — 90-day plan, paste-ready NAP + descriptions, 40+ targets | — |
| 2026-09-27 | **GEO/AEO:** IndexNow submission of all 38 sitemap URLs (api.indexnow.org + Bing → Copilot / ChatGPT search), key file live | — |
| 2026-09-27 | Author entity: user "yuvarajgs" → **Yuvaraj GS** with bio (Article schema author was the username) | Users → Profile |
| 2026-09-27 | Entity schema: Chennai office (ProfessionalService, parentOrganization → #organization) on home; Onscreens / Worxforu / Conxyou as Organization nodes with knowsAbout + parentOrganization on their brand pages | Rank Math schema tab |
| 2026-09-27 | Answer-first opening sentence (who / what / Bengaluru & Chennai) on 17 service pages, replacing fluff openers; rest of each paragraph and layout unchanged | `backups/service-intros-before-2026-09-27.json` |
| 2026-09-27 | **Service FAQs:** 4 visible Q&As (includes / cost / timeline / service-specific) appended to the existing accordion on 18 service pages + FAQPage schema (output as Service `subjectOf`). Content in `implementation/service-faqs.md` | `backups/service-pages-before-faq-2026-09-27.json.gz` |

### Still to do by hand (blocked or needs wp-admin UI)

1. ~~llms.txt~~ — done 2026-09-27.
2. **Rank Math → Setup Wizard** — Company, Marvice Media, logo, Local SEO (Bengaluru address, phone). Fixes the Article/Person schema on every page and the site-wide Organization data.
3. **Rank Math → Titles & Meta → Post Types** — set tf-header / tf-footer to noindex and exclude from sitemap (theme template parts; can't be unpublished without breaking the header/footer).
4. **Legal pages** — review `implementation/legal-pages-draft.md` and publish (Privacy Policy still names themexriver.com).
5. **Google Search Console** verified 2026-09-27 — still submit the sitemap there; **Bing Webmaster** —  submit `https://marvice.in/sitemap_index.xml`; Rank Math's sitemap cache refreshes on its own.
6. **Google Business Profiles** for Koramangala and Nungambakkam.
7. **Homepage H1** — the theme's hero slider has no H1 option; add an H1 in Elementor only if it can be styled to match.
8. **Remove Smash Balloon + WPChat** (deactivate/delete was blocked for me): Plugins → select Smash Balloon Facebook/Instagram/Reviews/TikTok/X/YouTube Feed, Social Wall, WPChat → Deactivate → Delete. None are used in any page.
9. **LiteSpeed UCSS** — homepage only loads a stale UCSS file, so CSS fixes (carousel) don't reach visitors: LiteSpeed Cache → Page Optimization → CSS Settings → *Generate UCSS* OFF → Save → Toolbox → Purge All.
10. **WhatsApp button** — after removing WPChat: Plugins → Add New → *Joinchat* → Settings → phone `+918056291930` → Save (or update Elementor Pro with a licence to use Elementor Floating Buttons; draft 4298 is ready).
11. **Contact + newsletter forms and email delivery** — see `implementation/contact-forms.md`. GoSMTP (Outlook) is the active mailer; Entra app `bcf9354f-f457-4709-8788-5419c6fbaca4` needs a client secret **Value** (not the Secret ID) and GoSMTP's redirect URI added under Authentication → Web. Microsoft basic SMTP AUTH is retired, so OAuth is the only direct route.
12. **Instagram Posts in footer (auto-update)** — keep *Smash Balloon Instagram Feed* (only that one), connect the @marvice.in account, then edit Global Footer in Elementor and replace the 4 static images with the Instagram Feed widget (4 posts, 1 row).
13. ~~Delete `public_html/llms.txt`~~ — done 2026-09-27.
14. **HSTS + security headers** (audit FAIL) — hPanel → Security, or add to .htaccess: `Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"` plus X-Content-Type-Options, X-Frame-Options, Referrer-Policy.
15. ~~Homepage H1~~ — done 2026-09-27 via hero slide title tag. (was: — theme widgets hard-code h2; add one Elementor Heading (H1) styled like the section title, e.g. "Digital Marketing, SEO & Software Company in Bengaluru & Chennai".
16. **Header/footer links** — logo + copyright link use http://marvice.in; footer LinkedIn icon points to the admin URL …/mycompany/ → use https://www.linkedin.com/company/marvice-media-pvt-ltd/.
17. **Image alt text** — theme widgets don't read media-library alt text; set alt fields in each Elementor image/logo widget.
18. **Spam comments** — 1,312 held spam comments (betting/casino links): Comments → Pending → select all → Spam → Empty Spam. Then install Akismet or Antispam Bee.
19. **Rank Math "Post Titles Missing Focus Keywords"** — false positive: it checks the on-page page name (e.g. "Digital Marketing"), which is part of the design; SEO titles already carry the keywords. Leave as is.
20. **Hero empty until first interaction** — LiteSpeed delays all JS until the visitor moves/scrolls/taps, so the hero slider paints blank at first load (hurts LCP/first impression, esp. mobile). LiteSpeed Cache → Page Optimization → JS Settings → *Load JS Deferred*: set to **Deferred** instead of **Delayed**, or add the Swiper/theme scripts to *JS Delayed Excludes*. Console also shows `wp is not defined` / `moment is not defined` from the same delay.
21. **Page weight** (SEOptimer) — WPChat is still active and loads ~0.6 MB JS + fonts on every page; deactivate + delete it (item 8). Theme + gilroy-core both load Font Awesome Pro (~1.5 MB of icon fonts, fa-solid loaded twice) — theme-level, leave unless the theme vendor offers a toggle.
22. **GPTBot rate-limited** — ChatGPT's crawler got an HTTP 429 in testing (others 200). hPanel → Security / bot protection: make sure AI crawlers (GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot) aren't throttled.
23. **Bing Webmaster Tools** — verify (import from Search Console) and submit the sitemap; Bing's index feeds ChatGPT search and Copilot.
24. ~~Service-page FAQs~~ — done 2026-09-27 (review wording in `implementation/service-faqs.md`). Was: each service page needs 4–6 visible Q&As (price range, timeline, process, cities) for AI answer extraction; add in Elementor using the existing accordion style ("What We Provide" block).
