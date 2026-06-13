import ExcelJS from "exceljs";
import { requireRole } from "@/lib/auth";
import { fmtTime } from "@/lib/dates";
import { getStore, localDate } from "@/lib/store";

export const runtime = "nodejs";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  checked_in: "Inside",
  checked_out: "Out",
};

const HEADERS = [
  "No",
  "Tanggal / Date",
  "Nama / Name",
  "Instansi / Institution",
  "Telepon / Phone",
  "Keperluan / Purpose",
  "Ditemui / Host",
  "Jam Masuk / In",
  "Jam Keluar / Out",
  "Status",
];
const WIDTHS = [12, 12, 22, 26, 18, 22, 26, 11, 12, 10];

const thin = { style: "thin" as const, color: { argb: "FFCBD5E1" } };
const border = { top: thin, left: thin, bottom: thin, right: thin };

export async function GET(req: Request) {
  const session = await requireRole("receptionist", "admin");
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const raw = new URL(req.url).searchParams.get("date");
  const date = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : localDate();
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
  ws.getCell("A5").value = `Visitor Log Book — ${date}`;
  ws.getCell("A5").font = { size: 11, color: { argb: "FF64748B" } };

  const headerRowNo = 7;
  const headerRow = ws.getRow(headerRowNo);
  HEADERS.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: "FF0F172A" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.border = border;
  });

  visits.forEach((v, idx) => {
    const row = ws.getRow(headerRowNo + 1 + idx);
    const values = [
      v.code,
      date,
      v.name,
      v.institution,
      v.phone,
      v.purpose,
      v.hostDepartment ? `${v.hostName} (${v.hostDepartment})` : v.hostName,
      fmtTime(v.checkinAt),
      v.checkoutMethod === "auto" ? `${fmtTime(v.checkoutAt)} (auto)` : fmtTime(v.checkoutAt),
      STATUS_LABEL[v.status] ?? v.status,
    ];
    values.forEach((val, i) => {
      const cell = row.getCell(i + 1);
      cell.value = val;
      cell.alignment = { vertical: "middle" };
      cell.border = border;
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
