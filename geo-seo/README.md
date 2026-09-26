# GEO-SEO — Marvice Media branding

White-label layer for [geo-seo-claude](https://github.com/zubair-trabzada/geo-seo-claude) (and the `/market` skills from ai-marketing-claude). The skills themselves install to `~/.claude`; this folder only holds Marvice's branding and the PDF renderer.

```
geo-seo/
├── render-geo-pdf.sh                  # GEO-AUDIT-REPORT.md → branded PDF
└── branding/
    ├── brand.json                     # agency details + palette (brand_config.py format)
    ├── marvice-report-template.html   # pandoc template: logo, "Prepared by", footer
    ├── marvice-report.css             # overrides on top of the skill's base stylesheet
    └── marvice-logo.png
```

## Render a report

```bash
/geo audit https://client.com          # produces GEO-AUDIT-REPORT.md
geo-seo/render-geo-pdf.sh GEO-AUDIT-REPORT.md client-geo-audit.pdf
```

Cover metadata (client name, domain, score, date, business type, locations, CMS) is read from the report header — both the full-audit and quick-audit formats. Requirements: `pandoc`, Chrome/Chromium, and geo-seo-claude installed (the base stylesheet comes from `~/.claude/skills/geo/templates/`).

## Before sending to clients

Fill `phone` and `contact_name` in `branding/brand.json`. They're blank until confirmed, and the proposal skills omit them when empty.

`brand.json` follows the skill's `white-label/brand_config.py` schema, so `load_brand("geo-seo/branding/brand.json")` works in any custom generator.
