import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def append_record(path: str, record: dict, id_key: str = "id") -> None:
    p = ROOT / path
    text = p.read_text()
    data = json.loads(text)
    rid = record[id_key]
    if any(item.get(id_key) == rid for item in data):
        return
    marker = "\n]"
    idx = text.rfind(marker)
    if idx < 0:
        raise RuntimeError(f"array terminator not found: {path}")
    prefix = text[:idx].rstrip()
    if not prefix.endswith("["):
        prefix += ","
    rendered = json.dumps(record, ensure_ascii=False, indent=2)
    p.write_text(prefix + "\n" + rendered + "\n]\n")


candidate_path = ROOT / "data-staging/candidates/thorwallet-2026-09-02.json"
candidate = candidate_path.read_text()
if '"review_state": "ready_for_review"' in candidate:
    candidate = candidate.replace('"review_state": "ready_for_review"', '"review_state": "review_ready"', 1)
candidate_path.write_text(candidate)

append_record("data/entities.json", {
    "id": "wlr_ent_000102",
    "slug": "thorwallet",
    "canonical_name": "THORWallet",
    "aliases": [],
    "wallet_type": "software",
    "status": "active",
    "summary": "Self-custody multichain cryptocurrency wallet from EMM Ventures AG with native cross-chain swaps, DeFi features, multisig support and integrated card spending capabilities.",
    "developer_or_company": "EMM Ventures AG",
    "country_or_origin": "Switzerland",
    "launch_date": "2021",
    "launch_date_precision": "year",
    "official_url": "https://www.thorwallet.org/",
    "official_domain": "thorwallet.org",
    "source_code_urls": [],
    "custody_model": "self_custody",
    "key_management_model": "user_controlled_self_custody_wallet_keys",
    "confidence": "high",
    "last_verified_at": "2026-09-02",
    "notes": "THORWallet's current first-party site states 'Since 2021' and repeatedly describes the wallet as self-custody/non-custodial."
})

append_record("data/products.json", {
    "id": "wlr_prod_000151",
    "entity_id": "wlr_ent_000102",
    "slug": "thorwallet-mobile",
    "product_name": "THORWallet Mobile",
    "product_type": "mobile_app",
    "status": "active",
    "sales_status": "not_applicable",
    "support_status": "supported",
    "launch_date": "2021",
    "launch_date_precision": "year",
    "platform": ["iOS", "Android"],
    "official_url": "https://www.thorwallet.org/",
    "source_code_url": None,
    "custody_model": "self_custody",
    "key_management_model": "user_controlled_self_custody_wallet_keys",
    "summary": "THORWallet self-custody multichain mobile wallet for swaps, DeFi, multisig and integrated spending features.",
    "confidence": "high",
    "last_verified_at": "2026-09-02",
    "notes": "The first-party homepage currently distributes THORWallet through the App Store and Google Play."
})

append_record("data/events.json", {
    "id": "wlr_ev_000224",
    "entity_id": "wlr_ent_000102",
    "product_id": "wlr_prod_000151",
    "affected_product_ids": ["wlr_prod_000151"],
    "event_type": "other",
    "event_date": "2026-08-31",
    "event_date_basis": "announcement",
    "title": "THORWallet Card launched",
    "description": "THORWallet announced that its card was live, adding Mastercard spending to the self-custody wallet experience. Current first-party material advertises Basic and Premium card tiers and describes the card offering as distinct from the existing Swiss IBAN card program.",
    "confidence": "high",
    "event_status_effect": "active",
    "is_major_event": True,
    "notes": "WLR records this as a wallet capability/lifecycle event. The payment-card program itself belongs in Crypto Card Lifecycle Registry. Country-count claims vary across current first-party surfaces, so this event does not canonicalize one exact global country count."
})

for rec in [
    {
        "id": "wlr_src_000493",
        "entity_id": "wlr_ent_000102",
        "product_id": "wlr_prod_000151",
        "event_id": None,
        "source_type": "official_statement",
        "title": "THORWallet — Self-Custody Multi-Chain Crypto Wallet, Swaps & DeFi",
        "url": "https://www.thorwallet.org/",
        "publisher": "THORWallet / EMM Ventures AG",
        "published_at": None,
        "accessed_at": "2026-09-02",
        "reliability": "high",
        "claim_scope": "product",
        "is_primary": True,
        "notes": "First-party homepage describes THORWallet as self-custody/non-custodial, says 'Since 2021', and links iOS and Android distribution."
    },
    {
        "id": "wlr_src_000494",
        "entity_id": "wlr_ent_000102",
        "product_id": "wlr_prod_000151",
        "event_id": "wlr_ev_000224",
        "source_type": "official_blog",
        "title": "Swap Anything, Spend Anywhere: The THORWallet Card Is Live",
        "url": "https://www.thorwallet.org/",
        "publisher": "THORWallet",
        "published_at": "2026-08-31",
        "accessed_at": "2026-09-02",
        "reliability": "high",
        "claim_scope": "event",
        "is_primary": True,
        "notes": "The current first-party homepage lists the dated 2026-08-31 card-live announcement and presents the live card tiers."
    },
    {
        "id": "wlr_src_000495",
        "entity_id": "wlr_ent_000102",
        "product_id": "wlr_prod_000151",
        "event_id": "wlr_ev_000224",
        "source_type": "official_statement",
        "title": "THORWallet Card Waitlist - Join Early Access",
        "url": "https://whitelist.thorwallet.org/",
        "publisher": "THORWallet",
        "published_at": None,
        "accessed_at": "2026-09-02",
        "reliability": "high",
        "claim_scope": "event",
        "is_primary": True,
        "notes": "First-party card page describes Basic/Premium as an offering additional to the existing Swiss IBAN card program and advertises broad international availability."
    }
]:
    append_record("data/evidence.json", rec)

for path in ["data/entities.json", "data/products.json", "data/events.json", "data/evidence.json", "data-staging/candidates/thorwallet-2026-09-02.json"]:
    json.loads((ROOT / path).read_text())

print("THORWallet canonical promotion prepared")
