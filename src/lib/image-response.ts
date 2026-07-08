// Turn a stored data URL into a cacheable binary image response. Records are
// immutable once created, so we can cache aggressively in the browser; this
// keeps the base64 blobs out of the frequent list polls (Supabase egress).
export function imageResponse(dataUrl: string | null | undefined): Response {
  // Don't cache the "missing" state — a record may gain an image later
  // (e.g. an item's collection signature).
  const notFound = () =>
    new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  if (!dataUrl) return notFound();
  const m = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(dataUrl);
  if (!m) return notFound();
  const bytes = Buffer.from(m[2], "base64");
  return new Response(bytes, {
    headers: {
      "Content-Type": m[1],
      "Content-Length": String(bytes.length),
      // Per-id and immutable once created — let each device cache it "forever"
      // so signatures/photos are fetched once, not re-pulled on every visit.
      // `private` keeps them out of shared caches so the auth check still runs.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
