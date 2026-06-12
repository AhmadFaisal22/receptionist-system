"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { staffDict } from "@/lib/i18n";
import { useLang } from "@/lib/useLang";
import BackToMenu from "@/components/BackToMenu";
import LangToggle from "@/components/LangToggle";

export default function QrPostersPage() {
  const [lang, setLang] = useLang();
  const t = staffDict[lang];
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  if (!origin) return null;

  return (
    <main className="flex-1 p-6">
      <div className="no-print flex items-center justify-between gap-3 max-w-3xl mx-auto mb-6 flex-wrap">
        <div>
          <h1 className="text-base font-semibold">{t.qrTitle}</h1>
          <p className="text-xs text-slate-500">{t.qrDesc}</p>
        </div>
        <div className="flex items-center gap-4">
          <LangToggle lang={lang} setLang={setLang} />
          <BackToMenu label={t.menu} />
          <button
            onClick={() => window.print()}
            className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-medium"
          >
            🖨 {t.print}
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        <div className="rounded-3xl border-4 border-green-600 bg-white p-8 text-center">
          <p className="text-2xl font-bold text-green-700">CHECK IN</p>
          <p className="text-sm text-slate-500 mb-1">Tamu masuk · Visitor entry · 访客进入</p>
          <div className="flex justify-center my-5">
            <QRCodeSVG value={`${origin}/checkin`} size={220} />
          </div>
          <p className="text-sm font-medium">Scan untuk mengisi buku tamu</p>
          <p className="text-xs text-slate-500">Scan to fill the visitor form · 扫码填写访客登记</p>
          <p className="font-mono text-xs text-slate-400 mt-3">{origin}/checkin</p>
        </div>

        <div className="rounded-3xl border-4 border-amber-500 bg-white p-8 text-center">
          <p className="text-2xl font-bold text-amber-600">CHECK OUT</p>
          <p className="text-sm text-slate-500 mb-1">Tamu keluar · Visitor exit · 访客离开</p>
          <div className="flex justify-center my-5">
            <QRCodeSVG value={`${origin}/checkout`} size={220} />
          </div>
          <p className="text-sm font-medium">Scan saat meninggalkan area</p>
          <p className="text-xs text-slate-500">Scan when leaving the site · 离开时扫码登记</p>
          <p className="font-mono text-xs text-slate-400 mt-3">{origin}/checkout</p>
        </div>
      </div>
    </main>
  );
}
