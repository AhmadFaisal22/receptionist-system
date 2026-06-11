import { describe, expect, it } from "vitest";
import { CheckinSchema, CheckoutSchema, EmployeeSchema } from "../src/lib/validation";

const SIG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";

const valid = {
  name: "  Budi Santoso  ",
  institution: "PT Logistik Nusantara",
  phone: "+62 812-3456-7890",
  purpose: "meeting",
  hostName: "Rina Wijaya",
  signatureDataUrl: SIG,
  lang: "id",
};

describe("CheckinSchema", () => {
  it("accepts a valid payload and trims whitespace", () => {
    const parsed = CheckinSchema.parse(valid);
    expect(parsed.name).toBe("Budi Santoso");
    expect(parsed.hostDepartment).toBe("");
  });

  it("rejects bad phone numbers", () => {
    expect(CheckinSchema.safeParse({ ...valid, phone: "abc" }).success).toBe(false);
    expect(CheckinSchema.safeParse({ ...valid, phone: "12" }).success).toBe(false);
    expect(
      CheckinSchema.safeParse({ ...valid, phone: "0812'; DROP TABLE visits;--" }).success,
    ).toBe(false);
  });

  it("rejects unknown purposes", () => {
    expect(CheckinSchema.safeParse({ ...valid, purpose: "sabotage" }).success).toBe(false);
  });

  it("rejects non-PNG signature payloads", () => {
    expect(
      CheckinSchema.safeParse({ ...valid, signatureDataUrl: "data:text/html;base64,PGI+" })
        .success,
    ).toBe(false);
    expect(
      CheckinSchema.safeParse({ ...valid, signatureDataUrl: "<script>alert(1)</script>" })
        .success,
    ).toBe(false);
  });

  it("rejects oversized signatures", () => {
    const big = "data:image/png;base64," + "A".repeat(500_000);
    expect(CheckinSchema.safeParse({ ...valid, signatureDataUrl: big }).success).toBe(false);
  });

  it("rejects names that are too short or too long", () => {
    expect(CheckinSchema.safeParse({ ...valid, name: "B" }).success).toBe(false);
    expect(CheckinSchema.safeParse({ ...valid, name: "x".repeat(81) }).success).toBe(false);
  });
});

describe("CheckoutSchema", () => {
  it("accepts a uuid token", () => {
    expect(
      CheckoutSchema.safeParse({ token: "123e4567-e89b-12d3-a456-426614174000" }).success,
    ).toBe(true);
  });

  it("accepts code+phone", () => {
    expect(CheckoutSchema.safeParse({ code: "SEG-0001", phone: "08123456789" }).success).toBe(
      true,
    );
  });

  it("rejects malformed tokens and codes", () => {
    expect(CheckoutSchema.safeParse({ token: "not-a-uuid" }).success).toBe(false);
    expect(CheckoutSchema.safeParse({ code: "HACK-1", phone: "08123456789" }).success).toBe(
      false,
    );
  });
});

describe("EmployeeSchema", () => {
  it("accepts and rejects sensibly", () => {
    expect(EmployeeSchema.safeParse({ name: "Mei Lin", department: "Engineering" }).success).toBe(
      true,
    );
    expect(EmployeeSchema.safeParse({ name: "M", department: "" }).success).toBe(false);
  });
});
