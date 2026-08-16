# WLR Lifecycle Identity and Evidence Policy

Status: mandatory operating boundary for new candidate records

This policy implements step 2 of `docs/ai-era-execution-schedule.md`. It applies to new candidate records before canonical promotion. Existing reviewed canonical records are not silently rewritten to satisfy newer conventions; any cleanup must be a separate reviewed change.

## Purpose

WLR is a historical wallet lifecycle and evidence registry. Identity boundaries must be stable enough that release, incident, patch, replacement, migration, support, and end-of-life history remain comparable over time.

The registry must not inflate record counts by turning every version, edition, operating system build, or branding change into a new product.

## Authority

Canonical authority remains exactly:

```text
data/entities.json
data/products.json
data/events.json
data/evidence.json
```

Candidate data remains non-public and follows `RECORD_GROWTH_POLICY.md`.

## Entity identity

Create one entity for a continuous wallet brand/project ecosystem when its historical identity remains understandable across product changes.

Keep the same entity when:

- the brand is renamed but continuity is explicit;
- the organization is acquired but the wallet lineage remains identifiable;
- a wallet adds new hardware or software products;
- a project moves between companies without creating a genuinely new wallet identity.

Create a new entity when evidence shows a distinct wallet/project identity rather than a continuation, including a true fork, spin-out, independently operated successor, or unrelated product reusing a similar name.

Acquisition alone does not mean `dead` or `discontinued`. Rebrand alone does not create a new entity.

Entity aliases preserve former names. A rebrand/acquisition should also be represented as an event when historically material.

## Product identity

A product is a user-facing wallet component with its own meaningful release, distribution, security, support, sale, replacement, or discontinuation lifecycle.

Normally create separate products for:

- separately named hardware models/generations;
- browser extension vs mobile app when runtime/distribution/security boundaries differ;
- desktop vs mobile applications when they have independent release/security boundaries;
- smart-account protocol vs user-facing wallet interface when they have distinct lifecycle/security boundaries;
- a companion application when it has an independent software release/security lifecycle;
- materially different key-management products under one brand.

Normally keep one product for:

- the same application distributed across operating systems from one release lineage;
- cosmetic colors or storage/package bundles;
- firmware-only editions on identical hardware unless they develop an independent lifecycle;
- ordinary semantic versions, patch releases, and app-store versions;
- regional availability differences without a separate product lifecycle.

Examples already established by WLR:

- MetaMask Extension and MetaMask Mobile are separate products.
- Electrum is one multi-platform application product rather than one product per OS.
- BitBox02 Multi and Bitcoin-only editions are variants on the same hardware product.
- Trezor Safe 3 / Safe 5 / Safe 7 are separate hardware products.
- Ready Mobile and Ready X are separate products because their key-management/security models differ.

## Variant identity

Use `variants` for differences that do not independently justify product history, such as:

- color or enclosure options;
- card-count/package bundles;
- Bitcoin-only or chain-limited firmware editions on the same hardware when the hardware/support lifecycle is shared;
- minor hardware revisions that do not create a separately marketed/security-supported model.

If a supposed variant later receives an independent launch, support, vulnerability, replacement, or EOL lifecycle, review whether it must be promoted to a distinct product.

## Version identity

Versions are not products.

Record version scope on events with fields such as:

```text
affected_versions
affected_version_rules
fixed_versions
```

A security advisory affecting only one release does not create a new product record.

Use version ranges only when a source supports them. Do not infer a fixed version from changelog ordering alone.

## Rebrand, acquisition, replacement and lineage

- Rebrand: preserve the same entity/product when the underlying identity continues; add aliases and a `rebranded` event.
- Acquisition: preserve the acquired wallet identity unless evidence shows it was absorbed into a different product; add an `acquired` event.
- Replacement: use `predecessor_*` / `successor_*` only when evidence supports an actual lineage/replacement relationship, not merely because one product is newer.
- Parallel products: newer products can coexist without predecessor/successor links.
- Lineage references must never self-reference or form cycles.

## Services and hosted components

A hosted coordinator, support portal, cloud backend, swap provider, or hosted Lightning service is normally not a wallet product by itself.

Track material service shutdowns/incidents as events attached to the relevant entity/product. Do not mark the wallet discontinued merely because an optional hosted component shuts down.

## Event identity

Create an event for a material historical change, including:

- launch/release;
- material product/security architecture change;
- vulnerability or exploit disclosure;
- unauthorized access / data breach / supply-chain compromise;
- vendor response, patch, firmware/software fix, or required migration;
- acquisition or rebrand;
- sale/support deprecation or discontinuation;
- service shutdown that materially changes wallet use;
- network/product migration.

Do not create events merely to improve coverage counts. Routine version churn belongs in release history outside canonical WLR unless it materially changes lifecycle/security state.

Every new candidate event must declare `event_date_basis` so readers know whether its date is occurrence, discovery, disclosure, announcement, release, effective, or approximate.

## Date precision

Never invent day precision.

For new candidate entity/product launch dates:

