import { afterEach, describe, expect, it } from "vitest";
import { clientIp, rateLimit, resetRateLimits } from "../src/lib/ratelimit";

afterEach(() => resetRateLimits());

describe("rateLimit", () => {
  it("allows up to max hits inside the window", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) {
      expect(rateLimit("k", 5, 60_000, t0 + i)).toBe(true);
    }
    expect(rateLimit("k", 5, 60_000, t0 + 10)).toBe(false);
  });

  it("frees the slot after the window passes", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) rateLimit("k", 5, 60_000, t0);
    expect(rateLimit("k", 5, 60_000, t0 + 59_999)).toBe(false);
    expect(rateLimit("k", 5, 60_000, t0 + 60_001)).toBe(true);
  });

  it("tracks keys independently", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) rateLimit("a", 5, 60_000, t0);
    expect(rateLimit("a", 5, 60_000, t0)).toBe(false);
    expect(rateLimit("b", 5, 60_000, t0)).toBe(true);
  });
});

describe("clientIp", () => {
  it("takes the first forwarded address", () => {
    const req = new Request("http://x", {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    });
    expect(clientIp(req)).toBe("203.0.113.7");
  });

  it("falls back to local when no header", () => {
    expect(clientIp(new Request("http://x"))).toBe("local");
  });
});
