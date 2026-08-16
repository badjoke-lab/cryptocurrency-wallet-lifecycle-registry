# Cloudflare Pages deployment

WLR uses static Next.js export and is published on Cloudflare Pages.

- Production hostname: `https://wlr.badjoke-lab.com`
- Pages project: `cryptocurrency-wallet-lifecycle-registry`
- Git source: `badjoke-lab/cryptocurrency-wallet-lifecycle-registry`
- Production branch: `main`
- Build command: `npm run build`
- Output directory: `out`
- Node.js: 22
- Functions / D1 / R2 / KV: not required for v0
- Preview deployments: disabled by repository policy

The first production deployment was accepted from `main` commit `fbebf0c0f04a9ac517594361897e6bb4605f1bfe` after Cloudflare reported the custom domain active and the deployment stage successful.

Production closeout verified the canonical domain, major routes, `version.json`, manifest and canonical JSON, deterministic wallet/product indexes and representative records, `llms.txt`, `ai.txt`, `robots.txt`, `sitemap.xml`, canonical record counts, responsive CSS safeguards, incident severity mapping, and Support disclosures.

`prebuild` copies reviewed canonical JSON into `public/data/` and creates the machine-readable manifest/version/LLM guidance before Next exports the site.
