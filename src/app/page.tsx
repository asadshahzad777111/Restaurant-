import type { Metadata } from "next";
import { MarketingHome } from "./marketing-home";

export const metadata: Metadata = {
  title: "ORDO — Digital systems built for real kitchens",
  description:
    "Restaurant operating system for Pakistan: guest QR ordering, counter POS, kitchen tickets, menu, and stock — isolated per kitchen. PKR plans from ₨999/month. Live demo, no account needed.",
};

export default function Page() {
  return <MarketingHome />;
}
