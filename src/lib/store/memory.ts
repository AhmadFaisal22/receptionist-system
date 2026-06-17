import crypto from "crypto";
import { PHOTO_RETENTION_DAYS } from "../config";
import { localDate } from "../dates";
import { phonesMatch } from "../phone";
import type { CheckoutMethod, Employee, Visit } from "../types";
import type { CheckinInput, VisitUpdateInput } from "../validation";
import type { Store } from "./index";

const SEED_EMPLOYEES: Omit<Employee, "id">[] = [
  { name: "Rina Wijaya", department: "HR", active: true },
  { name: "Andi Prasetyo", department: "Warehouse", active: true },
  { name: "Hartono", department: "QA", active: true },
  { name: "Dian Putri", department: "Finance", active: true },
  { name: "Slamet Riyadi", department: "Production", active: true },
  { name: "Mei Lin", department: "Engineering", active: true },
];

export class MemoryStore implements Store {
  private visits: Visit[] = [];
  private employees: Employee[];
  private seq = 1;

  constructor() {
    this.employees = SEED_EMPLOYEES.map((e) => ({ ...e, id: crypto.randomUUID() }));
  }

  /** Lazy housekeeping run on every read: close stale visits + purge old photos. */
  private maintenance(): void {
    this.autoCloseStale();
    this.purgeExpiredPhotos();
  }

  /** Close out anything left open from a previous day, flagged as "auto". */
  private autoCloseStale(): void {
    const today = localDate();
    for (const v of this.visits) {
      if (v.status !== "checked_out" && localDate(new Date(v.submittedAt)) < today) {
        const day = new Date(v.submittedAt);
        day.setHours(23, 59, 0, 0);
        v.status = "checked_out";
        v.checkoutAt = day.toISOString();
        v.checkoutMethod = "auto";
      }
    }
  }

  /** Delete visitor selfies older than the retention window (UU PDP). */
  private purgeExpiredPhotos(): void {
    const cutoff = Date.now() - PHOTO_RETENTION_DAYS * 86_400_000;
    for (const v of this.visits) {
      if (v.photoDataUrl && new Date(v.submittedAt).getTime() < cutoff) {
        v.photoDataUrl = null;
      }
    }
  }

  async createVisit(input: CheckinInput): Promise<Visit> {
    const visit: Visit = {
      id: crypto.randomUUID(),
      code: `SEG-${String(this.seq++).padStart(4, "0")}`,
      status: "pending",
      name: input.name,
      institution: input.institution,
      phone: input.phone,
      purpose: input.purpose,
      hostId: input.hostId ?? null,
      hostName: input.hostName,
      hostDepartment: input.hostDepartment ?? "",
      photoDataUrl: input.photoDataUrl ?? null,
      signatureDataUrl: input.signatureDataUrl,
      notes: "",
      lang: input.lang,
      submittedAt: new Date().toISOString(),
      checkinAt: null,
      checkoutAt: null,
      checkoutMethod: null,
      exitToken: crypto.randomUUID(),
    };
    this.visits.unshift(visit);
    return visit;
  }

  async listVisits(date: string): Promise<Visit[]> {
    this.maintenance();
    return this.visits
      .filter((v) => localDate(new Date(v.submittedAt)) === date)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }

  async listAllVisits(): Promise<Visit[]> {
    this.maintenance();
    return [...this.visits].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }

  async getVisit(id: string): Promise<Visit | null> {
    this.maintenance();
    return this.visits.find((v) => v.id === id) ?? null;
  }

  async confirmVisit(id: string): Promise<Visit | null> {
    const v = await this.getVisit(id);
    if (!v || v.status !== "pending") return v;
    v.status = "checked_in";
    v.checkinAt = new Date().toISOString();
    return v;
  }

  async checkoutVisit(id: string, method: CheckoutMethod): Promise<Visit | null> {
    const v = await this.getVisit(id);
    if (!v) return null;
    if (v.status === "checked_out") return v;
    v.status = "checked_out";
    v.checkoutAt = new Date().toISOString();
    v.checkoutMethod = method;
    return v;
  }

  async updateVisit(id: string, patch: VisitUpdateInput): Promise<Visit | null> {
    const v = await this.getVisit(id);
    if (!v) return null;
    Object.assign(v, patch);
    return v;
  }

  async deleteVisit(id: string): Promise<boolean> {
    const before = this.visits.length;
    this.visits = this.visits.filter((v) => v.id !== id);
    return this.visits.length < before;
  }

  async findByExitToken(token: string): Promise<Visit | null> {
    this.maintenance();
    return this.visits.find((v) => v.exitToken === token) ?? null;
  }

  async findByCodeAndPhone(code: string, phone: string): Promise<Visit | null> {
    this.maintenance();
    return (
      this.visits.find(
        (v) => v.code.toUpperCase() === code.toUpperCase() && phonesMatch(v.phone, phone),
      ) ?? null
    );
  }

  async listEmployees(q?: string, includeInactive = false): Promise<Employee[]> {
    const needle = (q ?? "").trim().toLowerCase();
    return this.employees
      .filter((e) => includeInactive || e.active)
      .filter((e) => !needle || e.name.toLowerCase().includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async createEmployee(name: string, department: string): Promise<Employee> {
    const employee: Employee = { id: crypto.randomUUID(), name, department, active: true };
    this.employees.push(employee);
    return employee;
  }

  async updateEmployee(
    id: string,
    patch: Partial<Pick<Employee, "name" | "department" | "active">>,
  ): Promise<Employee | null> {
    const e = this.employees.find((x) => x.id === id);
    if (!e) return null;
    Object.assign(e, patch);
    return e;
  }

  async deleteEmployee(id: string): Promise<boolean> {
    const before = this.employees.length;
    this.employees = this.employees.filter((e) => e.id !== id);
    return this.employees.length < before;
  }
}
