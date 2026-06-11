import { cookies } from "next/headers";
import type { Role } from "./types";
import { SESSION_COOKIE, verifySessionToken, type Session } from "./auth-core";

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}

export async function requireRole(...roles: Role[]): Promise<Session | null> {
  const session = await getSession();
  if (!session || !roles.includes(session.role)) return null;
  return session;
}
