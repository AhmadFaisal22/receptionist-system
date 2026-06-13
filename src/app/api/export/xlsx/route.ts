import ExcelJS from "exceljs";
import { requireRole } from "@/lib/auth";
import { fmtTime } from "@/lib/dates";
import { dict, staffDict, type Lang } from "@/lib/i18n";
import { getStore, localDate } from "@/lib/store";

export const runtime = "nodejs";

// Log-book columns, matching the receptionist dashboard view / paper form.
const WIDTHS = [12, 24, 12, 13, 13, 20, 18, 26, 22];

const thin = { style: "thin" as const, color: { argb: "FFCBD5E1" } };
const border = { top: thin, left: thin, bottom: thin, right: thin };

export async function GET(req: Request) {
  const session = await requireRole("receptionist", "admin", "guard");
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const raw = url.searchParams.get("date");
  const date = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : localDate();
  const langParam = url.searchParams.get("lang");
  const lang: Lang = langParam === "en" || langParam === "zh" ? langParam : "id";
  const t = staffDict[lang];
  const zhCols = staffDict.zh.printCols;
  const purposeLabel = (p: string) =>
    (dict[lang].purposes as Record<string, string>)[p] ?? p;
  const visits = await getStore().listVisits(date);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Visitors");
  ws.columns = WIDTHS.map((w) => ({ width: w }));

  // Logo top-left. public/ isn't on the serverless filesystem, so fetch the
  // asset from the same origin (served by the CDN) and embed it.
  try {
    const logoRes = await fetch(new URL("/seg-logo.png", req.url));
    if (logoRes.ok) {
      const buffer = await logoRes.arrayBuffer();
      const imageId = wb.addImage({ buffer, extension: "png" });
      ws.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 180, height: 56 } });
    }
  } catch {
    // no logo — export still works
  }
  ws.getRow(1).height = 16;
  ws.getRow(2).height = 16;
  ws.getRow(3).height = 16;

  ws.getCell("A4").value = "SEG SOLAR MANUFAKTUR INDONESIA";
  ws.getCell("A4").font = { bold: true, size: 14 };
  ws.getCell("A5").value = `${t.printLogBook} — ${date}`;
  ws.getCell("A5").font = { size: 11, color: { argb: "FF64748B" } };

  const headerRowNo = 7;
  const headerRow = ws.getRow(headerRowNo);
  headerRow.height = 30;
  zhCols.forEach((zh, i) => {
    const c = headerRow.getCell(i + 1);
    c.value = lang === "zh" ? zh : `${zh}\n${t.printCols[i]}`;
    c.font = { bold: true, color: { argb: "FF0F172A" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    c.alignment = { vertical: "middle", wrapText: true };
    c.border = border;
  });

  visits.forEach((v, idx) => {
    const row = ws.getRow(headerRowNo + 1 + idx);
    const values = [
      v.code,
      v.institution ? `${v.name}\n${v.institution}` : v.name,
      date,
      fmtTime(v.checkinAt),
      v.checkoutMethod === "auto" ? `${fmtTime(v.checkoutAt)} (auto)` : fmtTime(v.checkoutAt),
      purposeLabel(v.purpose),
      v.phone,
      v.hostDepartment ? `${v.hostName} (${v.hostDepartment})` : v.hostName,
      "",
    ];
    values.forEach((val, i) => {
      const c = row.getCell(i + 1);
      c.value = val;
      c.alignment = { vertical: "middle", wrapText: i === 1 };
      c.border = border;
    });
  });

  const out = await wb.xlsx.writeBuffer();
  return new Response(out as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="visitors-${date}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
