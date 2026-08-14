#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
errors = []

if (ROOT / "public" / "data-staging").exists():
    errors.append("public/data-staging must not exist")

for relative in ("scripts/sync-public-data.mjs", "scripts/build-machine-layer.mjs"):
    path = ROOT / relative
    text = path.read_text(encoding="utf-8")
    if "data-staging" in text:
        errors.append(f"public build script references data-staging: {relative}")

for path in (ROOT / "src").rglob("*"):
    if path.is_file() and path.suffix in {".ts", ".tsx", ".js", ".jsx", ".mjs"}:
        if "data-staging" in path.read_text(encoding="utf-8"):
            errors.append(f"public application source references data-staging: {path.relative_to(ROOT)}")

if errors:
    print("FAIL")
    print("\n".join(errors))
    raise SystemExit(1)

print("PASS staging boundary: candidate data is not referenced by public application/build paths")
