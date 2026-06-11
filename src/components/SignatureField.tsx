"use client";

import { useEffect, useRef } from "react";
import SignaturePad from "signature_pad";

export default function SignatureField({
  onChange,
  hint,
  clearLabel,
}: {
  onChange: (dataUrl: string | null) => void;
  hint: string;
  clearLabel: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pad = new SignaturePad(canvas, { penColor: "#0f172a" });
    padRef.current = pad;

    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext("2d")?.scale(ratio, ratio);
      pad.clear();
      onChange(null);
    };
    resize();
    window.addEventListener("resize", resize);

    const onEnd = () => onChange(pad.isEmpty() ? null : pad.toDataURL("image/png"));
    pad.addEventListener("endStroke", onEnd);

    return () => {
      window.removeEventListener("resize", resize);
      pad.off();
    };
    // onChange comes from useState setters / stable callbacks upstream.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="w-full h-36 rounded-xl border border-slate-300 bg-white touch-none"
      />
      <div className="flex items-center justify-between mt-1">
        <p className="text-xs text-slate-400">{hint}</p>
        <button
          type="button"
          onClick={() => {
            padRef.current?.clear();
            onChange(null);
          }}
          className="text-xs text-slate-500 underline"
        >
          {clearLabel}
        </button>
      </div>
    </div>
  );
}
