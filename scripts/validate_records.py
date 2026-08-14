#!/usr/bin/env python3
import json
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker
ROOT = Path(__file__).resolve().parents[1]
FILES = {
    "entities": (ROOT / "data" / "entities.json", ROOT / "schemas/entity.schema.json"),
    "products": (ROOT / "data" / "products.json", ROOT / "schemas/product.schema.json"),
    "events": (ROOT / "data" / "events.json", ROOT / "schemas/event.schema.json"),
    "evidence": (ROOT / "data" / "evidence.json", ROOT / "schemas/evidence.schema.json"),
}
def load(path): return json.loads(path.read_text())
errors=[]; data={}
for name,(data_path,schema_path) in FILES.items():
    rows=load(data_path); schema=load(schema_path); data[name]=rows
    validator=Draft202012Validator(schema, format_checker=FormatChecker())
    for i,row in enumerate(rows):
        for err in sorted(validator.iter_errors(row), key=lambda e:list(e.path)):
            errors.append(f"{name}[{i}] {list(err.path)}: {err.message}")
for name,rows in data.items():
    ids=[r["id"] for r in rows]
    if len(ids)!=len(set(ids)): errors.append(f"duplicate ids in {name}")
for name in ('entities','products'):
    slugs=[r['slug'] for r in data[name]]
    if len(slugs)!=len(set(slugs)): errors.append(f"duplicate slugs in {name}")
ents={r['id']:r for r in data['entities']}; prods={r['id']:r for r in data['products']}; evs={r['id']:r for r in data['events']}
for r in data['products']:
    if r['entity_id'] not in ents: errors.append(f"bad product entity ref: {r['id']}")
    for k in ('predecessor_product_id','successor_product_id'):
        if r.get(k):
            if r[k] not in prods: errors.append(f"bad {k}: {r['id']} -> {r[k]}")
            elif prods[r[k]]['entity_id'] != r['entity_id']: errors.append(f"cross-entity {k}: {r['id']} -> {r[k]}")
for r in data['events']:
    if r['entity_id'] not in ents: errors.append(f"bad event entity ref: {r['id']}")
    if r.get('product_id'):
        if r['product_id'] not in prods: errors.append(f"bad event product ref: {r['id']}")
        elif prods[r['product_id']]['entity_id'] != r['entity_id']: errors.append(f"event product/entity mismatch: {r['id']}")
    for pid in r.get('affected_product_ids',[]):
        if pid not in prods: errors.append(f"bad affected product ref: {r['id']} -> {pid}")
        elif prods[pid]['entity_id'] != r['entity_id']: errors.append(f"affected product/entity mismatch: {r['id']} -> {pid}")
    for group in r.get('affected_version_rules',[]) + r.get('fixed_versions',[]):
        for pid in group.get('product_ids',[]):
            if pid not in prods: errors.append(f"bad version-matrix product ref: {r['id']} -> {pid}")
            elif prods[pid]['entity_id'] != r['entity_id']: errors.append(f"version matrix entity mismatch: {r['id']} -> {pid}")
for r in data['evidence']:
    if r['entity_id'] not in ents: errors.append(f"bad evidence entity ref: {r['id']}")
    evidence_product_ids = list(r.get('product_ids', [])) + ([r['product_id']] if r.get('product_id') else [])
    evidence_event_ids = list(r.get('event_ids', [])) + ([r['event_id']] if r.get('event_id') else [])
    for pid in evidence_product_ids:
        if pid not in prods: errors.append(f"bad evidence product ref: {r['id']} -> {pid}")
        elif prods[pid]['entity_id'] != r['entity_id']: errors.append(f"evidence product/entity mismatch: {r['id']} -> {pid}")
    for eid in evidence_event_ids:
        if eid not in evs: errors.append(f"bad evidence event ref: {r['id']} -> {eid}")
        elif evs[eid]['entity_id'] != r['entity_id']: errors.append(f"evidence event/entity mismatch: {r['id']} -> {eid}")
covered_events=set()
for r in data['evidence']:
    if r.get('event_id'): covered_events.add(r['event_id'])
    covered_events.update(r.get('event_ids', []))
for eid in evs:
    if eid not in covered_events: errors.append(f"event has no evidence: {eid}")
if errors:
    print("FAIL"); print("\n".join(errors)); raise SystemExit(1)
print(f"PASS entities={len(data['entities'])} products={len(data['products'])} events={len(data['events'])} evidence={len(data['evidence'])}")
