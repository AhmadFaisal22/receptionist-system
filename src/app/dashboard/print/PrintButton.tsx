"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-medium"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/pdf.svg" alt="" className="h-4 w-4 brightness-0 invert" />
      Print / Save as PDF
    </button>
  );
}