- `YYYY-MM-DD` -> `launch_date_precision: day` unless explicitly marked approximate;
- `YYYY-MM` -> `launch_date_precision: month` unless explicitly marked approximate;
- `YYYY` -> `launch_date_precision: year` unless explicitly marked approximate;
- uncertain chronology -> use the supported coarser date and `approximate`, or leave the date null.

Do not convert a blog publication date into a product launch date unless the source actually establishes that relationship.

## Product support-status semantics

`support_status` describes the **product's vendor/project maintenance and update-support state**, not whether a URL loads, whether a binary can still be downloaded, whether a product can still be used, whether customer-service contact exists, or whether the overall wallet entity remains active.

The canonical values are interpreted as follows.

### `supported`

Use only when first-party evidence presents the product as currently supported/maintained or gives a current ordinary maintenance/update commitment. A live product page, reachable application, recent repository activity, or recent release alone is not enough.

### `maintenance`

Use when first-party evidence explicitly places the product in a reduced/legacy maintenance phase **and also establishes that some ordinary maintenance continues**. This is not a synonym for “old”, “limited”, or “not actively maintained”. If ongoing maintenance cannot be established, do not use this value.

### `security_only`

Use only when first-party evidence explicitly says normal maintenance/features have ended but security fixes or security updates continue. Do not infer this state from silence, release history, or security advisories alone.

### `ended`

Use when first-party evidence explicitly establishes that active product maintenance/support/updates have ended, including language that the product is no longer actively maintained, unless the same or newer first-party evidence establishes a narrower continuing `maintenance` or `security_only` commitment.

`ended` does **not** mean the software is unusable, the download has disappeared, the entity is dead, or customer-service contact is unavailable. A legacy product can remain downloadable or usable while its product-maintenance status is `ended`.

### `unknown`

Use when available first-party evidence does not resolve the maintenance/support state into one of the values above. `unknown` is preferred to inferring a positive or negative support state from circumstantial signals.

### Evidence and separation rules

Support status is product-specific. Do not automatically copy one product's support state to sibling products or the parent entity.

The following are **not sufficient by themselves** to set `support_status`:

- HTTP reachability or monitoring results;
- current download availability;
- app-store listing presence;
- source-repository archival/non-archival state;
- recent or old commit/release timestamps;
- a generic help center, email address, or customer-support contact;
- a successor product existing;
- the product's `status` or `sales_status` value.

When changing an existing canonical `support_status`, use a separate reviewed cleanup with first-party evidence that supports the exact product and state. If evidence only establishes that ordinary maintenance ended but says nothing about continued security fixes, classify `ended` rather than inventing `security_only`.

## Evidence minimums

### Every new candidate event

Must have at least one candidate evidence record that:

- directly references the event ID;
- is marked `is_primary: true`;
- has `reliability: high`;
- supports the material claim being recorded.

Search results, monitoring output, social discussion, referral content, or unsourced summaries are discovery inputs, not evidence.

### New entity identity/current status

Prefer first-party legal, about, product, documentation, or official source-repository material. Evidence should establish the wallet identity and avoid inferring current status from stale historical pages.

### New product boundary/current status

Use official product/download/documentation pages, app-store links controlled by the project, official source repositories, or release material that demonstrates a distinct product/runtime/security lifecycle.

### Launch, rebrand, acquisition, deprecation, EOL

Use an official announcement, release note, legal/company statement, or equivalent primary record. If only year/month precision is supported, retain that precision.

### Vulnerability / incident

Prefer vendor security advisories, researcher disclosure, CVE/NVD-style primary records where appropriate, incident reports, or official postmortems. Separate:

- vulnerability from known exploitation;
- product compromise from customer-data/vendor compromise;
- affected product/version scope from unrelated products;
- confirmed loss from unknown/no-loss statements.

### Affected and fixed versions

Version ranges and fixed versions require explicit supporting evidence. Do not infer them from nearby releases.

### Funds, user impact, and negative claims

Claims such as `funds_affected: no`, "no exploitation observed", or "device not compromised" must be source-supported. Absence of reported loss is not proof of no loss.

## Evidence scope and reuse

One primary source may support multiple records when it genuinely contains those claims. Evidence records must identify the relevant entity/product/event IDs and use a claim scope that matches what the source supports.

Archived or secondary sources may supplement evidence but do not replace a required high-reliability primary source for a newly proposed event.

## Candidate-only hard gates

New candidates fail closed when machine-verifiable requirements are violated:

- entity/product launch date supplied without `launch_date_precision`;
- launch-date precision contradicts the supplied date granularity;
- event lacks `event_date_basis`;
- new event lacks high-reliability primary candidate evidence;
- entity/product predecessor/successor self-reference;
- entity/product lineage forms a cycle;
- explicit predecessor/successor links conflict with each other.

These gates apply prospectively to candidate records. Existing canonical records are audited separately and are not auto-mutated.

## Human review remains authoritative

Passing validation does not prove that a proposed entity/product split is correct. Product-boundary decisions, interpretation of evidence, impact classification, and canonical wording remain human-reviewed decisions through the normal PR process.

No automated process may promote candidate records into canonical data.
