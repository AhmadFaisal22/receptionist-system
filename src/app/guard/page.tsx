import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import DashboardClient from "../dashboard/DashboardClient";

export default async function GuardPage() {
  const session = await requireRole("guard", "admin");
  if (!session) redirect("/login?next=/guard");
  // Guard gets the same modern dashboard as admin, branded with the SIGAP
  // security-vendor logo.
  return (
    <DashboardClient
      user={session.user}
      role={session.role}
      variant="modern"
      loginNext="/guard"
      logoSrc="/SIGAP.png"
      logoAlt="SIGAP"
    />
  );
}
