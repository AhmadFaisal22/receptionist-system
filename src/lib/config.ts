// How long visitor selfies are kept before automatic deletion. Personal data
// under Indonesia's UU PDP — keep the window short. Signature, name, and the
// rest of the log are retained for the audit trail; only the photo is purged.
export const PHOTO_RETENTION_DAYS: number = (() => {
  const n = Number(process.env.PHOTO_RETENTION_DAYS);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 30;
})();
