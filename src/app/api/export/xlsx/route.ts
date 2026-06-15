import ExcelJS from "exceljs";
import { requireRole } from "@/lib/auth";
import { fmtDate, fmtTime } from "@/lib/dates";
import { dict, staffDict, type Lang } from "@/lib/i18n";
import { getStore, localDate } from "@/lib/store";

export const runtime = "nodejs";

const thin = { style: "thin" as const, color: { argb: "FFCBD5E1" } };
const border = { top: thin, left: thin, bottom: thin, right: thin };
const headerFill = {
  type: "pattern" as const,
  pattern: "solid" as const,
  fgColor: { argb: "FFF1F5F9" },
};

export async function GET(req: Request) {
  const session = await requireRole("receptionist", "admin", "guard");
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const raw = url.searchParams.get("date");
  const date = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : localDate();
  const all = url.searchParams.get("all") === "1";
  const lp = url.searchParams.get("lang");
  const lang: Lang = lp === "en" || lp === "zh" ? lp : "id";
  const variant = url.searchParams.get("variant") === "modern" ? "modern" : "logbook";
  const logoKey = url.searchParams.get("logo") === "sigap" ? "sigap" : "seg";
  const logoFile = logoKey === "sigap" ? "/SIGAP.png" : "/seg-logo.png";

  const t = staffDict[lang];
  const purposeLabel = (p: string) =>
    (dict[lang].purposes as Record<string, string>)[p] ?? p;
  const statusLabel = (s: string) =>
    s === "pending" ? t.stPending : s === "checked_in" ? t.stInside : t.stOut;
  const hostLabel = (name: string) => `${t.hostHonorific} ${name}`;
  const store = getStore();
  const visits = all ? await store.listAllVisits() : await store.listVisits(date);
  const subtitle = all ? t.viewAll : date;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Visitors");

  // Logo top-left. public/ isn't on the serverless filesystem, so fetch the
  // asset from the same origin (served by the CDN) and embed it.
  try {
    const logoRes = await fetch(new URL(logoFile, req.url));
    if (logoRes.ok) {
      const buffer = await logoRes.arrayBuffer();
      const imageId = wb.addImage({ buffer, extension: "png" });
      const ext = logoKey === "sigap" ? { width: 52, height: 52 } : { width: 180, height: 56 };
      ws.addImage(imageId, { tl: { col: 0, row: 0 }, ext });
    }
  } catch {
    // no logo — export still works
  }
  ws.getRow(1).height = 16;
  ws.getRow(2).height = 16;
  ws.getRow(3).height = 16;

  ws.getCell("A4").value = "SEG SOLAR MANUFAKTUR INDONESIA";
  ws.getCell("A4").font = { bold: true, size: 14 };
  ws.getCell("A5").value = `${t.printLogBook} — ${subtitle}`;
  ws.getCell("A5").font = { size: 11, color: { argb: "FF64748B" } };

  const headerRowNo = 7;

  if (variant === "modern") {
    // Same columns as the admin/guard dashboard.
    ws.columns = [12, 28, 20, 26, 12, 13, 12, 24].map((w) => ({ width: w }));
    const headers = [
      t.colNo,
      t.colVisitor,
      t.colPurpose,
      t.colHost,
      t.colIn,
      t.colOut,
      t.colStatus,
      t.colSign,
    ];
    const hr = ws.getRow(headerRowNo);
    headers.forEach((h, i) => {
      const c = hr.getCell(i + 1);
      c.value = h;
      c.font = { bold: true, color: { argb: "FF0F172A" } };
      c.fill = headerFill;
      c.alignment = { vertical: "middle", wrapText: true };
      c.border = border;
    });
    const SIGN_COL = 8;
    visits.forEach((v, idx) => {
      const rowNo = headerRowNo + 1 + idx;
      const row = ws.getRow(rowNo);
      row.height = 26;
      const values = [
        idx + 1,
        v.institution ? `${v.name}\n${v.institution}` : v.name,
        purposeLabel(v.purpose),
        v.hostDepartment
          ? `${hostLabel(v.hostName)} (${v.hostDepartment})`
          : hostLabel(v.hostName),
        fmtTime(v.checkinAt),
        v.checkoutMethod === "auto" ? `${fmtTime(v.checkoutAt)} (auto)` : fmtTime(v.checkoutAt),
        statusLabel(v.status),
        "",
      ];
      values.forEach((val, i) => {
        const c = row.getCell(i + 1);
        c.value = val;
        c.alignment = { vertical: "middle", wrapText: i === 1 };
        c.border = border;
      });
      // Embed the signature image in the Sign column.
      try {
        const b64 = v.signatureDataUrl.split(",")[1];
        if (b64) {
          const imgId = wb.addImage({ base64: b64, extension: "png" });
          ws.addImage(imgId, {
            tl: { col: SIGN_COL - 1, row: rowNo - 1 },
            ext: { width: 100, height: 24 },
          });
        }
      } catch {
        // skip a bad signature
      }
    });
  } else {
    // Log-book columns, matching the receptionist view / paper form.
    ws.columns = [12, 24, 12, 13, 13, 20, 18, 26, 22].map((w) => ({ width: w }));
    const zhCols = staffDict.zh.printCols;
    const hr = ws.getRow(headerRowNo);
    hr.height = 30;
    zhCols.forEach((zh, i) => {
      const c = hr.getCell(i + 1);
      c.value = lang === "zh" ? zh : `${zh}\n${t.printCols[i]}`;
      c.font = { bold: true, color: { argb: "FF0F172A" } };
      c.fill = headerFill;
      c.alignment = { vertical: "middle", wrapText: true };
      c.border = border;
    });
    visits.forEach((v, idx) => {
      const row = ws.getRow(headerRowNo + 1 + idx);
      const values = [
        idx + 1,
        v.institution ? `${v.name}\n${v.institution}` : v.name,
        fmtDate(v.submittedAt),
        fmtTime(v.checkinAt),
        v.checkoutMethod === "auto" ? `${fmtTime(v.checkoutAt)} (auto)` : fmtTime(v.checkoutAt),
        purposeLabel(v.purpose),
        v.phone,
        v.hostDepartment
          ? `${hostLabel(v.hostName)} (${v.hostDepartment})`
          : hostLabel(v.hostName),
        "",
      ];
      values.forEach((val, i) => {
        const c = row.getCell(i + 1);
        c.value = val;
        c.alignment = { vertical: "middle", wrapText: i === 1 };
        c.border = border;
      });
    });
  }

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
