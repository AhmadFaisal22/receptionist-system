"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { fmtDate, fmtTime, localDate } from "@/lib/dates";
import { dict, staffDict, type Lang, type StaffMessages } from "@/lib/i18n";
import { useLang } from "@/lib/useLang";
import type { PublicVisit } from "@/lib/types";
import BackToMenu from "@/components/BackToMenu";
import LangToggle from "@/components/LangToggle";
import Logo from "@/components/Logo";

type Variant = "modern" | "logbook";

// Column headers for the receptionist log-book view, mirroring the official
// paper form (Chinese on top, selected language below).
const LOGBOOK_ZH = [
  "序号",
  "姓名",
  "日期",
  "进入时间",
  "离开时间",
  "事由",
  "联系方式",
  "SEG对接人员",
  "备注/物品进出",
];
const LOGBOOK_SUB: Record<Lang, string[]> = {
  id: ["No", "Nama", "Tanggal", "Waktu Masuk", "Waktu Keluar", "Alasan", "Kontak", "Personel SEG", "Catatan/Barang"],
  en: ["No", "Name", "Date", "Clock in", "Clock out", "Purpose", "Contact", "SEG host", "Notes/Items"],
  zh: LOGBOOK_ZH,
};
// Per-column width + alignment for the log-book table (table-fixed). The widths
// act as ratios on desktop and as real widths under the min-width on mobile,
// so columns stay even instead of cramming together.
const LOGBOOK_COLW = [
  "w-[44px]",
  "w-[200px]",
  "w-[110px]",
  "w-[96px]",
  "w-[96px]",
  "w-[150px]",
  "w-[140px]",
  "w-[190px]",
  "w-[150px]",
];
const LOGBOOK_ALIGN = [
  "text-center",
  "text-left",
  "text-center whitespace-nowrap",
  "text-center whitespace-nowrap",
  "text-center whitespace-nowrap",
  "text-left",
  "text-left",
  "text-left",
  "text-left",
];

function StatusPill({ visit, t }: { visit: PublicVisit; t: StaffMessages }) {
  if (visit.status === "pending") {
    return (
      <span className="rounded-full bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-0.5">
        {t.stPending}
      </span>
    );
  }
  if (visit.status === "checked_in") {
    return (
      <span className="rounded-full bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5">
        {t.stInside}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-slate-100 text-slate-500 text-xs font-medium px-2.5 py-0.5 border border-slate-200">
      {t.stOut}
      {visit.checkoutMethod === "auto" ? " (auto)" : ""}
    </span>
  );
}

function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);
  useEffect(() => {
    const obj = { v: prev.current };
    gsap.to(obj, {
      v: value,
      duration: 0.6,
      ease: "power1.out",
      snap: { v: 1 },
      onUpdate: () => {
        if (ref.current) ref.current.textContent = String(Math.round(obj.v));
      },
    });
    prev.current = value;
  }, [value]);
  return <span ref={ref}>{value}</span>;
}

