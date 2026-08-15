#!/usr/bin/env python3
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CANONICAL = {
    "entities": ROOT / "data" / "entities.json",
    "products": ROOT / "data" / "products.json",
    "events": ROOT / "data" / "events.json",
    "evidence": ROOT / "data" / "evidence.json",
}


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description="Render a non-mutating canonical promotion preview for one reviewed WLR candidate bundle.")
    parser.add_argument("--candidate", required=True, help="Path to one candidate bundle JSON file")
    parser.add_argument("--output-dir", required=True, help="Directory that receives promoted canonical JSON previews")
    args = parser.parse_args()

    candidate_path = (ROOT / args.candidate).resolve()
    output_dir = (ROOT / args.output_dir).resolve()
    bundle = load(candidate_path)
    records = bundle.get("records", {})

    expected = set(CANONICAL)
    unexpected = set(records) - expected
    if unexpected:
        raise SystemExit(f"unexpected record groups: {sorted(unexpected)}")

    counts = {}
    for group, canonical_path in CANONICAL.items():
        canonical = load(canonical_path)
        additions = records.get(group, [])
        if not isinstance(additions, list):
            raise SystemExit(f"candidate records.{group} must be an array")
        promoted = canonical + additions
        dump(output_dir / canonical_path.name, promoted)
        counts[group] = (len(canonical), len(additions), len(promoted))

    manifest = {
        "candidate_id": bundle.get("candidate_id"),
        "source_candidate": str(candidate_path.relative_to(ROOT)),
        "counts": {
            group: {"before": before, "added": added, "after": after}
            for group, (before, added, after) in counts.items()
        },
        "mutation": "none",
        "note": "Preview only. Canonical data files were not modified by this script.",
    }
    dump(output_dir / "promotion-manifest.json", manifest)

    for group, (before, added, after) in counts.items():
        print(f"{group}: {before} + {added} = {after}")


if __name__ == "__main__":
    main()
