#!/usr/bin/env python3
import copy
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VALIDATOR = ROOT / "scripts" / "validate_identity_evidence_policy.py"


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def unused_id(prefix, rows, offset=0):
    existing = {row["id"] for row in rows}
    seen = 0
    for number in range(999999, 900000, -1):
        candidate = f"{prefix}{number:06d}"
        if candidate in existing:
            continue
        if seen == offset:
            return candidate
        seen += 1
    raise RuntimeError(f"no unused self-test ID for {prefix}")


def bundle(candidate_id, records):
    return {
        "bundle_version": "1.0.0",
        "candidate_id": candidate_id,
        "title": candidate_id,
        "review_state": "researching",
        "records": {
            "entities": records.get("entities", []),
            "products": records.get("products", []),
            "events": records.get("events", []),
            "evidence": records.get("evidence", []),
        },
    }


def run_case(name, payload, expect_success):
    with tempfile.TemporaryDirectory(prefix=f"wlr-policy-{name}-") as temp:
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
            print(f"FAIL identity/evidence self-test {name}: expected success={expect_success}, returncode={result.returncode}")
            print(result.stdout)
            print(result.stderr)
            raise SystemExit(1)


entities = load(ROOT / "data" / "entities.json")
products = load(ROOT / "data" / "products.json")
events = load(ROOT / "data" / "events.json")
evidence = load(ROOT / "data" / "evidence.json")

entity_id = entities[0]["id"]
product_id = next(row["id"] for row in products if row["entity_id"] == entity_id)
new_event_id = unused_id("wlr_ev_", events)
new_evidence_id = unused_id("wlr_src_", evidence)

valid_event = {
    "id": new_event_id,
    "entity_id": entity_id,
    "product_id": product_id,
    "affected_product_ids": [product_id],
    "event_type": "other",
    "event_date": "2026",
    "event_date_basis": "approximate",
    "title": "Policy self-test event",
    "description": "Synthetic event used only by the validator self-test.",
    "confidence": "high",
}
valid_evidence = {
    "id": new_evidence_id,
    "entity_id": entity_id,
    "product_id": product_id,
    "event_id": new_event_id,
    "source_type": "official_statement",
    "title": "Policy self-test evidence",
    "url": "https://example.invalid/wlr-policy-self-test",
    "publisher": "Self-test",
    "published_at": "2026",
    "reliability": "high",
    "claim_scope": "event",
    "is_primary": True,
}

run_case(
    "valid-event",
    bundle("wlr_cand_policy-valid-event", {"events": [valid_event], "evidence": [valid_evidence]}),
    True,
)

missing_basis = copy.deepcopy(valid_event)
missing_basis.pop("event_date_basis")
run_case(
    "missing-event-date-basis",
    bundle("wlr_cand_policy-missing-basis", {"events": [missing_basis], "evidence": [valid_evidence]}),
    False,
)

weak_evidence = copy.deepcopy(valid_evidence)
weak_evidence["reliability"] = "medium"
run_case(
    "weak-event-evidence",
    bundle("wlr_cand_policy-weak-evidence", {"events": [valid_event], "evidence": [weak_evidence]}),
    False,
)

launch_precision_missing = {
    "id": unused_id("wlr_prod_", products),
    "entity_id": entity_id,
    "launch_date": "2025-06",
}
run_case(
    "missing-launch-precision",
    bundle("wlr_cand_policy-launch-precision", {"products": [launch_precision_missing]}),
    False,
)

self_lineage = {
    "id": unused_id("wlr_prod_", products, 1),
    "entity_id": entity_id,
}
self_lineage["successor_product_id"] = self_lineage["id"]
run_case(
    "self-lineage",
    bundle("wlr_cand_policy-self-lineage", {"products": [self_lineage]}),
    False,
)

cycle_a = {"id": unused_id("wlr_prod_", products, 2), "entity_id": entity_id}
cycle_b = {"id": unused_id("wlr_prod_", products, 3), "entity_id": entity_id}
cycle_a["successor_product_id"] = cycle_b["id"]
cycle_b["successor_product_id"] = cycle_a["id"]
run_case(
    "lineage-cycle",
    bundle("wlr_cand_policy-lineage-cycle", {"products": [cycle_a, cycle_b]}),
    False,
)

print(
    "PASS identity/evidence policy self-tests: valid event accepted; "
    "missing date basis, weak evidence, missing launch precision, self-reference, and lineage cycle rejected"
)
