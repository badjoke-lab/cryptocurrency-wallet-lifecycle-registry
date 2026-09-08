# Coverage recovery Wave 03 — thin-history batch 9 selection

Fresh main: `043ea9700308a20983600f0791100f05694bd464`

One-event entities before selection: 29.

Deterministic top five:

1. Prokey — `wlr_ent_000100` / `wlr_prod_000149` Prokey Optimum
2. Guarda Wallet — `wlr_ent_000033` / `wlr_prod_000082` Guarda Wallet
3. OneKey — `wlr_ent_000037` / `wlr_prod_000086` OneKey Pro
4. NGRAVE — `wlr_ent_000040` / `wlr_prod_000089` NGRAVE ZERO
5. Ronin Wallet — `wlr_ent_000045` / `wlr_prod_000094` Ronin Wallet Extension

Reviewed candidate events are staged in `data-staging/candidates/coverage-recovery-wave-03-thin-history-9.json`. Promotion must re-check current-main entity/product identity, preserve the one-event invariant, reject duplicate event keys and evidence URLs, allocate canonical IDs dynamically, regenerate public/machine-readable layers, and pass repository validators before merge.
