# Coverage recovery Wave 03 — thin-history batch 8 selection

Fresh main: `1d9a0fed1391fdea29f080f5770788477f819c1f`

One-event entities before selection: 34.

Deterministic top five:

1. HashPack — `wlr_ent_000062` / `wlr_prod_000111` HashPack Extension
2. Arculus — `wlr_ent_000072` / `wlr_prod_000121` Arculus Cold Storage Wallet
3. Tonkeeper — `wlr_ent_000079` / `wlr_prod_000128` Tonkeeper Mobile
4. Nightly Wallet — `wlr_ent_000089` / `wlr_prod_000138` Nightly Wallet Extension
5. ZEUS Wallet — `wlr_ent_000093` / `wlr_prod_000142` ZEUS Wallet Mobile

Reviewed candidate events are staged in `data-staging/candidates/coverage-recovery-wave-03-thin-history-8.json`. Promotion must re-check current-main entity/product identity, preserve the one-event invariant, reject duplicate event keys and evidence URLs, allocate canonical IDs dynamically, regenerate public/machine-readable layers, and pass repository validators before merge.
