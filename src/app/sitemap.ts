import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL || "https://ordo.asfins.com";

/** Public marketing + guest entry pages only — staff/HQ routes stay out of search. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ["", "/guest", "/scan", "/order", "/login"].map((path) => ({
    url: `${BASE}${path}`,
    lastModified,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
