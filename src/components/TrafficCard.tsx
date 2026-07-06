"use client";

import { useEffect, useMemo, useState } from "react";
import { staffDict, type Lang } from "@/lib/i18n";

type Period = "day" | "week" | "month";

/** WIB (Asia/Jakarta) yyyy-mm-dd for a given instant. */
function wibDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}
function nowWibDate(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

/** Monday (yyyy-mm-dd) of the week containing the given yyyy-mm-dd. */
function mondayOf(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = (dt.getUTCDay() + 6) % 7; // 0 = Monday
  dt.setUTCDate(dt.getUTCDate() - dow);
  return dt.toISOString().slice(0, 10);
}
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

interface Bucket {
  key: string;
  label: string;
  count: number;
}

export default function TrafficCard({ lang }: { lang: Lang }) {
  const t = staffDict[lang];
  const [period, setPeriod] = useState<Period>("day");
  const [timestamps, setTimestamps] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Tiny endpoint: just visit timestamps, no rows/images.
        const res = await fetch("/api/visits/stats", { cache: "no-store" });
        if (res.ok && !cancelled) setTimestamps((await res.json()) as string[]);
      } catch {
        // leave empty — the card shows "no data"
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const buckets = useMemo<Bucket[]>(() => {
    const today = nowWibDate();
    const monthName = (ym: string) => {
      const [y, m] = ym.split("-").map(Number);
      return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(t.dateLocale, {
        month: "short",
        timeZone: "UTC",
      });
    };
    const dayLabel = (ds: string) => {
      const [, m, d] = ds.split("-");
      return `${d}/${m}`;
    };

    if (period === "day") {
      const keys: Bucket[] = [];
      for (let i = 6; i >= 0; i--) {
        const ds = addDays(today, -i);
        keys.push({ key: ds, label: dayLabel(ds), count: 0 });
      }
      const idx = new Map(keys.map((b, i) => [b.key, i]));
      for (const ts of timestamps) {
        const i = idx.get(wibDate(ts));
        if (i !== undefined) keys[i].count++;
      }
      return keys;
    }

    if (period === "week") {
      const thisMonday = mondayOf(today);
      const keys: Bucket[] = [];
      for (let i = 7; i >= 0; i--) {
        const ds = addDays(thisMonday, -i * 7);
        keys.push({ key: ds, label: dayLabel(ds), count: 0 });
      }
      const idx = new Map(keys.map((b, i) => [b.key, i]));
      for (const ts of timestamps) {
        const i = idx.get(mondayOf(wibDate(ts)));
        if (i !== undefined) keys[i].count++;
      }
      return keys;
    }

    // month — last 6 months
    const [cy, cm] = today.split("-").map(Number);
    const keys: Bucket[] = [];
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(Date.UTC(cy, cm - 1 - i, 1));
      const ym = dt.toISOString().slice(0, 7);
      keys.push({ key: ym, label: monthName(ym), count: 0 });
    }
    const idx = new Map(keys.map((b, i) => [b.key, i]));
    for (const ts of timestamps) {
      const i = idx.get(wibDate(ts).slice(0, 7));
      if (i !== undefined) keys[i].count++;
    }
    return keys;
  }, [timestamps, period, t.dateLocale]);

  const max = Math.max(1, ...buckets.map((b) => b.count));
  const hasData = buckets.some((b) => b.count > 0);
  const periods: [Period, string][] = [
    ["day", t.periodDay],
    ["week", t.periodWeek],
    ["month", t.periodMonth],
  ];

  return (
    <section className="rounded-2xl bg-white border border-slate-200 p-4 mt-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-sm font-semibold text-slate-700">{t.analyticsTitle}</h2>
        <div className="flex gap-1 rounded-full border border-slate-200 bg-slate-100 p-1">
          {periods.map(([p, label]) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                period === p
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {hasData ? (
        <div className="mt-4 flex items-end justify-between gap-1.5 h-36">
          {buckets.map((b) => (
            <div key={b.key} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
              <span className="text-[11px] font-medium text-slate-600">{b.count}</span>
              <div
                className="w-full max-w-[40px] rounded-t-md bg-gradient-to-t from-red-300 to-red-600 transition-all"
                style={{ height: `${Math.max(4, (b.count / max) * 100)}%` }}
                title={`${b.count} ${t.analyticsVisitors}`}
              />
              <span className="text-[10px] text-slate-400 whitespace-nowrap">{b.label}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-6 mb-6 text-center text-sm text-slate-400">{t.analyticsEmpty}</p>
      )}
    </section>
  );
}
