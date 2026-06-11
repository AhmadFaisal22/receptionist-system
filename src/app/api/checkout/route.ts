import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { getStore } from "@/lib/store";
import { CheckoutSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`checkout:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many attempts, please wait" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const store = getStore();
  const visit =
    "token" in parsed.data
      ? await store.findByExitToken(parsed.data.token)
      : await store.findByCodeAndPhone(parsed.data.code, parsed.data.phone);

  if (!visit) {
    return NextResponse.json({ error: "Visit not found" }, { status: 404 });
  }

  const updated = await store.checkoutVisit(visit.id, "qr");
  return NextResponse.json({
    code: updated?.code ?? visit.code,
    checkoutAt: updated?.checkoutAt ?? null,
  });
}
