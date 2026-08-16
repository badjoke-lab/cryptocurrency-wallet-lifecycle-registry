# WLR Lifecycle / Security / Support Compare Specification

Status: required implementation specification for AI-era execution schedule Step 6
Scope: deterministic comparison of reviewed wallet entities and their reviewed product/event facts

## Purpose

Add a public Compare view that lets readers place reviewed wallet histories side by side without turning WLR into a recommendation, score, ranking, or synthetic safety judgement.

Compare is a derived presentation of canonical WLR records. It creates no new canonical claims.

## Authority

Compare may derive facts only from:

```text
data/entities.json
data/products.json
data/events.json
data/evidence.json
config/structured-discovery.json
```

Identity boundaries remain governed by `IDENTITY_EVIDENCE_POLICY.md`. The incident and remediation event sets must reuse `config/structured-discovery.json`; Compare must not create a second security taxonomy.

## Comparison target

The top-level target is a wallet entity, not an arbitrary mixture of entities and products.

A comparison contains 2 to 4 distinct reviewed wallet entities. A single preselected entity may be shown while the user is choosing another, but comparison facts must not imply a head-to-head result until at least two valid entities are selected.

Product identities remain explicit inside each wallet column. Compare must never collapse multiple products into a fake single `wallet product` with one support or sales state.

## Route and deterministic selection state

Public route:

```text
/compare/
```

Selection state is represented by repeated query parameters in displayed order:

```text
/compare/?wallet=trezor&wallet=ledger
```

Rules:

- accept canonical entity slugs only;
- preserve the first occurrence order;
- ignore duplicate slugs after the first;
- ignore unknown slugs and expose a neutral invalid-selection notice rather than inventing a match;
- keep at most four valid selections;
- no wallet is selected by default;
- changing selection updates the shareable URL without creating a canonical data mutation.

The page must remain statically exportable. Query-state handling is client presentation state over build-time canonical data.

## Selection UI

- Candidate wallets are ordered alphabetically by canonical name, never by incident count, popularity, perceived safety, or support status.
- The page provides add/remove/reset controls and prevents duplicate active selections.
- A normal site-navigation entry exposes Compare without requiring a chatbot or natural-language prompt.
- Selection labels use canonical wallet names and may show wallet type as disambiguating context.

## Compare sections

### 1. Identity and current lifecycle

Show directly recorded or deterministic identity facts per selected wallet:

- canonical name;
- wallet type;
- custody model;
- key-management model when recorded;
- developer/company;
- country/origin;
- launch date and recorded precision;
- current entity status;
- entity predecessor/successor names when explicit canonical links exist;
- confidence;
- last verified date.

Missing optional values display `Not recorded`. `unknown` remains `Unknown`; it must not be converted into a stronger claim.

### 2. Product and support facts

Each wallet column contains its reviewed product list. For each product show, when recorded:

- product name;
- product type;
- product status;
- support status;
- sales status;
- launch date;
- sales-end date;
- discontinued date;
- predecessor/successor product names from explicit canonical lineage;
- support commitment key/value facts exactly as recorded;
- confidence and last verified date.

Support and sales status must be shown per product. Do not derive an ecosystem-wide label such as `supported`, `unsupported`, `still sold`, or `EOL` from a mixture of product states.

If `support_status`, `sales_status`, or support commitment is absent, show `Not recorded`; do not infer it from `product.status`, an official URL, release recency, or absence of an EOL event.

### 3. Security history

Use exactly the incident taxonomy from `config/structured-discovery.json`.

Per wallet, Compare may show descriptive counts and reviewed event rows:

- total reviewed incident events;
- low / medium / high / critical event counts where `impact_level` is recorded;
- event date;
- event title and event type;
- impact level;
- security scope;
- affected product names from explicit product references;
- affected versions/rules when recorded;
- CVE IDs when recorded;
- funds affected as the canonical `yes` / `no` / `unknown` value;
- user actions required when recorded;
- event confidence;
- linked evidence sources where canonical evidence references the event.

`0 reviewed incident events` means only that WLR has no reviewed incident event matching the canonical taxonomy for that entity. It must not be rendered as `safe`, `no vulnerabilities`, `never hacked`, or an equivalent real-world absence claim.

Severity color may aid scanning but must not produce a score, grade, winner, or overall risk color for a wallet.

### 4. Recorded remediation / response

Reuse the Step 5 remediation event taxonomy.

Show explicit remediation event rows and, when recorded:

