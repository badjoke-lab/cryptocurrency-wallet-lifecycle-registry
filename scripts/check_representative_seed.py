#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
POLICY_PATH = ROOT / "config" / "structured-discovery.json"

RELEASE_TYPES = {"launched", "product_released"}


def load(name):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def load_policy():
    return json.loads(POLICY_PATH.read_text(encoding="utf-8"))


def sample_ids(rows, limit=5):
    return [row["id"] for row in rows[:limit]]


def main():
    products = load("products.json")
    events = load("events.json")
    policy = load_policy()
    incident_types = set(policy["incident_event_types"])
    remediation_types = set(policy["remediation_event_types"])
    eol_event_types = set(policy["eol_event_types"])
    eol_product_states = set(policy["eol_product_statuses"])

    release = [row for row in events if row.get("event_type") in RELEASE_TYPES]
    incident = [row for row in events if row.get("event_type") in incident_types]
    patch_or_fixed_version_shape = [
        row
        for row in events
        if row.get("event_type") in remediation_types or bool(row.get("fixed_versions"))
    ]
    replacement = [
        row
        for row in products
        if row.get("predecessor_product_id") or row.get("successor_product_id")
    ]
    eol_events = [row for row in events if row.get("event_type") in eol_event_types]
    eol_products = [row for row in products if row.get("status") in eol_product_states]

    classes = {
        "release": release,
        "incident": incident,
        "patch_or_fixed_version_shape": patch_or_fixed_version_shape,
        "replacement_lineage": replacement,
        "eol_or_deprecation": eol_events or eol_products,
    }

    errors = []
    for name, rows in classes.items():
        if not rows:
            errors.append(f"representative lifecycle class missing: {name}")

    print("REPRESENTATIVE_LIFECYCLE_SEED")
    print("taxonomy_source=config/structured-discovery.json")
    print(f"release count={len(release)} sample={','.join(sample_ids(release))}")
    print(f"incident count={len(incident)} sample={','.join(sample_ids(incident))}")
    print(
        "patch_or_fixed_version_shape "
        f"count={len(patch_or_fixed_version_shape)} "
        f"sample={','.join(sample_ids(patch_or_fixed_version_shape))}"
    )
    print(f"replacement_lineage count={len(replacement)} sample={','.join(sample_ids(replacement))}")
    print(
        "eol_or_deprecation "
        f"events={len(eol_events)} products={len(eol_products)} "
        f"event_sample={','.join(sample_ids(eol_events))} "
        f"product_sample={','.join(sample_ids(eol_products))}"
    )
    print(
        "NOTE representative coverage is a seed-shape gate, not a wallet safety/quality score "
        "and not an incident-to-remediation response pairing"
    )

    if errors:
        print("FAIL")
        for error in errors:
            print(error)
        raise SystemExit(1)

    print(
        "PASS representative lifecycle seed covers release, incident, patch/fixed-version shape, "
        "replacement, and EOL/deprecation"
    )


if __name__ == "__main__":
    main()
