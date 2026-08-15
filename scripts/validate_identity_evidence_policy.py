#!/usr/bin/env python3
import argparse
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CANDIDATE_DIR = ROOT / "data-staging" / "candidates"
KINDS = ("entities", "products", "events", "evidence")
CANONICAL_PATHS = {
    "entities": ROOT / "data" / "entities.json",
    "products": ROOT / "data" / "products.json",
    "events": ROOT / "data" / "events.json",
    "evidence": ROOT / "data" / "evidence.json",
}


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def evidence_event_ids(row):
    values = list(row.get("event_ids", []))
    if row.get("event_id"):
        values.append(row["event_id"])
    return values


def date_granularity(value):
    if not isinstance(value, str):
        return None
    if re.fullmatch(r"\d{4}", value):
        return "year"
    if re.fullmatch(r"\d{4}-\d{2}", value):
        return "month"
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        return "day"
    return None


def validate_launch_precision(kind, row, errors):
    value = row.get("launch_date")
    if not value:
        return
    precision = row.get("launch_date_precision")
    if not precision:
        errors.append(f"candidate {kind} launch_date requires launch_date_precision: {row.get('id')}")
        return
    granularity = date_granularity(value)
    if not granularity:
        return
    if precision != "approximate" and precision != granularity:
        errors.append(
            f"candidate {kind} launch_date precision mismatch: {row.get('id')} "
            f"date={value} precision={precision} expected={granularity} or approximate"
        )


def add_edge(graph, source, target):
    if source and target:
        graph[source].add(target)


def detect_cycles(graph, label, errors):
    visiting = set()
    visited = set()
    stack = []

    def visit(node):
        if node in visited:
            return
        if node in visiting:
            try:
                start = stack.index(node)
                cycle = stack[start:] + [node]
            except ValueError:
                cycle = [node, node]
            errors.append(f"{label} lineage cycle: {' -> '.join(cycle)}")
            return
        visiting.add(node)
        stack.append(node)
        for target in sorted(graph.get(node, ())):
            visit(target)
        stack.pop()
        visiting.remove(node)
        visited.add(node)

    for node in sorted(graph):
        visit(node)


def validate_lineage(merged_entities, merged_products, candidate, errors):
    for row in candidate["entities"]:
        record_id = row.get("id")
        for key in ("parent_entity_id", "predecessor_entity_id", "successor_entity_id", "acquired_by_entity_id"):
            if record_id and row.get(key) == record_id:
                errors.append(f"candidate entity self-reference: {record_id} {key}")

    entity_graph = defaultdict(set)
    for row in merged_entities.values():
        record_id = row.get("id")
        predecessor = row.get("predecessor_entity_id")
        successor = row.get("successor_entity_id")
        if predecessor in merged_entities:
            add_edge(entity_graph, predecessor, record_id)
        if successor in merged_entities:
            add_edge(entity_graph, record_id, successor)
    detect_cycles(entity_graph, "entity", errors)

    for row in candidate["entities"]:
        record_id = row.get("id")
        successor = row.get("successor_entity_id")
        if successor in merged_entities:
            reverse = merged_entities[successor].get("predecessor_entity_id")
            if reverse and reverse != record_id:
                errors.append(
                    f"candidate entity successor conflict: {record_id} -> {successor}; "
                    f"target predecessor={reverse}"
                )
        predecessor = row.get("predecessor_entity_id")
        if predecessor in merged_entities:
            forward = merged_entities[predecessor].get("successor_entity_id")
            if forward and forward != record_id:
                errors.append(
                    f"candidate entity predecessor conflict: {predecessor} -> {record_id}; "
                    f"source successor={forward}"
                )

    for row in candidate["products"]:
        record_id = row.get("id")
        for key in ("predecessor_product_id", "successor_product_id"):
            if record_id and row.get(key) == record_id:
                errors.append(f"candidate product self-reference: {record_id} {key}")

    product_graph = defaultdict(set)
    for row in merged_products.values():
        record_id = row.get("id")
        predecessor = row.get("predecessor_product_id")
        successor = row.get("successor_product_id")
        if predecessor in merged_products:
            add_edge(product_graph, predecessor, record_id)
        if successor in merged_products:
            add_edge(product_graph, record_id, successor)
    detect_cycles(product_graph, "product", errors)

    for row in candidate["products"]:
        record_id = row.get("id")
        successor = row.get("successor_product_id")
        if successor in merged_products:
            reverse = merged_products[successor].get("predecessor_product_id")
            if reverse and reverse != record_id:
                errors.append(
                    f"candidate product successor conflict: {record_id} -> {successor}; "
                    f"target predecessor={reverse}"
                )
        predecessor = row.get("predecessor_product_id")
        if predecessor in merged_products:
            forward = merged_products[predecessor].get("successor_product_id")
            if forward and forward != record_id:
                errors.append(
                    f"candidate product predecessor conflict: {predecessor} -> {record_id}; "
                    f"source successor={forward}"
                )


