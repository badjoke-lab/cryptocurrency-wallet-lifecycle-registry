#!/usr/bin/env python3
import argparse
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CANDIDATE_DIR = ROOT / "data-staging" / "candidates"
KINDS = ("entities", "products", "events", "evidence")
REVIEW_STATES = {"discovered", "researching", "review_ready"}

CANONICAL_PATHS = {
    "entities": ROOT / "data" / "entities.json",
    "products": ROOT / "data" / "products.json",
    "events": ROOT / "data" / "events.json",
    "evidence": ROOT / "data" / "evidence.json",
}
SCHEMA_PATHS = {
    "entities": ROOT / "schemas" / "entity.schema.json",
    "products": ROOT / "schemas" / "product.schema.json",
    "events": ROOT / "schemas" / "event.schema.json",
    "evidence": ROOT / "schemas" / "evidence.schema.json",
}


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def normalize_identity(value):
    if not value:
        return ""
    return re.sub(r"[^a-z0-9]+", "", str(value).lower())


def normalize_domain(value):
    if not value:
        return ""
    raw = str(value).strip().lower()
    parsed = urlparse(raw if "://" in raw else f"//{raw}")
    host = parsed.hostname or parsed.path.split("/")[0]
    host = host.strip(".").lower()
    return host[4:] if host.startswith("www.") else host


def entity_domains(row):
    values = {normalize_domain(row.get("official_domain")), normalize_domain(row.get("official_url"))}
    return {value for value in values if value}


def evidence_event_ids(row):
    values = list(row.get("event_ids", []))
    if row.get("event_id"):
        values.append(row["event_id"])
    return values


def evidence_product_ids(row):
    values = list(row.get("product_ids", []))
    if row.get("product_id"):
        values.append(row["product_id"])
    return values


def collect_version_product_ids(event):
    values = []
    for group in list(event.get("affected_version_rules", [])) + list(event.get("fixed_versions", [])):
        values.extend(group.get("product_ids", []))
    return values


def fail_if_duplicate(values, label, errors):
    seen = set()
    for value in values:
        if value in seen:
            errors.append(f"duplicate {label}: {value}")
        seen.add(value)


def validate_bundle_shape(path, bundle, errors):
    label = path.name
    if not isinstance(bundle, dict):
        errors.append(f"{label}: bundle must be an object")
        return False
    if bundle.get("bundle_version") != "1.0.0":
        errors.append(f"{label}: bundle_version must be 1.0.0")
    candidate_id = bundle.get("candidate_id")
    if not isinstance(candidate_id, str) or not re.fullmatch(r"wlr_cand_[a-z0-9]+(?:-[a-z0-9]+)*", candidate_id):
        errors.append(f"{label}: invalid candidate_id")
    if not isinstance(bundle.get("title"), str) or not bundle.get("title", "").strip():
        errors.append(f"{label}: title is required")
    if bundle.get("review_state") not in REVIEW_STATES:
        errors.append(f"{label}: review_state must be one of {sorted(REVIEW_STATES)}")
    records = bundle.get("records")
    if not isinstance(records, dict):
        errors.append(f"{label}: records must be an object")
        return False
    for kind in KINDS:
        if kind not in records or not isinstance(records[kind], list):
            errors.append(f"{label}: records.{kind} must be an array")
    if all(isinstance(records.get(kind), list) and len(records[kind]) == 0 for kind in KINDS):
        errors.append(f"{label}: candidate bundle contains no records")
    return True


