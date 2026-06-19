// How long visitor selfies are kept before automatic deletion. Personal data
// under Indonesia's UU PDP — keep the window short. Signature, name, and the
// rest of the log are retained for the audit trail; only the photo is purged.
export const PHOTO_RETENTION_DAYS: number = (() => {
  const n = Number(process.env.PHOTO_RETENTION_DAYS);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 30;
})();

// Destinations a visitor can be heading to inside the site. Edit this list to
// match the real building/room layout — it powers the check-in dropdown.
// `id` is the canonical value stored in the DB; `en`/`zh` are shown when the
// visitor switches language. To add a location, copy a row and translate it.
import type { Lang } from "./i18n";

export interface LocationOption {
  id: string;
  en: string;
  zh: string;
}

export const LOCATIONS: LocationOption[] = [
  { id: "Lobby / Resepsionis", en: "Lobby / Reception", zh: "大堂 / 前台" },
  { id: "Parkir Motor / Mobil", en: "Motorcycle / Car Parking", zh: "摩托车 / 汽车停车场" },
  { id: "Ruang Meeting / Training", en: "Meeting / Training Room", zh: "会议 / 培训室" },
  { id: "Ruang produksi / Workshop", en: "Production / Workshop", zh: "生产车间 / 工作间" },
  { id: "Ruang IT / server", en: "IT / Server Room", zh: "IT / 服务器机房" },
  { id: "Ruang Warehouse / Gudang", en: "Warehouse", zh: "仓库" },
  { id: "Ruang Machine / Server", en: "Machine / Server Room", zh: "机器 / 服务器机房" },
];

/** Translate a stored destination value for display. Falls back to the raw
 *  value for free-typed or legacy entries that aren't in the list. */
export function locationLabel(value: string, lang: Lang): string {
  if (!value) return value;
  const m = LOCATIONS.find((l) => l.id === value || l.en === value || l.zh === value);
  if (!m) return value;
  return lang === "en" ? m.en : lang === "zh" ? m.zh : m.id;
}