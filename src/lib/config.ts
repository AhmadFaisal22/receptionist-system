// How long visitor selfies are kept before automatic deletion. Personal data
// under Indonesia's UU PDP — keep the window short. Signature, name, and the
// rest of the log are retained for the audit trail; only the photo is purged.
export const PHOTO_RETENTION_DAYS: number = (() => {
  const n = Number(process.env.PHOTO_RETENTION_DAYS);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 30;
})();

// Destinations a visitor can be heading to inside the site. Edit this list to
// match the real building/room layout — it powers the check-in dropdown.
export const LOCATIONS: string[] = [
  "Lobby / Resepsionis",
  "Gedung A - Office",
  "Gedung A - Ruang Meeting",
  "Gedung B - Produksi",
  "Gedung B - Ruang IT",
  "Gedung C - Warehouse / Gudang",
  "Quality Assurance (QA)",
  "Engineering",
  "Finance / HR",
  "Klinik",
];