def validate(candidate_dir: Path):
    errors = []
    canonical = {kind: load_json(path) for kind, path in CANONICAL_PATHS.items()}
    candidate = {kind: [] for kind in KINDS}

    candidate_paths = sorted(candidate_dir.glob("*.json")) if candidate_dir.exists() else []
    if not candidate_paths:
        print("PASS identity/evidence policy candidate_bundles=0")
        return True

    for path in candidate_paths:
        try:
            bundle = load_json(path)
        except Exception as exc:
            errors.append(f"{path.name}: invalid JSON: {exc}")
            continue
        records = bundle.get("records", {}) if isinstance(bundle, dict) else {}
        for kind in KINDS:
            rows = records.get(kind, [])
            if isinstance(rows, list):
                candidate[kind].extend(row for row in rows if isinstance(row, dict))

    for row in candidate["entities"]:
        validate_launch_precision("entity", row, errors)
    for row in candidate["products"]:
        validate_launch_precision("product", row, errors)

    candidate_evidence_by_event = defaultdict(list)
    for row in candidate["evidence"]:
        for event_id in evidence_event_ids(row):
            candidate_evidence_by_event[event_id].append(row)

    for row in candidate["events"]:
        event_id = row.get("id")
        if not row.get("event_date_basis"):
            errors.append(f"candidate event requires event_date_basis: {event_id}")
        supporting = candidate_evidence_by_event.get(event_id, [])
        primary_high = [
            evidence
            for evidence in supporting
            if evidence.get("is_primary") is True and evidence.get("reliability") == "high"
        ]
        if not primary_high:
            errors.append(f"candidate event requires high-reliability primary candidate evidence: {event_id}")

    merged_entities = {row["id"]: row for row in canonical["entities"] if row.get("id")}
    merged_entities.update({row["id"]: row for row in candidate["entities"] if row.get("id")})
    merged_products = {row["id"]: row for row in canonical["products"] if row.get("id")}
    merged_products.update({row["id"]: row for row in candidate["products"] if row.get("id")})
    validate_lineage(merged_entities, merged_products, candidate, errors)

    if errors:
        print("FAIL identity/evidence policy")
        for error in errors:
            print(error)
        return False

    print(
        "PASS identity/evidence policy "
        f"candidate_bundles={len(candidate_paths)} "
        f"entities={len(candidate['entities'])} products={len(candidate['products'])} "
        f"events={len(candidate['events'])} evidence={len(candidate['evidence'])}"
    )
    return True


def main():
    parser = argparse.ArgumentParser(
        description="Enforce prospective WLR lifecycle identity and evidence requirements on candidate bundles."
    )
    parser.add_argument("--candidate-dir", type=Path, default=DEFAULT_CANDIDATE_DIR)
    args = parser.parse_args()
    candidate_dir = args.candidate_dir if args.candidate_dir.is_absolute() else ROOT / args.candidate_dir
    raise SystemExit(0 if validate(candidate_dir) else 1)


if __name__ == "__main__":
    main()
