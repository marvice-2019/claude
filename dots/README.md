# dots.marvice.tech

Marvice Media's internal portal for running AI agents with
[Munder Difflin](https://github.com/HarnessMD/munder-difflin) (MIT). It covers install links, team setup and house rules.

Static HTML/CSS with no build step. Pushing changes under `dots/` to `main` rsyncs it to the Marvice VPS (nginx) via
`.github/workflows/deploy-dots.yml`. One-time VPS, DNS and secrets setup is documented at the top of that file.

`noindex` is set in the page, `robots.txt` and the nginx `X-Robots-Tag` header (`NOINDEX=1`), because this is an internal page.
