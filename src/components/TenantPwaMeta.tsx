"use client";

import { useEffect } from "react";
import {
  isCustomerShell,
  isStaffShell,
  readAppShell,
  readLockedCustomerTenant,
  readLockedStaffTenant,
} from "@/lib/app-shell";
import { tenantManifestPath } from "@/lib/pwa-links";
import { useStore } from "@/lib/store";

function upsertLink(rel: string, href: string, attrs?: Record<string, string>) {
  let el = document.head.querySelector(`link[data-ordo-pwa="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("data-ordo-pwa", rel);
    document.head.appendChild(el);
  }
  el.rel = rel;
  el.href = href;
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  }
}

function upsertMeta(name: string, content: string) {
  let el = document.head.querySelector(`meta[data-ordo-pwa="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("data-ordo-pwa", name);
    document.head.appendChild(el);
  }
  el.name = name;
  el.content = content;
}

/**
 * Binds per-kitchen web manifest + Apple web-app title for Staff/Customer PWA installs.
 * Falls back to global /manifest.webmanifest on marketing web.
 */
export function TenantPwaMeta() {
  const { tenant } = useStore();

  useEffect(() => {
    const shell = readAppShell();
    const locked =
      shell === "customer" || isCustomerShell()
        ? readLockedCustomerTenant()
        : shell === "staff" || isStaffShell()
          ? readLockedStaffTenant() || tenant?.code || ""
          : tenant?.code || "";

    const app =
      shell === "staff" || isStaffShell()
        ? "staff"
        : shell === "customer" || isCustomerShell()
          ? "customer"
          : null;

    if (app && locked) {
      const path = tenantManifestPath(locked, app);
      upsertLink("manifest", path);
      const liveName = tenant?.branding?.name?.trim();
      const title =
        liveName
          ? app === "staff"
            ? `${liveName} · Staff`
            : `${liveName} · Order`
          : app === "staff"
            ? `Staff · ${locked}`
            : `Order · ${locked}`;
      upsertMeta("apple-mobile-web-app-title", title);
      upsertMeta("apple-mobile-web-app-capable", "yes");
      document.title = title;
      if (tenant?.branding?.logoUrl) {
        upsertLink("apple-touch-icon", tenant.branding.logoUrl);
      }
      return;
    }

    upsertLink("manifest", "/manifest.webmanifest");
  }, [tenant?.code, tenant?.branding?.name, tenant?.branding?.logoUrl]);

  return null;
}
