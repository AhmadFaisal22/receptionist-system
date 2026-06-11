import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "../src/lib/csv";

describe("csvCell", () => {
  it("neutralizes spreadsheet formula injection", () => {
    expect(csvCell("=HYPERLINK(\"http://evil\")")).toMatch(/^"?'=/);
    expect(csvCell("+62 812")).toMatch(/^"?'\+62 812/);
    expect(csvCell("-cmd")).toMatch(/^'-/);
    expect(csvCell("@SUM(A1)")).toMatch(/^'@/);
  });

  it("quotes separators and doubles quotes", () => {
    expect(csvCell('PT "Maju", Tbk')).toBe('"PT ""Maju"", Tbk"');
  });

  it("passes plain values through", () => {
    expect(csvCell("Budi Santoso")).toBe("Budi Santoso");
    expect(csvCell(null)).toBe("");
  });
});

describe("toCsv", () => {
  it("starts with a UTF-8 BOM and joins with CRLF", () => {
    const out = toCsv([
      ["a", "b"],
      ["c", "d"],
    ]);
    expect(out.charCodeAt(0)).toBe(0xfeff);
    expect(out.slice(1)).toBe("a,b\r\nc,d");
  });
});
