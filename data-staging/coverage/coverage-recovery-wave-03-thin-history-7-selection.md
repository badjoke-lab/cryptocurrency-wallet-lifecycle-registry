# Coverage recovery Wave 03 — thin-history batch 7

Generated from canonical main `e33e4ea43ba413d8e581fb24045d24f176f1a30d`.

Fresh recomputation found **39 entities with exactly one canonical event**. Ranking follows:

`priority_score = missing_launch*4 + unknown_support*3 + max(0,4-evidence_count)`, then evidence count ascending and entity ID ascending.

Selected top five:

1. Specter Desktop — `wlr_ent_000096` / `wlr_prod_000145`
2. TokenPocket — `wlr_ent_000030` / `wlr_prod_000079`
3. Cake Wallet — `wlr_ent_000042` / `wlr_prod_000091`
4. Lace — `wlr_ent_000044` / `wlr_prod_000093`
5. Ambire Wallet — `wlr_ent_000058` / `wlr_prod_000107`

Reviewed additions:

- Specter Desktop v2.1.7 security fixes — official GitHub release, 2026-04-09.
- TokenPocket iOS 2.0.6 adds Bitcoin/Dogecoin and Taproot support — official TokenPocket update log, 2023-04-14.
- Cake Wallet v4.26.0 adds Monero to BIP39 wallet groups — first-party Cake Wallet release article, 2025-04-15.
- Lace 1.24 adds Bitcoin mainnet, Handles and Tempo.vote — IOG / Essential Cardano development report, 2025-06-27.
- Ambire Extension public launch without invite codes, with EIP-7702 support — first-party Ambire announcement, 2025-05-08.

Canonical evidence URL preflight returned no matches for all five candidate URLs. Promotion must still fail closed on current-main identity, one-event state, event-key duplicates and exact evidence URL duplicates.
