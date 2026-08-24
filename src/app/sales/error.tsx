"use client";

import { StaffPageError } from "@/components/StaffPageError";

export default function SalesError({ reset }: { reset: () => void }) {
  return <StaffPageError title="Sales & Profit" reset={reset} />;
}
