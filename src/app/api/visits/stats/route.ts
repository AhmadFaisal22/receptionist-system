import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getStore } from "@/lib/store";

// Tiny payload for the traffic chart: just visit timestamps (no rows/blobs).
export async function GET() {
  const session = await requireRole("receptionist", "guard", "admin");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await getStore().listVisitTimestamps());
}
