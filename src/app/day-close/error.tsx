"use client";

import { StaffPageError } from "@/components/StaffPageError";

export default function DayCloseError({ reset }: { reset: () => void }) {
  return <StaffPageError title="Day close" reset={reset} />;
}
