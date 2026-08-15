#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

RELEASE_TYPES = {"launched", "product_released"}
INCIDENT_TYPES = {
    "vulnerability_disclosed",
    "exploit",
    "unauthorized_access",
    "supply_chain_compromise",
    "malicious_update",
    "seed_key_exposure",
    "private_key_exposure",
    "firmware_issue",
    "software_issue",
    "customer_data_breach",
    "third_party_data_breach",
    "phishing_campaign",
}
PATCH_TYPES = {"security_fix", "firmware_fix", "software_fix", "key_migration_recommended"}
EOL_EVENT_TYPES = {"deprecation_announced", "sales_discontinued", "discontinued", "service_shutdown"}
EOL_PRODUCT_STATES = {"deprecated", "discontinued", "dead"}


def load(name):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def sample_ids(rows, limit=5):
    return [row["id"] for row in rows[:limit]]


def main():
    products = load("products.json")
    events = load("events.json")

    release = [row for row in events if row.get("event_type") in RELEASE_TYPES]
    incident = [row for row in events if row.get("event_type") in INCIDENT_TYPES]
    patch = [
        row
        for row in events
        if row.get("event_type") in PATCH_TYPES or bool(row.get("fixed_versions"))
    ]
    replacement = [
        row
        for row in products
        if row.get("predecessor_product_id") or row.get("successor_product_id")
    ]
    eol_events = [row for row in events if row.get("event_type") in EOL_EVENT_TYPES]
    eol_products = [row for row in products if row.get("status") in EOL_PRODUCT_STATES]

    classes = {
        "release": release,
        "incident": incident,
        "patch_response": patch,
        "replacement_lineage": replacement,
        "eol_or_deprecation": eol_events or eol_products,
    }

    errors = []
    for name, rows in classes.items():
        if not rows:
            errors.append(f"representative lifecycle class missing: {name}")

    print("REPRESENTATIVE_LIFECYCLE_SEED")
    print(f"release count={len(release)} sample={','.join(sample_ids(release))}")
    print(f"incident count={len(incident)} sample={','.join(sample_ids(incident))}")
    print(f"patch_response count={len(patch)} sample={','.join(sample_ids(patch))}")
    print(f"replacement_lineage count={len(replacement)} sample={','.join(sample_ids(replacement))}")
    print(
        "eol_or_deprecation "
        f"events={len(eol_events)} products={len(eol_products)} "
        f"event_sample={','.join(sample_ids(eol_events))} "
        f"product_sample={','.join(sample_ids(eol_products))}"
    )
    print("NOTE representative coverage is a seed-shape gate, not a wallet safety or quality score")

    if errors:
        print("FAIL")
        for error in errors:
            print(error)
        raise SystemExit(1)

    print("PASS representative lifecycle seed covers release, incident, patch response, replacement, and EOL/deprecation")


if __name__ == "__main__":
    main()
