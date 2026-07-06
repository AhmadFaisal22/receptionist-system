import type {
  CheckoutMethod,
  Employee,
  IncomingItem,
  ListItem,
  ListVisit,
  PublicVisit,
  Visit,
} from "../types";
import type {
  CheckinInput,
  ItemCreateInput,
  ItemUpdateInput,
  VisitUpdateInput,
} from "../validation";
import { MemoryStore } from "./memory";
import { SupabaseStore } from "./supabase";

export { localDate } from "../dates";

export interface Store {
  createVisit(input: CheckinInput): Promise<Visit>;
  /** date is a local yyyy-mm-dd string. FULL rows (with images) — exports only. */
  listVisits(date: string): Promise<Visit[]>;
  /** every visit, newest first (capped) — FULL rows, exports only */
  listAllVisits(): Promise<Visit[]>;
  /** date view WITHOUT image blobs — for the polled dashboard */
  listVisitsLite(date: string): Promise<ListVisit[]>;
  /** view-all WITHOUT image blobs — for the polled dashboard */
  listAllVisitsLite(): Promise<ListVisit[]>;
  /** just submittedAt timestamps — for the traffic chart */
  listVisitTimestamps(): Promise<string[]>;
  getVisit(id: string): Promise<Visit | null>;
  confirmVisit(id: string): Promise<Visit | null>;
  checkoutVisit(id: string, method: CheckoutMethod): Promise<Visit | null>;
  /** Receptionist edit of visitor details (not times/status). */
  updateVisit(id: string, patch: VisitUpdateInput): Promise<Visit | null>;
  deleteVisit(id: string): Promise<boolean>;
  findByExitToken(token: string): Promise<Visit | null>;
  findByCodeAndPhone(code: string, phone: string): Promise<Visit | null>;
  listEmployees(q?: string, includeInactive?: boolean): Promise<Employee[]>;
  createEmployee(name: string, department: string): Promise<Employee>;
  updateEmployee(
    id: string,
    patch: Partial<Pick<Employee, "name" | "department" | "active">>,
  ): Promise<Employee | null>;
  deleteEmployee(id: string): Promise<boolean>;

  // ---- Incoming Items ----
  createItem(input: ItemCreateInput, loggedBy: string): Promise<IncomingItem>;
  /** date view — FULL rows (with proof blobs) — exports only */
  listItems(date: string): Promise<IncomingItem[]>;
  /** view-all — FULL rows, exports only */
  listAllItems(): Promise<IncomingItem[]>;
  /** date view WITHOUT proof blobs — for the polled dashboard */
  listItemsLite(date: string): Promise<ListItem[]>;
  /** view-all WITHOUT proof blobs — for the polled dashboard */
  listAllItemsLite(): Promise<ListItem[]>;
  getItem(id: string): Promise<IncomingItem | null>;
  updateItem(id: string, patch: ItemUpdateInput): Promise<IncomingItem | null>;
  deleteItem(id: string): Promise<boolean>;
}

/** Strip the visitor-only exit token before anything reaches staff UIs. */
export function toPublic(v: Visit): PublicVisit {
  const { exitToken: _exitToken, ...pub } = v;
  return pub;
}

/** Drop the exit token AND the heavy image blobs for the polled list. */
export function toListVisit(v: Visit): ListVisit {
  const {
    exitToken: _exitToken,
    photoDataUrl: _photoDataUrl,
    signatureDataUrl: _signatureDataUrl,
    ...lite
  } = v;
  return lite;
}

/** Drop the proof blobs for the polled item list; keep a hasProof flag. */
export function toListItem(i: IncomingItem): ListItem {
  const { proofSignature, proofPhoto, collectedProof, ...lite } = i;
  return { ...lite, hasProof: !!(proofSignature || proofPhoto || collectedProof) };
}

const g = globalThis as unknown as { __vlogStore?: Store };

export function getStore(): Store {
  if (!g.__vlogStore) {
    g.__vlogStore =
      process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
        ? new SupabaseStore()
        : new MemoryStore();
  }
  return g.__vlogStore;
}
