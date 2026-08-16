# WLR Lifecycle Monitoring Runbook

Status: operator runbook for AI-era Step 8

Specification authority: `LIFECYCLE_MONITORING_SPEC.md`

## What the workflow does

`.github/workflows/monitor-lifecycle.yml` runs weekly and can also be started manually. It reads reviewed canonical entities/products, derives reverification due state, checks existing canonical `official_url` targets, compares with the latest retained monitoring artifact when available, and uploads a new review artifact.

It does not edit canonical data, candidate bundles, or public output.

Expected artifact files:

```text
monitoring-report.json
monitoring-state.json
review-queue.json
monitoring-summary.md
```

## How to interpret signals

Monitoring results are operational prompts for research only.

- `ok`: the checked URL responded; this is not proof of current support, maintenance, safety, or product status.
- `redirected`: the checked URL redirected; investigate before deciding whether a rebrand, migration, acquisition, or URL correction exists.
- `not_found` / `gone`: the checked URL returned 404/410; this is not proof that a wallet/product is dead or discontinued.
- `rate_limited` / `client_error`: access may be blocked or restricted; do not make lifecycle conclusions.
- `server_error` / `network_error` / `timeout`: operational failure only.
- reverification due/overdue: review priority only; not a negative classification.

## Review flow

For an actionable queue item:

1. identify the canonical entity/product from the IDs in `review-queue.json`;
2. open the relevant existing canonical/evidence records;
3. research first-party/current sources and preserve date/identity boundaries from `IDENTITY_EVIDENCE_POLICY.md`;
4. if a real lifecycle/security change is supported, use the normal candidate or explicit correction flow;
5. validate and open a normal canonical PR;
6. merge only after human review and CI.

Do not copy a monitoring observation into canonical evidence merely because it exists in the artifact.

## Baseline behavior

If no prior retained `monitoring-state.json` is available, the workflow marks `baseline_initialized: true`. First observations are not classified as historical changes.

If prior state cannot be restored, the workflow continues safely and reports that prior state was unavailable rather than inventing comparison history.

## Retention and privacy

Monitoring stores only bounded URL/HTTP operational metadata needed for follow-up. Response bodies, cookies, authorization material, and arbitrary response headers are not retained.

Artifacts are retained according to `config/lifecycle-monitoring.json` and are not published by the WLR site.

## First accepted real run

Step 8 operational acceptance used the first `main` network run after PR #53 merged.

- accepted implementation commit: `117edc5942f09a2962d01ed6bf7cd63906f676cf`
- workflow: `Monitor WLR lifecycle`
- run number: `1`
- run id: `31960555176`
- conclusion: `success`
- artifact: `wlr-lifecycle-monitoring`
- artifact id: `9267112811`
- artifact digest: `sha256:31f9bbcca7ab62c26c26acec7721e71157ce76e0b87441a75dcd269fbb44c367`

The accepted artifact reported:

- 25 entities / 69 products;
- 76 valid canonical official-URL targets;
- 76 checked, 0 invalid, 0 truncated;
- 67 `ok`, 5 `client_error`, 3 `redirected`, 1 `not_found`;
- 94 records in the `current` reverification state;
- no previous state, therefore `baseline_initialized: true` with zero historical changes;
- one neutral review item: `wlr_prod_000066` / `leather-browser-extension`, recorded install URL `https://leather.io/install-extension`, HTTP 404, action `research_before_canonical_change`.

Artifact inspection verified all four expected files, exact source commit identity, bounded observation fields, one observation per checked target, and absence of persisted response bodies, arbitrary headers, cookies, authorization material, or automatic canonical actions such as `mark_dead`, `mark_unsupported`, `mark_patched`, or `downgrade_security`.

The 404 is therefore a research prompt only. It does not change Leather, its browser extension, support status, lifecycle status, or security classification without separate first-party research and a reviewed canonical PR.
