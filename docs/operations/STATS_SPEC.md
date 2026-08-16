# WLR Deterministic Stats Specification

Status: required implementation specification for AI-era execution schedule Step 7
Scope: descriptive statistics and data-quality coverage derived from reviewed canonical WLR records

## Purpose

Add a public Stats view that summarizes what WLR has reviewed and recorded without converting registry coverage into a wallet ranking, safety score, market-share claim, or inferred vendor-performance metric.

Stats is a deterministic derived view over canonical WLR records. It creates no canonical claims and must expose its denominators and unavailable metrics rather than filling gaps with inference.

## Authority

Stats may derive facts only from:

```text
data/entities.json
data/products.json
data/events.json
data/evidence.json
config/structured-discovery.json
```

The incident, remediation, and EOL event taxonomies must come from `config/structured-discovery.json`. Stats must not define a separate security taxonomy.

Identity/date/evidence interpretation remains governed by `IDENTITY_EVIDENCE_POLICY.md`. Compare boundaries in `COMPARE_SPEC.md` also apply when Stats summarizes support/security/lifecycle facts.

## Public surfaces

Human-readable route:

```text
/stats/
```

Machine-readable derived artifact:

```text
/data/stats.json
```

`/data/stats.json` is generated from canonical data during the normal build and is not an independent authority. Required top-level schema identifier:

```text
wlr.stats.v1
```

The public Stats page must render from the same deterministic stats derivation used to produce `stats.json`, so the HTML and machine-readable numbers cannot drift.

`manifest.json` must advertise the stats artifact without changing canonical record counts.

## Global interpretation rules

Every percentage or coverage ratio must expose both numerator and denominator. Example:

```text
44 / 69 products have a recorded launch date (63.8%)
```

Do not display a percentage without enough context to identify what population it describes.

The word `market` must not be used for distributions derived from WLR records. WLR is not a census of all wallets and therefore does not publish market share.

Stats ordering must be neutral: natural category order, chronology, or descending count where the section is explicitly a frequency distribution. Frequency ordering must not be described as a ranking or recommendation.

No section may calculate a composite quality, safety, completeness, vendor-response, or wallet score.

## 1. Registry scope

Show current reviewed canonical totals:

- wallet entities;
- products;
- events;
- evidence records;
- reviewed incident events;
- recorded remediation events;
- explicit EOL/deprecation events.

The incident total must equal the same central incident predicate used by Incidents, Step 5 discovery, and Compare.

The remediation total must use only `structured-discovery.json.remediation_event_types`.

The EOL/deprecation event total must use only `structured-discovery.json.eol_event_types`; `service_shutdown` alone is excluded.

## 2. Wallet/entity distributions

Publish counts and percentages for:

- `wallet_type`;
- current entity `status`;
- entity `confidence`;
- `custody_model`, keeping canonical `unknown` distinct from missing/unrecorded if such records exist;
- launch-date availability;
- launch-date precision among entities with a launch date.

These are distributions of reviewed WLR records, not the wallet market.

## 3. Product distributions

Publish counts and percentages for:

- `product_type`;
- product `status`;
- `support_status`, with missing/unrecorded separate from canonical `unknown`;
- `sales_status`, with missing/unrecorded separate from canonical `unknown`;
- product `confidence`;
- launch-date availability;
- launch-date precision among products with a launch date;
- support-commitment availability.

Do not collapse per-product support/sales states into one ecosystem-wide wallet status.

## 4. Reviewed incident history

Incident statistics use exactly the central incident taxonomy.

Publish descriptive distributions for:

- incident events by calendar year derived from the supported year component of `event_date`;
- incident `event_type`;
- `impact_level`, with `Not recorded` shown explicitly where absent;
- `security_scope`, with `Not recorded` shown explicitly where absent;
- `funds_affected` as canonical `yes` / `no` / `unknown` / `Not recorded`;
- confidence;
- CVE availability;
- affected-version information availability (`affected_versions` or `affected_version_rules`).

Do not normalize incident counts by wallet age and call the result risk. Do not infer severity where `impact_level` is absent.

## 5. Recorded remediation / patch information

Publish descriptive facts for reviewed remediation events:

