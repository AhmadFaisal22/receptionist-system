import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { fmtDate, fmtDateTime, fmtTime } from "@/lib/dates";
import { itemsDict, staffDict, type Lang } from "@/lib/i18n";
import { getStore, localDate } from "@/lib/store";
import PrintButton from "../../dashboard/print/PrintButton";

export default async function ItemsPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; lang?: string; all?: string; action?: string }>;
}) {
  const session = await requireRole("guard", "receptionist", "admin");
  if (!session) redirect("/login?next=/items");

  const sp = await searchParams;
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : localDate();
  const all = sp.all === "1";
  const lang: Lang = sp.lang === "en" || sp.lang === "zh" ? sp.lang : "id";
  const action = sp.action === "save" || sp.action === "print" ? sp.action : undefined;
  const t = itemsDict[lang];
  const st = staffDict[lang];

  const store = getStore();
  const items = all ? await store.listAllItems() : await store.listItems(date);
  const subtitle = all ? st.viewAll : date;
  const generated = `${st.printGeneratedBy} — ${fmtDateTime(new Date(), t.dateLocale)} WIB`;

  // Column width ratios: No / Received / Sender / Type / Description /
  // Recipient / Dept / Status / Proof.
  const colw = [5, 12, 16, 9, 18, 15, 9, 10, 6];

  const cell = "border border-slate-400 px-2 py-1 align-top break-words [overflow-wrap:anywhere]";
  const th =
    "border border-slate-400 px-2 py-1.5 text-center align-middle bg-slate-100 whitespace-normal break-words [overflow-wrap:anywhere]";

  return (
    <main className="flex-1 bg-white p-4 sm:p-8 mx-auto w-full max-w-5xl">
      <div className="no-print mb-4 flex justify-end">
        <PrintButton
          fileBase={`incoming-items-${all ? "all" : date}`}
          captureId="print-root"
          saveLabel={st.savePdf}
          printLabel={st.printPdf}
          autoAction={action}
        />
      </div>

      <div id="print-root" className="bg-white">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/seg-logo.png" alt="logo" className="h-10 w-auto" crossOrigin="anonymous" />
          <div>
            <h1 className="text-base sm:text-lg font-bold">SEG SOLAR MANUFAKTUR INDONESIA</h1>
            <p className="text-sm">{t.title} — {subtitle}</p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs border-collapse table-fixed min-w-[820px]">
            <colgroup>
              {colw.map((w, i) => (
                <col key={i} style={{ width: `${w}%` }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {t.cols.map((label, i) => (
                  <th key={i} className={th}>
                    <div className="leading-tight">{label}</div>
                    {lang !== "zh" && (
                      <div className="text-[10px] font-normal text-slate-500 leading-tight mt-0.5">
                        {itemsDict.zh.cols[i]}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={9} className="border border-slate-400 px-2 py-6 text-center text-slate-400">
                    {t.empty}
                  </td>
                </tr>
              )}
              {items.map((i, idx) => (
                <tr key={i.id}>
                  <td className={`${cell} text-center`}>{idx + 1}</td>
                  <td className={`${cell} text-center`}>
                    {fmtDate(i.receivedAt)} {fmtTime(i.receivedAt)}
                  </td>
                  <td className={cell}>{i.sender}</td>
                  <td className={cell}>{t.types[i.itemType]}</td>
                  <td className={cell}>{i.description}</td>
                  <td className={cell}>{i.recipientName}</td>
                  <td className={cell}>{i.recipientDepartment}</td>
                  <td className={`${cell} text-center`}>{t.statuses[i.status]}</td>
                  <td className={`${cell} text-center`}>
                    {i.proofSignature || i.proofPhoto ? "✓" : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-500 mt-4">{generated}</p>
      </div>
    </main>
  );
}
