import Link from "next/link";

/** Consistent, tappable "back to the home/landing page" chip used across pages.
 *  Styled as a pill with a comfortable touch target for mobile + desktop. */
export default function BackToMenu({
  label = "Main menu",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <Link
      href="/"
      aria-label={label}
      className={`group inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4 -ml-0.5 transition-transform group-hover:-translate-x-0.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="m15 18-6-6 6-6" />
      </svg>
      <span>{label}</span>
    </Link>
  );
}
