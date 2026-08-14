# WLR Reviewed Record Growth Policy

Status: required operating boundary for adding canonical records

## Goal

Grow Wallet Lifecycle Registry without allowing discovery automation, monitoring, or draft generation to mutate public canonical data.

## Authority boundary

Public authority remains exactly:

```text
data/entities.json
data/products.json
data/events.json
data/evidence.json
```

`data-staging/**` is non-public working material. It is not canonical, is not copied to `public/`, and must not be used by public pages or machine-readable outputs.

## Flow

```text
candidate
  -> research / normalize
  -> candidate validation
  -> human review
  -> explicit canonical edit
  -> normal pull request
  -> canonical validation / build
  -> manual merge
```

There is no candidate-to-canonical automatic promotion command.

## Candidate bundle

Each `data-staging/candidates/*.json` file is one review bundle:

```json
{
  "bundle_version": "1.0.0",
  "candidate_id": "wlr_cand_example-wallet",
  "title": "Example wallet candidate",
  "review_state": "researching",
  "records": {
    "entities": [],
    "products": [],
    "events": [],
    "evidence": []
  }
}
```

Allowed review states:

- `discovered`
- `researching`
- `review_ready`

`review_ready` does not mean published or approved. Canonical approval occurs only through a reviewed canonical-data PR.

## Validation requirements

Candidate validation must fail on:

- invalid row shape under the canonical JSON Schemas;
- duplicate candidate IDs or IDs already used by canonical data;
- duplicate entity/product slugs;
- entity canonical-name or alias identity collisions with canonical/candidate entities;
- matching official domains for a proposed entity and an existing canonical entity;
- broken entity/product/event references after candidate and canonical records are viewed together;
- cross-entity product/event/evidence references;
- proposed events without reachable evidence.

The validator may warn, rather than fail, when:

- the same developer/company appears on another canonical entity;
- a proposed evidence URL already exists in canonical evidence.

Those signals require human review because they can be legitimate.

## Evidence boundary

Discovery posts, search results, watchlists, referral material, and monitoring output are discovery inputs only. They become evidence only when an evidence record is deliberately created and it passes the evidence schema and review standard.

Every proposed event must be supported by at least one evidence record that reaches the event ID. Candidate evidence may also reference existing canonical events/products/entities when adding missing support material.

## Identifier allocation

Candidate records carry their intended final WLR IDs before promotion. Validation is the collision gate. Do not recycle IDs removed from rejected candidates as a source of historical meaning; only canonical IDs are authoritative.

## Promotion

Promotion is intentionally manual:

1. review the candidate bundle and source material;
2. copy only accepted facts into the relevant canonical arrays;
3. run canonical validation;
4. inspect count deltas and public output;
5. open a normal PR describing evidence boundaries and unresolved unknowns;
6. merge only after CI is green.

A script that directly appends candidate records to canonical files is prohibited unless this policy is deliberately changed in a reviewed PR.

## Cloudflare independence

Record research, candidate validation, and canonical PR review do not depend on Cloudflare availability. Publication/deployment is a separate operational gate.
