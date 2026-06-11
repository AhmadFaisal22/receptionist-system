import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { getStore } from "@/lib/store";
import { EmployeeSchema } from "@/lib/validation";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const store = getStore();

  // Admin view: full list including inactive employees.
  if (url.searchParams.get("all") === "1") {
    const session = await requireRole("admin");
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(await store.listEmployees(undefined, true));
  }

  // Public autocomplete for the check-in form: rate-limited, active only,
  // minimal fields, capped result count.
  const ip = clientIp(req);
  if (!rateLimit(`emp:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const q = (url.searchParams.get("q") ?? "").slice(0, 40);
  if (q.trim().length < 2) {
    return NextResponse.json([]);
  }
  const employees = await store.listEmployees(q);
  return NextResponse.json(
    employees.slice(0, 8).map((e) => ({ id: e.id, name: e.name, department: e.department })),
  );
}

export async function POST(req: Request) {
  const session = await requireRole("admin");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = EmployeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const employee = await getStore().createEmployee(parsed.data.name, parsed.data.department);
  return NextResponse.json(employee, { status: 201 });
}
