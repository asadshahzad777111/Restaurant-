import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Plus_Jakarta_Sans } from "next/font/google";
import { StoreProvider } from "@/lib/store";
import { ApkExperience } from "@/components/ApkExperience";
import { TenantPwaMeta } from "@/components/TenantPwaMeta";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const display = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-display",
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ORDO — Modern tech for premium hospitality",
  description:
    "ORDO is the quiet layer between guests and the kitchen: QR ordering, counter POS, tickets, and isolated restaurants. Browser-first, PKR from ₨999/month.",
  manifest: "/manifest.webmanifest",
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
  themeColor: "#c45c26",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} ${display.variable}`}>
        <StoreProvider>
          <TenantPwaMeta />
          <ApkExperience />
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
