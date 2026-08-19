import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ORDO — Restaurant OS for Pakistan kitchens",
  description:
    "Guest QR ordering, counter POS, kitchen tickets, and isolated restaurants. Browser-first, PKR pricing from ₨999/month. No per-order fee.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} ${display.variable}`}>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
