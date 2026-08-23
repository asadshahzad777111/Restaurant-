import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL || "https://ordo.asfins.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/control", "/super", "/lab", "/api/", "/track/"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
