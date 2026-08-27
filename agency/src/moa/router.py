from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any

import httpx

from .config import load_models_config


@dataclass
class ChatResult:
    role: str
    model: str
    content: str
    dry_run: bool


class SequentialModelRouter:
    """Ensures at most one heavy model is 'active' — unload before swap."""

    def __init__(self, dry_run: bool | None = None) -> None:
        self.cfg = load_models_config()
        self.dry_run = (
            dry_run
            if dry_run is not None
            else os.environ.get("MOA_DRY_RUN", "1") != "0"
        )
        self.active_heavy: str | None = None
        base = (self.cfg.get("openai_compatible_base") or "").strip()
        self.base = base or self.cfg.get("ollama_host", "http://127.0.0.1:11434")
        self._client = httpx.Client(timeout=120.0)

    def role_meta(self, role: str) -> dict[str, Any]:
        roles = self.cfg["roles"]
        if role not in roles:
            raise KeyError(f"Unknown role: {role}")
        return roles[role]

    def _unload_all(self) -> None:
        if self.dry_run:
            self.active_heavy = None
            return
        # Ollama: keep_alive=0 on a tiny request frees VRAM/unified memory.
        try:
            self._client.post(
                f"{self.base.rstrip('/')}/api/generate",
                json={"model": "noop", "prompt": "", "keep_alive": 0},
            )
        except Exception:
            pass
        self.active_heavy = None

    def activate(self, role: str) -> str:
        meta = self.role_meta(role)
        model = meta["model"]
        if meta.get("heavy") and self.active_heavy and self.active_heavy != model:
            self._unload_all()
        if meta.get("heavy"):
            self.active_heavy = model
        return model

    def chat(
        self,
        role: str,
        system: str,
        user: str,
        *,
        dry_stub: str | None = None,
    ) -> ChatResult:
        model = self.activate(role)
        if self.dry_run:
            content = dry_stub or self._default_stub(role, user)
            return ChatResult(role=role, model=model, content=content, dry_run=True)

        # Prefer OpenAI-compatible /v1/chat/completions (Ollama + MLX + LM Studio)
        url = f"{self.base.rstrip('/')}/v1/chat/completions"
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": 0.3,
        }
        r = self._client.post(url, json=payload)
        r.raise_for_status()
        data = r.json()
        content = data["choices"][0]["message"]["content"]
        return ChatResult(role=role, model=model, content=content, dry_run=False)

    def _default_stub(self, role: str, user: str) -> str:
        if role == "planner":
            return json.dumps(
                {
                    "sections": ["hero", "menu_highlights", "hours", "cta"],
                    "palette": "warm charcoal + saffron accent",
                    "motion": ["hero fade-up", "CTA pulse"],
                },
                indent=2,
            )
        if role == "vision":
            return json.dumps(
                {
                    "ok": True,
                    "issues": [],
                    "notes": "Dry-run: no real screenshot analysis",
                },
                indent=2,
            )
        if role in ("coder", "auditor"):
            return (
                "DRY_RUN_OK: use template VIP demo; "
                f"context_chars={len(user)}"
            )
        return f"dry-run stub for {role}"

    def close(self) -> None:
        self._client.close()
