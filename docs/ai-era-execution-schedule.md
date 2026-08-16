# Wallet Lifecycle Registry — AI-era Execution Schedule

Status: roadmap addendum

## Order
1. Continue bootstrap/current approved WLR work; do not discard the current implementation.
2. Before large-scale record growth, lock lifecycle identity boundaries and evidence requirements for hardware/software products and versions.
3. Seed representative records that exercise release, vulnerability/incident, patch/vendor response, replacement and EOL histories.
4. Ship deterministic per-wallet/product JSON and validation.
5. Add structured filters/search.
6. Add lifecycle/security/support Compare.
7. Add Stats for incident/patch response, EOL/lifespan, types and data quality.
8. Establish monitored/reviewed lifecycle follow-up for existing records.
9. Evaluate natural-language-to-filter translation only after deterministic search/Compare are stable.

## Current execution status

- Steps 1–4: complete.
- Step 5 structured filters/search: complete and production-verified.
  - specification: `docs/operations/STRUCTURED_DISCOVERY_SPEC.md`
  - implementation: PR #36
  - accepted production main commit: `714e0e774fee6c0b893b9bf45097c339c7d389d0`
  - Cloudflare production deployment: `31298acd-3bf9-45b2-b8f9-28778a5bf51c`
  - real-browser verification covered deterministic filter counts, combined filters, product-label search, invalid launch-year ranges, reset behavior, and 390px mobile layout.
- Next: Step 6 lifecycle/security/support Compare. Compare must receive its own specification before implementation.

## Gate
Spec -> implementation PR -> validation/CI green -> merge -> production verification where applicable -> docs/status sync.

## Mandatory continuation rule
Future WLR work must read `DESIGN.md`, relevant operations docs, `ai-era-registry-spec.md`, and this schedule before selecting the next task.
