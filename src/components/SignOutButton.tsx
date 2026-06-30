"use client";

/** Red "exit / sign out" chip, matching the BackToMenu pill so the header
 *  controls line up consistently across all phones (Android + iOS). */
export default function SignOutButton({
  label,
  onClick,
  className = "",
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-medium text-red-600 shadow-sm hover:border-red-300 hover:bg-red-100 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4 -ml-0.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="m16 17 5-5-5-5" />
        <path d="M21 12H9" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
