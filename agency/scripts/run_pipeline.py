#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from moa.pipeline import run_pipeline  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Run ORDO Local MoA agency pipeline")
    parser.add_argument("--lead", type=Path, required=True, help="Path to lead JSON/CSV")
    group = parser.add_mutually_exclusive_group()
    group.add_argument(
        "--dry-run",
        action="store_true",
        help="Mock LLM calls (default when MOA_DRY_RUN unset)",
    )
    group.add_argument(
        "--live",
        action="store_true",
        help="Call real Ollama/MLX endpoints",
    )
    args = parser.parse_args()

    if args.live:
        dry_run = False
    elif args.dry_run:
        dry_run = True
    else:
        dry_run = None  # honor MOA_DRY_RUN / pipeline.yaml

    result = run_pipeline(args.lead, dry_run=dry_run)
    print(
        json.dumps(
            {
                "slug": result.slug,
                "site_dir": result.site_dir,
                "vision_loops": result.vision_loops,
                "dry_run": result.dry_run,
                "steps": result.steps,
                "final_review": result.final_review,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
