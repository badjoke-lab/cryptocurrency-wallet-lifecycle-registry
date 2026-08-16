# WLR Structured Discovery Specification

Status: required implementation specification for AI-era execution schedule step 5
Scope: reviewed canonical wallet discovery on the public registry

## Purpose

Add deterministic filters and search to the wallet registry without turning WLR into a recommendation, risk score, or inferred-security product.

The discovery layer is a derived view over reviewed canonical data. It never creates or changes canonical claims.

## Authority

Discovery facts may be derived only from:

```text
data/entities.json
data/products.json
data/events.json
data/evidence.json
```

Identity and evidence semantics remain governed by `IDENTITY_EVIDENCE_POLICY.md`. Unknown or absent data must stay unknown/absent; the UI must not fill gaps with inference.

## Required wallet facets

### Wallet type

Source: `entity.wallet_type`.

Filtering is exact. Values are presented as recorded rather than normalized into a new taxonomy.

### Custody / key model

Source: `entity.custody_model` only.

The UI may expose recorded custody-model values plus a neutral `Not recorded` option for null/empty values. It must not infer custody or key-management architecture from marketing text, product names, `system_components`, or incident history.

### Lifecycle status

Source: `entity.status`.

This is current reviewed lifecycle state. It remains separate from historical incident severity.

### Security history

Use the same incident definition as the public incidents view. An entity has `Reviewed incident history` when at least one related event satisfies the canonical `isIncident` predicate.

The inverse label must be `No reviewed incident recorded`, not `safe`, `no vulnerabilities`, or equivalent. Absence of a reviewed event is not evidence that no incident exists.

### Fix / remediation history

`Recorded fix or remediation` is true only when the entity has an explicit event whose `event_type` is one of:

```text
security_fix
firmware_fix
software_fix
key_migration_recommended
recall
```

The inverse label must be `No reviewed fix/remediation recorded`. It must never be shown as `unpatched`, `unfixed`, `unsafe`, or as evidence that a vendor failed to respond.

### EOL / deprecation history

`Recorded EOL/deprecation` is true when at least one reviewed canonical signal explicitly establishes lifecycle wind-down:

- entity status is `deprecated`, `discontinued`, or `dead`;
- a related product status is `deprecated` or `discontinued`;
- a related product has `discontinued_date` or `sales_end_date`;
- a related event has `event_type` of `deprecation_announced`, `sales_discontinued`, or `discontinued`.

`service_shutdown` alone is not an EOL signal because an optional hosted component may shut down while the wallet remains usable or supported.

The inverse label must be `No reviewed EOL/deprecation recorded`, not `supported indefinitely` or `active forever`.

### Launch-year range

Source: `entity.launch_date` only.

The UI accepts optional inclusive `from` and `to` years. The comparison uses the supported year component of the canonical date regardless of day/month precision. If either date bound is active, entities without a canonical launch date are excluded rather than assigned an inferred date.

Invalid or contradictory ranges must produce no misleading result; the UI should prevent or clearly represent `from > to`.

## Text search

Case-insensitive text search may match reviewed canonical labels from the entity and its related records:

- canonical wallet name and aliases;
- developer/company and country/origin;
- wallet type, custody model, and status;
- related product names and aliases;
- related event titles and event types.

Search is string matching only. It must not synthesize claims, synonyms, or natural-language interpretations. Natural-language-to-filter translation remains step 9 and is explicitly out of scope.

## Result semantics

All active facets combine with logical AND. Text search also combines with AND against selected facets.

Existing deterministic sort choices may remain:

- name;
- recently verified;
- incident count;
- product count.

The result count must continue to state that records are reviewed registry records. Filter controls must have a single reset path.

## Presentation safeguards

- Do not use stars, scores, grades, `best`, `safest`, `recommended`, or equivalent ranking language.
- Security history, remediation history, EOL history, and current status must remain visibly separate concepts.
- Negative filter labels describe registry coverage (`recorded` / `not recorded`), not real-world absence.
- Unknown custody model must be visible as missing registry data rather than silently dropped when the user explicitly selects `Not recorded`.
- Controls must remain usable at the existing mobile breakpoint without document-level horizontal overflow.

## Implementation boundary

Step 5 modifies the wallet registry discovery view and supporting deterministic derivation helpers only. It does not change canonical JSON, schemas, incident inclusion policy, Compare, Stats, monitoring, or natural-language search.

A validation helper must exercise the derivation rules against canonical data so event-type sets and negative-label semantics do not silently drift from this specification.

## Acceptance gate

1. This specification is merged before implementation.
2. Implementation is submitted in a separate PR linked to the Step 5 issue.
3. `Validate WLR` is green at the exact implementation head.
4. After merge, production is verified for the structured controls and representative filter combinations, including a 390px mobile viewport.
5. Step 5 status is synchronized only after production verification passes.
