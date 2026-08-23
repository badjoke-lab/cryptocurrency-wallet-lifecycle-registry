# WLR material concerns and retroactive audit specification

Status: canonical implementation specification
Parent issue: #269

## Purpose

WLR records wallet lifecycle, custody architecture, products and incidents. Canonical inclusion, active support, evidence verification or a low incident count is not a safety endorsement.

## Public custody/key-control summary

Every canonical wallet detail page must support evidence-backed presentation of custody model; key-control holder; user seed/recovery material availability; independent recovery capability; account/service dependency; third-party custody/MPC infrastructure; external withdrawal dependency; integrated exchange/yield dependencies; and material security or operational incidents.

Unknown key control or recovery must remain unknown. Do not infer self-custody from branding, address visibility, withdrawal support or MPC terminology. Distinguish confirmed facts, vendor/operator claims, allegations, unresolved unknowns and not-applicable fields.

## Retroactive audit

Apply this contract to every existing canonical wallet entity and product. Classify each dimension as `derivable`, `research_required`, or `not_applicable`. Existing hosted/custodial/MPC/hybrid products must be brought to the same presentation standard as new records. Corrections must be reviewable batches; absence of evidence must not be treated as user control.

## IZAKA-YA Wallet first application

IZAKA-YA Wallet is the first new intake governed by this specification. Evidence the current hosted/custodial classification only to the level supported by reviewed sources; record Fireblocks MPC-CMP/custody infrastructure, deposits/withdrawals/transfers, swap and lending integrations, and explicit unknowns for final key control or independent recovery where not proven.

Cross-link related JPYR (SOG), IZAKA-YA yield service (CYA) and IZAKA-YA exchange/service (HEI) records when available. Each registry retains authority for its own classifications.

## Completion gate

Issue #269 is not complete until relevant methodology/UI/roadmap documentation references this contract, every existing canonical wallet/product has been audited, required correction batches are merged, custody/key-control presentation is implemented, IZAKA-YA Wallet is reviewed under the same rules, and repository validators/build/production parity gates pass.
