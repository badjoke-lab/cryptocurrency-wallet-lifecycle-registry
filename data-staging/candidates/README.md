# WLR candidate staging

This directory is a non-public review boundary for proposed record additions.

- Candidate bundles use `*.json`.
- Canonical public data remains only in `data/entities.json`, `data/products.json`, `data/events.json`, and `data/evidence.json`.
- Build scripts must never copy this directory into `public/` or promote candidates automatically.
- A candidate may add a new entity/product/event/evidence record or add product/event/evidence records that reference an existing canonical entity.
- Promotion into canonical data is a manual reviewed PR operation after candidate validation.

Use `candidate-template.json.example` as the starting shape and run:

```bash
npm run validate:candidates
npm run test:candidates
```

The validator checks the canonical schemas, identifier and slug collisions, obvious identity collisions, merged-reference integrity, and evidence coverage for every proposed event.
