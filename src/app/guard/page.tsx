import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import GuardClient from "./GuardClient";

export default async function GuardPage() {
  const session = await requireRole("guard", "admin");
  if (!session) redirect("/login?next=/guard");
  return <GuardClient user={session.user} />;
}
