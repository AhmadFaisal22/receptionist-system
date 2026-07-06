import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getStore, localDate } from "@/lib/store";

export async function GET(req: Request) {
  const session = await requireRole("receptionist", "guard", "admin");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Lite rows only (no base64 image blobs) — images load on demand per record
  // via /api/visits/[id]/photo|signature. Keeps the 4s dashboard poll tiny.
  const params = new URL(req.url).searchParams;
  const store = getStore();
  const visits =
    params.get("all") === "1"
      ? await store.listAllVisitsLite()
      : await store.listVisitsLite(
          params.get("date") && /^\d{4}-\d{2}-\d{2}$/.test(params.get("date")!)
            ? params.get("date")!
            : localDate(),
        );
  return NextResponse.json(visits);
}
