"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fmtDate, fmtTime, localDate } from "@/lib/dates";
import { itemsDict, staffDict, type ItemMessages } from "@/lib/i18n";
import { ITEM_STATUSES, ITEM_TYPES } from "@/lib/validation";
import { UOMS } from "@/lib/config";
import { useLang } from "@/lib/useLang";
import type { IncomingItem, ItemStatus } from "@/lib/types";
import BackToMenu from "@/components/BackToMenu";
import DownloadableImage from "@/components/DownloadableImage";
import LangToggle from "@/components/LangToggle";
import Logo from "@/components/Logo";
import SignatureField from "@/components/SignatureField";
import SignOutButton from "@/components/SignOutButton";

interface EmployeeOption {
  id: string;
  name: string;
  department: string;
}

const STATUS_STYLE: Record<ItemStatus, string> = {
  received_guard: "bg-amber-100 text-amber-800",
  at_reception: "bg-blue-100 text-blue-800",
  collected: "bg-green-100 text-green-800",
};

// Proportional, wrapping columns: No / Received / Sender / Type / Desc /
// Recipient / Dept / Status / Proof.
const COLW = ["w-[44px]", "w-[110px]", "w-[150px]", "w-[96px]", "w-[160px]", "w-[140px]", "w-[90px]", "w-[120px]", "w-[70px]"];

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

function StatusBadge({ status, t }: { status: ItemStatus; t: ItemMessages }) {
  return (
    <span
      className={`inline-block rounded-2xl text-xs font-medium px-2.5 py-0.5 text-center leading-tight break-words ${STATUS_STYLE[status]}`}
    >
      {t.statuses[status]}
    </span>
  );
}

