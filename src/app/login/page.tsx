"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { staffDict } from "@/lib/i18n";
import { useLang } from "@/lib/useLang";
import BackToMenu from "@/components/BackToMenu";
import LangToggle from "@/components/LangToggle";
import Logo from "@/components/Logo";

const HOME_BY_ROLE: Record<string, string> = {
  receptionist: "/dashboard",
  guard: "/guard",
  admin: "/dashboard",
};

function safeDest(role: string, next: string | null): string {
  // Only allow same-origin redirects. Resolving through URL collapses parser
  // tricks like "/\evil.com" into their real cross-origin host, which then
  // fails the origin check below.
  let dest = HOME_BY_ROLE[role] ?? "/";
  if (next) {
    try {
      const u = new URL(next, window.location.origin);
      if (u.origin === window.location.origin) dest = u.pathname + u.search + u.hash;
    } catch {
      // unparsable input keeps the role-based default
    }
  }
  return dest;
}

function LoginForm() {
  const [lang, setLang] = useLang();
  const t = staffDict[lang];
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const [username, setUsername] = useState("reception");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // After an explicit login: honor ?next (deep-link back to /items etc.).
  // replace() so the login page is not left in history.
  const goAfterLogin = useCallback(
    (role: string) => window.location.replace(safeDest(role, next)),
    [next],
  );

  // If ALREADY logged in, bounce to the role's own dashboard and deliberately
  // IGNORE ?next. A stale next (e.g. /items left over from an Incoming-Items
  // deep link/QR, restored via bfcache or the router cache) was sending people
  // who tapped "Staff Login" straight into the Incoming Items screen.
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!cancelled && res.ok) {
          const { role } = (await res.json()) as { role: string };
          window.location.replace(HOME_BY_ROLE[role] ?? "/");
        }
      } catch {
        // not logged in or offline — stay on the form
      }
    };
    check();
    const onPageShow = (e: PageTransitionEvent) => {
      setPassword("");
      if (e.persisted) check();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => {
      cancelled = true;
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? t.loginFailed);
        return;
      }
      const { role } = (await res.json()) as { role: string };
      goAfterLogin(role);
    } catch {
      setError(t.networkError);
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-slate-500";

  return (
    <main className="flex-1 flex flex-col p-4">
      <div className="w-full max-w-sm mx-auto pt-1 pb-3">
        <BackToMenu label={t.menu} />
      </div>
      <div className="flex-1 flex items-start justify-center">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-white border border-slate-200 p-6">
        <div className="mb-5">
          <div className="mb-3 flex justify-end">
            <LangToggle lang={lang} setLang={setLang} />
          </div>
          <div className="flex items-center gap-3">
            <Logo className="h-9 w-auto shrink-0" />
            <div>
              <p className="text-sm font-semibold leading-tight">SEG Solar Manufaktur Indonesia</p>
              <p className="text-xs text-slate-500">{t.staffLogin}</p>
            </div>
          </div>
        </div>

        <div className="mb-4 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-center text-xs font-medium text-slate-600">
          {t.inStaffLogin}
        </div>

        <label className="block text-sm text-slate-600 mb-1">{t.role}</label>
        <select className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)}>
          <option value="reception">{t.roleReceptionist}</option>
          <option value="guard">{t.roleGuard}</option>
        </select>

        <label className="block text-sm text-slate-600 mb-1 mt-3">{t.password}</label>
        <input
          className={inputCls}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

        <button
          type="submit"
          disabled={busy || !password}
          className="w-full mt-5 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {busy ? t.signingIn : t.signIn}
        </button>
      </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
