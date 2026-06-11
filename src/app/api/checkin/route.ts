import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { getStore } from "@/lib/store";
import { CheckinSchema, zodIssues } from "@/lib/validation";

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`checkin:${ip}`, 5, 60_000)) {
    return NextResponse.json(
      { error: "Too many check-ins from this device, please wait a minute" },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CheckinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: zodIssues(parsed.error) },
      { status: 400 },
    );
  }

  const visit = await getStore().createVisit(parsed.data);
  // The exit token goes only to the visitor's own device.
  return NextResponse.json(
    { code: visit.code, exitToken: visit.exitToken, submittedAt: visit.submittedAt },
    { status: 201 },
  );
}
