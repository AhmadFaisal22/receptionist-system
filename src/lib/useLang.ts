"use client";

import { useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n";

const KEY = "vlog_lang";

function isLang(v: unknown): v is Lang {
  return v === "id" || v === "en" || v === "zh";
}

/**
 * Language state for staff pages, persisted in localStorage so the choice
 * carries across pages and reloads. Starts at "id" on first paint (matching
 * SSR) and switches to the stored value after hydration.
 */
export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLangState] = useState<Lang>("id");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (isLang(stored)) setLangState(stored);
    } catch {
      // storage blocked — keep default
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      // ignore
    }
  };

  return [lang, setLang];
}
