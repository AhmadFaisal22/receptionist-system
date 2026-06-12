import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { fmtTime } from "@/lib/dates";
import { dict, staffDict, type Lang } from "@/lib/i18n";
import { getStore, localDate, toPublic } from "@/lib/store";
import PrintButton from "./PrintButton";

export default async function PrintPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; lang?: string }>;
}) {
  const session = await requireRole("receptionist", "admin");
  if (!session) redirect("/login?next=/dashboard");

  const sp = await searchParams;
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : localDate();
  const lang: Lang = sp.lang === "en" || sp.lang === "zh" ? sp.lang : "id";
  const t = staffDict[lang];
  const purposeLabel = (p: string) =>
    (dict[lang].purposes as Record<string, string>)[p] ?? p;
  const visits = (await getStore().listVisits(date)).map(toPublic);

  return (
    <main className="flex-1 bg-white p-8 max-w-5xl mx-auto w-full">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold">SEG SOLAR MANUFAKTUR INDONESIA</h1>
          <p className="text-sm">{t.printLogBook} — {date}</p>
        </div>
        <PrintButton />
      </div>

      <table className="w-full mt-4 text-xs border-collapse">
        <thead>
          <tr>
            {t.printCols.map((h) => (
              <th key={h} className="border border-slate-400 px-2 py-1.5 text-left bg-slate-100">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visits.length === 0 && (
            <tr>
              <td colSpan={10} className="border border-slate-400 px-2 py-6 text-center text-slate-400">
                {t.printNoEntries}
              </td>
            </tr>
          )}
          {visits.map((v) => (
            <tr key={v.id}>
              <td className="border border-slate-400 px-2 py-1 font-mono">{v.code}</td>
              <td className="border border-slate-400 px-2 py-1">{date}</td>
              <td className="border border-slate-400 px-2 py-1">{v.name}</td>
              <td className="border border-slate-400 px-2 py-1">{v.institution}</td>
              <td className="border border-slate-400 px-2 py-1">{v.phone}</td>
              <td className="border border-slate-400 px-2 py-1">{purposeLabel(v.purpose)}</td>
              <td className="border border-slate-400 px-2 py-1">
                {v.hostName}
                {v.hostDepartment ? ` (${v.hostDepartment})` : ""}
              </td>
              <td className="border border-slate-400 px-2 py-1">{fmtTime(v.checkinAt)}</td>
              <td className="border border-slate-400 px-2 py-1">
                {fmtTime(v.checkoutAt)}
                {v.checkoutMethod === "auto" ? " (auto)" : ""}
              </td>
              <td className="border border-slate-400 px-2 py-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={v.signatureDataUrl} alt="ttd" className="h-8 max-w-24 object-contain" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-xs text-slate-500 mt-4">
        {t.printGeneratedBy} — {new Date().toLocaleString(t.dateLocale)}
      </p>
    </main>
  );
}
