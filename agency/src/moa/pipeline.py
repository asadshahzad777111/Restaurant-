from __future__ import annotations

import json
import os
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from .config import agency_root, load_pipeline_config
from .lead import Lead, load_lead
from .router import SequentialModelRouter
from .stages.codegen import run_code_stage, run_plan
from .stages.deploy import trigger_outreach_webhook, write_deploy_manifest
from .stages.vision import apply_fix, capture_screenshots, review_screenshots


@dataclass
class PipelineResult:
    slug: str
    site_dir: str
    plan: dict[str, Any]
    vision_loops: int
    final_review: dict[str, Any]
    deploy_manifest: str
    outreach: dict[str, Any]
    dry_run: bool
    steps: list[str] = field(default_factory=list)


def run_pipeline(
    lead_path: Path,
    *,
    dry_run: bool | None = None,
) -> PipelineResult:
    cfg = load_pipeline_config()
    if dry_run is None:
        dry_run = os.environ.get("MOA_DRY_RUN", "1" if cfg.get("dry_run_default", True) else "0") != "0"

    root = agency_root()
    lead = load_lead(lead_path)
    out_root = root / cfg.get("output_root", "output")
    site_dir = out_root / lead.slug
    template_dir = root / cfg.get("template_dir", "templates/vip-demo")
    shot_dir = site_dir / cfg.get("screenshots_dir", "screenshots")

    router = SequentialModelRouter(dry_run=dry_run)
    steps: list[str] = []

    try:
        steps.append("intake")
        plan = run_plan(router, lead)
        steps.append("plan")

        run_code_stage(router, lead, plan, template_dir, site_dir)
        steps.append("code")

        max_loops = int(cfg.get("max_vision_fix_loops", 3))
        pw = cfg.get("playwright") or {}
        desktop = (int(pw.get("viewport_width", 1440)), int(pw.get("viewport_height", 900)))
        mobile = (int(pw.get("mobile_width", 390)), int(pw.get("mobile_height", 844)))

        final_review: dict[str, Any] = {"ok": True, "issues": []}
        loops = 0
        for i in range(max_loops):
            loops = i + 1
            shots = capture_screenshots(
                site_dir,
                shot_dir,
                dry_run=dry_run,
                desktop=desktop,
                mobile=mobile,
            )
            steps.append(f"screenshot:{loops}")
            # First dry-run loop can optionally force an issue via env for demo
            force = dry_run and i == 0 and os.environ.get("MOA_FORCE_VISION_ISSUE") == "1"
            review = review_screenshots(router, shots, force_issue=force)
            final_review = review
            if review.get("ok", True) and not review.get("issues"):
                steps.append(f"vision_ok:{loops}")
                break
            apply_fix(site_dir, review)
            router.chat(
                "coder",
                "Apply visual QA fixes to the VIP demo CSS/HTML.",
                json.dumps(review),
                dry_stub="FIXED",
            )
            steps.append(f"vision_fix:{loops}")
        else:
            steps.append("vision_max_loops")

        provider = (cfg.get("deploy") or {}).get("provider", "cloudflare_pages")
        manifest = write_deploy_manifest(site_dir, provider)
        steps.append("deploy_manifest")

        outreach_cfg = cfg.get("outreach") or {}
        outreach = trigger_outreach_webhook(
            {
                "business_name": lead.business_name,
                "slug": lead.slug,
                "phone": lead.phone,
                "whatsapp": lead.whatsapp,
                "email": lead.email,
                "demo_path": str(site_dir),
                "preferred_plan": lead.preferred_plan,
            },
            str(outreach_cfg.get("n8n_webhook_url") or ""),
            dry_run=dry_run,
        )
        steps.append("outreach_preview")

        result = PipelineResult(
            slug=lead.slug,
            site_dir=str(site_dir),
            plan=plan,
            vision_loops=loops,
            final_review=final_review,
            deploy_manifest=str(manifest),
            outreach=outreach,
            dry_run=dry_run,
            steps=steps,
        )
        (site_dir / "pipeline-result.json").write_text(
            json.dumps(asdict(result), indent=2),
            encoding="utf-8",
        )
        return result
    finally:
        router.close()
