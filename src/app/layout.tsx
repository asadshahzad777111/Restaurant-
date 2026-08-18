import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "ORDO — Restaurant OS",
  description:
    "Multi-tenant restaurant operating system: POS, kitchen, inventory, guest QR ordering.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "ORDO",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#ff6a1a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={jakarta.variable}>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
