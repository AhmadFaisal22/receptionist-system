import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getStore, localDate, toPublic } from "@/lib/store";

export async function GET(req: Request) {
  const session = await requireRole("receptionist", "guard", "admin");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = new URL(req.url).searchParams.get("date");
  const date = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : localDate();
  const visits = await getStore().listVisits(date);
  return NextResponse.json(visits.map(toPublic));
}
