"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

const HOME_BY_ROLE: Record<string, string> = {
  receptionist: "/dashboard",
  guard: "/guard",
  admin: "/dashboard",
};

function LoginForm() {
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("reception");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
        setError(data?.error ?? "Login failed");
        return;
      }
      const { role } = (await res.json()) as { role: string };
      const next = searchParams.get("next");
      // Only allow same-origin redirects. Resolving through URL collapses
      // parser tricks like "/\evil.com" into their real cross-origin host,
      // which then fails the origin comparison.
      let dest = HOME_BY_ROLE[role] ?? "/";
      if (next) {
        try {
          const u = new URL(next, window.location.origin);
          if (u.origin === window.location.origin) {
            dest = u.pathname + u.search + u.hash;
          }
        } catch {
          // unparsable input keeps the role-based default
        }
      }
      window.location.assign(dest);
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-slate-500";

  return (
    <main className="flex-1 flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-white border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center text-xl">☀</div>
          <div>
            <p className="text-sm font-semibold leading-tight">SEG Solar Manufaktur Indonesia</p>
            <p className="text-xs text-slate-500">Staff login</p>
          </div>
        </div>

        <label className="block text-sm text-slate-600 mb-1">Role</label>
        <select className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)}>
          <option value="reception">Receptionist</option>
          <option value="guard">Security guard</option>
          <option value="admin">Admin</option>
        </select>

        <label className="block text-sm text-slate-600 mb-1 mt-3">Password</label>
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
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
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
