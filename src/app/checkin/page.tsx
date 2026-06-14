"use client";

import { useEffect, useRef, useState } from "react";
import SignatureField from "@/components/SignatureField";
import BackToMenu from "@/components/BackToMenu";
import Logo from "@/components/Logo";
import { dict, LANGS, PURPOSES, type Lang, type Purpose } from "@/lib/i18n";

interface EmployeeOption {
  id: string;
  name: string;
  department: string;
}

interface SubmitResult {
  code: string;
  exitToken: string;
  submittedAt: string;
}

async function downscalePhoto(file: File, maxDim = 800, quality = 0.8): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function CheckinPage() {
  const [lang, setLang] = useState<Lang>("id");
  const t = dict[lang];

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [phone, setPhone] = useState("");
  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [purposeOther, setPurposeOther] = useState("");
  const [hostQuery, setHostQuery] = useState("");
  const [host, setHost] = useState<EmployeeOption | null>(null);
  const [suggestions, setSuggestions] = useState<EmployeeOption[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (host || hostQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/employees?q=${encodeURIComponent(hostQuery.trim())}`);
        if (res.ok) setSuggestions(await res.json());
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [hostQuery, host]);

  const step1Valid = name.trim().length >= 2 && institution.trim().length >= 2 && phone.trim().length >= 7;
  const step2Valid =
    purpose !== null &&
    (purpose !== "other" || purposeOther.trim().length >= 2) &&
    (host !== null || hostQuery.trim().length >= 2);
  const step3Valid = signature !== null;

  async function handlePhoto(file: File | undefined) {
    if (!file) return;
    try {
      setPhoto(await downscalePhoto(file));
    } catch {
      setPhoto(null);
    }
  }

  async function submit() {
    if (!step3Valid || !purpose) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          institution: institution.trim(),
          phone: phone.trim(),
          purpose: purpose === "other" ? purposeOther.trim() : purpose,
          hostId: host?.id ?? null,
          hostName: host?.name ?? hostQuery.trim(),
          hostDepartment: host?.department ?? "",
          photoDataUrl: photo,
          signatureDataUrl: signature,
          lang,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as SubmitResult;
      try {
        localStorage.setItem(
          "vlog_exit",
          JSON.stringify({ token: data.exitToken, code: data.code }),
        );
      } catch {
        // Private-mode browsers without storage still get the code on screen.
      }
      setResult(data);
    } catch {
      setError(t.submitErr);
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-slate-500";
  const labelCls = "block text-sm text-slate-600 mb-1 mt-3";

  if (result) {
    return (
      <main className="flex-1 flex items-start justify-center p-4 bg-green-50">
        <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-6 mt-6 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-green-100 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold mt-3">{t.confirmedTitle}</h1>
          <p className="font-mono text-3xl tracking-wider my-3">{result.code}</p>
          <p className="text-sm text-slate-500">{t.showGuard}</p>
          <span className="inline-block mt-3 rounded-full bg-amber-100 text-amber-800 text-xs font-medium px-3 py-1">
            {t.waitingGuard}
          </span>
          <div className="border-t border-slate-200 mt-5 pt-4 text-left text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">{t.nameLabel}</span>
              <span>{name.trim()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t.hostLabel}</span>
              <span>{host ? `${host.name} — ${host.department}` : hostQuery.trim()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t.clockIn}</span>
              <span>
                {new Date(result.submittedAt).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t.clockOut}</span>
              <span className="text-slate-400">{t.recordedAtExit}</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4">{t.exitHint}</p>
          <div className="mt-5 pt-4 border-t border-slate-100">
            <BackToMenu label={t.mainMenu} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-start justify-center p-4 bg-green-50">
      <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-5 mt-4 mb-8">
        <div className="mb-3">
          <BackToMenu label={t.mainMenu} />
        </div>
        <div className="flex items-center gap-3">
          <Logo className="h-9 w-auto" />
          <div className="flex-1">
            <p className="text-sm font-semibold leading-tight">{t.companyName}</p>
            <p className="text-xs text-slate-500">{t.checkinTitle}</p>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
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

        <div className="flex gap-1.5 mt-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-amber-400" : "bg-slate-200"}`}
            />
          ))}
        </div>

        {step === 1 && (
          <section className="mt-4">
            <h2 className="text-sm font-semibold text-slate-700">1 · {t.step1}</h2>
            <label className={labelCls}>{t.fullName}</label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder={t.fullNamePh} autoComplete="name" />
            <label className={labelCls}>{t.institution}</label>
            <input className={inputCls} value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder={t.institutionPh} autoComplete="organization" />
            <label className={labelCls}>{t.phone}</label>
            <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t.phonePh} type="tel" autoComplete="tel" inputMode="tel" />
          </section>
        )}

        {step === 2 && (
          <section className="mt-4">
            <h2 className="text-sm font-semibold text-slate-700">2 · {t.step2}</h2>
            <label className={labelCls}>{t.purpose}</label>
            <div className="flex flex-wrap gap-2">
              {PURPOSES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPurpose(p)}
                  className={`rounded-full px-3.5 py-1.5 text-sm border ${
                    purpose === p
                      ? "bg-slate-900 text-white border-slate-900"
                      : "border-slate-300 text-slate-600"
                  }`}
                >
                  {t.purposes[p]}
                </button>
              ))}
            </div>
            {purpose === "other" && (
              <input
                className={`${inputCls} mt-2`}
                value={purposeOther}
                onChange={(e) => setPurposeOther(e.target.value)}
                placeholder={t.purposeOtherPh}
                maxLength={120}
                autoFocus
              />
            )}
            <label className={labelCls}>{t.host}</label>
            {host ? (
              <div className="flex items-center justify-between rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5">
                <span className="text-sm">
                  {host.name} <span className="text-slate-400">— {host.department}</span>
                </span>
                <button
                  type="button"
                  className="text-xs text-slate-500 underline"
                  onClick={() => {
                    setHost(null);
                    setHostQuery("");
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  className={inputCls}
                  value={hostQuery}
                  onChange={(e) => setHostQuery(e.target.value)}
                  placeholder={t.hostPh}
                />
                {suggestions.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 mt-1 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setHost(s);
                          setSuggestions([]);
                        }}
                        className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                      >
                        {s.name} <span className="text-slate-400">— {s.department}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {step === 3 && (
          <section className="mt-4">
            <h2 className="text-sm font-semibold text-slate-700">3 · {t.step3}</h2>
            <label className={labelCls}>{t.photo}</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={(e) => handlePhoto(e.target.files?.[0])}
            />
            {photo ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt="selfie" className="w-16 h-16 rounded-xl object-cover border border-slate-200" />
                <button type="button" className="text-sm text-slate-500 underline" onClick={() => fileRef.current?.click()}>
                  {t.photoRetake}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-xl border border-dashed border-slate-300 py-4 text-sm text-slate-500"
              >
                📷 {t.photo}
              </button>
            )}
            <label className={labelCls}>{t.signature}</label>
            <SignatureField onChange={setSignature} hint={t.signatureHint} clearLabel={t.clear} />
          </section>
        )}

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

        <div className="flex gap-2 mt-5">
          {step > 1 && (
            <button
              type="button"
              onClick={() => {
                setError("");
                setStep(step - 1);
              }}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-600"
            >
              {t.back}
            </button>
          )}
          {step < 3 ? (
            <button
              type="button"
              onClick={() => {
                const valid = step === 1 ? step1Valid : step2Valid;
                if (!valid) {
                  setError(t.requiredErr);
                  return;
                }
                setError("");
                setStep(step + 1);
              }}
              className="flex-1 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-medium"
            >
              {t.next}
            </button>
          ) : (
            <button
              type="button"
              disabled={!step3Valid || submitting}
              onClick={submit}
              className="flex-1 rounded-xl bg-amber-400 text-slate-900 px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? t.submitting : t.submit}
            </button>
          )}
        </div>

        <p className="text-xs text-slate-400 text-center mt-4">🕐 {t.autoNote}</p>
      </div>
    </main>
  );
}
