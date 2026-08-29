#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CANDIDATE = ROOT / "data-staging/candidates/ledger-lsb-023-025.json"
TARGETS = {
    "events": ROOT / "data/events.json",
    "evidence": ROOT / "data/evidence.json",
}
EVENT_REMAP = {
    "wlr_ev_000159": "wlr_ev_000175",
    "wlr_ev_000160": "wlr_ev_000176",
    "wlr_ev_000161": "wlr_ev_000177",
}
EVIDENCE_REMAP = {
    "wlr_src_000419": "wlr_src_000440",
    "wlr_src_000420": "wlr_src_000441",
    "wlr_src_000421": "wlr_src_000442",
}

if not CANDIDATE.exists():
    raise SystemExit("candidate already promoted or missing")

bundle = json.loads(CANDIDATE.read_text(encoding="utf-8"))
if bundle.get("review_state") != "review_ready":
    raise SystemExit("candidate is not review_ready")

for event in bundle["records"]["events"]:
    event["id"] = EVENT_REMAP[event["id"]]
for evidence in bundle["records"]["evidence"]:
    evidence["id"] = EVIDENCE_REMAP[evidence["id"]]
    if evidence.get("event_id") in EVENT_REMAP:
        evidence["event_id"] = EVENT_REMAP[evidence["event_id"]]
    if evidence.get("event_ids"):
        evidence["event_ids"] = [EVENT_REMAP.get(v, v) for v in evidence["event_ids"]]

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
print("promoted Ledger LSB 023-025 candidate as events 175-177 / evidence 440-442")
