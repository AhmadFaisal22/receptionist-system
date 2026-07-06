import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { getStore, localDate } from "@/lib/store";
import { ItemCreateSchema, zodIssues } from "@/lib/validation";

export async function GET(req: Request) {
  const session = await requireRole("guard", "receptionist", "admin");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Lite rows only (no proof blobs) — proofs load on demand per record via
  // /api/items/[id]/photo|signature|collected.
  const params = new URL(req.url).searchParams;
  const store = getStore();
  const items =
    params.get("all") === "1"
      ? await store.listAllItemsLite()
      : await store.listItemsLite(
          params.get("date") && /^\d{4}-\d{2}-\d{2}$/.test(params.get("date")!)
            ? params.get("date")!
            : localDate(),
        );
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await requireRole("guard", "receptionist", "admin");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Defends the 9 AM burst surface against runaway clients.
  if (!rateLimit(`item:${clientIp(req)}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ItemCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: zodIssues(parsed.error) }, { status: 400 });
  }

  const item = await getStore().createItem(parsed.data, session.role);
  return NextResponse.json(item, { status: 201 });
}
