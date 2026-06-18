import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { fmtDate, fmtDateTime, fmtTime } from "@/lib/dates";
import { dict, staffDict, type Lang } from "@/lib/i18n";
import { getStore, localDate, toPublic } from "@/lib/store";
import PrintButton from "./PrintButton";

export default async function PrintPage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    lang?: string;
    variant?: string;
    logo?: string;
    all?: string;
    action?: string;
  }>;
}) {
  const session = await requireRole("receptionist", "admin", "guard");
  if (!session) redirect("/login?next=/dashboard");

  const sp = await searchParams;
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : localDate();
  const all = sp.all === "1";
  const lang: Lang = sp.lang === "en" || sp.lang === "zh" ? sp.lang : "id";
  const variant = sp.variant === "modern" ? "modern" : "logbook";
  const logoFile = sp.logo === "sigap" ? "/SIGAP.png" : "/seg-logo.png";
  const action = sp.action === "save" || sp.action === "print" ? sp.action : undefined;
  const t = staffDict[lang];
  const purposeLabel = (p: string) =>
    (dict[lang].purposes as Record<string, string>)[p] ?? p;
  const statusLabel = (s: string) =>
    s === "pending" ? t.stPending : s === "checked_in" ? t.stInside : t.stOut;
  const hostLabel = (name: string) => `${t.hostHonorific} ${name}`;
  const store = getStore();
  const visits = (all ? await store.listAllVisits() : await store.listVisits(date)).map(toPublic);
  const subtitle = all ? t.viewAll : date;
  const generated = `${t.printGeneratedBy} — ${fmtDateTime(new Date(), t.dateLocale)} WIB`;

  const cell = "border border-slate-400 px-2 py-1 align-top break-words [overflow-wrap:anywhere]";
  const th =
    "border border-slate-400 px-2 py-1.5 text-left bg-slate-100 align-bottom whitespace-normal break-words [overflow-wrap:anywhere]";

  // Column width ratios so the table never blows out / headers wrap cleanly.
  const modernCols = [6, 18, 13, 19, 9, 9, 11, 15];
  const logbookCols = [5, 16, 10, 9, 9, 13, 12, 16, 10];

  // Structured rows for the downloadable PDF (built once, reused by jsPDF).
  const host = (v: (typeof visits)[number]) =>
    v.hostDepartment ? `${hostLabel(v.hostName)} (${v.hostDepartment})` : hostLabel(v.hostName);
  const nameCell = (v: (typeof visits)[number]) =>
    v.institution ? `${v.name}\n${v.institution}` : v.name;

  const pdfHead =
    variant === "modern"
      ? [t.colNo, t.colVisitor, t.colPurpose, t.colHost, t.colIn, t.colOut, t.colStatus, t.colSign]
      : t.printCols;
  const pdfBody = visits.map((v, idx) =>
    variant === "modern"
      ? [
          String(idx + 1),
          nameCell(v),
          purposeLabel(v.purpose),
          host(v),
          fmtTime(v.checkinAt),
          v.checkoutMethod === "auto" ? `${fmtTime(v.checkoutAt)} (auto)` : fmtTime(v.checkoutAt),
          statusLabel(v.status),
          "",
        ]
      : [
          String(idx + 1),
          nameCell(v),
          fmtDate(v.submittedAt),
          fmtTime(v.checkinAt),
          v.checkoutMethod === "auto" ? `${fmtTime(v.checkoutAt)} (auto)` : fmtTime(v.checkoutAt),
          purposeLabel(v.purpose),
          v.phone,
          host(v),
          v.notes,
        ],
  );
  const signatures =
    variant === "modern"
      ? visits.map((v, idx) => ({ row: idx, url: v.signatureDataUrl })).filter((s) => s.url)
      : [];
  const signCol = variant === "modern" ? 7 : -1;

  return (
    <main className="flex-1 bg-white p-4 sm:p-8 mx-auto w-full max-w-5xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoFile}
            alt="logo"
            className={sp.logo === "sigap" ? "h-12 w-auto" : "h-10 w-auto"}
          />
          <div>
            <h1 className="text-base sm:text-lg font-bold">SEG SOLAR MANUFAKTUR INDONESIA</h1>
            <p className="text-sm">{t.printLogBook} — {subtitle}</p>
          </div>
        </div>
        <PrintButton
          fileBase={`visitors-${all ? "all" : date}`}
          docTitle="SEG SOLAR MANUFAKTUR INDONESIA"
          docSubtitle={`${t.printLogBook} — ${subtitle}`}
          generated={generated}
          head={pdfHead}
          body={pdfBody}
          signatures={signatures}
          signCol={signCol}
          saveLabel={t.savePdf}
          printLabel={t.printPdf}
          autoAction={action}
        />
      </div>

      <div className="mt-4 overflow-x-auto">
        {variant === "modern" ? (
          <table className="w-full text-xs border-collapse table-fixed min-w-[720px]">
            <colgroup>
              {modernCols.map((w, i) => (
                <col key={i} style={{ width: `${w}%` }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {pdfHead.map((h, i) => (
                  <th key={i} className={th}>
                    {h}
                  </th>
                ))}
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
                  <td className={cell}>{host(v)}</td>
                  <td className={cell}>{fmtTime(v.checkinAt)}</td>
                  <td className={cell}>
                    {fmtTime(v.checkoutAt)}
                    {v.checkoutMethod === "auto" ? " (auto)" : ""}
                  </td>
                  <td className={cell}>{statusLabel(v.status)}</td>
                  <td className={cell}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.signatureDataUrl} alt="sign" className="h-8 max-w-full object-contain" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-xs border-collapse table-fixed min-w-[820px]">
            <colgroup>
              {logbookCols.map((w, i) => (
                <col key={i} style={{ width: `${w}%` }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {staffDict.zh.printCols.map((zh, i) => (
                  <th key={i} className={th}>
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
                  <td className={cell}>{host(v)}</td>
                  <td className={cell}>{v.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-slate-500 mt-4">{generated}</p>
    </main>
  );
}
