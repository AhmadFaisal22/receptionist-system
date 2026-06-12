"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { fmtTime, localDate } from "@/lib/dates";
import type { PublicVisit } from "@/lib/types";
import BackToMenu from "@/components/BackToMenu";
import Logo from "@/components/Logo";

const PURPOSE_LABEL: Record<string, string> = {
  meeting: "Meeting",
  delivery: "Delivery",
  audit: "Audit",
  interview: "Interview",
  contractor: "Contractor",
  other: "Other",
};

function StatusPill({ visit }: { visit: PublicVisit }) {
  if (visit.status === "pending") {
    return (
      <span className="rounded-full bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-0.5">
        Pending
      </span>
    );
  }
  if (visit.status === "checked_in") {
    return (
      <span className="rounded-full bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5">
        Inside
      </span>
    );
  }
  return (
    <span className="rounded-full bg-slate-100 text-slate-500 text-xs font-medium px-2.5 py-0.5 border border-slate-200">
      Out{visit.checkoutMethod === "auto" ? " (auto)" : ""}
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

export default function DashboardClient({ user, role }: { user: string; role: string }) {
  const [visits, setVisits] = useState<PublicVisit[]>([]);
  const [date, setDate] = useState(localDate());
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<PublicVisit | null>(null);
  const [live, setLive] = useState(false);
  const prevIds = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);
  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/visits?date=${date}`, { cache: "no-store" });
      if (res.status === 401) {
        window.location.assign("/login?next=/dashboard");
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      setVisits((await res.json()) as PublicVisit[]);
      setLive(true);
    } catch {
      setLive(false);
    }
  }, [date]);

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

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }

  return (
    <main className="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Logo className="h-9 w-auto" />
          <div>
            <h1 className="text-base font-semibold leading-tight">
              SEG Solar Manufaktur Indonesia
            </h1>
            <p className="text-xs text-slate-500">
              Visitor log —{" "}
              {new Date(date + "T00:00:00").toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1.5 rounded-full text-xs font-medium px-3 py-1 ${
              live ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-500"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${live ? "bg-green-600" : "bg-slate-400"}`} />
            {live ? "Live" : "Offline"}
          </span>
          <span className="text-xs text-slate-500 hidden sm:block">
            {user} ({role})
          </span>
          <BackToMenu label="Menu" className="text-xs" />
          <button onClick={logout} className="text-xs text-slate-500 underline">
            Sign out
          </button>
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
        {(
          [
            ["Visitors today", stats.total],
            ["Currently inside", stats.inside],
            ["Pending at gate", stats.pending],
            ["Checked out", stats.out],
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

      <section className="flex items-center gap-2 mt-5 flex-wrap">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, company, or host…"
          className="flex-1 min-w-48 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
        />
        <a
          href={`/api/export/csv?date=${date}`}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:border-slate-400"
        >
          ⬇ Excel
        </a>
        <a
          href={`/dashboard/print?date=${date}`}
          target="_blank"
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:border-slate-400"
        >
          🖨 PDF
        </a>
      </section>

      <section className="mt-4 rounded-2xl bg-white border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
              <th className="px-4 py-3 font-medium">No</th>
              <th className="px-2 py-3 font-medium">Visitor</th>
              <th className="px-2 py-3 font-medium">Purpose</th>
              <th className="px-2 py-3 font-medium">Host</th>
              <th className="px-2 py-3 font-medium">In</th>
              <th className="px-2 py-3 font-medium">Out</th>
              <th className="px-2 py-3 font-medium">Status</th>
              <th className="px-2 py-3 font-medium">Sign</th>
            </tr>
          </thead>
          <tbody ref={tbodyRef}>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                  No visitors for this date yet — entries appear here the moment
                  someone checks in at the gate.
                </td>
              </tr>
            )}
            {filtered.map((v) => (
              <tr
                key={v.id}
                data-vid={v.id}
                onClick={() => setSelected(v)}
                className="border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50"
              >
                <td className="px-4 py-2.5 font-mono text-xs">{v.code}</td>
                <td className="px-2 py-2.5">
                  <p className="font-medium">{v.name}</p>
                  <p className="text-xs text-slate-500">{v.institution}</p>
                </td>
                <td className="px-2 py-2.5 text-slate-600">
                  {PURPOSE_LABEL[v.purpose] ?? v.purpose}
                </td>
                <td className="px-2 py-2.5">
                  <p>{v.hostName}</p>
                  {v.hostDepartment && (
                    <p className="text-xs text-slate-500">{v.hostDepartment}</p>
                  )}
                </td>
                <td className="px-2 py-2.5">{fmtTime(v.checkinAt)}</td>
                <td className="px-2 py-2.5">{fmtTime(v.checkoutAt)}</td>
                <td className="px-2 py-2.5">
                  <StatusPill visit={v} />
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

      <p className="text-xs text-slate-400 mt-3">
        ⟳ Updates appear automatically every few seconds — no refresh needed.
      </p>

      {selected && (
        <div
          className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-20"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-xs text-slate-500">{selected.code}</p>
                <h2 className="text-lg font-semibold">{selected.name}</h2>
                <p className="text-sm text-slate-500">{selected.institution}</p>
              </div>
              <StatusPill visit={selected} />
            </div>
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
                  no photo
                </div>
              )}
              <div className="flex-1 text-sm space-y-1.5">
                <p>
                  <span className="text-slate-500">Phone:</span> {selected.phone}
                </p>
                <p>
                  <span className="text-slate-500">Purpose:</span>{" "}
                  {PURPOSE_LABEL[selected.purpose] ?? selected.purpose}
                </p>
                <p>
                  <span className="text-slate-500">Host:</span> {selected.hostName}
                  {selected.hostDepartment ? ` — ${selected.hostDepartment}` : ""}
                </p>
                <p>
                  <span className="text-slate-500">In:</span> {fmtTime(selected.checkinAt)}{" "}
                  <span className="text-slate-500 ml-2">Out:</span> {fmtTime(selected.checkoutAt)}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4 mb-1">Signature</p>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selected.signatureDataUrl} alt="signature" className="h-16 mx-auto object-contain" />
            </div>
            <div className="flex gap-2 mt-5">
              {selected.status === "pending" && (
                <button
                  onClick={() => action(selected, "confirm")}
                  className="flex-1 rounded-xl bg-green-600 text-white px-4 py-2.5 text-sm font-medium"
                >
                  Confirm arrival
                </button>
              )}
              {selected.status !== "checked_out" && (
                <button
                  onClick={() => action(selected, "checkout")}
                  className="flex-1 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-medium"
                >
                  Clock out
                </button>
              )}
              <button
                onClick={() => setSelected(null)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
