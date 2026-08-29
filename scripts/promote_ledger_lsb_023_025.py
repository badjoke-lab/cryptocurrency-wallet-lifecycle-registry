#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CANDIDATE = ROOT / "data-staging/candidates/ledger-lsb-023-025.json"
TARGETS = {
    "events": ROOT / "data/events.json",
    "evidence": ROOT / "data/evidence.json",
}

if not CANDIDATE.exists():
    raise SystemExit("candidate already promoted or missing")

bundle = json.loads(CANDIDATE.read_text(encoding="utf-8"))
if bundle.get("review_state") != "review_ready":
    raise SystemExit("candidate is not review_ready")

for kind, target in TARGETS.items():
    current = json.loads(target.read_text(encoding="utf-8"))
    proposed = bundle["records"][kind]
    current_ids = {row["id"] for row in current}
    collisions = current_ids.intersection(row["id"] for row in proposed)
    if collisions:
        raise SystemExit(f"{kind} id collision: {sorted(collisions)}")
    current.extend(proposed)
    target.write_text(json.dumps(current, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

CANDIDATE.unlink()
print("promoted Ledger LSB 023-025 candidate")