- total remediation events;
- remediation events by `event_type`;
- remediation events by year;
- count/coverage with `fixed_versions` recorded;
- count/coverage with explicit affected product references;
- count/coverage with `user_actions_required`;
- confidence.

An incident event that itself contains `fixed_versions` may be counted separately as `incident records containing fixed-version information`; it is not automatically a remediation event unless its `event_type` is in the central remediation taxonomy.

### Patch-response duration — fail closed

Current canonical event schema has no explicit relationship such as:

```text
responds_to_event_id
remediates_event_ids
```

Therefore Step 7 must not calculate days-to-patch, median response time, average response time, fastest response, slowest response, or vendor response rankings by pairing events on any of the following alone:

- same entity;
- same product;
- overlapping affected products;
- same security scope;
- matching fixed-version strings;
- nearby dates;
- adjacent record IDs;
- shared evidence publisher or URL.

The public Stats page and `stats.json` must report response-duration availability explicitly, for example:

```json
{
  "patch_response_duration": {
    "status": "unavailable",
    "reason": "canonical incident-to-remediation linkage is not recorded"
  }
}
```

If a future reviewed schema adds an explicit incident-to-remediation relationship, response duration requires a new reviewed specification before publication.

## 6. EOL / lifecycle-date statistics

Use the central Step 5 EOL semantics.

Publish counts for:

- entities with an explicit discontinued date;
- products with an explicit discontinued date;
- products with an explicit sales-end date;
- products whose current status is deprecated/discontinued;
- explicit EOL/deprecation events by type and year;
- products participating in explicit predecessor/successor lineage.

`service_shutdown` alone must not enter EOL counts.

### Product lifespan — precision rules

A numeric elapsed lifespan may be calculated only when both lifecycle anchors support an exact day-level interval:

- product `launch_date` is `YYYY-MM-DD`;
- `launch_date_precision` is `day`;
- closing anchor is explicit `discontinued_date` in `YYYY-MM-DD` format.

Do not substitute `sales_end_date` for discontinued date and call that product lifespan; end-of-sale and end-of-support/discontinuation are distinct lifecycle facts.

Do not synthesize a single lifespan from year-, month-, or approximate-precision dates. Instead report lifecycle-pair availability by precision/anchor coverage.

If fewer than two exact closed product lifespans are available, Stats must not publish a distribution summary such as median/min/max because the sample is too thin to be meaningful. It may report the exact eligible count and state that no distribution is published.

If two or more exact day-level closed lifespans exist, a future implementation may publish count, median, minimum, and maximum only as descriptive statistics over that explicitly labelled eligible subset. It must never rank wallets/products by lifespan.

Entity lifespan is out of scope for Step 7 because the current entity model does not carry independent precision metadata for the closing date.

## 7. Evidence and data-quality coverage

Publish coverage indicators, not quality grades.

Required coverage metrics include:

### Entity coverage

- entities with at least one product;
- entities with at least one history event;
- entities with at least two history events;
- entities with at least one evidence record;
- entities with at least two evidence records;
- entity launch-date availability;
- entity custody-model availability;
- confidence distribution.

### Product coverage

- launch-date availability;
- known support-status coverage, where canonical `unknown` and missing both count as not-known but remain separately inspectable;
- known sales-status coverage;
- support-commitment availability;
- explicit lineage participation;
- confidence distribution.

### Event coverage

- event-date-basis availability;
- incident impact-level coverage;
- incident security-scope coverage;
- incident funds-affected coverage;
- incident CVE coverage;
- incident affected-version coverage;
- remediation fixed-version coverage;
- confidence distribution.

### Evidence coverage

- total evidence records;
- primary-evidence count/coverage;
- reliability distribution;
- source-type distribution;
- evidence linked to an event;
- evidence linked to a product;
- evidence linked only at entity level.

Coverage must not be presented as `data quality score`, `trust score`, `completeness grade`, or a wallet/vendor grade.

## Existing coverage and seed tooling convergence

Step 7 must remove taxonomy drift from existing internal reports.

`report_coverage.py` currently maintains a local `SECURITY_EVENT_TYPES` set that mixes incident and remediation classes. It must instead consume or deterministically mirror the central structured-discovery policy so displayed coverage does not report remediation events as incidents.

