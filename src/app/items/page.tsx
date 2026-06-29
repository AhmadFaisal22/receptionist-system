import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import ItemsClient from "./ItemsClient";

export default async function ItemsPage() {
  const session = await requireRole("guard", "receptionist", "admin");
  if (!session) redirect("/login?next=/items");
  // Hard delete is reception/admin only, matching the API authorization.
  const canDelete = session.role === "receptionist" || session.role === "admin";
  return <ItemsClient user={session.user} role={session.role} canDelete={canDelete} />;
}
