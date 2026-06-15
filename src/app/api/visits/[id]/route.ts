import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getStore, toPublic } from "@/lib/store";
import { VisitUpdateSchema, zodIssues } from "@/lib/validation";

// Edit and delete are office-staff actions. Guards are deliberately excluded —
// they confirm arrivals and clock-outs but cannot alter or remove records.
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireRole("receptionist", "admin");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = VisitUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: zodIssues(parsed.error) }, { status: 400 });
  }

  const { id } = await ctx.params;
  const visit = await getStore().updateVisit(id, parsed.data);
  if (!visit) {
    return NextResponse.json({ error: "Visit not found" }, { status: 404 });
  }
  return NextResponse.json(toPublic(visit));
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireRole("receptionist", "admin");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const ok = await getStore().deleteVisit(id);
  if (!ok) {
    return NextResponse.json({ error: "Visit not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
