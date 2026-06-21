import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { getStore, toPublic } from "@/lib/store";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireRole("guard", "receptionist", "admin");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!rateLimit(`staffmut:${clientIp(req)}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { id } = await ctx.params;
  const visit = await getStore().checkoutVisit(id, "staff");
  if (!visit) {
    return NextResponse.json({ error: "Visit not found" }, { status: 404 });
  }
  return NextResponse.json(toPublic(visit));
}
