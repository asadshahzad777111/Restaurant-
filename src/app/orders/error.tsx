"use client";

import { StaffPageError } from "@/components/StaffPageError";

export default function OrdersError({ reset }: { reset: () => void }) {
  return <StaffPageError title="Orders" reset={reset} />;
}
