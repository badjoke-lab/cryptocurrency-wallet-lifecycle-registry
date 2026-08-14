#!/usr/bin/env python3
import copy
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VALIDATOR = ROOT / "scripts" / "validate_candidates.py"


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def unused_id(prefix, rows):
    existing = {row["id"] for row in rows}
    for number in range(999999, 900000, -1):
        candidate = f"{prefix}{number:06d}"
        if candidate not in existing:
            return candidate
    raise RuntimeError(f"no unused self-test ID for {prefix}")


def bundle(candidate_id, records):
    return {
        "bundle_version": "1.0.0",
        "candidate_id": candidate_id,
        "title": f"Self-test {candidate_id}",
        "review_state": "researching",
        "records": {
            "entities": records.get("entities", []),
            "products": records.get("products", []),
            "events": records.get("events", []),
            "evidence": records.get("evidence", []),
        },
    }


def run_case(name, payload, expect_success):
    with tempfile.TemporaryDirectory(prefix=f"wlr-{name}-") as temp:
        directory = Path(temp)
        (directory / f"{name}.json").write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        result = subprocess.run(
            [sys.executable, str(VALIDATOR), "--candidate-dir", str(directory)],
            cwd=ROOT,
            text=True,
            capture_output=True,
        )
        succeeded = result.returncode == 0
        if succeeded != expect_success:
            print(f"FAIL self-test {name}: expected success={expect_success}, returncode={result.returncode}")
            print(result.stdout)
            print(result.stderr)
            raise SystemExit(1)


canonical_entities = load(ROOT / "data" / "entities.json")
canonical_events = load(ROOT / "data" / "events.json")
canonical_evidence = load(ROOT / "data" / "evidence.json")

# A new evidence record may safely support an existing canonical entity/event.
valid_evidence = copy.deepcopy(canonical_evidence[0])
valid_evidence["id"] = unused_id("wlr_src_", canonical_evidence)
run_case(
    "valid-evidence",
    bundle("wlr_cand_selftest-valid-evidence", {"evidence": [valid_evidence]}),
    True,
)

# Reusing a canonical entity ID/name/domain must fail closed.
colliding_entity = copy.deepcopy(canonical_entities[0])
run_case(
    "canonical-collision",
    bundle("wlr_cand_selftest-collision", {"entities": [colliding_entity]}),
    False,
)

# A new event without reachable evidence must fail closed.
uncovered_event = copy.deepcopy(canonical_events[0])
uncovered_event["id"] = unused_id("wlr_ev_", canonical_events)
run_case(
    "uncovered-event",
    bundle("wlr_cand_selftest-uncovered-event", {"events": [uncovered_event]}),
    False,
)

print("PASS candidate validator self-tests: valid evidence accepted; canonical collision and uncovered event rejected")
