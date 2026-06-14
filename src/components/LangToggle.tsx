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
    <div className="flex shrink-0 gap-1 rounded-full border border-slate-200 bg-slate-100 p-1">
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLang(l.code)}
          className={`min-w-[2.25rem] rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
            lang === l.code
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
