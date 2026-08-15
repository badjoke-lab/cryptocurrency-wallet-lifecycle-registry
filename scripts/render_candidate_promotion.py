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


def append_records_preserving_existing_bytes(raw: str, additions: list[dict]) -> str:
    if not additions:
        return raw if raw.endswith("\n") else raw + "\n"

    stripped = raw.rstrip()
    if not stripped.endswith("]"):
        raise ValueError("canonical JSON must be a top-level array")

    prefix = stripped[:-1].rstrip()
    rendered_additions = [
        json.dumps(record, ensure_ascii=False, separators=(",", ":"))
        for record in additions
    ]

    if "\n" in prefix:
        separator = "" if prefix.endswith("[") else ","
        rendered = prefix + separator + "\n  " + ",\n  ".join(rendered_additions) + "\n]\n"
    else:
        separator = "" if prefix.endswith("[") else ","
        rendered = prefix + separator + ",".join(rendered_additions) + "]\n"

    json.loads(rendered)
    return rendered


def dump_json(path: Path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description="Render a non-mutating canonical promotion preview for one reviewed WLR candidate bundle.")
    parser.add_argument("--candidate", required=True, help="Path to one candidate bundle JSON file")
    parser.add_argument("--output-dir", required=True, help="Directory that receives promoted canonical JSON previews")
    args = parser.parse_args()

    candidate_path = Path(args.candidate)
    if not candidate_path.is_absolute():
        candidate_path = (ROOT / candidate_path).resolve()
    output_dir = Path(args.output_dir)
    if not output_dir.is_absolute():
        output_dir = (ROOT / output_dir).resolve()

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

        raw = canonical_path.read_text(encoding="utf-8")
        promoted_text = append_records_preserving_existing_bytes(raw, additions)
        promoted = json.loads(promoted_text)
        if promoted != canonical + additions:
            raise SystemExit(f"render mismatch for {group}")

        output_path = output_dir / canonical_path.name
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(promoted_text, encoding="utf-8")
        counts[group] = (len(canonical), len(additions), len(promoted))

    manifest = {
        "candidate_id": bundle.get("candidate_id"),
        "source_candidate": str(candidate_path),
        "counts": {
            group: {"before": before, "added": added, "after": after}
            for group, (before, added, after) in counts.items()
        },
        "mutation": "none",
        "formatting": "existing canonical bytes preserved; only appended candidate records and final array terminator change",
        "note": "Preview only. Canonical data files were not modified by this script.",
    }
    dump_json(output_dir / "promotion-manifest.json", manifest)

    for group, (before, added, after) in counts.items():
        print(f"{group}: {before} + {added} = {after}")


if __name__ == "__main__":
    main()
