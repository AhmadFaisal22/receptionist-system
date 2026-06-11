import { beforeAll, describe, expect, it } from "vitest";

process.env.AUTH_SECRET = "test-secret-test-secret-test-secret-1234";

import {
  checkCredentials,
  newSession,
  signSession,
  verifySessionToken,
} from "../src/lib/auth-core";

describe("session signing", () => {
  it("round-trips a valid session", () => {
    const token = signSession(newSession("reception", "receptionist"));
    const session = verifySessionToken(token);
    expect(session?.user).toBe("reception");
    expect(session?.role).toBe("receptionist");
  });

  it("rejects a tampered payload", () => {
    const token = signSession(newSession("reception", "receptionist"));
    const [payload, mac] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ user: "reception", role: "admin", exp: Date.now() + 9_999_999 }),
    ).toString("base64url");
    expect(verifySessionToken(`${forged}.${mac}`)).toBeNull();
    expect(verifySessionToken(`${payload}.AAAA${mac.slice(4)}`)).toBeNull();
  });

  it("rejects an expired session", () => {
    const token = signSession({ user: "reception", role: "receptionist", exp: Date.now() - 1000 });
    expect(verifySessionToken(token)).toBeNull();
  });

  it("rejects garbage tokens", () => {
    expect(verifySessionToken(undefined)).toBeNull();
    expect(verifySessionToken("")).toBeNull();
    expect(verifySessionToken("abc")).toBeNull();
    expect(verifySessionToken("a.b")).toBeNull();
  });
});

describe("checkCredentials", () => {
  beforeAll(() => {
    process.env.STAFF_GUARD_PASSWORD = "correct-horse";
    delete process.env.STAFF_RECEPTIONIST_PASSWORD;
  });

  it("accepts the right password for a configured account", () => {
    expect(checkCredentials("guard", "correct-horse")).toBe("guard");
  });

  it("rejects a wrong password", () => {
    expect(checkCredentials("guard", "wrong")).toBeNull();
  });

  it("rejects unknown usernames", () => {
    expect(checkCredentials("hacker", "correct-horse")).toBeNull();
  });

  it("disables login when the password env is unset", () => {
    expect(checkCredentials("reception", "")).toBeNull();
    expect(checkCredentials("reception", "anything")).toBeNull();
  });
});
