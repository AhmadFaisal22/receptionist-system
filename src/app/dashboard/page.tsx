import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await requireRole("receptionist", "admin");
  if (!session) redirect("/login?next=/dashboard");
  return <DashboardClient user={session.user} role={session.role} />;
}
