#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRODUCTS = ROOT / "data" / "products.json"
EVENTS = ROOT / "data" / "events.json"
EVIDENCE = ROOT / "data" / "evidence.json"

products = json.loads(PRODUCTS.read_text())
events = json.loads(EVENTS.read_text())
evidence = json.loads(EVIDENCE.read_text())

assert events[-1]["id"] == "wlr_ev_000147", events[-1]["id"]
assert evidence[-1]["id"] == "wlr_src_000374", evidence[-1]["id"]
assert not any(r["id"] in {"wlr_ev_000148","wlr_ev_000149","wlr_ev_000150"} for r in events)
assert not any(r["id"] in {"wlr_src_000375","wlr_src_000376","wlr_src_000377"} for r in evidence)

p = next(r for r in products if r["id"] == "wlr_prod_000079")
assert p.get("launch_date") is None, p.get("launch_date")
p["launch_date"] = "2018-02-13"
p["launch_date_precision"] = "day"
p["last_verified_at"] = "2026-08-23"

events.extend([
  {"id":"wlr_ev_000148","entity_id":"wlr_ent_000030","product_id":"wlr_prod_000079","affected_product_ids":["wlr_prod_000079"],"event_type":"product_released","event_date":"2018-02-13","event_date_basis":"release","title":"TokenPocket Wallet officially released","description":"TokenPocket's first-party announcement history records the formal release of TokenPocket Wallet on 2018-02-13.","confidence":"high","event_status_effect":"active","is_major_event":True,"notes":"The source provides an exact first-party formal release date. Canonical product wlr_prod_000079 is corrected from unresolved launch_date to 2018-02-13 with day precision in this promotion."},
  {"id":"wlr_ev_000149","entity_id":"wlr_ent_000033","product_id":"wlr_prod_000082","affected_product_ids":["wlr_prod_000082"],"event_type":"product_released","event_date":"2018-12-04","event_date_basis":"release","title":"Guarda Mobile Multiwallet released","description":"Guarda released its Mobile Multiwallet on 2018-12-04 as a universal multi-coin mobile wallet, extending the earlier Guarda wallet lineage into a concrete multi-currency mobile product milestone.","confidence":"high","event_status_effect":"none","is_major_event":True,"notes":"This is a later multi-currency mobile milestone, not the initial launch of the Guarda wallet lineage. Guarda's first-party history separately states that its first Ethereum wallet launched in 2017, so wlr_prod_000082 launch_date remains unresolved rather than being backdated or reset to this 2018 release."},
  {"id":"wlr_ev_000150","entity_id":"wlr_ent_000042","product_id":"wlr_prod_000091","affected_product_ids":["wlr_prod_000091"],"event_type":"product_released","event_date":"2018","event_date_basis":"release","title":"Cake Wallet launched as a Monero wallet for iOS","description":"Cake Wallet's first-party history states that the project started in 2018 as the first Monero wallet for iOS, establishing the selected product's public release lineage during that year.","confidence":"high","event_status_effect":"active","is_major_event":True,"notes":"Year precision only. The reviewed first-party history does not establish a defensible exact public-release month or day, so the existing 2018 launch_date and year precision remain unchanged."}
])

evidence.extend([
  {"id":"wlr_src_000375","entity_id":"wlr_ent_000030","product_id":"wlr_prod_000079","event_id":"wlr_ev_000148","source_type":"official_statement","title":"TokenPocket announcement center — TokenPocket Wallet officially released","url":"https://www.tokenpocket.pro/announcement/","publisher":"TokenPocket","published_at":"2018-02-13","accessed_at":"2026-08-23","reliability":"high","claim_scope":"launch_date","is_primary":True,"notes":"First-party TokenPocket announcement center lists the formal TokenPocket Wallet release on 2018-02-13. Used for the exact product-release event and canonical launch-date correction."},
  {"id":"wlr_src_000376","entity_id":"wlr_ent_000033","product_id":"wlr_prod_000082","event_id":"wlr_ev_000149","source_type":"official_blog","title":"Mobile Multiwallet release","url":"https://guarda.com/blog/mobile-multiwallet-release/","publisher":"Guarda","published_at":"2018-12-04","accessed_at":"2026-08-23","reliability":"high","claim_scope":"event","is_primary":True,"notes":"First-party Guarda release post introducing the universal multi-coin Mobile Multiwallet on 2018-12-04. This source is not used to replace the earlier 2017 single-currency Guarda lineage."},
  {"id":"wlr_src_000377","entity_id":"wlr_ent_000042","product_id":"wlr_prod_000091","event_id":"wlr_ev_000150","source_type":"official_statement","title":"About Us | Cake Wallet","url":"https://cakewallet.com/about/","publisher":"Cake Wallet","published_at":None,"accessed_at":"2026-08-23","reliability":"high","claim_scope":"launch_date","is_primary":True,"notes":"First-party Cake Wallet history states the project was founded in 2018 and started as the first Monero wallet for iOS. Used at year precision only."}
])

PRODUCTS.write_text(json.dumps(products, separators=(",", ":")) + "\n")
EVENTS.write_text(json.dumps(events, separators=(",", ":")) + "\n")
EVIDENCE.write_text(json.dumps(evidence, separators=(",", ":")) + "\n")