`check_representative_seed.py` currently keeps local incident/patch/EOL sets and treats `service_shutdown` as EOL. It must converge on the central incident/remediation/EOL policy while preserving its purpose as a seed-shape gate.

After convergence:

- `incident` means the same thing in Incidents, discovery, Compare, Coverage, representative seed, and Stats;
- `remediation` means the same central remediation set;
- `service_shutdown` alone never means EOL.

The seed gate may continue treating an incident record containing explicit `fixed_versions` as evidence that the seed exercises patch/fix data shape, but it must label this as shape coverage rather than an incident-to-remediation response pair.

## Deterministic stats artifact structure

`/data/stats.json` must contain at least:

```text
schema
scope
interpretation
generated_from
registry
entities
products
incidents
remediation
eol_lifecycle
data_quality
```

`scope` must be `canonical_only`.

`interpretation` must explicitly state that the statistics describe reviewed WLR registry records and are not wallet safety, market-share, or recommendation metrics.

`generated_from` identifies the canonical input paths and the central structured-discovery policy path; it must not claim an independent source dataset.

Category distributions use stable arrays of objects such as:

```json
[{ "value": "hardware", "count": 12, "denominator": 25 }]
```

Unknown/missing buckets must have stable machine-readable names rather than being silently omitted.

## UI presentation

The Stats page should use compact cards/tables/bars suitable for the existing black registry design. No third-party chart library is required.

Required page sections:

1. Registry scope
2. Wallet records
3. Product records
4. Reviewed incident history
5. Recorded remediation / patch information
6. EOL / lifecycle coverage
7. Data-quality coverage
8. Methodology / interpretation note

Charts/bars must encode counts descriptively and keep exact values visible in text. Color must not imply good/bad wallet quality. Incident severity may retain existing semantic severity colors because those colors describe event impact, not wallet score.

The page must include a direct link to `/data/stats.json` and normal navigation must expose Stats.

## Mobile behavior

At the existing 720px breakpoint:

- no document-level horizontal overflow;
- cards stack vertically where appropriate;
- any wide data table is contained in an explicit internal scroll viewport;
- category labels and numerator/denominator values remain readable at 390px;
- no chart depends on hover to expose its numeric value.

## Validation requirements

A Stats validator must fail closed if:

- Stats defines a second incident/remediation/EOL taxonomy;
- `service_shutdown` is included as EOL;
- incident totals differ from the central incident predicate;
- remediation events are folded into incident totals;
- a patch-response duration is emitted without an explicit canonical linkage specification;
- a lifespan duration is emitted from partial/approximate dates or from sales-end substituted for discontinuation;
- a percentage lacks a valid denominator;
- public stats counts differ from canonical input counts;
- a composite score/ranking field is introduced;
- `/stats/`, `/data/stats.json`, navigation, or sitemap integration is missing after implementation.

`stats.json` generation must be deterministic for identical canonical inputs.

## Production acceptance

After implementation merge, production verification must confirm:

1. Cloudflare reports a successful production deployment for the exact accepted `main` commit.
2. `/stats/` and `/data/stats.json` return final HTTP 200.
3. Stats registry totals match production canonical JSON counts.
4. Incident/remediation/EOL totals match the central production policy and existing Incidents/Compare semantics.
5. Known current coverage facts are reproduced deterministically, including product launch/support gaps.
6. Patch-response duration is visibly unavailable unless an explicit linkage model has been reviewed and implemented.
7. No safety score, ranking, market-share, best/safest, or inferred vendor-response language appears.
8. Real-browser verification confirms section values and representative distributions against production JSON.
9. A 390x844 real-browser run has no document-level horizontal overflow.

## Implementation boundary

Step 7 may add deterministic stats derivation/generation, `/stats/`, `/data/stats.json`, navigation/sitemap integration, validators, coverage/seed taxonomy convergence, CSS, and isolated production QA.

Step 7 must not change canonical records merely to create more interesting statistics. Missing linkage or lifecycle precision stays visible as a limitation.

Step 8 monitoring remains a separate gate.
