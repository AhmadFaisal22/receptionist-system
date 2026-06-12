"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fmtTime, localDate } from "@/lib/dates";
import type { PublicVisit } from "@/lib/types";
import BackToMenu from "@/components/BackToMenu";
import Logo from "@/components/Logo";

export default function GuardClient({ user }: { user: string }) {
  const [visits, setVisits] = useState<PublicVisit[]>([]);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/visits?date=${localDate()}`, { cache: "no-store" });
      if (res.status === 401) {
        window.location.replace("/login?next=/guard");
        return;
      }
      if (res.ok) setVisits((await res.json()) as PublicVisit[]);
    } catch {
      // keep last known list; next poll retries
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
  }, [load]);

  async function action(id: string, kind: "confirm" | "checkout") {
    setBusyId(id);
    try {
      await fetch(`/api/visits/${id}/${kind}`, { method: "POST" });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.replace("/login");
  }

  const pending = visits.filter((v) => v.status === "pending");
  const inside = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return visits
      .filter((v) => v.status === "checked_in")
      .filter(
        (v) =>
          !needle ||
          [v.name, v.code, v.institution].join(" ").toLowerCase().includes(needle),
      );
  }, [visits, q]);

  return (
    <main className="flex-1 p-4 max-w-lg mx-auto w-full">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo className="h-9 w-auto" />
          <div>
            <h1 className="text-base font-semibold leading-tight">Pos keamanan</h1>
            <p className="text-xs text-slate-500">{user} — SEG Solar</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <BackToMenu label="Menu" className="text-xs" />
          <button onClick={logout} className="text-xs text-slate-500 underline">
            Keluar
          </button>
        </div>
      </header>

      <section className="mt-5">
        <h2 className="text-sm font-semibold text-slate-700">
          Menunggu konfirmasi ({pending.length})
        </h2>
        {pending.length === 0 && (
          <p className="text-sm text-slate-400 mt-2">
            Tidak ada tamu yang menunggu. Entri baru muncul otomatis.
          </p>
        )}
        <div className="space-y-3 mt-2">
          {pending.map((v) => (
            <div key={v.id} className="rounded-2xl bg-white border border-amber-300 p-4">
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs text-slate-500">{v.code}</p>
                <p className="text-xs text-slate-400">{fmtTime(v.submittedAt)}</p>
              </div>
              <p className="font-semibold text-lg mt-1">{v.name}</p>
              <p className="text-sm text-slate-500">
                {v.institution} → {v.hostName}
                {v.hostDepartment ? ` (${v.hostDepartment})` : ""}
              </p>
              <button
                disabled={busyId === v.id}
                onClick={() => action(v.id, "confirm")}
                className="w-full mt-3 rounded-xl bg-green-600 text-white px-4 py-3 text-base font-semibold disabled:opacity-50"
              >
                ✓ Konfirmasi masuk
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-slate-700">
          Sedang di dalam ({inside.length})
        </h2>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nama / nomor kunjungan…"
          className="w-full mt-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <div className="space-y-2 mt-2">
          {inside.map((v) => (
            <div
              key={v.id}
              className="rounded-xl bg-white border border-slate-200 p-3 flex items-center justify-between gap-2"
            >
              <div>
                <p className="font-medium text-sm">
                  {v.name} <span className="font-mono text-xs text-slate-400">{v.code}</span>
                </p>
                <p className="text-xs text-slate-500">
                  Masuk {fmtTime(v.checkinAt)} — {v.institution}
                </p>
              </div>
              <button
                disabled={busyId === v.id}
                onClick={() => action(v.id, "checkout")}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-600 disabled:opacity-50"
              >
                Clock out
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
