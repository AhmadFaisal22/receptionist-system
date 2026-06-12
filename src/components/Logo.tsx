/** SEG Solar wordmark. Wide horizontal logo — sized by height, width auto. */
export default function Logo({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/seg-logo.png" alt="SEG Solar" className={className} />
  );
}
