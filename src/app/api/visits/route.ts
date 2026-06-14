import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getStore, localDate, toPublic } from "@/lib/store";

export async function GET(req: Request) {
  const session = await requireRole("receptionist", "guard", "admin");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = new URL(req.url).searchParams;
  const store = getStore();
  const visits =
    params.get("all") === "1"
      ? await store.listAllVisits()
      : await store.listVisits(
          params.get("date") && /^\d{4}-\d{2}-\d{2}$/.test(params.get("date")!)
            ? params.get("date")!
            : localDate(),
        );
  return NextResponse.json(visits.map(toPublic));
}
