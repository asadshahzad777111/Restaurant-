import type { NextConfig } from "next";

const svgHeaders = [
  { key: "Content-Type", value: "image/svg+xml; charset=utf-8" },
  { key: "Cache-Control", value: "public, max-age=86400, must-revalidate" },
  { key: "X-Content-Type-Options", value: "nosniff" },
];

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  async headers() {
    return [
      { source: "/pos58-thermal-printer.svg", headers: svgHeaders },
      { source: "/thermal-printer.svg", headers: svgHeaders },
    ];
  },
};

export default nextConfig;
