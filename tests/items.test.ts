import { describe, expect, it } from "vitest";
import { MemoryStore } from "../src/lib/store/memory";
import { localDate } from "../src/lib/dates";
import type { IncomingItem } from "../src/lib/types";
import { ItemCreateSchema, ItemUpdateSchema, type ItemCreateInput } from "../src/lib/validation";

const SIG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";

function input(overrides: Partial<ItemCreateInput> = {}): ItemCreateInput {
  return {
    sender: "PT Aska Kurnia",
    itemType: "package",
    description: "Tumbler",
    recipientId: null,
    recipientName: "Rina Wijaya",
    recipientDepartment: "HR",
    proofSignature: null,
    proofPhoto: null,
    ...overrides,
  };
}

describe("MemoryStore — incoming items", () => {
  it("assigns sequential ITM codes and defaults to received_guard", async () => {
    const store = new MemoryStore();
    const a = await store.createItem(input(), "guard");
    const b = await store.createItem(input({ sender: "J&T" }), "guard");
    expect(a.code).toBe("ITM-0001");
    expect(b.code).toBe("ITM-0002");
    expect(a.status).toBe("received_guard");
    expect(a.loggedBy).toBe("guard");
    expect(a.collectedAt).toBeNull();
  });

  it("advances status guard -> reception -> collected and stamps collectedAt once", async () => {
    const store = new MemoryStore();
    const it1 = await store.createItem(input(), "guard");

    const atReception = await store.updateItem(it1.id, { status: "at_reception" });
    expect(atReception?.status).toBe("at_reception");
    expect(atReception?.collectedAt).toBeNull();

    const collected = await store.updateItem(it1.id, { status: "collected", collectedProof: SIG });
    expect(collected?.status).toBe("collected");
    expect(collected?.collectedAt).toBeTruthy();
    expect(collected?.collectedProof).toBe(SIG);

    const firstCollectedAt = collected?.collectedAt;
    const again = await store.updateItem(it1.id, { status: "collected" });
    expect(again?.collectedAt).toBe(firstCollectedAt); // idempotent stamp
  });

  it("lists by date and supports view-all, newest first", async () => {
    const store = new MemoryStore();
    const a = await store.createItem(input(), "guard");
    await store.createItem(input({ sender: "Prudential" }), "reception");

    const today = await store.listItems(localDate());
    expect(today).toHaveLength(2);

    // Age one item to yesterday — it drops out of the date view but stays in all.
    const rows = (store as unknown as { items: IncomingItem[] }).items;
    rows.find((i) => i.id === a.id)!.receivedAt = new Date(Date.now() - 86_400_000).toISOString();
    expect(await store.listItems(localDate())).toHaveLength(1);
    expect(await store.listAllItems()).toHaveLength(2);
  });

  it("deletes an item", async () => {
    const store = new MemoryStore();
    const it1 = await store.createItem(input(), "guard");
    expect(await store.deleteItem(it1.id)).toBe(true);
    expect(await store.getItem(it1.id)).toBeNull();
    expect(await store.deleteItem(it1.id)).toBe(false);
  });
});

describe("Incoming item validation", () => {
  it("accepts a valid create payload", () => {
    expect(ItemCreateSchema.safeParse(input()).success).toBe(true);
  });

  it("rejects an unknown item type and a too-short recipient", () => {
    expect(ItemCreateSchema.safeParse(input({ itemType: "weapon" as never })).success).toBe(false);
    expect(ItemCreateSchema.safeParse(input({ recipientName: "A" })).success).toBe(false);
  });

  it("rejects a non-image proof signature", () => {
    expect(ItemCreateSchema.safeParse(input({ proofSignature: "javascript:alert(1)" })).success).toBe(false);
  });

  it("requires at least one field on update", () => {
    expect(ItemUpdateSchema.safeParse({}).success).toBe(false);
    expect(ItemUpdateSchema.safeParse({ status: "collected" }).success).toBe(true);
  });
});
