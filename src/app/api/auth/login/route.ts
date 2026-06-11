import { NextResponse } from "next/server";
import {
  checkCredentials,
  newSession,
  sessionCookieOptions,
  SESSION_COOKIE,
  SESSION_HOURS,
  signSession,
} from "@/lib/auth-core";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { LoginSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const ip = clientIp(req);
  // Tight limit: this is the brute-force surface.
  if (!rateLimit(`login:${ip}`, 5, 5 * 60_000)) {
    return NextResponse.json(
      { error: "Too many login attempts, try again in a few minutes" },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const role = checkCredentials(parsed.data.username, parsed.data.password);
  if (!role) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const res = NextResponse.json({ role });
  res.cookies.set({
    name: SESSION_COOKIE,
    value: signSession(newSession(parsed.data.username, role)),
    maxAge: SESSION_HOURS * 3600,
    ...sessionCookieOptions(),
  });
  return res;
}
