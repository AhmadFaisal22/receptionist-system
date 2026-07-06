"use client";

import { useState, type ReactNode } from "react";

/** Image with an optional download button overlay. `src` can be a data URL or a
 *  same-origin endpoint (e.g. /api/visits/[id]/photo). If it fails to load
 *  (missing record image), `fallback` is rendered instead. */
export default function DownloadableImage({
  src,
  alt,
  name,
  title,
  wrapClassName = "",
  imgClassName,
  allowDownload = true,
  fallback = null,
}: {
  src: string;
  alt: string;
  /** Base filename without extension, e.g. "SEG-0001-photo". */
  name: string;
  title: string;
  wrapClassName?: string;
  imgClassName?: string;
  /** Set false to hide the download button (e.g. signatures). */
  allowDownload?: boolean;
  /** Rendered when the image can't load (e.g. no photo on record). */
  fallback?: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;

  const ext = src.startsWith("data:image/png")
    ? "png"
    : src.startsWith("data:image/webp")
      ? "webp"
      : "jpg";

  return (
    <div className={`relative ${wrapClassName}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className={imgClassName} onError={() => setFailed(true)} />
      {allowDownload && (
        <a
          href={src}
          download={`${name}.${ext}`}
          title={title}
          aria-label={title}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-1 right-1 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white/90 p-1.5 text-slate-700 shadow-sm hover:bg-white"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="m7 10 5 5 5-5" />
            <path d="M12 15V3" />
          </svg>
        </a>
      )}
    </div>
  );
}
