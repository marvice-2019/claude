# dots.marvice.tech

Marvice Media's internal portal for running AI agents with
[Munder Difflin](https://github.com/HarnessMD/munder-difflin) (MIT). It covers install links, team setup and house rules.

Static HTML/CSS with no build step. Hosted as a Coolify app (Static build pack, base directory `/dots`) on the Marvice VPS at
https://coolify.marvice.tech. Pushes to `main` under `dots/` trigger a redeploy via `.github/workflows/deploy-dots.yml`
(setup notes at the top of that file).

`noindex` is set in the page and `robots.txt` because this is an internal page.