def validate(candidate_dir: Path):
    errors = []
    warnings = []

    canonical = {kind: load_json(path) for kind, path in CANONICAL_PATHS.items()}
    schemas = {kind: load_json(path) for kind, path in SCHEMA_PATHS.items()}
    validators = {
        kind: Draft202012Validator(schema, format_checker=FormatChecker())
        for kind, schema in schemas.items()
    }

    candidate_paths = sorted(candidate_dir.glob("*.json")) if candidate_dir.exists() else []
    if not candidate_paths:
        print("PASS candidate_bundles=0 proposed entities=0 products=0 events=0 evidence=0")
        return True

    candidate = {kind: [] for kind in KINDS}
    candidate_ids = []

    for path in candidate_paths:
        try:
            bundle = load_json(path)
        except Exception as exc:
            errors.append(f"{path.name}: invalid JSON: {exc}")
            continue
        if not validate_bundle_shape(path, bundle, errors):
            continue
        candidate_ids.append(bundle.get("candidate_id"))
        records = bundle["records"]
        for kind in KINDS:
            if not isinstance(records.get(kind), list):
                continue
            for index, row in enumerate(records[kind]):
                if not isinstance(row, dict):
                    errors.append(f"{path.name}: {kind}[{index}] must be an object")
                    continue
                for error in sorted(validators[kind].iter_errors(row), key=lambda item: list(item.path)):
                    errors.append(f"{path.name}: {kind}[{index}] {list(error.path)}: {error.message}")
                candidate[kind].append(row)

    fail_if_duplicate([value for value in candidate_ids if value], "candidate_id", errors)

    for kind in KINDS:
        canonical_ids = {row["id"] for row in canonical[kind]}
        proposed_ids = [row.get("id") for row in candidate[kind] if row.get("id")]
        fail_if_duplicate(proposed_ids, f"candidate {kind} id", errors)
        for record_id in proposed_ids:
            if record_id in canonical_ids:
                errors.append(f"candidate {kind} id already canonical: {record_id}")

    for kind in ("entities", "products"):
        canonical_slugs = {row["slug"] for row in canonical[kind]}
        proposed_slugs = [row.get("slug") for row in candidate[kind] if row.get("slug")]
        fail_if_duplicate(proposed_slugs, f"candidate {kind} slug", errors)
        for slug in proposed_slugs:
            if slug in canonical_slugs:
                errors.append(f"candidate {kind} slug already canonical: {slug}")

    canonical_identity = {}
    for row in canonical["entities"]:
        for value in [row.get("canonical_name"), *row.get("aliases", [])]:
            normalized = normalize_identity(value)
            if normalized:
                canonical_identity.setdefault(normalized, set()).add(row["id"])

    candidate_identity = {}
    for row in candidate["entities"]:
        if not row.get("id"):
            continue
        for value in [row.get("canonical_name"), *row.get("aliases", [])]:
            normalized = normalize_identity(value)
            if not normalized:
                continue
            if normalized in canonical_identity:
                owners = ", ".join(sorted(canonical_identity[normalized]))
                errors.append(f"candidate entity identity collides with canonical: {row['id']} value={value!r} owners={owners}")
            owner = candidate_identity.get(normalized)
            if owner and owner != row["id"]:
                errors.append(f"candidate entity identity collision: {row['id']} value={value!r} owner={owner}")
            candidate_identity[normalized] = row["id"]

    canonical_domains = {}
    for row in canonical["entities"]:
        for domain in entity_domains(row):
            canonical_domains.setdefault(domain, set()).add(row["id"])
    candidate_domains = {}
    for row in candidate["entities"]:
        if not row.get("id"):
            continue
        for domain in entity_domains(row):
            if domain in canonical_domains:
                owners = ", ".join(sorted(canonical_domains[domain]))
                errors.append(f"candidate entity official domain collides with canonical: {row['id']} domain={domain} owners={owners}")
            owner = candidate_domains.get(domain)
            if owner and owner != row["id"]:
                errors.append(f"candidate entity official domain collision: {row['id']} domain={domain} owner={owner}")
            candidate_domains[domain] = row["id"]

    canonical_developers = {}
    for row in canonical["entities"]:
        normalized = normalize_identity(row.get("developer_or_company"))
        if normalized:
            canonical_developers.setdefault(normalized, set()).add(row["id"])
    for row in candidate["entities"]:
        normalized = normalize_identity(row.get("developer_or_company"))
        if normalized and normalized in canonical_developers:
            owners = ", ".join(sorted(canonical_developers[normalized]))
            warnings.append(f"candidate entity shares developer/company with canonical: {row.get('id')} owners={owners}")

    canonical_evidence_urls = {row.get("url") for row in canonical["evidence"] if row.get("url")}
    for row in candidate["evidence"]:
        if row.get("url") in canonical_evidence_urls:
            warnings.append(f"candidate evidence URL already exists in canonical: {row.get('id')} {row.get('url')}")

    merged_entities = {row["id"]: row for row in canonical["entities"] if row.get("id")}
    merged_entities.update({row["id"]: row for row in candidate["entities"] if row.get("id")})
    merged_products = {row["id"]: row for row in canonical["products"] if row.get("id")}
    merged_products.update({row["id"]: row for row in candidate["products"] if row.get("id")})
    merged_events = {row["id"]: row for row in canonical["events"] if row.get("id")}
    merged_events.update({row["id"]: row for row in candidate["events"] if row.get("id")})

    for row in candidate["entities"]:
        for key in ("parent_entity_id", "predecessor_entity_id", "successor_entity_id", "acquired_by_entity_id"):
            target = row.get(key)
            if target and target not in merged_entities:
                errors.append(f"bad candidate entity {key}: {row.get('id')} -> {target}")

    for row in candidate["products"]:
        entity_id = row.get("entity_id")
        if entity_id not in merged_entities:
            errors.append(f"bad candidate product entity ref: {row.get('id')} -> {entity_id}")
        for key in ("predecessor_product_id", "successor_product_id"):
            target = row.get(key)
            if not target:
                continue
            if target not in merged_products:
                errors.append(f"bad candidate {key}: {row.get('id')} -> {target}")
            elif merged_products[target].get("entity_id") != entity_id:
                errors.append(f"cross-entity candidate {key}: {row.get('id')} -> {target}")

    for row in candidate["events"]:
        event_id = row.get("id")
        entity_id = row.get("entity_id")
        if entity_id not in merged_entities:
            errors.append(f"bad candidate event entity ref: {event_id} -> {entity_id}")
        product_ids = []
        if row.get("product_id"):
            product_ids.append(row["product_id"])
        product_ids.extend(row.get("affected_product_ids", []))
        product_ids.extend(collect_version_product_ids(row))
        for product_id in product_ids:
            if product_id not in merged_products:
                errors.append(f"bad candidate event product ref: {event_id} -> {product_id}")
            elif merged_products[product_id].get("entity_id") != entity_id:
                errors.append(f"candidate event product/entity mismatch: {event_id} -> {product_id}")

    all_evidence = list(canonical["evidence"]) + list(candidate["evidence"])
    for row in candidate["evidence"]:
        evidence_id = row.get("id")
        entity_id = row.get("entity_id")
        if entity_id not in merged_entities:
            errors.append(f"bad candidate evidence entity ref: {evidence_id} -> {entity_id}")
        for product_id in evidence_product_ids(row):
            if product_id not in merged_products:
                errors.append(f"bad candidate evidence product ref: {evidence_id} -> {product_id}")
            elif merged_products[product_id].get("entity_id") != entity_id:
                errors.append(f"candidate evidence product/entity mismatch: {evidence_id} -> {product_id}")
        for event_id in evidence_event_ids(row):
            if event_id not in merged_events:
                errors.append(f"bad candidate evidence event ref: {evidence_id} -> {event_id}")
            elif merged_events[event_id].get("entity_id") != entity_id:
                errors.append(f"candidate evidence event/entity mismatch: {evidence_id} -> {event_id}")

    covered_events = set()
    for row in all_evidence:
        covered_events.update(evidence_event_ids(row))
    for row in candidate["events"]:
        if row.get("id") and row["id"] not in covered_events:
            errors.append(f"candidate event has no evidence: {row['id']}")

    for warning in warnings:
        print(f"WARN {warning}")

    if errors:
        print("FAIL")
        for error in errors:
            print(error)
        return False

    print(
        "PASS "
        f"candidate_bundles={len(candidate_paths)} "
        f"proposed entities={len(candidate['entities'])} "
        f"products={len(candidate['products'])} "
        f"events={len(candidate['events'])} "
        f"evidence={len(candidate['evidence'])}"
    )
    print(
        "PROJECTED canonical "
        f"entities={len(canonical['entities']) + len(candidate['entities'])} "
        f"products={len(canonical['products']) + len(candidate['products'])} "
        f"events={len(canonical['events']) + len(candidate['events'])} "
        f"evidence={len(canonical['evidence']) + len(candidate['evidence'])}"
    )
    return True


def main():
    parser = argparse.ArgumentParser(description="Validate non-public WLR candidate bundles without mutating canonical data.")
    parser.add_argument("--candidate-dir", type=Path, default=DEFAULT_CANDIDATE_DIR)
    args = parser.parse_args()
    candidate_dir = args.candidate_dir if args.candidate_dir.is_absolute() else ROOT / args.candidate_dir
    raise SystemExit(0 if validate(candidate_dir) else 1)


if __name__ == "__main__":
    main()
