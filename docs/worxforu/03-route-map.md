# 03 — Navigation, Routes and Redirects (Brief §3, §12, §14)

## Prerequisite

The site uses plain permalinks (`?page_id=`). Go to Settings → Permalinks → **Post name** (`/%postname%/`). WordPress then 301s the old `?page_id=` URLs to the new pretty URLs automatically. Purge the LiteSpeed cache afterwards.

## Header menu (reuse the existing menu location and dropdown styling)

```
Home                         /
Services ▾                   /services/
  AI Solutions               /services/ai-solutions/
  ERP and CRM Software       /services/erp-crm/
  Business Automation        /services/business-automation/
  Custom Software            /services/custom-software/
  Website and Mobile         /services/web-mobile-development/
  Consulting and Support     /services/technology-consulting/
  SEO Services               /services/seo/
  Market Research            /services/market-research/
  ─ All services →           /services/
Products ▾                   /products/
  CRM Solution               /products/crm-solution/
  ERP Solution               /products/erp-solution/
  AI Business Assistant      /products/ai-business-assistant/
  Workflow Automation        /products/workflow-automation/
  LMS Solution               /products/lms-solution/
  ─ All solutions →          /products/
About                        /about/
Insights                     /insights/
Contact                      /contact/
[Discuss Your Project]       /contact/   (existing header CTA button slot)
```

The industries list sits on the Services hub as a section, not in the menu.

## Footer menu

Services · Products · About · Insights · Contact · Privacy · Terms · Marvice Media (https://marvice.in/)

## Page routes

Build child pages under `services` (parent page = 407, slug `services`) so the URLs nest.

| Route | Page | Source | Status |
|---|---|---|---|
| `/` | Home | ID 9 edited | Publish |
| `/services/` | Services hub | ID 407 renamed, slug `services` | Publish |
| `/services/ai-solutions/` | AI Solutions | Duplicate of 409 | Publish |
| `/services/erp-crm/` | ERP and CRM Software (includes CRM consulting) | Duplicate of 409 | Publish |
| `/services/business-automation/` | Business Automation | Duplicate of 409 | Publish |
| `/services/custom-software/` | Custom Software (includes full-stack/backend) | Duplicate of 409 | Publish |
| `/services/web-mobile-development/` | Website and Mobile | Duplicate of 409 | Publish (owner confirmed Worxforu delivers websites and apps) |
| `/services/technology-consulting/` | Consulting and Support | Duplicate of 409 | Publish |
| `/services/web-portals/` | Web Portals | Duplicate of 409 | Publish |
| `/services/learning-management-systems/` | LMS | Duplicate of 409 | Publish |
| `/services/saas-implementation/` | SaaS Implementation | Duplicate of 409 | Publish |
| `/services/website-development/` | Business Websites | Duplicate of 409 | Publish |
| `/services/ecommerce-development/` | Ecommerce | Duplicate of 409 | Publish |
| `/services/mobile-app-development/` | Android and iOS Apps | Duplicate of 409 | Publish |
| `/services/ui-ux-design/` | UI and UX Design | Duplicate of 409 | Publish |
| `/services/cloud-solutions/` | Cloud Migration and Hosting | Duplicate of 409 | Publish |
| `/services/devops/` | DevOps | Duplicate of 409 | Publish |
| `/services/api-integration/` | API Development and Integration | Duplicate of 409 | Publish |
| `/services/data-analytics/` | Data and Analytics | Duplicate of 409 | Publish |
| `/services/support-maintenance/` | Maintenance, Training and Support | Duplicate of 409 | Publish |
| `/services/seo/` | SEO Services | Existing `seo-optimization` service record, rewritten | Publish |
| `/services/market-research/` | Market Research | Existing `market-research-and-advertising` record, rewritten | Publish |
| `/products/` | Products and Solutions hub | Duplicate of 407 | Publish |
| `/products/{slug}/` | 9 catalogue entries | Duplicate of 409 | Only entries with a confirmed state (see 02-content §Products) |
| `/about/` | About | ID 26 edited | Publish |
| `/insights/` | Insights | ID 132 renamed | Publish. Keep noindex until the first real article goes up. |
| `/faq/` | FAQ | ID 30 edited | Publish |
| `/contact/` | Contact | ID 24 edited | Publish |
| `/privacy/`, `/terms/` | Policies | New | Draft until approved policy copy is supplied |

Compliance workflow implementation is a subsection of `/services/technology-consulting/` for now (§14).

## Redirects (Redirection plugin or AIOSEO Pro redirects, 301)

Redirect only where an equivalent page exists. The brief (§3) says not to send removed pages to the homepage.

| Old | New |
|---|---|
| `/?page_id=407` (Services v.1) | `/services/` (handled by the permalink change) |
| `/?service=seo-optimization` | `/services/seo/` (the same record is kept and rewritten) |
| `/?service=market-research-and-advertising` | `/services/market-research/` (the same record is kept and rewritten) |
| `/?service=tax-…`, `audit-…`, `life-health-…`, `legal-…` | 410, or leave drafted |
| `/?case-study=*` (4) | `/products/` (the showcase replaced them) |
| `/?page_id=748` Shop, cart, checkout, my-account | 410 after WooCommerce is deactivated |
| Team, testimonials, pricing, portfolio, blog variants | Leave drafted; they have no inbound value |

## Exclusions check (§14)

None of these may appear in any menu, card, page, FAQ, metadata, schema or post: **Forex CRM, Forex Webdesign, Forex Liquidity, Prop Firm CRM, Forex Copier, Dedicated Server hosting for MT4/MT5**. The same goes for social trading, PAMM/MAMM, broker reporting and trading VPS.

Verification command after release:

```bash
for u in / /services/ /products/ /about/ /contact/; do
  curl -sL "https://worxforu.com$u" | grep -iE 'forex|prop firm|mt4|mt5|liquidity|copier|pamm|mamm|infyst' && echo "FAIL $u"
done
```

## Live URL state (29 Sep 2026)

- Permalinks: `/index.php/%postname%/` (PATHINFO). `/%postname%/` was tried first but the host's `.htaccess` has no WordPress rewrite block, so every inner page 404'd; switched to PATHINFO to restore the site.
- Services: `/index.php/service/<slug>/` (theme `service_slug` = `service`). Setting it to `services` made the theme's service archive shadow the Services page at `/services/`.
- `/index.php/services/ai-agent-setup-managed-automation/` redirects (WordPress) to `/index.php/service/ai-agent-setup-managed-automation/`.
- Sitemap: `/index.php/sitemap.xml` (34 URLs: pages, 20 services, 9 products). Root `/robots.txt`, `/sitemap.xml` and sub-sitemaps need the `.htaccess` WordPress block.
- To finish: add the standard WordPress block to `public_html/.htaccess`, then `rewrite structure '/%postname%/'` (approval), re-verify.
