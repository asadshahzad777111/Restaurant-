#!/usr/bin/env python3
"""Estimate whether configured MoA roles fit unified memory without OOM."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from moa.config import load_models_config  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--budget-gb", type=float, default=128.0)
    parser.add_argument(
        "--concurrent",
        default="coder,vision",
        help="Comma-separated roles assumed loaded together",
    )
    args = parser.parse_args()
    cfg = load_models_config()
    roles = cfg["roles"]
    reserve = (
        float(cfg.get("system_reserve_gb", 12))
        + float(cfg.get("browser_reserve_gb", 8))
        + float(cfg.get("n8n_reserve_gb", 2))
    )
    names = [n.strip() for n in args.concurrent.split(",") if n.strip()]
    heavies = [n for n in names if roles[n].get("heavy")]
    used = reserve
    rows = []
    for n in names:
        gb = float(roles[n].get("approx_gb_q4", 0))
        used += gb
        rows.append((n, gb, roles[n].get("heavy")))

    print(f"Budget: {args.budget_gb:.0f} GB unified")
    print(f"Reserves (OS+browser+n8n): {reserve:.0f} GB")
    for n, gb, heavy in rows:
        tag = "heavy" if heavy else "light"
        print(f"  + {n:10} {gb:5.1f} GB ({tag})")
    print(f"Total estimate: {used:.1f} GB")
    if len(heavies) > 1:
        print("WARN: more than one heavy role concurrent — swap instead.")
        return 2
    if used > args.budget_gb:
        print("FAIL: likely OOM / thrashing — reduce concurrent set.")
        return 1
    print("OK: fits budget under sequential MoA rules.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
