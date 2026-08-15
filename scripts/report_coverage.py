#!/usr/bin/env python3
import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

SECURITY_EVENT_TYPES = {
    "vulnerability_disclosed",
    "security_research_published",
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
    "security_fix",
    "firmware_fix",
    "software_fix",
    "key_migration_recommended",
    "recall",
}


def load(name):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def evidence_entity_ids(row):
    return [row.get("entity_id")] if row.get("entity_id") else []


def build_report():
    entities = load("entities.json")
    products = load("products.json")
    events = load("events.json")
    evidence = load("evidence.json")

    products_by_entity = defaultdict(list)
    events_by_entity = defaultdict(list)
    evidence_by_entity = defaultdict(list)

    for row in products:
        products_by_entity[row["entity_id"]].append(row)
    for row in events:
        events_by_entity[row["entity_id"]].append(row)
    for row in evidence:
        for entity_id in evidence_entity_ids(row):
            evidence_by_entity[entity_id].append(row)

    rows = []
    structural_errors = []
    thin_entities = []

    for entity in sorted(entities, key=lambda x: x["id"]):
        entity_id = entity["id"]
        entity_products = products_by_entity[entity_id]
        entity_events = events_by_entity[entity_id]
        entity_evidence = evidence_by_entity[entity_id]

        product_launch_known = sum(1 for p in entity_products if p.get("launch_date"))
        product_support_known = sum(
            1 for p in entity_products if p.get("support_status") not in (None, "unknown")
        )
        major_events = sum(1 for e in entity_events if e.get("is_major_event") is True)
        security_events = sum(1 for e in entity_events if e.get("event_type") in SECURITY_EVENT_TYPES)
        primary_evidence = sum(1 for e in entity_evidence if e.get("is_primary") is True)
        source_types = Counter(e.get("source_type", "unknown") for e in entity_evidence)

        flags = []
        if not entity_products:
            flags.append("no_products")
            structural_errors.append(f"{entity_id} has no products")
        if not entity_evidence:
            flags.append("no_evidence")
            structural_errors.append(f"{entity_id} has no evidence")
        if len(entity_events) == 0:
            flags.append("no_history_events")
        elif len(entity_events) < 2:
            flags.append("thin_history")
        if len(entity_evidence) < 2:
            flags.append("thin_evidence")
        if entity_products and product_launch_known < len(entity_products):
            flags.append("product_launch_gaps")
        if entity_products and product_support_known < len(entity_products):
            flags.append("product_support_unknown")

        if any(flag in flags for flag in ("no_history_events", "thin_history", "thin_evidence")):
            thin_entities.append(entity_id)

        rows.append(
            {
                "entity_id": entity_id,
                "slug": entity["slug"],
                "name": entity["canonical_name"],
                "wallet_type": entity["wallet_type"],
                "status": entity["status"],
                "products": len(entity_products),
                "products_with_launch_date": product_launch_known,
                "products_with_known_support": product_support_known,
                "events": len(entity_events),
                "major_events": major_events,
                "security_events": security_events,
                "evidence": len(entity_evidence),
                "primary_evidence": primary_evidence,
                "source_types": dict(sorted(source_types.items())),
                "flags": flags,
            }
        )

    summary = {
        "entities": len(entities),
        "products": len(products),
        "events": len(events),
        "evidence": len(evidence),
        "entities_with_zero_products": sum(1 for r in rows if r["products"] == 0),
        "entities_with_zero_events": sum(1 for r in rows if r["events"] == 0),
        "entities_with_one_event": sum(1 for r in rows if r["events"] == 1),
        "entities_with_less_than_two_evidence": sum(1 for r in rows if r["evidence"] < 2),
        "products_missing_launch_date": sum(1 for p in products if not p.get("launch_date")),
        "products_with_unknown_support": sum(
            1 for p in products if p.get("support_status") in (None, "unknown")
        ),
        "security_events": sum(1 for e in events if e.get("event_type") in SECURITY_EVENT_TYPES),
        "major_events": sum(1 for e in events if e.get("is_major_event") is True),
    }

    return {
        "scope": "canonical_only",
        "interpretation": "Coverage metrics are completeness indicators, not wallet safety or quality scores.",
        "summary": summary,
        "entities": rows,
        "structural_errors": structural_errors,
        "thin_entity_ids": thin_entities,
    }


def print_text(report):
    summary = report["summary"]
    print(
        "COVERAGE "
        f"entities={summary['entities']} products={summary['products']} "
        f"events={summary['events']} evidence={summary['evidence']} "
        f"security_events={summary['security_events']} major_events={summary['major_events']}"
    )
    print(
        "GAPS "
        f"zero_products={summary['entities_with_zero_products']} "
        f"zero_events={summary['entities_with_zero_events']} "
        f"one_event={summary['entities_with_one_event']} "
        f"lt2_evidence={summary['entities_with_less_than_two_evidence']} "
        f"product_launch_missing={summary['products_missing_launch_date']} "
        f"product_support_unknown={summary['products_with_unknown_support']}"
    )
    print("ENTITY\tPRODUCTS\tEVENTS\tSECURITY\tEVIDENCE\tLAUNCH\tSUPPORT\tFLAGS")
    for row in report["entities"]:
        print(
            f"{row['slug']}\t{row['products']}\t{row['events']}\t{row['security_events']}\t"
            f"{row['evidence']}\t{row['products_with_launch_date']}/{row['products']}\t"
            f"{row['products_with_known_support']}/{row['products']}\t"
            f"{','.join(row['flags']) or '-'}"
        )
    if report["structural_errors"]:
        print("STRUCTURAL_ERRORS")
        for error in report["structural_errors"]:
            print(f"- {error}")
    print("THIN_ENTITY_IDS " + (" ".join(report["thin_entity_ids"]) or "none"))


def main():
    parser = argparse.ArgumentParser(
        description="Report deterministic WLR canonical coverage without creating wallet rankings."
    )
    parser.add_argument("--json", action="store_true", help="emit JSON instead of the text report")
    parser.add_argument(
        "--fail-on-structural",
        action="store_true",
        help="exit non-zero only when an entity has zero products or zero evidence",
    )
    args = parser.parse_args()

    report = build_report()
    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        print_text(report)

    if args.fail_on_structural and report["structural_errors"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
