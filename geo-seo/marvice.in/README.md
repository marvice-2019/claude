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

### Still to do by hand (blocked or needs wp-admin UI)

1. **llms.txt** — a stale physical file in `public_html/llms.txt` lists the old lorem posts. hPanel → File Manager → replace it with `implementation/llms.txt`.
2. **Rank Math → Setup Wizard** — Company, Marvice Media, logo, Local SEO (Bengaluru address, phone). Fixes the Article/Person schema on every page and the site-wide Organization data.
3. **Rank Math → Titles & Meta → Post Types** — set tf-header / tf-footer to noindex and exclude from sitemap (theme template parts; can't be unpublished without breaking the header/footer).
4. **Legal pages** — review `implementation/legal-pages-draft.md` and publish (Privacy Policy still names themexriver.com).
5. **Google Search Console + Bing Webmaster** — submit `https://marvice.in/sitemap_index.xml`; Rank Math's sitemap cache refreshes on its own.
6. **Google Business Profiles** for Koramangala and Nungambakkam.
7. **Homepage H1** — the theme's hero slider has no H1 option; add an H1 in Elementor only if it can be styled to match.
8. **Remove Smash Balloon + WPChat** (deactivate/delete was blocked for me): Plugins → select Smash Balloon Facebook/Instagram/Reviews/TikTok/X/YouTube Feed, Social Wall, WPChat → Deactivate → Delete. None are used in any page.
9. **LiteSpeed UCSS** — homepage only loads a stale UCSS file, so CSS fixes (carousel) don't reach visitors: LiteSpeed Cache → Page Optimization → CSS Settings → *Generate UCSS* OFF → Save → Toolbox → Purge All.
10. **WhatsApp button** — after removing WPChat: Plugins → Add New → *Joinchat* → Settings → phone `+918056291930` → Save (or update Elementor Pro with a licence to use Elementor Floating Buttons; draft 4298 is ready).
11. **Image alt text** — theme widgets don't read media-library alt text; set alt fields in each Elementor image/logo widget.
