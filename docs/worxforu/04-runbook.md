# 04 — Implementation Runbook, Acceptance and Blockers (Brief §10–11)

## Status (29 Sep 2026)

| Phase | Status |
|---|---|
| 1. Inventory and baseline | **Done from outside the CMS.** See `01-inventory.md` and `baseline/` (4 pages × 1440/1024/768/390, Chromium 141, networkidle + 1.5 s, web fonts loaded) |
| 2. Content and catalogue | **Written** (`02-content.md`, `03-route-map.md`). **Not yet applied:** needs CMS access |
| 3. Functionality and search | Specified. Not applied. |
| 4. Verification and handover | Pending phases 2–3 |

## Blockers (each one only blocks its own item)

| # | Dependency | Blocks | Owner |
|---|---|---|---|
| B1 | WordPress admin access: approve the WPVibe connection or supply a staging copy | All CMS edits | Yuvaraj |
| B2 | Backup taken and confirmed (UpdraftPlus or host) | Any edit on production | Yuvaraj / host |
| B3 | Staging environment (host staging, or WP Staging plugin) | Safe review before production | Yuvaraj / host |
| ~~B4~~ | Resolved 29 Sep: keep SEO and Market Research; unpublish the other 4 | — | — |
| ~~B5~~ | Resolved 29 Sep: websites and apps published under Worxforu | — | — |
| B6 | Hours resolved (Mon–Sat 10am–7pm · Sunday closed). Response-time targets are still open (support plans only, not blocking) | — | Marvice |
| ~~B7~~ | Resolved 29 Sep: broad industry coverage | — | — |
| B8 | Privacy and Terms copy | `/privacy/`, `/terms/` | Marvice / legal |
| B9 | Is the phone number WhatsApp-enabled? | Any WhatsApp button (none added until confirmed) | Marvice |
| B10 | Real product screenshots or demos | Any "Book a Demo" CTA (none added) | Marvice |

## Execution order once B1–B3 are cleared

1. **Backup:** UpdraftPlus full backup, download it, record the restore steps from 01-inventory.
2. **Permalinks:** Settings → Permalinks → Post name. Purge the LiteSpeed cache. Confirm the old `?page_id=` URLs 301 correctly.
3. **Global settings:**
   - Consultio Theme Options (Redux): top bar phone, email and hours (Mon–Sat 10am–7pm · Sunday closed), hide cart icon, disable the newsletter popup, footer copyright.
   - Header logo → the Worxforu Asset files.
   - Remove the Instagram Feed widget. Replace the off-canvas sidebar widget text.
4. **Menus:**
   - Appearance → Menus: create "Worxforu Main" and "Worxforu Footer" per 03-route-map and assign them to the existing locations.
   - Keep the old menu unassigned; don't delete it, so it can be rolled back.
5. **Pages:**
   - Duplicate page 409 (Elementor → Duplicate, or Yoast Duplicate Post) once per service or product page.
   - Edit the text in Elementor only. Never do raw SQL or `post_content` replacements; Elementor data is JSON in `_elementor_data`.
   - Edit order: Home (9), Services hub (407), About (26), Contact (24), FAQ (30), then the service pages, then the product pages.
6. **Contact Form 7:**
   - Replace the form markup and mail settings from 02-content.
   - Install Flamingo, add spam protection, and send a real test submission to `info@marvice.in`.
7. **Unpublish demo content:**
   - Set every DRAFT row in 01-inventory to Draft. Don't trash anything until the owner signs off on B4.
   - Deactivate WooCommerce, then RevSlider if the hero moves to an Elementor section. Otherwise keep RevSlider and just edit the slide text.
8. **SEO (AIOSEO):**
   - Titles and metas from 02-content. Organization schema with the Marvice parent.
   - Noindex drafts and `/insights/` until the first post exists.
   - Set the sitemap to include only public canonical pages. Resubmit it in Search Console, keeping the existing verification.
9. **Cache and CSS:** Elementor → Regenerate CSS, then LiteSpeed → Purge All.
10. **Verification** (below).

## Verification (Prompt 4)

- Re-run `baseline` screenshots (same script, same viewports) into `after/`. Compare with the baseline, masking the edited text regions. Check for overlaps, wrapping and horizontal scroll at 390 px.
- **Existing issue, not ours:** the cart drawer bleeds into the right edge at 1440 px (horizontal overflow). Hiding the cart should fix it; record the result.
- Crawl every menu, card and CTA link and expect 200s. The script is below.
- Run the exclusions grep (in 03-route-map) and a demo-string grep:
  `casethemes|envato|consultio.com|123-451|476-0713|697-2907|971-1906|452-1505|Fratton|St Kilda|Hartford|At vero eos|Lorem ipsum|World Bank`
- Form tests:
  - A valid submission must arrive at info@marvice.in and in Flamingo.
  - Required fields empty should show a validation message.
  - A duplicate rapid submission should be throttled.
  - A simulated mail failure should show the error message and keep the input.
- Keyboard: tab through the menu, dropdowns, form and accordion; focus must stay visible.

```bash
# link check once pretty permalinks are live
for u in / /services/ /products/ /about/ /contact/ /faq/; do
  curl -sL "https://worxforu.com$u" | grep -oE 'href="https://worxforu.com[^"#]*' | sed 's/href="//' ; done | sort -u |
  while read l; do printf "%s %s\n" "$(curl -s -o /dev/null -w '%{http_code}' -L "$l")" "$l"; done | grep -v '^200'
```

## Release acceptance checklist (§11)

- [ ] All genuine services and products are accounted for; uncertain records are drafted, not deleted
- [ ] 6 core, 3 Marvice-required (portals, LMS, SaaS), 12 expanded and 2 growth (SEO, Market Research) service pages have useful content
- [ ] No theme migration, new palette, font or global CSS change
- [ ] No demo links, placeholder claims or sample contacts on any published page
- [ ] Every menu item, card and CTA resolves on desktop and mobile
- [ ] Enquiries reach info@marvice.in and Flamingo; errors show feedback
- [ ] No API keys or secrets in page source
- [ ] Canonicals, redirects and sitemap match 03-route-map
- [ ] No horizontal scroll, overlap, broken images or keyboard traps
- [ ] Backup and rollback are recorded; staging reviewed before production
- [ ] The six excluded Forex/MT4/MT5 offerings and all Infyst references appear nowhere

## Rollback

1. Reassign the old menu to the header location.
2. Set the edited pages back via WordPress Revisions (Elementor → History → Revisions).
3. Re-publish any drafted demo records if needed.
4. For a full restore, use the UpdraftPlus backup from step 1, then purge the cache and regenerate CSS.
