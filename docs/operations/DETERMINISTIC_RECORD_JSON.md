# WLR Deterministic Wallet/Product JSON

Status: AI-era execution schedule step 4

WLR publishes deterministic record views derived only from reviewed canonical JSON.

## Paths

- `/data/wallet-index.json`
- `/data/product-index.json`
- `/data/wallets/{entity-slug}.json`
- `/data/products/{product-slug}.json`

## Wallet record

Each wallet record contains:

- `schema: wlr.wallet-record.v1`
- the canonical entity
- all canonical products for that entity
- all canonical events for that entity
- all canonical evidence for that entity

## Product record

Each product record contains:

- `schema: wlr.product-record.v1`
- a minimal parent-entity identity block
- the canonical product
- events directly linked through `product_id` or `affected_product_ids`
- evidence linked directly to the product or through those product events

## Safety and determinism

These files are generated views, not a second source of truth. `data/entities.json`, `data/products.json`, `data/events.json`, and `data/evidence.json` remain canonical.

Generation sorts records by stable canonical IDs, recreates wallet/product output directories on every build, and fails on missing parent entities.

`npm run validate:machine-records` rebuilds the machine layer and then fails if:

- generated wallet/product counts differ from canonical counts;
- slugs are missing or duplicated;
- a wallet record has the wrong product/event/evidence set;
- a product record points to the wrong parent entity;
- a product record contains unrelated events or evidence;
- manifest record counts drift from canonical counts.

These record views are historical data surfaces. They are not safety ratings, recommendations, or claims that absence of an incident means a wallet is safe.
