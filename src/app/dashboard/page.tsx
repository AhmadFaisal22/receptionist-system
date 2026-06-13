import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await requireRole("receptionist", "admin");
  if (!session) redirect("/login?next=/dashboard");
  // Receptionist sees the paper log-book layout; admin keeps the modern view.
  const variant = session.role === "receptionist" ? "logbook" : "modern";
  return <DashboardClient user={session.user} role={session.role} variant={variant} />;
}
