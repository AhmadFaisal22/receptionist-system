import { requireRole } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { fmtTime } from "@/lib/dates";
import { getStore, localDate } from "@/lib/store";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  checked_in: "Inside",
  checked_out: "Out",
};

export async function GET(req: Request) {
  const session = await requireRole("receptionist", "admin");
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const raw = new URL(req.url).searchParams.get("date");
  const date = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : localDate();
  const visits = await getStore().listVisits(date);

  const rows: string[][] = [
    [
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
    ],
    ...visits.map((v) => [
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
    ]),
  ];

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="visitors-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
