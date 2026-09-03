from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import httpx


def write_deploy_manifest(site_dir: Path, provider: str) -> Path:
    manifest = {
        "provider": provider,
        "site_dir": str(site_dir.resolve()),
        "status": "pending",
        "instructions": {
            "cloudflare_pages": "npx wrangler pages deploy . --project-name=<slug>",
            "vercel": "npx vercel deploy --yes",
        },
        "note": "Free-tier deploy is manual/token-gated; pipeline only prepares the artifact.",
    }
    path = site_dir / "deploy.manifest.json"
    path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return path


def trigger_outreach_webhook(
    payload: dict[str, Any],
    webhook_url: str,
    *,
    dry_run: bool,
) -> dict[str, Any]:
    body = {
        **payload,
        "mode": "preview_only",
        "disclaimer": "Do not auto-blast WhatsApp/SMS; human approval required.",
    }
    if dry_run or not webhook_url:
        return {"ok": True, "dry_run": True, "payload": body}
    try:
        r = httpx.post(webhook_url, json=body, timeout=30.0)
        return {"ok": r.is_success, "status_code": r.status_code, "body": r.text[:500]}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def env_token_present(provider: str) -> bool:
    if provider == "vercel":
        return bool(os.environ.get("VERCEL_TOKEN"))
    return bool(os.environ.get("CLOUDFLARE_API_TOKEN"))
