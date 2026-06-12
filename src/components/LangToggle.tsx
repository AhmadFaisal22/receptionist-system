"use client";

import { LANGS, type Lang } from "@/lib/i18n";

/** ID / EN / 中文 pill switcher used across staff pages. */
export default function LangToggle({
  lang,
  setLang,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLang(l.code)}
          className={`rounded-full px-2.5 py-1 text-xs font-medium border ${
            lang === l.code
              ? "bg-slate-900 text-white border-slate-900"
              : "border-slate-300 text-slate-500"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
