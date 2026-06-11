// CSV building with protection against spreadsheet formula injection:
// visitor-supplied text starting with = + - @ or tab would otherwise execute
// as a formula when the receptionist opens the export in Excel.

export function csvCell(value: string | null | undefined): string {
  let v = value ?? "";
  if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
  if (/[",\n\r]/.test(v)) v = `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function toCsv(rows: (string | null | undefined)[][]): string {
  // BOM so Excel detects UTF-8 (Indonesian + Chinese names survive).
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}
