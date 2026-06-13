/** Brand logo. Defaults to the SEG Solar wordmark; pass `src` to override. */
export default function Logo({
  className = "h-8 w-auto",
  src = "/seg-logo.png",
  alt = "SEG Solar",
}: {
  className?: string;
  src?: string;
  alt?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  );
}
