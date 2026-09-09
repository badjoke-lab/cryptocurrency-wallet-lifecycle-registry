# Coverage recovery Wave 03 — thin-history batch 10 selection

Fresh queue source: main `ae66fe9339ab941a1e028c0fc7e622003e7d1856`.

`one_event_count = 24`.

Deterministic top five selected for reviewed depth additions:

1. Bitget Wallet — `wlr_ent_000046` / `wlr_prod_000095` — add the 2025-03-17 default multi-chain MEV protection rollout.
2. Phoenix Wallet — `wlr_ent_000049` / `wlr_prod_000098` — add the 2024-02-23 Swaproot deployment for cheaper and more private on-chain deposits.
3. Brave Wallet — `wlr_ent_000051` / `wlr_prod_000100` — add the 2024-02-27 native Bitcoin support release.
4. Crypto.com Onchain — `wlr_ent_000052` / `wlr_prod_000101` — add the 2025-06-26 revamped Onchain Extension release.
5. Binance Wallet — `wlr_ent_000053` / `wlr_prod_000102` — add the 2023-11-08 initial Binance Web3 Wallet launch.

All five use first-party sources. Exact source URLs were searched against current canonical main before staging and returned no matches. Promotion must still fail closed on duplicate event keys and evidence URLs and must re-check exact entity/product identity plus the one-event invariant from fresh canonical main.
