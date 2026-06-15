import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { fmtDate, fmtDateTime, fmtTime } from "@/lib/dates";
import { dict, staffDict, type Lang } from "@/lib/i18n";
import { getStore, localDate, toPublic } from "@/lib/store";
import PrintButton from "./PrintButton";

export default async function PrintPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; lang?: string; variant?: string; logo?: string; all?: string }>;
}) {
  const session = await requireRole("receptionist", "admin", "guard");
  if (!session) redirect("/login?next=/dashboard");

  const sp = await searchParams;
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : localDate();
  const all = sp.all === "1";
  const lang: Lang = sp.lang === "en" || sp.lang === "zh" ? sp.lang : "id";
  const variant = sp.variant === "modern" ? "modern" : "logbook";
  const logoFile = sp.logo === "sigap" ? "/SIGAP.png" : "/seg-logo.png";
  const t = staffDict[lang];
  const purposeLabel = (p: string) =>
    (dict[lang].purposes as Record<string, string>)[p] ?? p;
  const statusLabel = (s: string) =>
    s === "pending" ? t.stPending : s === "checked_in" ? t.stInside : t.stOut;
  const hostLabel = (name: string) => `${t.hostHonorific} ${name}`;
  const store = getStore();
  const visits = (all ? await store.listAllVisits() : await store.listVisits(date)).map(toPublic);
  const subtitle = all ? t.viewAll : date;

  const cell = "border border-slate-400 px-2 py-1 align-top";

  return (
    <main className="flex-1 bg-white p-8 max-w-5xl mx-auto w-full">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoFile}
            alt="logo"
            className={sp.logo === "sigap" ? "h-12 w-auto" : "h-10 w-auto"}
          />
          <div>
            <h1 className="text-lg font-bold">SEG SOLAR MANUFAKTUR INDONESIA</h1>
            <p className="text-sm">{t.printLogBook} — {subtitle}</p>
          </div>
        </div>
        <PrintButton />
      </div>

      {variant === "modern" ? (
        <table className="w-full mt-4 text-xs border-collapse">
          <thead>
            <tr>
              {[t.colNo, t.colVisitor, t.colPurpose, t.colHost, t.colIn, t.colOut, t.colStatus, t.colSign].map(
                (h, i) => (
                  <th key={i} className="border border-slate-400 px-2 py-1.5 text-left bg-slate-100">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {visits.length === 0 && (
              <tr>
                <td colSpan={8} className="border border-slate-400 px-2 py-6 text-center text-slate-400">
                  {t.printNoEntries}
                </td>
              </tr>
            )}
            {visits.map((v, idx) => (
              <tr key={v.id}>
                <td className={cell}>{idx + 1}</td>
                <td className={cell}>
                  <div>{v.name}</div>
                  {v.institution && <div className="text-[10px] text-slate-500">{v.institution}</div>}
                </td>
                <td className={cell}>{purposeLabel(v.purpose)}</td>
                <td className={cell}>
                  {hostLabel(v.hostName)}
                  {v.hostDepartment ? ` (${v.hostDepartment})` : ""}
                </td>
                <td className={cell}>{fmtTime(v.checkinAt)}</td>
                <td className={cell}>
                  {fmtTime(v.checkoutAt)}
                  {v.checkoutMethod === "auto" ? " (auto)" : ""}
                </td>
                <td className={cell}>{statusLabel(v.status)}</td>
                <td className={cell}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={v.signatureDataUrl} alt="sign" className="h-8 max-w-24 object-contain" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table className="w-full mt-4 text-xs border-collapse">
          <thead>
            <tr>
              {staffDict.zh.printCols.map((zh, i) => (
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
            {visits.map((v, idx) => (
              <tr key={v.id}>
                <td className={cell}>{idx + 1}</td>
                <td className={cell}>
                  <div>{v.name}</div>
                  {v.institution && <div className="text-[10px] text-slate-500">{v.institution}</div>}
                </td>
                <td className={cell}>{fmtDate(v.submittedAt)}</td>
                <td className={cell}>{fmtTime(v.checkinAt)}</td>
                <td className={cell}>
                  {fmtTime(v.checkoutAt)}
                  {v.checkoutMethod === "auto" ? " (auto)" : ""}
                </td>
                <td className={cell}>{purposeLabel(v.purpose)}</td>
                <td className={cell}>{v.phone}</td>
                <td className={cell}>
                  {hostLabel(v.hostName)}
                  {v.hostDepartment ? ` (${v.hostDepartment})` : ""}
                </td>
                <td className={cell}></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="text-xs text-slate-500 mt-4">
        {t.printGeneratedBy} — {fmtDateTime(new Date(), t.dateLocale)} WIB
      </p>
    </main>
  );
}
