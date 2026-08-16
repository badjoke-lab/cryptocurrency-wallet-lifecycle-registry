# WLR Reviewed Lifecycle Monitoring Specification

Status: required specification for AI-era execution Step 8

## Purpose

Wallet Lifecycle Registry must keep already-reviewed wallet and product records under recurring follow-up without allowing a network check, redirect, HTTP failure, monitoring heuristic, or automated discovery result to become a canonical lifecycle/security claim by itself.

This specification extends `RECORD_GROWTH_POLICY.md` and `IDENTITY_EVIDENCE_POLICY.md`. Where a conflict exists, the stricter existing evidence/canonical boundary wins.

## Authority boundary

Canonical authority remains exactly:

```text
data/entities.json
data/products.json
data/events.json
data/evidence.json
```

Monitoring output is operational review material only. It is not canonical data, public machine-readable data, evidence, or a safety/support score.

No monitoring workflow may automatically:

- change entity/product status;
- mark a wallet or product dead, discontinued, deprecated, patched, vulnerable, safe, unsafe, supported, or unsupported;
- create or modify canonical events/evidence;
- promote a candidate bundle;
- infer vendor response time or incident-to-remediation linkage;
- publish generated monitoring state under `public/`.

Any accepted lifecycle/security change still follows:

```text
monitoring signal
  -> human research
  -> candidate or explicit reviewed correction
  -> validation
  -> canonical pull request
  -> manual merge
```

## Scope

Step 8 monitors existing reviewed WLR entities/products. It is not a broad-web wallet discovery crawler.

The first implementation covers two deterministic review inputs:

1. reverification due state derived from canonical `last_verified_at` plus an explicit cadence policy;
2. HTTP health/change signals for official URLs already present on canonical entity/product records.

Historical evidence URLs and arbitrary news/search sources are out of scope for the first monitoring implementation. Discovery can be added later through the existing candidate lane, but it must not weaken this specification.

## Machine-readable policy

Monitoring behavior must be defined in a versioned repository file, expected at:

```text
config/lifecycle-monitoring.json
```

At minimum it must declare:

- policy/schema version;
- schedule cadence;
- reverification age thresholds;
- network timeout;
- redirect limit;
- user agent;
- maximum targets per run;
- concurrency/rate limits;
- accepted URL schemes;
- output schema version;
- artifact retention expectation.

Changing the policy is a reviewed code/config change.

## Reverification queue

For every canonical entity/product carrying `last_verified_at`, monitoring must deterministically classify the record against the policy thresholds.

Required states:

- `current`
- `review_due`
- `review_overdue`
- `verification_date_missing`
- `verification_date_invalid`

The queue must retain enough identity to make human follow-up unambiguous:

- record kind (`entity` or `product`);
- canonical ID;
- entity ID where applicable;
- slug;
- display name/product name;
- canonical `last_verified_at` value;
- derived age/due state;
- reason.

A due state is a review-priority signal, not evidence that a product is stale, abandoned, unsafe, unsupported, or discontinued.

## Official-source target extraction

Network targets may be derived only from canonical official entity/product URL fields explicitly approved by the implementation policy.

Each target must retain:

- record kind and canonical ID;
- entity ID/product ID as applicable;
- canonical source field name;
- requested URL;
- normalized host;
- monitoring target ID stable for the same canonical source field/URL.

Monitoring must never synthesize a URL from a name/slug/domain guess.

Non-HTTP(S) URLs, malformed URLs, duplicate targets, and targets beyond the run cap must be handled deterministically and reported without mutating canonical data.

## Network observation model

A successful observation may record only bounded operational metadata needed for follow-up, including:

- observation timestamp;
- requested URL;
- final URL after redirects;
- HTTP status where available;
- redirect count;
- elapsed time;
- coarse outcome category;
- bounded error category/message when no HTTP response is available.

Do not store response bodies, HTML snapshots, cookies, authorization material, or arbitrary response headers in the monitoring artifact.

Required coarse outcome categories include at least:

- `ok`
- `redirected`
- `not_found`
- `gone`
- `rate_limited`
- `client_error`
- `server_error`
- `network_error`
- `timeout`
- `invalid_target`

