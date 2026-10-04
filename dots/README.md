# dots.marvice.tech

Marvice Media's internal portal for running AI agents with
[Munder Difflin](https://github.com/HarnessMD/munder-difflin) (MIT). It covers install links, team setup and house rules.

Static HTML/CSS with no build step. Pushing changes under `dots/` to `main` deploys to Hostinger via
`.github/workflows/deploy-dots.yml`. One-time hPanel and secrets setup is documented at the top of that file.

`noindex` is set in the page, `robots.txt` and `.htaccess`, because this is an internal page.
