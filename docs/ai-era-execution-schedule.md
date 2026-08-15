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

## Gate
Spec -> implementation PR -> validation/CI green -> merge -> production verification where applicable -> docs/status sync.

## Mandatory continuation rule
Future WLR work must read `DESIGN.md`, relevant operations docs, `ai-era-registry-spec.md`, and this schedule before selecting the next task.