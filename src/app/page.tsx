"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import LangToggle from "@/components/LangToggle";
import { dict } from "@/lib/i18n";
import { useLang } from "@/lib/useLang";

export default function Home() {
  const [lang, setLang] = useLang();
  const t = dict[lang];

  const links = [
    {
      href: "/checkin",
      title: t.menuCheckin,
      desc: t.menuCheckinDesc,
      cls: "bg-green-50 border-green-300 hover:border-green-500",
    },
    {
      href: "/checkout",
      title: t.menuCheckout,
      desc: t.menuCheckoutDesc,
      cls: "bg-red-50 border-red-300 hover:border-red-500",
    },
    {
      href: "/login",
      title: t.menuStaff,
      desc: t.menuStaffDesc,
      cls: "bg-white border-slate-200 hover:border-slate-400",
    },
    {
      href: "/qr",
      title: t.menuQr,
      desc: t.menuQrDesc,
      cls: "bg-white border-slate-200 hover:border-slate-400",
    },
  ];

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <Logo className="h-11 w-auto shrink-0" />
            <div>
              <h1 className="text-lg font-semibold leading-tight">
                SEG Solar Manufaktur Indonesia
              </h1>
              <p className="text-sm text-slate-500">{t.homeSubtitle}</p>
            </div>
          </div>
          <LangToggle lang={lang} setLang={setLang} />
        </div>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`block rounded-2xl border p-4 transition-colors ${l.cls}`}
          >
            <p className="font-medium">{l.title}</p>
            <p className="text-sm text-slate-500">{l.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
