from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any

import yaml


def agency_root() -> Path:
    return Path(__file__).resolve().parents[2]


def expand_env(value: str) -> str:
    """Expand ${VAR:default} and ${VAR} placeholders."""

    def repl(match: re.Match[str]) -> str:
        inner = match.group(1)
        if ":" in inner:
            key, default = inner.split(":", 1)
            return os.environ.get(key, default)
        return os.environ.get(inner, "")

    if not isinstance(value, str):
        return value
    return re.sub(r"\$\{([^}]+)\}", repl, value)


def deep_expand(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {k: deep_expand(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [deep_expand(v) for v in obj]
    if isinstance(obj, str):
        return expand_env(obj)
    return obj


def load_yaml(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return deep_expand(data)


def load_models_config() -> dict[str, Any]:
    return load_yaml(agency_root() / "config" / "models.yaml")


def load_pipeline_config() -> dict[str, Any]:
    return load_yaml(agency_root() / "config" / "pipeline.yaml")
