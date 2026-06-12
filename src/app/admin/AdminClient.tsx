"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { staffDict } from "@/lib/i18n";
import { useLang } from "@/lib/useLang";
import type { Employee } from "@/lib/types";
import BackToMenu from "@/components/BackToMenu";
import LangToggle from "@/components/LangToggle";

export default function AdminClient() {
  const [lang, setLang] = useLang();
  const t = staffDict[lang];
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/employees?all=1", { cache: "no-store" });
    if (res.status === 401) {
      window.location.replace("/login?next=/admin");
      return;
    }
    if (res.ok) setEmployees((await res.json()) as Employee[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), department: department.trim() }),
    });
    if (!res.ok) {
      setError(t.addError);
      return;
    }
    setName("");
    setDepartment("");
    load();
  }

  async function toggle(emp: Employee) {
    await fetch(`/api/employees/${emp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !emp.active }),
    });
    load();
  }

  async function remove(emp: Employee) {
    if (!confirm(`${emp.name} — ${t.confirmDelete}`)) return;
    await fetch(`/api/employees/${emp.id}`, { method: "DELETE" });
    load();
  }

  const inputCls =
    "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500";

  return (
    <main className="flex-1 p-4 md:p-6 max-w-2xl mx-auto w-full">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">{t.employeeList}</h1>
          <p className="text-xs text-slate-500">{t.employeeListDesc}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <LangToggle lang={lang} setLang={setLang} />
          <Link href="/dashboard" className="text-xs text-slate-500 underline">
            ← {t.backDashboard}
          </Link>
          <BackToMenu label={t.menu} className="text-xs" />
        </div>
      </header>

      <form onSubmit={add} className="flex gap-2 mt-5 flex-wrap">
        <input
          className={`${inputCls} flex-1 min-w-40`}
          placeholder={t.fullName}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className={`${inputCls} w-40`}
          placeholder={t.department}
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
        />
        <button
          type="submit"
          disabled={name.trim().length < 2 || !department.trim()}
          className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {t.add}
        </button>
      </form>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

      <div className="mt-4 rounded-2xl bg-white border border-slate-200 divide-y divide-slate-100">
        {employees.map((emp) => (
          <div key={emp.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className={`text-sm font-medium ${emp.active ? "" : "text-slate-400 line-through"}`}>
                {emp.name}
              </p>
              <p className="text-xs text-slate-500">{emp.department}</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => toggle(emp)} className="text-xs text-slate-500 underline">
                {emp.active ? t.deactivate : t.activate}
              </button>
              <button onClick={() => remove(emp)} className="text-xs text-red-500 underline">
                {t.remove}
              </button>
            </div>
          </div>
        ))}
        {employees.length === 0 && (
          <p className="px-4 py-8 text-sm text-slate-400 text-center">{t.noEmployees}</p>
        )}
      </div>
    </main>
  );
}
