import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { jsonMaybe304 } from "@/lib/http-cache";
import { getStore } from "@/lib/store";

// Tiny payload for the traffic chart: just visit timestamps (no rows/blobs).
export async function GET(req: Request) {
  const session = await requireRole("receptionist", "guard", "admin");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return jsonMaybe304(req, await getStore().listVisitTimestamps());
}
