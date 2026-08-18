import { redirect } from "next/navigation";

/** Legacy path — owner panel lives at /control on control.asfins.com */
export default function SuperRedirect() {
  redirect("/control");
}