export default function DashboardClient({
  user,
  role,
  variant = "modern",
  loginNext = "/dashboard",
  logoSrc = "/seg-logo.png",
  logoAlt = "SEG Solar",
  canEdit = false,
}: {
  user: string;
  role: string;
  variant?: Variant;
  loginNext?: string;
  logoSrc?: string;
  logoAlt?: string;
  /** Show edit/delete controls in the detail drawer (receptionist only). */
  canEdit?: boolean;
}) {
  const [lang, setLang] = useLang();
  const t = staffDict[lang];
  const purposeLabel = (p: string) =>
    (dict[lang].purposes as Record<string, string>)[p] ?? p;
  // Address the host politely (Mr/Ms · Bapak/Ibu · 先生/女士).
  const hostLabel = (name: string) => `${t.hostHonorific} ${name}`;
  const logoKey = logoSrc.includes("SIGAP") ? "sigap" : "seg";

  const [visits, setVisits] = useState<PublicVisit[]>([]);
  const [date, setDate] = useState(localDate());
  const [showAll, setShowAll] = useState(false);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<PublicVisit | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    institution: "",
    phone: "",
    purpose: "",
    hostName: "",
    hostDepartment: "",
  });
  const [busy, setBusy] = useState(false);
  const [editError, setEditError] = useState("");
  const [live, setLive] = useState(false);
  const prevIds = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);
  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  const exportQs = showAll
    ? `all=1&lang=${lang}&variant=${variant}&logo=${logoKey}`
    : `date=${date}&lang=${lang}&variant=${variant}&logo=${logoKey}`;

  const load = useCallback(async () => {
    try {
      const res = await fetch(showAll ? `/api/visits?all=1` : `/api/visits?date=${date}`, {
        cache: "no-store",
      });
      if (res.status === 401) {
        window.location.replace(`/login?next=${loginNext}`);
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      setVisits((await res.json()) as PublicVisit[]);
      setLive(true);
    } catch {
      setLive(false);
    }
  }, [date, showAll, loginNext]);

  useEffect(() => {
    firstLoad.current = true;
    load();
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
  }, [load]);

  // GSAP: slide-in + highlight for rows that appeared since the last poll.
  useEffect(() => {
    const fresh = visits.filter((v) => !prevIds.current.has(v.id));
    if (!firstLoad.current && fresh.length > 0 && tbodyRef.current) {
      for (const v of fresh) {
        const el = tbodyRef.current.querySelector(`[data-vid="${v.id}"]`);
        if (el) {
          gsap.fromTo(
            el,
            { y: -14, opacity: 0, backgroundColor: "#fef3c7" },
            {
              y: 0,
              opacity: 1,
              backgroundColor: "#ffffff",
              duration: 0.9,
              ease: "power2.out",
              clearProps: "backgroundColor,transform",
            },
          );
        }
      }
    }
    prevIds.current = new Set(visits.map((v) => v.id));
    if (visits.length > 0 || !firstLoad.current) firstLoad.current = false;
  }, [visits]);

  const stats = useMemo(() => {
    const pending = visits.filter((v) => v.status === "pending").length;
    const inside = visits.filter((v) => v.status === "checked_in").length;
    const out = visits.filter((v) => v.status === "checked_out").length;
    return { total: visits.length, pending, inside, out };
  }, [visits]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return visits;
    return visits.filter((v) =>
      [v.name, v.institution, v.hostName, v.code]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [visits, q]);

  async function action(visit: PublicVisit, kind: "confirm" | "checkout") {
    await fetch(`/api/visits/${visit.id}/${kind}`, { method: "POST" });
    setSelected(null);
    load();
  }

  function startEdit(v: PublicVisit) {
    setForm({
      name: v.name,
      institution: v.institution,
      phone: v.phone,
      purpose: v.purpose,
      hostName: v.hostName,
      hostDepartment: v.hostDepartment ?? "",
    });
    setEditError("");
    setEditing(true);
  }

  async function saveEdit(visit: PublicVisit) {
    setBusy(true);
    setEditError("");
    try {
      const res = await fetch(`/api/visits/${visit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        setEditError(t.addError);
        return;
      }
      const updated = (await res.json()) as PublicVisit;
      setSelected(updated);
      setEditing(false);
      load();
    } catch {
      setEditError(t.networkError);
    } finally {
      setBusy(false);
    }
  }

  async function deleteVisit(visit: PublicVisit) {
    if (!window.confirm(t.confirmDeleteVisit)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/visits/${visit.id}`, { method: "DELETE" });
      if (res.ok) {
        setSelected(null);
        setEditing(false);
        load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.replace("/login");
  }

  const td = "border border-slate-300 px-3 py-2 align-top";

  return (
    <main className="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Logo className="h-9 w-auto" src={logoSrc} alt={logoAlt} />
          <div>
            <h1 className="text-base font-semibold leading-tight">
              SEG Solar Manufaktur Indonesia
            </h1>
            <p className="text-xs text-slate-500">
              {variant === "logbook" ? "外来人员进出登记表" : t.visitorLog} —{" "}
              {new Date(date + "T00:00:00").toLocaleDateString(t.dateLocale, {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <LangToggle lang={lang} setLang={setLang} />
          <span
            className={`flex items-center gap-1.5 rounded-full text-xs font-medium px-3 py-1 ${
              live ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-500"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${live ? "bg-green-600" : "bg-slate-400"}`} />
            {live ? t.live : t.offline}
          </span>
          <span className="text-xs text-slate-500 hidden sm:block">
            {user} ({role})
          </span>
          <BackToMenu label={t.menu} className="text-xs" />
          <button onClick={logout} className="text-xs text-slate-500 underline">
            {t.signOut}
          </button>
        </div>
      </header>

      {variant === "modern" && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          {(
            [
              [t.statToday, stats.total],
              [t.statInside, stats.inside],
              [t.statPending, stats.pending],
              [t.statCheckedOut, stats.out],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-white border border-slate-200 p-4">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-2xl font-semibold mt-1">
                <AnimatedNumber value={value} />
              </p>
            </div>
          ))}
        </section>
      )}

      <section className="flex items-center gap-2 mt-5 flex-wrap">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="flex-1 min-w-48 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <input
          type="date"
          value={date}
          disabled={showAll}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-40"
        />
        <button
          onClick={() => setShowAll((s) => !s)}
          className={`rounded-xl border px-3 py-2 text-sm ${
            showAll
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-slate-600 border-slate-300 hover:border-slate-400"
          }`}
        >
          {showAll ? t.viewByDate : t.viewAll}
        </button>
        <a
          href={`/api/export/xlsx?${exportQs}`}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:border-slate-400"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/excel.svg" alt="" className="h-4 w-4" />
          {t.excel}
        </a>
        <a
          href={`/dashboard/print?${exportQs}`}
          target="_blank"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:border-slate-400"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pdf.svg" alt="" className="h-4 w-4" />
          {t.pdf}
        </a>
      </section>

      {variant === "logbook" ? (
        <section className="mt-4 bg-white border border-slate-300 rounded-xl overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm border-collapse table-fixed">
            <colgroup>
              {LOGBOOK_COLW.map((w, i) => (
                <col key={i} className={w} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {LOGBOOK_ZH.map((zh, i) => (
                  <th
                    key={i}
                    className={`border border-slate-300 px-3 py-2.5 bg-slate-100 align-bottom ${LOGBOOK_ALIGN[i]}`}
                  >
                    <div className="text-[13px] font-medium text-slate-700 leading-tight">{zh}</div>
                    {lang !== "zh" && (
                      <div className="text-[10px] text-slate-400 font-normal leading-tight mt-0.5">
                        {LOGBOOK_SUB[lang][i]}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody ref={tbodyRef}>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="border border-slate-300 px-2 py-10 text-center text-slate-400">
                    {t.emptyToday}
                  </td>
                </tr>
              )}
              {filtered.map((v, i) => (
                <tr
                  key={v.id}
                  data-vid={v.id}
                  onClick={() => setSelected(v)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className={`${td} ${LOGBOOK_ALIGN[0]}`}>{i + 1}</td>
                  <td className={`${td} ${LOGBOOK_ALIGN[1]}`}>
                    <p className="font-medium break-words">{v.name}</p>
                    <p className="text-xs text-slate-500 break-words">{v.institution}</p>
                  </td>
                  <td className={`${td} ${LOGBOOK_ALIGN[2]}`}>{fmtDate(v.submittedAt)}</td>
                  <td className={`${td} ${LOGBOOK_ALIGN[3]}`}>{fmtTime(v.checkinAt)}</td>
                  <td className={`${td} ${LOGBOOK_ALIGN[4]}`}>{fmtTime(v.checkoutAt)}</td>
                  <td className={`${td} ${LOGBOOK_ALIGN[5]} break-words`}>{purposeLabel(v.purpose)}</td>
                  <td className={`${td} ${LOGBOOK_ALIGN[6]} break-words`}>{v.phone}</td>
                  <td className={`${td} ${LOGBOOK_ALIGN[7]} break-words`}>
                    {hostLabel(v.hostName)}
                    {v.hostDepartment ? ` (${v.hostDepartment})` : ""}
                  </td>
                  <td className={`${td} ${LOGBOOK_ALIGN[8]} text-slate-300`}>—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <section className="mt-4 rounded-2xl bg-white border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                <th className="px-4 py-3 font-medium">{t.colNo}</th>
                <th className="px-2 py-3 font-medium">{t.colVisitor}</th>
                <th className="px-2 py-3 font-medium">{t.colPurpose}</th>
                <th className="px-2 py-3 font-medium">{t.colHost}</th>
                <th className="px-2 py-3 font-medium">{t.colIn}</th>
                <th className="px-2 py-3 font-medium">{t.colOut}</th>
                <th className="px-2 py-3 font-medium">{t.colStatus}</th>
                <th className="px-2 py-3 font-medium">{t.colSign}</th>
              </tr>
            </thead>
            <tbody ref={tbodyRef}>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    {t.emptyToday}
                  </td>
                </tr>
              )}
              {filtered.map((v, i) => (
                <tr
                  key={v.id}
                  data-vid={v.id}
                  onClick={() => setSelected(v)}
                  className="border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50"
                >
                  <td className="px-4 py-2.5">{i + 1}</td>
                  <td className="px-2 py-2.5">
                    <p className="font-medium">{v.name}</p>
                    <p className="text-xs text-slate-500">{v.institution}</p>
                  </td>
                  <td className="px-2 py-2.5 text-slate-600">{purposeLabel(v.purpose)}</td>
                  <td className="px-2 py-2.5">
                    <p>{hostLabel(v.hostName)}</p>
                    {v.hostDepartment && (
                      <p className="text-xs text-slate-500">{v.hostDepartment}</p>
                    )}
                  </td>
                  <td className="px-2 py-2.5">{fmtTime(v.checkinAt)}</td>
                  <td className="px-2 py-2.5">{fmtTime(v.checkoutAt)}</td>
                  <td className="px-2 py-2.5">
                    <StatusPill visit={v} t={t} />
                  </td>
                  <td className="px-2 py-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.signatureDataUrl} alt="signature" className="h-6 max-w-16 object-contain" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <p className="text-xs text-slate-400 mt-3">⟳ {t.autoUpdate}</p>

      {selected && (
        <div
          className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-20"
          onClick={() => {
            setSelected(null);
            setEditing(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-xs text-slate-500">{selected.code}</p>
                <h2 className="text-lg font-semibold">{editing ? t.editTitle : selected.name}</h2>
                {!editing && <p className="text-sm text-slate-500">{selected.institution}</p>}
              </div>
              <StatusPill visit={selected} t={t} />
            </div>

            {editing ? (
              <div className="mt-4 space-y-3 text-sm">
                {(
                  [
                    ["name", t.fullName],
                    ["institution", t.institutionLabel],
                    ["phone", t.phoneLabel],
                    ["purpose", t.colPurpose],
                    ["hostName", t.colHost],
                    ["hostDepartment", t.department],
                  ] as const
                ).map(([field, label]) => (
                  <div key={field}>
                    <label className="block text-xs text-slate-500 mb-1">{label}</label>
                    <input
                      value={form[field]}
                      onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-slate-500"
                    />
                  </div>
                ))}
                {editError && <p className="text-red-600 text-xs">{editError}</p>}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => saveEdit(selected)}
                    disabled={busy}
                    className="flex-1 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-medium disabled:opacity-50"
                  >
                    {busy ? t.savingEdit : t.saveEdit}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    disabled={busy}
                    className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-600"
                  >
                    {t.cancelEdit}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex gap-3 mt-4">
                  {selected.photoDataUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={selected.photoDataUrl}
                      alt="visitor"
                      className="w-24 h-24 rounded-2xl object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                      {t.noPhoto}
                    </div>
                  )}
                  <div className="flex-1 text-sm space-y-1.5">
                    <p>
                      <span className="text-slate-500">{t.phoneLabel}:</span> {selected.phone}
                    </p>
                    <p>
                      <span className="text-slate-500">{t.colPurpose}:</span>{" "}
                      {purposeLabel(selected.purpose)}
                    </p>
                    <p>
                      <span className="text-slate-500">{t.colHost}:</span>{" "}
                      {hostLabel(selected.hostName)}
                      {selected.hostDepartment ? ` — ${selected.hostDepartment}` : ""}
                    </p>
                    <p>
                      <span className="text-slate-500">{t.colIn}:</span> {fmtTime(selected.checkinAt)}{" "}
                      <span className="text-slate-500 ml-2">{t.colOut}:</span>{" "}
                      {fmtTime(selected.checkoutAt)}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-4 mb-1">{t.signatureLabel}</p>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selected.signatureDataUrl} alt="signature" className="h-16 mx-auto object-contain" />
                </div>
                <div className="flex flex-wrap gap-2 mt-5">
                  {selected.status === "pending" && (
                    <button
                      onClick={() => action(selected, "confirm")}
                      className="flex-1 rounded-xl bg-green-600 text-white px-4 py-2.5 text-sm font-medium"
                    >
                      {t.confirmArrival}
                    </button>
                  )}
                  {selected.status !== "checked_out" && (
                    <button
                      onClick={() => action(selected, "checkout")}
                      className="flex-1 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-medium"
                    >
                      {t.clockOut}
                    </button>
                  )}
                  {canEdit && (
                    <>
                      <button
                        onClick={() => startEdit(selected)}
                        className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-700 hover:border-slate-400"
                      >
                        {t.editVisit}
                      </button>
                      <button
                        onClick={() => deleteVisit(selected)}
                        disabled={busy}
                        className="rounded-xl border border-red-300 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {t.deleteVisit}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setSelected(null)}
                    className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-600"
                  >
                    {t.close}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
