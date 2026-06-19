"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import Logo from "@/components/Logo";
import LangToggle from "@/components/LangToggle";
import { dict } from "@/lib/i18n";
import { useLang } from "@/lib/useLang";

const sw = {
  className: "w-6 h-6",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ICONS: Record<string, ReactNode> = {
  checkin: (
    <svg viewBox="0 0 24 24" {...sw}>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="m10 17 5-5-5-5" />
      <path d="M15 12H3" />
    </svg>
  ),
  checkout: (
    <svg viewBox="0 0 24 24" {...sw}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  ),
  staff: (
    <svg viewBox="0 0 24 24" {...sw}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  qr: (
    <svg viewBox="0 0 24 24" {...sw}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3M21 21v.01M21 14v.01M14 21v.01" />
    </svg>
  ),
};

export default function Home() {
  const [lang, setLang] = useLang();
  const t = dict[lang];

  const links = [
    {
      href: "/checkin",
      title: t.menuCheckin,
      desc: t.menuCheckinDesc,
      icon: ICONS.checkin,
      cls: "border-green-200 hover:border-green-400 bg-gradient-to-br from-green-50 to-white",
      iconCls: "bg-green-100 text-green-700",
    },
    {
      href: "/checkout",
      title: t.menuCheckout,
      desc: t.menuCheckoutDesc,
      icon: ICONS.checkout,
      cls: "border-red-200 hover:border-red-400 bg-gradient-to-br from-red-50 to-white",
      iconCls: "bg-red-100 text-red-700",
    },
    {
      href: "/login",
      title: t.menuStaff,
      desc: t.menuStaffDesc,
      icon: ICONS.staff,
      cls: "border-slate-200 hover:border-slate-400 bg-white",
      iconCls: "bg-slate-100 text-slate-700",
    },
    {
      href: "/qr",
      title: t.menuQr,
      desc: t.menuQrDesc,
      icon: ICONS.qr,
      cls: "border-slate-200 hover:border-slate-400 bg-white",
      iconCls: "bg-slate-100 text-slate-700",
    },
  ];

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-3.5">
        <div className="mb-2">
          <div className="mb-3 flex justify-end">
            <LangToggle lang={lang} setLang={setLang} />
          </div>
          <div className="flex items-center gap-3">
            <Logo className="h-11 w-auto shrink-0" />
            <div>
              <h1 className="text-lg font-semibold leading-tight">
                SEG Solar Manufaktur Indonesia
              </h1>
              <p className="text-sm text-slate-500">{t.homeSubtitle}</p>
            </div>
          </div>
        </div>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`group flex items-center gap-4 rounded-2xl border p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all ${l.cls}`}
          >
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${l.iconCls}`}>
              {l.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-tight">{l.title}</p>
              <p className="text-sm text-slate-500 leading-snug">{l.desc}</p>
            </div>
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 shrink-0 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>
        ))}
      </div>
    </main>
  );
}
