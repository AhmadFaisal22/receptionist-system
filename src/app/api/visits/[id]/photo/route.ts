import { requireRole } from "@/lib/auth";
import { imageResponse } from "@/lib/image-response";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireRole("receptionist", "guard", "admin");
  if (!session) return new Response("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const visit = await getStore().getVisit(id);
  return imageResponse(visit?.photoDataUrl);
}
