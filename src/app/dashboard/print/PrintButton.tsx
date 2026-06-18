"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  fileBase: string;
  docTitle: string;
  docSubtitle: string;
  generated: string;
  head: string[];
  body: string[][];
  signatures: { row: number; url: string }[];
  signCol: number;
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

export default function PrintButton(props: Props) {
  const [saving, setSaving] = useState(false);
  const ran = useRef(false);

  async function handleSave() {
    setSaving(true);
    try {
      const [{ jsPDF }, autoTableMod] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const autoTable = autoTableMod.default;
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const margin = 32;

      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(props.docTitle, margin, 36);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(props.docSubtitle, margin, 52);
      doc.setTextColor(0);

      const sigMap = new Map(props.signatures.map((s) => [s.row, s.url]));

      autoTable(doc, {
        head: [props.head],
        body: props.body,
        startY: 64,
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak", valign: "middle" },
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" },
        // Reserve room in the signature column for the embedded image.
        columnStyles: props.signCol >= 0 ? { [props.signCol]: { minCellWidth: 70 } } : {},
        didParseCell: (data) => {
          // Keep the multi-line "name\ninstitution" cell readable.
          if (data.section === "body" && data.column.index === 1) {
            data.cell.styles.cellWidth = "wrap";
          }
        },
        didDrawCell: (data) => {
          if (
            data.section === "body" &&
            data.column.index === props.signCol &&
            sigMap.has(data.row.index)
          ) {
            const url = sigMap.get(data.row.index)!;
            try {
              const pad = 2;
              const w = data.cell.width - pad * 2;
              const h = data.cell.height - pad * 2;
              doc.addImage(url, "PNG", data.cell.x + pad, data.cell.y + pad, w, h, undefined, "FAST");
            } catch {
              // skip an unreadable signature
            }
          }
        },
      });

      const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 64;
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(props.generated, margin, finalY + 16);

      doc.save(`${props.fileBase}.pdf`);
    } finally {
      setSaving(false);
    }
  }

  // Auto-run the action the dashboard requested (Save or Print) on open.
  useEffect(() => {
    if (ran.current || !props.autoAction) return;
    ran.current = true;
    const id = setTimeout(() => {
      if (props.autoAction === "print") window.print();
      else if (props.autoAction === "save") void handleSave();
    }, 400);
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
        {saving ? `${props.saveLabel}…` : props.saveLabel}
      </button>
      <button
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-medium"
      >
        {PrinterIcon}
        {props.printLabel}
      </button>
    </div>
  );
}
