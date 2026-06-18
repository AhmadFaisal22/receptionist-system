"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  fileBase: string;
  captureId: string;
  saveLabel: string;
  printLabel: string;
  autoAction?: "save" | "print";
}

const PrinterIcon = (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 9V2h12v7" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" rx="1" />
  </svg>
);

const DownloadIcon = (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m7 10 5 5 5-5" />
    <path d="M12 15V3" />
  </svg>
);

export default function PrintButton({
  fileBase,
  captureId,
  saveLabel,
  printLabel,
  autoAction,
}: Props) {
  const [saving, setSaving] = useState(false);
  const ran = useRef(false);

  async function handleSave() {
    const el = document.getElementById(captureId);
    if (!el) return;
    setSaving(true);
    try {
      // Render the actual HTML (Chinese headers + signatures included) to an
      // image — jsPDF's built-in fonts can't draw CJK, so we rasterise instead.
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");

      // A4 landscape so the wide visitor table is never trimmed.
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 24;
      const imgW = pageW - margin * 2;
      const imgH = (canvas.height * imgW) / canvas.width;
      const usableH = pageH - margin * 2;

      let heightLeft = imgH;
      let position = margin;
      pdf.addImage(imgData, "PNG", margin, position, imgW, imgH);
      heightLeft -= usableH;
      while (heightLeft > 0) {
        pdf.addPage();
        position = margin - (imgH - heightLeft);
        pdf.addImage(imgData, "PNG", margin, position, imgW, imgH);
        heightLeft -= usableH;
      }
      pdf.save(`${fileBase}.pdf`);
    } finally {
      setSaving(false);
    }
  }

  // Auto-run the action the dashboard requested (Save or Print) on open.
  useEffect(() => {
    if (ran.current || !autoAction) return;
    ran.current = true;
    const id = setTimeout(() => {
      if (autoAction === "print") window.print();
      else if (autoAction === "save") void handleSave();
    }, 500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="no-print flex items-center gap-2">
      <button
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white text-slate-700 px-4 py-2 text-sm font-medium hover:border-slate-400 disabled:opacity-50"
      >
        {DownloadIcon}
        {saving ? `${saveLabel}…` : saveLabel}
      </button>
      <button
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-medium"
      >
        {PrinterIcon}
        {printLabel}
      </button>
    </div>
  );
}
