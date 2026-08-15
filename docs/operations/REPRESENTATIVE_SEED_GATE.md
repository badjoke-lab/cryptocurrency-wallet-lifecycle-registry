# WLR Representative Lifecycle Seed Gate

Status: AI-era execution schedule step 3 gate

WLR must retain representative canonical histories for five lifecycle classes before moving to deterministic per-wallet/product JSON.

Required classes:

1. release / launch;
2. vulnerability or incident;
3. patch / vendor response;
4. product replacement / lineage;
5. EOL / deprecation / discontinuation.

The gate is implemented by `scripts/check_representative_seed.py` and runs over canonical data only.

It does not require every wallet to contain every lifecycle class. It proves that the seed as a whole exercises the data model across the histories required by `docs/ai-era-execution-schedule.md`.

The check must not be satisfied by adding synthetic or trivial events. Canonical records remain governed by the identity/evidence and reviewed growth policies.

Representative counts and record IDs are printed in CI for auditability. These counts are structural coverage, not wallet safety, quality, trust, or recommendation scores.

If a future refactor removes the last representative of one required class, CI fails until a legitimate canonical record/model replacement restores that class.
