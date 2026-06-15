import type { CheckoutMethod, Employee, PublicVisit, Visit } from "../types";
import type { CheckinInput, VisitUpdateInput } from "../validation";
import { MemoryStore } from "./memory";
import { SupabaseStore } from "./supabase";

export { localDate } from "../dates";

export interface Store {
  createVisit(input: CheckinInput): Promise<Visit>;
  /** date is a local yyyy-mm-dd string */
  listVisits(date: string): Promise<Visit[]>;
  /** every visit, newest first (capped) — for the "view all" mode */
  listAllVisits(): Promise<Visit[]>;
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
}

/** Strip the visitor-only exit token before anything reaches staff UIs. */
export function toPublic(v: Visit): PublicVisit {
  const { exitToken: _exitToken, ...pub } = v;
  return pub;
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