Semantics are deliberately weak:

- 2xx means the URL responded, not that the wallet/product is active or supported;
- redirect means the URL changed destination, not that rebrand/acquisition/migration occurred;
- 404/410 means the checked URL failed, not that the wallet/product is dead/discontinued;
- 403/429 may reflect blocking/rate limiting and must not become a negative lifecycle claim;
- 5xx/network/timeout are operational signals only.

## Prior-state comparison

When a prior retained monitoring state is available, the run should compare stable target IDs and report operational changes such as:

- outcome category changed;
- HTTP status changed;
- final URL changed;
- target added/removed because canonical URL fields changed.

First run without prior state must be explicitly marked `baseline_initialized`; every first observation must not be mislabeled as a change.

Failure to restore prior artifact/state must not silently invent a baseline comparison. The report must say prior state was unavailable and continue safely when possible.

## Review queue

Monitoring must emit a human-review queue separate from raw observations.

Allowed reasons may include:

- `reverification_due`
- `reverification_overdue`
- `official_url_redirect_changed`
- `official_url_not_found`
- `official_url_gone`
- `official_url_server_error`
- `official_url_network_error`
- `official_url_rate_limited`
- `official_url_final_url_changed`
- `verification_date_missing`
- `verification_date_invalid`

Every queue item must include canonical IDs, the observed URL when relevant, observation metadata, and a neutral recommended next action such as `research_before_canonical_change`.

No queue item may contain an automatic canonical conclusion such as `mark_dead`, `mark_unsupported`, `mark_patched`, or `downgrade_security`.

## Output artifacts

A monitoring run must generate deterministic-schema JSON artifacts outside canonical/public data. Expected outputs:

```text
monitoring-report.json
monitoring-state.json
review-queue.json
monitoring-summary.md
```

The workflow should upload these as GitHub Actions artifacts. Generated monitoring state must not be committed to `main` as a routine run result.

`monitoring-report.json` must identify:

- schema version;
- run mode (`network` or deterministic dry-run/no-network mode);
- source commit SHA;
- policy version;
- run start/end timestamps;
- canonical target counts;
- reverification summary;
- network observation summary;
- prior-state availability/baseline state;
- error summary.

## Workflow

The production monitoring workflow must be:

- scheduled weekly;
- manually runnable with `workflow_dispatch`;
- read-only with respect to repository contents;
- least-privilege (`contents: read` unless artifact APIs require more);
- bounded by timeout/target/rate limits;
- able to run a deterministic no-network validation mode in CI/tests.

A monitoring run must not open a canonical-data PR automatically. Human follow-up may create a normal research/candidate/correction PR later.

## Validation and tests

Step 8 implementation must add deterministic offline validation/tests proving at least:

- canonical target extraction is stable and deduplicated;
- no URL is synthesized from a slug/name;
- malformed/non-http targets fail closed;
- target cap and policy bounds are enforced;
- reverification due-state derivation is deterministic;
- first run is baseline initialization, not a false change set;
- prior-state comparison detects status/final-URL changes without creating lifecycle claims;
- 404/410/403/429/5xx/network/timeout remain neutral monitoring outcomes;
- report/state/review-queue schemas validate;
- monitoring never writes canonical files, candidate bundles, or `public/` output;
- monitoring artifacts do not contain response bodies or prohibited headers/secrets.

Normal `Validate WLR` CI must exercise the monitoring validator/offline tests after implementation.

## Acceptance gate

Step 8 is complete only after:

1. this specification is merged;
2. implementation lands in a separate PR;
3. deterministic offline tests/validator and normal WLR CI are green;
4. weekly/manual workflow exists on `main`;
5. at least one real network monitoring run against the accepted `main` implementation completes and its artifact is inspected;
6. inspected artifact proves neutral signals, canonical identifiers, bounded metadata, and no canonical/public mutation;
7. docs/status are synchronized and Issue #46 is closed.

## Non-goals

- wallet safety or quality rankings;
- uptime SLA monitoring;
- broad web/news crawling in the initial Step 8 implementation;
- automated source replacement;
- automated evidence creation;
- automatic canonical correction;
- publishing monitoring signals as user-facing warnings.
