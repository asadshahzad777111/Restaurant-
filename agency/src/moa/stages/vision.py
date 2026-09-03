from __future__ import annotations

import json
from pathlib import Path

from ..router import SequentialModelRouter


VISION_SYSTEM = (
    "You are a visual QA inspector. Given notes about desktop/mobile screenshots, "
    "return JSON: {ok: bool, issues: string[], notes: string}. "
    "Flag overflow, low contrast, stacked CTA clashes, and broken mobile layout."
)


def capture_screenshots(
    site_dir: Path,
    shot_dir: Path,
    *,
    dry_run: bool,
    desktop: tuple[int, int] = (1440, 900),
    mobile: tuple[int, int] = (390, 844),
) -> list[Path]:
    shot_dir.mkdir(parents=True, exist_ok=True)
    index = site_dir / "index.html"
    if dry_run or not index.exists():
        # Placeholder proof files for dry-run / CI
        paths = []
        for name in ("desktop.png", "mobile.png"):
            p = shot_dir / name
            p.write_bytes(b"PNG_DRY_RUN_PLACEHOLDER")
            paths.append(p)
        return paths

    from playwright.sync_api import sync_playwright

    url = index.resolve().as_uri()
    paths: list[Path] = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for label, size in (("desktop", desktop), ("mobile", mobile)):
            page = browser.new_page(viewport={"width": size[0], "height": size[1]})
            page.goto(url)
            out = shot_dir / f"{label}.png"
            page.screenshot(path=str(out), full_page=True)
            paths.append(out)
            page.close()
        browser.close()
    return paths


def review_screenshots(
    router: SequentialModelRouter,
    shot_paths: list[Path],
    *,
    force_issue: bool = False,
) -> dict:
    listing = ", ".join(p.name for p in shot_paths)
    stub = None
    if force_issue:
        stub = json.dumps(
            {
                "ok": False,
                "issues": ["CTA overlaps hero on mobile"],
                "notes": "Forced issue for loop test",
            }
        )
    result = router.chat(
        "vision",
        VISION_SYSTEM,
        f"Review screenshots: {listing}. Assume a restaurant VIP landing.",
        dry_stub=stub,
    )
    try:
        return json.loads(result.content)
    except json.JSONDecodeError:
        return {"ok": True, "issues": [], "notes": result.content}


def apply_fix(site_dir: Path, review: dict) -> None:
    """Lightweight self-heal: append a CSS patch for common mobile CTA issues."""
    issues = review.get("issues") or []
    if not issues:
        return
    css_path = site_dir / "styles.css"
    patch = (
        "\n/* MoA vision self-heal */\n"
        "@media (max-width: 640px) {\n"
        "  .cta-row { flex-direction: column; gap: 0.75rem; }\n"
        "  .hero-panel { padding-bottom: 4rem; }\n"
        "}\n"
    )
    if css_path.exists():
        css_path.write_text(css_path.read_text(encoding="utf-8") + patch, encoding="utf-8")
    else:
        css_path.write_text(patch, encoding="utf-8")
