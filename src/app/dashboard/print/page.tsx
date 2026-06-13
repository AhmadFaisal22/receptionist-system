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
  const session = await requireRole("receptionist", "admin", "guard");
  if (!session) redirect("/login?next=/dashboard");

  const sp = await searchParams;
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : localDate();
  const lang: Lang = sp.lang === "en" || sp.lang === "zh" ? sp.lang : "id";
  const t = staffDict[lang];
  const zhCols = staffDict.zh.printCols;
  const purposeLabel = (p: string) =>
    (dict[lang].purposes as Record<string, string>)[p] ?? p;
  const visits = (await getStore().listVisits(date)).map(toPublic);

  const cell = "border border-slate-400 px-2 py-1 align-top";

  return (
    <main className="flex-1 bg-white p-8 max-w-5xl mx-auto w-full">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/seg-logo.png" alt="SEG Solar" className="h-10 w-auto" />
          <div>
            <h1 className="text-lg font-bold">SEG SOLAR MANUFAKTUR INDONESIA</h1>
            <p className="text-sm">{t.printLogBook} — {date}</p>
          </div>
        </div>
        <PrintButton />
      </div>

      <table className="w-full mt-4 text-xs border-collapse">
        <thead>
          <tr>
            {zhCols.map((zh, i) => (
              <th key={i} className="border border-slate-400 px-2 py-1.5 text-left bg-slate-100 align-bottom">
                <div>{zh}</div>
                {lang !== "zh" && (
                  <div className="text-[10px] font-normal text-slate-500">{t.printCols[i]}</div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visits.length === 0 && (
            <tr>
              <td colSpan={9} className="border border-slate-400 px-2 py-6 text-center text-slate-400">
                {t.printNoEntries}
              </td>
            </tr>
          )}
          {visits.map((v) => (
            <tr key={v.id}>
              <td className={`${cell} font-mono`}>{v.code}</td>
              <td className={cell}>
                <div>{v.name}</div>
                {v.institution && <div className="text-[10px] text-slate-500">{v.institution}</div>}
              </td>
              <td className={cell}>{date}</td>
              <td className={cell}>{fmtTime(v.checkinAt)}</td>
              <td className={cell}>
                {fmtTime(v.checkoutAt)}
                {v.checkoutMethod === "auto" ? " (auto)" : ""}
              </td>
              <td className={cell}>{purposeLabel(v.purpose)}</td>
              <td className={cell}>{v.phone}</td>
              <td className={cell}>
                {v.hostName}
                {v.hostDepartment ? ` (${v.hostDepartment})` : ""}
              </td>
              <td className={cell}></td>
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
