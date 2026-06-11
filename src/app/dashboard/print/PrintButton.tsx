"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-medium"
    >
      🖨 Print / Save as PDF
    </button>
  );
}
