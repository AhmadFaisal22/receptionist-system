import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { phonesMatch } from "../phone";
import type { CheckoutMethod, Employee, Lang, Visit, VisitStatus } from "../types";
import type { CheckinInput } from "../validation";
import type { Store } from "./index";

// Production store. The service-role key is server-only (never NEXT_PUBLIC_)
// and bypasses RLS; the database itself stays deny-by-default for every other
// key. See supabase/schema.sql for the schema and policies.

interface VisitRow {
  id: string;
  code: string;
  status: string;
  name: string;
  institution: string;
  phone: string;
  purpose: string;
  host_id: string | null;
  host_name: string;
  host_department: string;
  photo_data: string | null;
  signature_data: string;
  lang: string;
  exit_token: string;
  submitted_at: string;
  checkin_at: string | null;
  checkout_at: string | null;
  checkout_method: string | null;
}

interface EmployeeRow {
  id: string;
  name: string;
  department: string;
  active: boolean;
}

function mapVisit(r: VisitRow): Visit {
  return {
    id: r.id,
    code: r.code,
    status: r.status as VisitStatus,
    name: r.name,
    institution: r.institution,
    phone: r.phone,
    purpose: r.purpose,
    hostId: r.host_id,
    hostName: r.host_name,
    hostDepartment: r.host_department,
    photoDataUrl: r.photo_data,
    signatureDataUrl: r.signature_data,
    lang: r.lang as Lang,
    submittedAt: r.submitted_at,
    checkinAt: r.checkin_at,
    checkoutAt: r.checkout_at,
    checkoutMethod: (r.checkout_method as CheckoutMethod | null) ?? null,
    exitToken: r.exit_token,
  };
}

export class SupabaseStore implements Store {
  private db: SupabaseClient;

  constructor() {
    this.db = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      { auth: { persistSession: false } },
    );
  }

  async createVisit(input: CheckinInput): Promise<Visit> {
    const { data, error } = await this.db
      .from("visits")
      .insert({
        name: input.name,
        institution: input.institution,
        phone: input.phone,
        purpose: input.purpose,
        host_id: input.hostId ?? null,
        host_name: input.hostName,
        host_department: input.hostDepartment ?? "",
        photo_data: input.photoDataUrl ?? null,
        signature_data: input.signatureDataUrl,
        lang: input.lang,
      })
      .select()
      .single();
    if (error) throw error;
    return mapVisit(data as VisitRow);
  }

  async listVisits(date: string): Promise<Visit[]> {
    await this.db.rpc("auto_close_stale");
    const { data, error } = await this.db
      .from("visits")
      .select()
      .eq("submitted_date", date)
      .order("submitted_at", { ascending: false });
    if (error) throw error;
    return ((data ?? []) as VisitRow[]).map(mapVisit);
  }

  async getVisit(id: string): Promise<Visit | null> {
    const { data, error } = await this.db.from("visits").select().eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? mapVisit(data as VisitRow) : null;
  }

  async confirmVisit(id: string): Promise<Visit | null> {
    const { error } = await this.db
      .from("visits")
      .update({ status: "checked_in", checkin_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "pending");
    if (error) throw error;
    return this.getVisit(id);
  }

  async checkoutVisit(id: string, method: CheckoutMethod): Promise<Visit | null> {
    const existing = await this.getVisit(id);
    if (!existing) return null;
    if (existing.status === "checked_out") return existing;
    const { error } = await this.db
      .from("visits")
      .update({
        status: "checked_out",
        checkout_at: new Date().toISOString(),
        checkout_method: method,
      })
      .eq("id", id)
      .neq("status", "checked_out");
    if (error) throw error;
    return this.getVisit(id);
  }

  async findByExitToken(token: string): Promise<Visit | null> {
    const { data, error } = await this.db
      .from("visits")
      .select()
      .eq("exit_token", token)
      .maybeSingle();
    if (error) throw error;
    return data ? mapVisit(data as VisitRow) : null;
  }

  async findByCodeAndPhone(code: string, phone: string): Promise<Visit | null> {
    const { data, error } = await this.db
      .from("visits")
      .select()
      .ilike("code", code)
      .limit(5);
    if (error) throw error;
    const match = ((data ?? []) as VisitRow[]).find((r) => phonesMatch(r.phone, phone));
    return match ? mapVisit(match) : null;
  }

  async listEmployees(q?: string, includeInactive = false): Promise<Employee[]> {
    let query = this.db.from("employees").select().order("name");
    if (!includeInactive) query = query.eq("active", true);
    if (q?.trim()) query = query.ilike("name", `%${q.trim().replace(/[%_]/g, "")}%`);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as EmployeeRow[];
  }

  async createEmployee(name: string, department: string): Promise<Employee> {
    const { data, error } = await this.db
      .from("employees")
      .insert({ name, department, active: true })
      .select()
      .single();
    if (error) throw error;
    return data as EmployeeRow;
  }

  async updateEmployee(
    id: string,
    patch: Partial<Pick<Employee, "name" | "department" | "active">>,
  ): Promise<Employee | null> {
    const { data, error } = await this.db
      .from("employees")
      .update(patch)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return (data as EmployeeRow | null) ?? null;
  }

  async deleteEmployee(id: string): Promise<boolean> {
    const { error, count } = await this.db
      .from("employees")
      .delete({ count: "exact" })
      .eq("id", id);
    if (error) throw error;
    return (count ?? 0) > 0;
  }
}
