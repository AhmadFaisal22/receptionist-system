import { createHash } from "crypto";

// Conditional JSON responder for the frequently-polled dashboard endpoints.
// Most 4–8s polls return unchanged data; a weak ETag lets us answer those with
// an empty `304 Not Modified` instead of re-shipping the whole (uncompressed)
// JSON body from the function to Vercel's edge — which is what "Fast Origin
// Transfer" bills. Fresh data still flows the instant the payload changes.
export function jsonMaybe304(req: Request, payload: unknown): Response {
  const body = JSON.stringify(payload);
  const etag = `W/"${createHash("sha1").update(body).digest("base64url").slice(0, 22)}"`;
  const headers = {
    "Content-Type": "application/json",
    ETag: etag,
    // Personal data + always revalidated by the client's If-None-Match; never
    // stored by a shared cache so the per-request auth check keeps running.
    "Cache-Control": "private, no-cache",
  };
  if (req.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(body, { status: 200, headers });
}
