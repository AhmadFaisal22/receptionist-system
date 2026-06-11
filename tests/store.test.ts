import { describe, expect, it } from "vitest";
import { MemoryStore } from "../src/lib/store/memory";
import { toPublic } from "../src/lib/store/index";
import { localDate } from "../src/lib/dates";
import type { Visit } from "../src/lib/types";
import type { CheckinInput } from "../src/lib/validation";

const SIG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";

function input(overrides: Partial<CheckinInput> = {}): CheckinInput {
  return {
    name: "Budi Santoso",
    institution: "PT Logistik Nusantara",
    phone: "+62 812-3456-7890",
    purpose: "meeting",
    hostId: null,
    hostName: "Rina Wijaya",
    hostDepartment: "HR",
    photoDataUrl: null,
    signatureDataUrl: SIG,
    lang: "id",
    ...overrides,
  };
}

describe("MemoryStore", () => {
  it("assigns sequential codes and pending status", async () => {
    const store = new MemoryStore();
    const a = await store.createVisit(input());
    const b = await store.createVisit(input({ name: "Chen Wei" }));
    expect(a.code).toBe("SEG-0001");
    expect(b.code).toBe("SEG-0002");
    expect(a.status).toBe("pending");
    expect(a.checkinAt).toBeNull();
    expect(a.exitToken).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("confirm sets checked_in exactly once", async () => {
    const store = new MemoryStore();
    const v = await store.createVisit(input());
    const confirmed = await store.confirmVisit(v.id);
    expect(confirmed?.status).toBe("checked_in");
    const firstCheckin = confirmed?.checkinAt;
    expect(firstCheckin).toBeTruthy();
    const again = await store.confirmVisit(v.id);
    expect(again?.checkinAt).toBe(firstCheckin);
  });

  it("checks out via exit token", async () => {
    const store = new MemoryStore();
    const v = await store.createVisit(input());
    const found = await store.findByExitToken(v.exitToken);
    expect(found?.id).toBe(v.id);
    const out = await store.checkoutVisit(v.id, "qr");
    expect(out?.status).toBe("checked_out");
    expect(out?.checkoutMethod).toBe("qr");
  });

  it("rejects a wrong exit token", async () => {
    const store = new MemoryStore();
    await store.createVisit(input());
    expect(await store.findByExitToken("00000000-0000-0000-0000-000000000000")).toBeNull();
  });

  it("matches code+phone across +62/0 prefix variants, rejects wrong phone", async () => {
    const store = new MemoryStore();
    const v = await store.createVisit(input({ phone: "+62 812-3456-7890" }));
    expect((await store.findByCodeAndPhone(v.code, "081234567890"))?.id).toBe(v.id);
    expect((await store.findByCodeAndPhone(v.code.toLowerCase(), "081234567890"))?.id).toBe(v.id);
    expect(await store.findByCodeAndPhone(v.code, "089999999999")).toBeNull();
    expect(await store.findByCodeAndPhone("SEG-9999", "081234567890")).toBeNull();
  });

  it("auto-closes visits left open from previous days", async () => {
    const store = new MemoryStore();
    const v = await store.createVisit(input());
    await store.confirmVisit(v.id);
    const yesterday = new Date(Date.now() - 24 * 3600_000);
    (store as unknown as { visits: Visit[] }).visits[0].submittedAt = yesterday.toISOString();

    const today = await store.listVisits(localDate());
    expect(today).toHaveLength(0);

    const closed = await store.getVisit(v.id);
    expect(closed?.status).toBe("checked_out");
    expect(closed?.checkoutMethod).toBe("auto");
  });

  it("employee search only exposes active employees", async () => {
    const store = new MemoryStore();
    const all = await store.listEmployees(undefined, true);
    const rina = all.find((e) => e.name === "Rina Wijaya");
    expect(rina).toBeTruthy();
    await store.updateEmployee(rina!.id, { active: false });
    const visible = await store.listEmployees("rina");
    expect(visible).toHaveLength(0);
    const adminView = await store.listEmployees("rina", true);
    expect(adminView).toHaveLength(1);
  });

  it("toPublic strips the exit token", async () => {
    const store = new MemoryStore();
    const v = await store.createVisit(input());
    const pub = toPublic(v) as Record<string, unknown>;
    expect(pub.exitToken).toBeUndefined();
    expect(pub.code).toBe(v.code);
  });
});
