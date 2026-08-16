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
- Step 6 lifecycle/security/support Compare: complete and production-verified.
  - specification: `docs/operations/COMPARE_SPEC.md`
  - implementation: PR #40
  - accepted production main commit: `b6dcfcc2346b452cdb5b755b6979d237a1e3cd9a`
  - Cloudflare production deployment: `b012afb9-54b5-4809-ac0f-0b5018766108`
  - representative browser QA: Trezor / Ledger; verified URL selection order, duplicate/unknown handling, four-wallet cap, add/remove/reset, product/support/security/remediation/EOL counts, and shareable repeated `wallet=` state.
  - 390x844 browser QA kept document width at 390px while exercising horizontal scrolling only inside explicit Compare viewports.
- Step 7 deterministic Stats: complete and production-verified.
  - specification: `docs/operations/STATS_SPEC.md`
  - implementation: PR #44
  - accepted production main commit: `79fc4bec2bc691f1fb24d05f3c8556cafaf71035`
  - production verification confirmed `/stats/` and `/data/stats.json`, exact deterministic JSON equality with the accepted main derivation, byte-equal canonical JSON, and the exact Cloudflare deployment for the accepted main commit.
  - verified registry scope: 25 entities / 69 products / 73 events / 119 evidence / 13 reviewed incident events / 2 recorded remediation events.
  - product launch-date coverage is 44 / 69 and known support-status coverage is 67 / 69.
  - patch-response duration remains explicitly unavailable because canonical incident-to-remediation linkage is not recorded.
  - exact day-level launch-to-discontinued product lifespan eligibility is currently 0, so no lifespan distribution is published.
  - real-browser desktop and 390x844 verification passed without document-level horizontal overflow.
- Step 8 monitored/reviewed lifecycle follow-up: complete and operationally verified.
  - specification: `docs/operations/LIFECYCLE_MONITORING_SPEC.md` via PR #52.
  - implementation: PR #53.
  - accepted implementation main commit: `117edc5942f09a2962d01ed6bf7cd63906f676cf`.
  - post-merge `Validate WLR` run #82 completed successfully on the accepted main commit.
  - first real network monitoring run: workflow `Monitor WLR lifecycle`, run #1 / run id `31960555176`, successful on the exact accepted main commit.
  - accepted artifact: `wlr-lifecycle-monitoring`, artifact id `9267112811`.
  - first-run scope: 25 entities / 69 products, 76 canonical official-URL targets, all 76 checked, 0 invalid and 0 truncated.
  - first-run outcomes: 67 `ok`, 5 `client_error`, 3 `redirected`, 1 `not_found`.
  - all 94 entity/product records were within the current reverification window at the first run.
  - prior state was unavailable as expected for the first accepted run; `baseline_initialized: true` and no observations were falsely reported as historical changes.
  - the single review-queue item was product `wlr_prod_000066` / `leather-browser-extension`, whose recorded install URL returned 404; its action remained neutral `research_before_canonical_change` and did not alter canonical status/support/security data.
  - artifact inspection confirmed bounded operational metadata only; response bodies, arbitrary headers, cookies, authorization material, and automatic `mark_dead` / `mark_unsupported` / `mark_patched` conclusions were absent.
  - normal workflow remains weekly + manually runnable and read-only with respect to repository contents; monitoring artifacts are not public/canonical evidence.
- Next: Step 9 evaluate natural-language-to-filter translation. This is an evaluation gate, not approval to make free-form AI output authoritative. Any implementation must translate into the existing deterministic structured-discovery state and preserve ordinary filters as the source of truth.

## Gate
Spec -> implementation PR -> validation/CI green -> merge -> production verification where applicable -> docs/status sync.

## Mandatory continuation rule
Future WLR work must read `DESIGN.md`, relevant operations docs, `ai-era-registry-spec.md`, and this schedule before selecting the next task.