- event date;
- event title/type;
- affected product/version scope;
- `fixed_versions` entries;
- user actions required;
- confidence;
- linked evidence sources.

A wallet with no matching remediation event displays `No reviewed fix/remediation recorded`. It must never display `unpatched`, `unfixed`, `vendor did not respond`, or an inferred response failure.

Compare does not calculate patch-response duration, average response time, median response time, or response ranking. Those aggregate/timeline metrics belong to Step 7 Stats unless separately specified later.

### 5. EOL / replacement history

Use the explicit Step 5 EOL/deprecation semantics and canonical lineage fields.

Show:

- current entity status;
- entity discontinued date when recorded;
- reviewed EOL/deprecation events;
- product sales-end/discontinued dates;
- explicit predecessor/successor relationships;
- replacement/migration events and required user actions when recorded.

`service_shutdown` alone must not make the wallet or product EOL. Newer products without explicit lineage must not be called replacements.

## Evidence and provenance

Compare must preserve provenance rather than detach negative/security claims from their reviewed records.

- Entity/product facts show confidence and last verification where available.
- Security, remediation, migration, and EOL event rows expose linked canonical evidence when available.
- Evidence links use the canonical source title/publisher/URL; Compare does not fabricate source summaries.
- Missing evidence display must not be interpreted as proof that a claim is false; canonical validation remains authoritative for what is publishable.

## Descriptive derivations allowed

The following are allowed because they are deterministic summaries of reviewed records:

- product count;
- reviewed incident count;
- severity-count breakdown;
- recorded remediation-event count;
- recorded EOL/deprecation-event count;
- product status/support-status/sales-status counts when clearly labelled as counts rather than an overall status.

The following are not allowed in Step 6:

- safety/risk score;
- best/safest/recommended ordering;
- overall winner;
- inferred support status;
- inferred patch status;
- inferred vendor responsiveness;
- normalized `days to patch` or lifespan ranking;
- automatically generated security conclusions.

## Presentation and mobile behavior

Desktop may use a matrix with one row-label column plus one column per selected wallet.

On narrow screens:

- document-level horizontal overflow is prohibited;
- a dedicated Compare matrix viewport may scroll horizontally when necessary;
- wallet headings and row labels must remain understandable while scrolling;
- product/event detail blocks must wrap long URLs, version ranges, and support text;
- controls remain usable at the existing 720px breakpoint;
- removing or adding a wallet must not reset unrelated selections unexpectedly.

## Empty and partial states

- 0 selected: explain what Compare does and show selectors.
- 1 selected: show that wallet as a pending selection and ask for at least one more; do not invent a comparison result.
- 2–4 selected: render Compare sections.
- Unknown slug: ignore it for facts, report it neutrally, and preserve valid selections.
- Missing field: `Not recorded`.
- Canonical enum `unknown`: `Unknown`.
- No reviewed incident: coverage-safe wording only.
- No remediation event: `No reviewed fix/remediation recorded`.

## Machine-readable boundary

Step 6 does not create a new canonical comparison JSON format. Existing per-wallet/product deterministic JSON plus canonical public JSON remain the machine-readable authority. Compare derivation helpers may be deterministic and tested, but the comparison result is a presentation view.

## Validation requirements

A Compare validator must fail closed if:

- Compare duplicates incident/remediation taxonomies instead of reusing structured-discovery policy;
- support or sales state is collapsed into an inferred ecosystem-wide status;
- `service_shutdown` is treated as EOL;
- negative labels contain prohibited safety/unpatched/winner wording;
- selection permits more than four distinct entities;
- duplicate/unknown slug handling violates this specification;
- required Compare navigation/route is missing after implementation.

## Production acceptance

After implementation merge, production verification must confirm:

1. Cloudflare reports a successful production deployment for the exact accepted `main` commit.
2. `/compare/` returns final HTTP 200.
3. URL-selected representative wallets load in the requested order.
4. Duplicate and unknown selection handling matches this specification.
5. Identity, lifecycle, incident, remediation, EOL, and per-product support facts match deterministic expectations computed from the same production canonical data.
6. No winner/safety-score/recommendation language appears.
7. Add/remove/reset and shareable URL state work in a real browser.
8. A 390x844 real-browser run has no document-level horizontal overflow; any horizontal movement is confined to the explicit Compare matrix viewport.

## Implementation boundary

Step 6 may add the Compare route, deterministic Compare derivation helpers, UI components/styles, navigation, validation, and production QA. It does not change canonical records merely to make a comparison look complete.

Step 7 Stats remains a separate gate.
