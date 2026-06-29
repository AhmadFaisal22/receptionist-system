import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { getStore } from "@/lib/store";
import { ItemUpdateSchema, zodIssues } from "@/lib/validation";

// Status updates + edits: any staff (guard advances status, reception collects).
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireRole("guard", "receptionist", "admin");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!rateLimit(`itemmut:${clientIp(req)}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ItemUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: zodIssues(parsed.error) }, { status: 400 });
  }

  const { id } = await ctx.params;
  const item = await getStore().updateItem(id, parsed.data);
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  return NextResponse.json(item);
}

// Hard delete is reception/admin only — guards cannot remove records.
export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireRole("receptionist", "admin");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!rateLimit(`itemmut:${clientIp(req)}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { id } = await ctx.params;
  const ok = await getStore().deleteItem(id);
  if (!ok) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
