import crypto from "crypto";
import type { Role } from "./types";

export const SESSION_COOKIE = "vlog_session";
export const SESSION_HOURS = 12;

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET (min 32 chars) must be set in production");
  }
  // Dev fallback: random per process, so sessions die on restart instead of
  // ever running on a guessable secret.
  const g = globalThis as unknown as { __vlogDevSecret?: string };
  if (!g.__vlogDevSecret) g.__vlogDevSecret = crypto.randomBytes(32).toString("hex");
  return g.__vlogDevSecret;
}

export interface Session {
  user: string;
  role: Role;
  exp: number;
}

export function newSession(user: string, role: Role): Session {
  return { user, role, exp: Date.now() + SESSION_HOURS * 3600_000 };
}

export function signSession(session: Session): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const mac = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}

export function verifySessionToken(token: string | undefined | null): Session | null {
  if (!token) return null;
  const [payload, mac] = token.split(".");
  if (!payload || !mac) return null;
  const expected = crypto.createHmac("sha256", secret()).update(payload).digest();
  let given: Buffer;
  try {
    given = Buffer.from(mac, "base64url");
  } catch {
    return null;
  }
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    return null;
  }
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    if (
      typeof session.user !== "string" ||
      typeof session.role !== "string" ||
      typeof session.exp !== "number" ||
      session.exp < Date.now()
    ) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export const STAFF_ACCOUNTS: { username: string; role: Role; envVar: string }[] = [
  { username: "reception", role: "receptionist", envVar: "STAFF_RECEPTIONIST_PASSWORD" },
  { username: "guard", role: "guard", envVar: "STAFF_GUARD_PASSWORD" },
  { username: "admin", role: "admin", envVar: "STAFF_ADMIN_PASSWORD" },
];

export function checkCredentials(username: string, password: string): Role | null {
  const account = STAFF_ACCOUNTS.find((a) => a.username === username);
  // Hash both sides so comparison is constant-time regardless of length,
  // and run a dummy comparison for unknown users to avoid a timing oracle.
  const expected = account ? process.env[account.envVar] : undefined;
  const a = crypto.createHash("sha256").update(password).digest();
  const b = crypto.createHash("sha256").update(expected ?? crypto.randomBytes(16)).digest();
  const match = crypto.timingSafeEqual(a, b);
  if (!account || !expected) return null;
  return match ? account.role : null;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}