export default function ItemsClient({
  user,
  role,
  canDelete,
}: {
  user: string;
  role: string;
  canDelete: boolean;
}) {
  const [lang, setLang] = useLang();
  const t = itemsDict[lang];
  const st = staffDict[lang];

  const [items, setItems] = useState<IncomingItem[]>([]);
  const [date, setDate] = useState(localDate());
  const [showAll, setShowAll] = useState(false);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | ItemStatus>("");
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [selected, setSelected] = useState<IncomingItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [collectSig, setCollectSig] = useState<string | null>(null);
  const [pdfMenu, setPdfMenu] = useState(false);
  const exportQs = showAll ? `all=1&lang=${lang}` : `date=${date}&lang=${lang}`;

  // Quick-add form
  const [adding, setAdding] = useState(false);
  const [sender, setSender] = useState("");
  const [itemType, setItemType] = useState<(typeof ITEM_TYPES)[number]>("package");
  const [description, setDescription] = useState("");
  const [qty, setQty] = useState(""); // blank by default; parsed on submit
  const [uom, setUom] = useState("pcs");
  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipient, setRecipient] = useState<EmployeeOption | null>(null);
  const [suggestions, setSuggestions] = useState<EmployeeOption[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [formErr, setFormErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(showAll ? `/api/items?all=1` : `/api/items?date=${date}`, {
        cache: "no-store",
      });
      if (res.status === 401) {
        window.location.replace("/login?next=/items");
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      setItems((await res.json()) as IncomingItem[]);
      setLive(true);
    } catch {
      setLive(false);
    } finally {
      setLoading(false);
    }
  }, [date, showAll]);

  useEffect(() => {
    setLoading(true);
    load();
    const timer = setInterval(() => {
      if (!document.hidden) load();
    }, 4000);
    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  // Recipient autocomplete from the employee directory.
  useEffect(() => {
    if (recipient || recipientQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/employees?q=${encodeURIComponent(recipientQuery.trim())}`);
        if (res.ok) setSuggestions((await res.json()) as EmployeeOption[]);
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [recipientQuery, recipient]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items
      .filter((i) => (statusFilter ? i.status === statusFilter : true))
      .filter((i) =>
        !needle
          ? true
          : [i.code, i.sender, i.recipientName, i.recipientDepartment, i.description]
              .join(" ")
              .toLowerCase()
              .includes(needle),
      );
  }, [items, q, statusFilter]);

  function resetForm() {
    setSender("");
    setItemType("package");
    setDescription("");
    setQty("");
    setUom("pcs");
    setRecipientQuery("");
    setRecipient(null);
    setSuggestions([]);
    setPhoto(null);
    setSignature(null);
    setFormErr("");
  }

  async function handlePhoto(file: File | undefined) {
    if (!file) return;
    try {
      setPhoto(await downscalePhoto(file));
    } catch {
      setPhoto(null);
    }
  }

  async function submit() {
    const recipientName = recipient?.name ?? recipientQuery.trim();
    if (sender.trim().length < 1 || recipientName.length < 2) {
      setFormErr(t.required);
      return;
    }
    setSubmitting(true);
    setFormErr("");
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: sender.trim(),
          itemType,
          description: description.trim(),
          recipientId: recipient?.id ?? null,
          recipientName,
          recipientDepartment: recipient?.department ?? "",
          quantity: qty === "" ? 1 : Math.min(100000, Math.max(0, parseInt(qty, 10))),
          uom,
          proofSignature: signature,
          proofPhoto: photo,
        }),
      });
      if (!res.ok) {
        setFormErr(t.addError);
        return;
      }
      resetForm();
      setAdding(false);
      load();
    } catch {
      setFormErr(st.networkError);
    } finally {
      setSubmitting(false);
    }
  }

  async function patchStatus(item: IncomingItem, status: ItemStatus, collectedProof?: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(collectedProof ? { status, collectedProof } : { status }),
      });
      if (res.ok) {
        setSelected((await res.json()) as IncomingItem);
        setCollectSig(null);
        load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.replace("/login");
  }

  async function remove(item: IncomingItem) {
    if (!window.confirm(t.confirmDelete)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/items/${item.id}`, { method: "DELETE" });
      if (res.ok) {
        setSelected(null);
        load();
      }
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-slate-500";
  const td = "border border-slate-300 px-3 py-2 align-top break-words [overflow-wrap:anywhere]";
  // Proof (photo/signature) stays locked until the required fields are filled.
  const formReady =
    sender.trim().length >= 1 && (recipient?.name ?? recipientQuery.trim()).length >= 2;

  return (
    <main className="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Logo className="h-9 w-auto" />
          <div>
            <h1 className="text-base font-semibold leading-tight">{t.title}</h1>
            <p className="text-xs text-slate-500">{t.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <LangToggle lang={lang} setLang={setLang} />
          <span
            className={`flex items-center gap-1.5 rounded-full text-xs font-medium px-3 py-1 ${
              live ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-500"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${live ? "bg-green-600" : "bg-slate-400"}`} />
            {live ? st.live : st.offline}
          </span>
          <span className="text-xs text-slate-500 hidden sm:block">
            {user} ({role})
          </span>
          <BackToMenu label={st.menu} className="text-xs" />
          <SignOutButton label={st.signOut} onClick={logout} className="text-xs" />
        </div>
      </header>

      <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-center text-xs font-medium text-amber-800">
        {t.inItemsMenu}
      </div>

      {/* Controls */}
      <section className="flex items-center gap-2 mt-5 flex-wrap">
        <button
          onClick={() => {
            setAdding((v) => !v);
            setFormErr("");
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-medium"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {t.logItem}
        </button>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.search}
          className="flex-1 min-w-44 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "" | ItemStatus)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">{t.filterAll}</option>
          {ITEM_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t.statuses[s]}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          disabled={showAll}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-40"
        />
        <button
          onClick={() => setShowAll((s) => !s)}
          className={`rounded-xl border px-3 py-2 text-sm ${
            showAll
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-slate-600 border-slate-300 hover:border-slate-400"
          }`}
        >
          {showAll ? t.viewByDate : t.viewAll}
        </button>
        <div className="relative">
          <button
            onClick={() => setPdfMenu((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:border-slate-400"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pdf.svg" alt="" className="h-4 w-4" />
            PDF
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {pdfMenu && (
            <>
              <button className="fixed inset-0 z-10 cursor-default" aria-label="close" onClick={() => setPdfMenu(false)} />
              <div className="absolute right-0 mt-1 z-20 w-44 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                <a
                  href={`/items/print?${exportQs}&action=save`}
                  target="_blank"
                  onClick={() => setPdfMenu(false)}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <path d="m7 10 5 5 5-5" />
                    <path d="M12 15V3" />
                  </svg>
                  {st.savePdf}
                </a>
                <a
                  href={`/items/print?${exportQs}&action=print`}
                  target="_blank"
                  onClick={() => setPdfMenu(false)}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 border-t border-slate-100"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9V2h12v7" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" rx="1" />
                  </svg>
                  {st.printPdf}
                </a>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Quick-add form */}
      {adding && (
        <section className="mt-4 rounded-2xl bg-white border border-slate-200 p-4 vlog-pop">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">{t.formTitle}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t.senderLabel}</label>
              <input className={inputCls} value={sender} onChange={(e) => setSender(e.target.value)} placeholder={t.senderPh} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t.typeLabel}</label>
              <select className={inputCls} value={itemType} onChange={(e) => setItemType(e.target.value as typeof itemType)}>
                {ITEM_TYPES.map((ty) => (
                  <option key={ty} value={ty}>
                    {t.types[ty]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t.qtyLabel}</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="1"
                maxLength={6}
                className={inputCls}
                value={qty}
                onChange={(e) =>
                  // digits only, drop leading zeros so "07" becomes "7"
                  setQty(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, ""))
                }
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t.uomLabel}</label>
              <select className={inputCls} value={uom} onChange={(e) => setUom(e.target.value)}>
                {UOMS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-500 mb-1">{t.descLabel}</label>
              <input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.descPh} maxLength={300} />
            </div>
            <div className="relative">
              <label className="block text-xs text-slate-500 mb-1">{t.recipientLabel}</label>
              {recipient ? (
                <div className="flex items-center justify-between rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5">
                  <span className="text-sm">
                    {recipient.name} <span className="text-slate-400">— {recipient.department}</span>
                  </span>
                  <button type="button" className="text-xs text-slate-500 underline" onClick={() => { setRecipient(null); setRecipientQuery(""); }}>
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <input className={inputCls} value={recipientQuery} onChange={(e) => setRecipientQuery(e.target.value)} placeholder={t.recipientPh} />
                  {suggestions.length > 0 && (
                    <div className="absolute z-10 left-0 right-0 mt-1 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                      {suggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => { setRecipient(s); setSuggestions([]); }}
                          className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                        >
                          {s.name} <span className="text-slate-400">— {s.department}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t.deptLabel}</label>
              <input className={`${inputCls} bg-slate-50`} value={recipient?.department ?? ""} readOnly placeholder="—" />
            </div>
          </div>

          {/* Proof (optional) — locked until required fields are filled. */}
          {formReady ? (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">{t.photoLabel}</label>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhoto(e.target.files?.[0])} />
                {photo ? (
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo} alt="item" className="w-16 h-16 rounded-xl object-cover border border-slate-200" />
                    <button type="button" className="text-sm text-slate-500 underline" onClick={() => fileRef.current?.click()}>
                      {t.photoRetake}
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()} className="w-full rounded-xl border border-dashed border-slate-300 py-3 text-sm text-slate-500">
                    📷 {t.photoLabel}
                  </button>
                )}
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">{t.proofLabel}</label>
                <SignatureField onChange={setSignature} hint={t.signatureHint} clearLabel={t.clear} />
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 py-5 text-center text-xs text-slate-400">
              🔒 {t.fillFirst}
            </div>
          )}

          {formErr && <p className="text-sm text-red-600 mt-3">{formErr}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={submit} disabled={submitting} className="flex-1 rounded-xl bg-amber-400 text-slate-900 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
              {submitting ? t.saving : t.save}
            </button>
            <button onClick={() => { setAdding(false); resetForm(); }} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-600">
              {t.cancel}
            </button>
          </div>
        </section>
      )}

      {/* Table */}
      <section className="mt-4 bg-white border border-slate-300 rounded-xl overflow-x-auto">
        <table className="w-full min-w-[1000px] text-sm border-collapse table-fixed">
          <colgroup>
            {COLW.map((w, i) => (
              <col key={i} className={w} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {t.cols.map((label, i) => (
                <th key={i} className="border border-slate-300 px-3 py-2.5 bg-slate-100 text-center align-middle whitespace-normal break-words leading-tight">
                  <div className="text-[13px] font-semibold text-slate-700">{label}</div>
                  {lang !== "zh" && (
                    <div className="text-[10px] font-normal text-slate-400 mt-0.5">{itemsDict.zh.cols[i]}</div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="border border-slate-300 px-2 py-10 text-center text-slate-400">
                  {loading ? "…" : t.empty}
                </td>
              </tr>
            )}
            {filtered.map((i, idx) => (
              <tr key={i.id} onClick={() => { setSelected(i); setCollectSig(null); }} className="cursor-pointer hover:bg-slate-50">
                <td className={`${td} text-center`}>{idx + 1}</td>
                <td className={`${td} text-center whitespace-nowrap`}>
                  <div>{fmtDate(i.receivedAt)}</div>
                  <div className="text-[11px] text-slate-500">{fmtTime(i.receivedAt)}</div>
                </td>
                <td className={td}>{i.sender}</td>
                <td className={td}>
                  {t.types[i.itemType]}
                  <div className="text-[11px] text-slate-500">× {i.quantity} {i.uom}</div>
                </td>
                <td className={td}>{i.description || "—"}</td>
                <td className={td}>{i.recipientName}</td>
                <td className={td}>{i.recipientDepartment || "—"}</td>
                <td className={`${td} text-center`}><StatusBadge status={i.status} t={t} /></td>
                <td className={`${td} text-center`}>
                  {i.proofSignature || i.proofPhoto ? (
                    <span className="text-green-600" title="proof">✓</span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="text-xs text-slate-400 mt-3">⟳ {t.autoUpdate}</p>

      {/* Detail drawer */}
      {selected && (
        <div
          className="vlog-fade fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-20"
          onClick={() => { setSelected(null); setCollectSig(null); }}
        >
          <div className="vlog-pop w-full max-w-md rounded-3xl bg-white p-6 max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-xs text-slate-500">{selected.code}</p>
                <h2 className="text-lg font-semibold">{selected.recipientName}</h2>
                <p className="text-sm text-slate-500">{selected.recipientDepartment}</p>
              </div>
              <StatusBadge status={selected.status} t={t} />
            </div>

            <div className="mt-4 text-sm space-y-1.5">
              <p><span className="text-slate-500">{t.receivedAt}:</span> {fmtDate(selected.receivedAt)} {fmtTime(selected.receivedAt)}</p>
              <p><span className="text-slate-500">{t.senderLabel}:</span> {selected.sender}</p>
              <p><span className="text-slate-500">{t.typeLabel}:</span> {t.types[selected.itemType]}</p>
              <p><span className="text-slate-500">{t.qtyLabel}:</span> {selected.quantity} {selected.uom}</p>
              {selected.description && <p><span className="text-slate-500">{t.descLabel}:</span> {selected.description}</p>}
              <p><span className="text-slate-500">{t.loggedBy}:</span> {selected.loggedBy}</p>
              {selected.collectedAt && (
                <p><span className="text-slate-500">{t.collectedAt}:</span> {fmtDate(selected.collectedAt)} {fmtTime(selected.collectedAt)}</p>
              )}
            </div>

            {(selected.proofPhoto || selected.proofSignature) && (
              <div className="mt-4">
                <p className="text-xs text-slate-500 mb-1">{t.senderProofLabel}</p>
                <div className="flex gap-3">
                  {selected.proofPhoto && (
                    <DownloadableImage
                      src={selected.proofPhoto}
                      alt="proof"
                      name={`${selected.code}-photo`}
                      title={st.download}
                      wrapClassName="w-24 h-24 shrink-0"
                      imgClassName="w-24 h-24 rounded-2xl object-cover border border-slate-200"
                    />
                  )}
                  {selected.proofSignature && (
                    <DownloadableImage
                      src={selected.proofSignature}
                      alt="sender signature"
                      name={`${selected.code}-sender-sign`}
                      title={st.download}
                      wrapClassName="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-2"
                      imgClassName="h-16 mx-auto object-contain"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Receiver's signature captured at collection. */}
            {selected.collectedProof && (
              <div className="mt-4">
                <p className="text-xs text-slate-500 mb-1">{t.receiverProofLabel}</p>
                <DownloadableImage
                  src={selected.collectedProof}
                  alt="receiver signature"
                  name={`${selected.code}-receiver-sign`}
                  title={st.download}
                  wrapClassName="rounded-xl border border-green-200 bg-green-50 p-2"
                  imgClassName="h-16 mx-auto object-contain"
                />
              </div>
            )}

            {/* Collection signature capture (when about to mark collected) */}
            {selected.status === "at_reception" && (
              <div className="mt-4">
                <p className="text-xs text-slate-500 mb-1">{t.proofLabel}</p>
                <SignatureField onChange={setCollectSig} hint={t.signatureHint} clearLabel={t.clear} />
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-5">
              {selected.status === "received_guard" && (
                <button onClick={() => patchStatus(selected, "at_reception")} disabled={busy} className="flex-1 rounded-xl bg-blue-600 text-white px-4 py-2.5 text-sm font-medium disabled:opacity-50">
                  {t.sendToReception}
                </button>
              )}
              {selected.status === "at_reception" && (
                <button onClick={() => patchStatus(selected, "collected", collectSig ?? undefined)} disabled={busy} className="flex-1 rounded-xl bg-green-600 text-white px-4 py-2.5 text-sm font-medium disabled:opacity-50">
                  {t.markCollected}
                </button>
              )}
              {canDelete && (
                <button onClick={() => remove(selected)} disabled={busy} className="rounded-xl border border-red-300 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50">
                  {t.delete}
                </button>
              )}
              <button onClick={() => { setSelected(null); setCollectSig(null); }} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-600">
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
