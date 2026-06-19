import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { getStore } from "@/lib/store";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Public status check for the visitor's own confirmation screen. The exit token
// is a secret held only by that visitor's device, so this leaks nothing.
export async function GET(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`vstatus:${ip}`, 120, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const token = new URL(req.url).searchParams.get("token") ?? "";
  if (!UUID_RE.test(token)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const visit = await getStore().findByExitToken(token);
  if (!visit) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ status: visit.status, code: visit.code });
}
