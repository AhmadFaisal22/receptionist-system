import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const session = await requireRole("admin");
  if (!session) redirect("/login?next=/admin");
  return <AdminClient />;
}
