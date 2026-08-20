import { redirect } from "next/navigation";

/** Private staff access door — not linked from the public demo homepage. */
export default function StaffAccessPage() {
  redirect("/login");
}
