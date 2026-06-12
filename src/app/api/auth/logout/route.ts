import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth-core";

export async function POST(req: Request) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    maxAge: 0,
    ...sessionCookieOptions(req),
  });
  return res;
}
