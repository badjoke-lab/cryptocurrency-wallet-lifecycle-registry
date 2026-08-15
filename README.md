# Wallet Lifecycle Registry

**Historical registry of cryptocurrency wallets.**

Wallet Lifecycle Registry (WLR) is an evidence-backed historical registry of hardware, software, smart-contract, MPC/threshold, and hybrid cryptocurrency wallets. It tracks wallet entities, concrete products, lifecycle changes, security incidents, vulnerabilities, fixes, migrations, and supporting evidence.

WLR is **not** a wallet ranking or recommendation service. Incident counts are historical facts, not safety scores.

## Current v0 seed

- 25 wallet entities
- 69 products
- 66 lifecycle/security events
- 112 evidence records
- CYA-derived editorial registry UI adapted to a black palette
- semantic status and incident-severity colors
- searchable wallet and incident views
- wallet/product metadata and structured data
- 8 core registry routes plus `/support/`
- static Next.js export for Cloudflare Pages

The original 25-entity v0 seed is complete. Further growth is reviewed against record depth, lifecycle coverage, evidence quality, and product-boundary clarity rather than adding wallets only to increase the entity count.

## Canonical data

```text
data/entities.json
data/products.json
data/events.json
data/evidence.json
```

Only those four files are public record authority. Proposed additions live under `data-staging/candidates/` and are never promoted automatically.

## Record growth

```text
candidate → research/normalize → validate → human review → canonical PR → manual merge
```

Candidate bundles use the same row schemas as canonical records. The validator checks ID/slug/identity collisions, cross-file references, and evidence coverage before a candidate can be considered for promotion.

See `docs/operations/RECORD_GROWTH_POLICY.md`.

## Coverage audit

```bash
npm run coverage:audit
npm run coverage:json
```

The coverage audit reports mechanical completeness indicators such as product, event, evidence, launch-date, support-status, and security-event coverage per entity. It does **not** calculate wallet safety, quality, trust, or recommendation scores. Thin history is a research-priority signal only.

CI fails only on structural coverage failures such as a canonical entity with zero products or zero evidence; historically thin records are reported for follow-up rather than rejected automatically.

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
npm run validate:candidates
npm run test:candidates
npm run check:staging-boundary
npm run coverage:audit
npm run build
```

## Deployment

WLR follows the static-export pattern used by Historical Exchange Index:

- Next.js / React / TypeScript
- `output: 'export'`
- Cloudflare Pages output: `out`
- planned hostname: `wlr.badjoke-lab.com`

Cloudflare publication is an independent operational gate; candidate research and canonical review do not depend on deployment availability.

## Support

Until WLR-specific donation addresses are assigned, the Support page temporarily uses the current HEI donation addresses. Support does not influence inclusion, status, incident severity, evidence standards, or wording.
