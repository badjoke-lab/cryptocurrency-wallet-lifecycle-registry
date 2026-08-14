# Cloudflare Pages deployment

WLR uses static Next.js export.

- Build command: `npm run build`
- Output directory: `out`
- Node.js: 22
- Functions / D1 / R2 / KV: not required for v0
- Planned hostname: `wlr.badjoke-lab.com`

`prebuild` copies reviewed canonical JSON into `public/data/` and creates the machine-readable manifest/version/LLM guidance before Next exports the site.
