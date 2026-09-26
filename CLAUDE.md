# CLAUDE.md

## Client deliverables are Marvice Media branded

Any proposal, report, audit, deck or PDF produced for a client (including output of the `/geo *` and `/market *` skills) is issued by **Marvice Media Pvt Ltd**. Brand details live in `geo-seo/branding/brand.json` — read it, don't hard-code.

- Fill every agency placeholder (`[YOUR AGENCY NAME]`, "Your Agency", "Prepared by", sign-off blocks) with the `brand.json` values: Marvice Media Pvt Ltd · marvice.in · offices in Bengaluru (Koramangala, primary) and Chennai (Prestige Palladium Bayan, Nungambakkam).
- Contact: Yuvaraj GS · +91 80562 91930 · yuvarajgs@marvice.in. Address is in `brand.json`.
- Never leave "GEO-SEO Claude", "AI Marketing Suite" or another agency's name as the author/analyst — use "Marvice Media".
- Pricing in `/geo proposal` and `/market proposal` defaults to USD; for Indian clients quote INR (+18% GST line) unless told otherwise.
- Brand palette: slate `#2D3836`, bronze `#BD8A53`, orange `#F28541`, cream `#FFF8ED`. Logo: `geo-seo/branding/marvice-logo.png`.

## GEO audit PDFs

Use the branded renderer instead of the geo-report-pdf skill's Mac-only Chrome command:

```bash
geo-seo/render-geo-pdf.sh GEO-AUDIT-REPORT.md            # → GEO-AUDIT-REPORT.pdf
```

It needs pandoc and Chrome/Chromium (auto-detected on macOS, Linux, and `/opt/pw-browsers/chromium` in cloud sessions; override with `CHROME_BIN`). See `geo-seo/README.md`.
