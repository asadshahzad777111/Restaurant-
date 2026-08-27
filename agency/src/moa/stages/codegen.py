from __future__ import annotations

import json
import shutil
from pathlib import Path

from ..lead import Lead
from ..router import SequentialModelRouter


PLAN_SYSTEM = (
    "You are a local web-agency planner. Return compact JSON with keys: "
    "sections, palette, motion. Keep it suitable for a single-page VIP demo."
)


def run_plan(router: SequentialModelRouter, lead: Lead) -> dict:
    user = json.dumps(lead.raw or lead.__dict__, default=str, indent=2)
    # Prefer resident coder for routine plans; use planner role only when MOA_HARD_PLAN=1
    import os

    role = "planner" if os.environ.get("MOA_HARD_PLAN") == "1" else "coder"
    result = router.chat(
        role,
        PLAN_SYSTEM,
        f"Plan a VIP demo landing for this business:\n{user}",
    )
    try:
        return json.loads(result.content)
    except json.JSONDecodeError:
        return {
            "sections": ["hero", "highlights", "cta"],
            "palette": "charcoal + saffron",
            "motion": ["fade-up"],
            "raw": result.content,
        }


def materialize_demo(lead: Lead, plan: dict, template_dir: Path, out_dir: Path) -> Path:
    if out_dir.exists():
        shutil.rmtree(out_dir)
    shutil.copytree(template_dir, out_dir)

    site_json = {
        "business_name": lead.business_name,
        "city": lead.city,
        "category": lead.category,
        "phone": lead.phone,
        "email": lead.email,
        "whatsapp": lead.whatsapp,
        "address": lead.address,
        "tagline": lead.tagline
        or f"{lead.business_name} — modern demo by ORDO MoA",
        "highlights": lead.highlights
        or ["Fresh menu", "Fast service", "Book a table"],
        "plan": plan,
        "ordo_cta": "Run your kitchen on ORDO",
    }
    (out_dir / "site-data.json").write_text(
        json.dumps(site_json, indent=2), encoding="utf-8"
    )

    # Patch index.html placeholders if present
    index = out_dir / "index.html"
    if index.exists():
        html = index.read_text(encoding="utf-8")
        html = html.replace("{{BUSINESS_NAME}}", lead.business_name)
        html = html.replace(
            "{{TAGLINE}}",
            site_json["tagline"],
        )
        html = html.replace("{{CITY}}", lead.city or "Pakistan")
        html = html.replace("{{PHONE}}", lead.phone or "")
        html = html.replace("{{ADDRESS}}", lead.address or "")
        highlights = "".join(
            f"<li>{h}</li>" for h in site_json["highlights"]
        )
        html = html.replace("{{HIGHLIGHTS}}", highlights)
        index.write_text(html, encoding="utf-8")

    return out_dir


def run_code_stage(
    router: SequentialModelRouter,
    lead: Lead,
    plan: dict,
    template_dir: Path,
    out_dir: Path,
) -> Path:
    router.chat(
        "coder",
        "You generate VIP demo sites. Confirm you will use the provided template.",
        f"Lead: {lead.business_name}\nPlan: {json.dumps(plan)}",
        dry_stub="USE_TEMPLATE",
    )
    return materialize_demo(lead, plan, template_dir, out_dir)
