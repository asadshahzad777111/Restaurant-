import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { StoreProvider } from "@/lib/store";
import { LanguageProvider } from "@/lib/lang-context";
import { ApkExperience } from "@/components/ApkExperience";
import { TenantPwaMeta } from "@/components/TenantPwaMeta";
import "./globals.css";

/* Cemio-style type system: one clean geometric sans everywhere (400-800). */
const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://ordo.asfins.com"),
  title: {
    default: "ORDO — Modern tech for premium hospitality",
    template: "%s · ORDO",
  },
  description:
    "ORDO is the quiet layer between guests and the kitchen: QR ordering, counter POS, tickets, and isolated restaurants. Browser-first, PKR from ₨999/month.",
  keywords: [
    "restaurant POS Pakistan",
    "QR menu ordering",
    "kitchen display system",
    "58mm thermal receipts",
    "restaurant management software PKR",
  ],
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: "ORDO",
    title: "ORDO — Restaurant operating system",
    description:
      "Guest QR ordering, counter POS, kitchen tickets, and stock — isolated per kitchen. PKR from ₨999/month.",
    url: "/",
    images: [{ url: "/ordo-lifestyle-hero.jpg", width: 1600, height: 1067, alt: "ORDO on a restaurant table" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ORDO — Restaurant operating system",
    description: "Guest QR ordering, counter POS, kitchen tickets — PKR from ₨999/month.",
    images: ["/ordo-lifestyle-hero.jpg"],
  },
  icons: {
    icon: [
      { url: "/ordo-icon.svg", type: "image/svg+xml" },
      { url: "/ordo-mark-256.png", sizes: "256x256", type: "image/png" },
    ],
    apple: [{ url: "/ordo-apple-touch.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "ORDO",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#ff8500",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={outfit.variable}>
        <StoreProvider>
          <LanguageProvider>
            <TenantPwaMeta />
            <ApkExperience />
            {children}
          </LanguageProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
