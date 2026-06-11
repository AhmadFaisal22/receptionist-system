import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getStore, toPublic } from "@/lib/store";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireRole("guard", "receptionist", "admin");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const visit = await getStore().checkoutVisit(id, "staff");
  if (!visit) {
    return NextResponse.json({ error: "Visit not found" }, { status: 404 });
  }
  return NextResponse.json(toPublic(visit));
}
