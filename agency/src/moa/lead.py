from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


def slugify(name: str) -> str:
    s = name.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-") or "lead"


@dataclass
class Lead:
    business_name: str
    city: str = ""
    category: str = "restaurant"
    phone: str = ""
    email: str = ""
    whatsapp: str = ""
    address: str = ""
    tagline: str = ""
    highlights: list[str] = field(default_factory=list)
    missing_website: bool = True
    notes: str = ""
    preferred_plan: str = "pro"
    raw: dict[str, Any] = field(default_factory=dict)

    @property
    def slug(self) -> str:
        return slugify(self.business_name)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Lead:
        return cls(
            business_name=str(data.get("business_name") or data.get("name") or "Business"),
            city=str(data.get("city") or ""),
            category=str(data.get("category") or "restaurant"),
            phone=str(data.get("phone") or ""),
            email=str(data.get("email") or ""),
            whatsapp=str(data.get("whatsapp") or ""),
            address=str(data.get("address") or ""),
            tagline=str(data.get("tagline") or ""),
            highlights=list(data.get("highlights") or []),
            missing_website=bool(data.get("missing_website", True)),
            notes=str(data.get("notes") or ""),
            preferred_plan=str(data.get("preferred_plan") or "pro"),
            raw=data,
        )


def load_lead(path: Path) -> Lead:
    text = path.read_text(encoding="utf-8")
    if path.suffix.lower() == ".json":
        return Lead.from_dict(json.loads(text))
    if path.suffix.lower() == ".csv":
        # Minimal one-row CSV: header + values
        lines = [ln for ln in text.splitlines() if ln.strip()]
        if len(lines) < 2:
            raise ValueError("CSV lead needs header + one data row")
        headers = [h.strip() for h in lines[0].split(",")]
        values = [v.strip() for v in lines[1].split(",")]
        return Lead.from_dict(dict(zip(headers, values, strict=False)))
    raise ValueError(f"Unsupported lead format: {path.suffix}")
