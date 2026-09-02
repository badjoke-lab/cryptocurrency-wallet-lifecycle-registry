# Coverage recovery Wave 03 — thin-history batch 4 selection

Fresh-main authority: `04953b4ab585947fe106085d7265c3fbeec3d92d`.

The current canonical recomputation reports **54 entities with exactly one canonical event**. Selection remains deterministic and candidate-first. Historical Wave 03 queue IDs are not identity authority.

## Selected first five

1. AQUA Wallet — `wlr_ent_000090` / `wlr_prod_000139` AQUA Wallet Mobile
2. Bitkit — `wlr_ent_000091` / `wlr_prod_000140` Bitkit Mobile
3. Breez — `wlr_ent_000092` / `wlr_prod_000141` Breez Mobile
4. Blixt Wallet — `wlr_ent_000094` / `wlr_prod_000143` Blixt Wallet Mobile
5. Satochip — `wlr_ent_000099` / `wlr_prod_000148` Satochip Hardware Wallet

All five scored 8 under the current queue rule: missing launch date, unknown support status, three evidence records, and exactly one canonical event.

## Staged lifecycle additions

- AQUA Wallet — 2025-04-17 discovery chronology from first-party wallet terms documenting beta, non-custodial Bitcoin/Layer 2 scope, USDt/Liquid support, swaps, and on/off-ramp integrations. No earlier launch date is inferred.
- Bitkit — 2025-05-21 first-party update documenting the native-app rewrite, Android Wake to Pay, and Bitcoin Maps.
- Breez — 2025-01-14 official repository release `0.17.bugfixes.5`.
- Blixt Wallet — 2025-07-01 official v0.8.0 release documenting React Native New Architecture migration, backend-library changes, lnd 0.18.4, and Android chain-sync rewrite.
- Satochip — 2025-06-16 official applet v0.15-0.1 beta release documenting MuSig2 support and secnonce-reuse protection.

Candidate file: `data-staging/candidates/coverage-recovery-wave-03-thin-history-4.json`.

No canonical files are changed in this research branch.
