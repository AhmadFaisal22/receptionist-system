"use client";

import { useEffect, useState } from "react";
import { dict, LANGS, type Lang } from "@/lib/i18n";

interface StoredExit {
  token: string;
  code: string;
}

export default function CheckoutPage() {
  const [lang, setLang] = useState<Lang>("id");
  const t = dict[lang];

  const [stored, setStored] = useState<StoredExit | null>(null);
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("vlog_exit");
      if (raw) setStored(JSON.parse(raw) as StoredExit);
    } catch {
      setStored(null);
    }
  }, []);

  async function checkout(body: { token: string } | { code: string; phone: string }) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { code: string };
      setDone(data.code);
      try {
        localStorage.removeItem("vlog_exit");
      } catch {
        // ignore
      }
    } catch {
      setError(t.notFoundErr);
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-slate-500";

  return (
    <main className="flex-1 flex items-start justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-6 mt-6 text-center">
        <div className="flex justify-center gap-2 mb-4">
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setLang(l.code)}
              className={`rounded-full px-3 py-1 text-xs font-medium border ${
                lang === l.code
                  ? "bg-slate-900 text-white border-slate-900"
                  : "border-slate-300 text-slate-500"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {done ? (
          <>
            <div className="w-14 h-14 mx-auto rounded-full bg-green-100 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold mt-3">{t.checkoutDone}</h1>
            <p className="font-mono text-2xl tracking-wider mt-2 text-slate-500">{done}</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">{t.checkoutTitle}</h1>
            <p className="text-sm text-slate-500 mt-1">{t.checkoutHint}</p>

            {stored ? (
              <>
                <p className="font-mono text-3xl tracking-wider my-4">{stored.code}</p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => checkout({ token: stored.token })}
                  className="w-full rounded-xl bg-amber-400 text-slate-900 px-4 py-3 text-base font-semibold disabled:opacity-50"
                >
                  {t.checkoutBtn}
                </button>
              </>
            ) : (
              <div className="text-left mt-4">
                <p className="text-sm text-slate-500 mb-3">{t.findVisit}</p>
                <label className="block text-sm text-slate-600 mb-1">{t.visitCode}</label>
                <input
                  className={inputCls}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="SEG-0001"
                />
                <label className="block text-sm text-slate-600 mb-1 mt-3">{t.phone}</label>
                <input
                  className={inputCls}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t.phonePh}
                  type="tel"
                  inputMode="tel"
                />
                <button
                  type="button"
                  disabled={busy || !/^SEG-\d{4,6}$/.test(code.trim()) || phone.trim().length < 7}
                  onClick={() => checkout({ code: code.trim(), phone: phone.trim() })}
                  className="w-full mt-4 rounded-xl bg-amber-400 text-slate-900 px-4 py-3 text-base font-semibold disabled:opacity-50"
                >
                  {t.checkoutBtn}
                </button>
              </div>
            )}
            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
          </>
        )}
      </div>
    </main>
  );
}
