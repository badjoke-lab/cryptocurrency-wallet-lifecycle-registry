# Wallet Lifecycle Registry

**Historical registry of cryptocurrency wallets.**

Wallet Lifecycle Registry (WLR) is an evidence-backed historical registry of hardware, software, smart-contract, MPC/threshold, and hybrid cryptocurrency wallets. It tracks wallet entities, concrete products, lifecycle changes, security incidents, vulnerabilities, fixes, migrations, and supporting evidence.

WLR is **not** a wallet ranking or recommendation service. Incident counts are historical facts, not safety scores.

## Current bootstrap

- 12 wallet entities
- 40 products
- 44 lifecycle/security events
- 56 evidence records
- CYA-derived editorial registry UI adapted to a black palette
- semantic status and incident-severity colors
- 8 core registry routes plus `/support/`
- static Next.js export for Cloudflare Pages

## Canonical data

```text
data/entities.json
data/products.json
data/events.json
data/evidence.json
```

## Public routes

```text
/
/hardware/
/software/
/incidents/
/wallet/[slug]/
/product/[slug]/
/methodology/
/about/
/support/
```

## Validation

```bash
python3 -m pip install -r requirements.txt
npm install
npm run validate:records
npm run build
```

## Deployment

WLR follows the static-export pattern used by Historical Exchange Index:

- Next.js / React / TypeScript
- `output: 'export'`
- Cloudflare Pages output: `out`
- planned hostname: `wlr.badjoke-lab.com`

## Support

Until WLR-specific donation addresses are assigned, the Support page temporarily uses the current HEI donation addresses. Support does not influence inclusion, status, incident severity, evidence standards, or wording.
