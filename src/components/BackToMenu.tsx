import Link from "next/link";

/** Consistent "back to the home/landing page" link used across pages. */
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
      className={`inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 ${className}`}
    >
      <span aria-hidden>←</span> {label}
    </Link>
  );
}
