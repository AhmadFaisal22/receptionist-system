import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PHOTO_RETENTION_DAYS } from "../config";
import { phonesMatch } from "../phone";
import type {
  CheckoutMethod,
  Employee,
  IncomingItem,
  ItemStatus,
  ItemType,
  Lang,
  Visit,
  VisitStatus,
} from "../types";
import type {
  CheckinInput,
  ItemCreateInput,
  ItemUpdateInput,
  VisitUpdateInput,
} from "../validation";
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
  destination: string | null;
  photo_data: string | null;
  signature_data: string;
  notes: string | null;
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

interface ItemRow {
  id: string;
  code: string;
  received_at: string;
  sender: string;
  item_type: string;
  description: string;
  recipient_id: string | null;
  recipient_name: string;
  recipient_department: string;
  status: string;
  proof_signature: string | null;
  proof_photo: string | null;
  logged_by: string;
  collected_at: string | null;
  collected_proof: string | null;
  created_at: string;
  updated_at: string;
}

function mapItem(r: ItemRow): IncomingItem {
  return {
    id: r.id,
    code: r.code,
    receivedAt: r.received_at,
    sender: r.sender,
    itemType: r.item_type as ItemType,
    description: r.description ?? "",
    recipientId: r.recipient_id,
    recipientName: r.recipient_name,
    recipientDepartment: r.recipient_department ?? "",
    status: r.status as ItemStatus,
    proofSignature: r.proof_signature,
    proofPhoto: r.proof_photo,
    loggedBy: r.logged_by ?? "",
    collectedAt: r.collected_at,
    collectedProof: r.collected_proof,
    submittedAt: r.created_at,
    updatedAt: r.updated_at,
  };
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
    destination: r.destination ?? "",
    photoDataUrl: r.photo_data,
    signatureDataUrl: r.signature_data,
    notes: r.notes ?? "",
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
        destination: input.destination ?? "",
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
    await this.db.rpc("purge_expired_photos", { retention_days: PHOTO_RETENTION_DAYS });
    const { data, error } = await this.db
      .from("visits")
      .select()
      .eq("submitted_date", date)
      .order("submitted_at", { ascending: false });
    if (error) throw error;
    return ((data ?? []) as VisitRow[]).map(mapVisit);
  }

  async listAllVisits(): Promise<Visit[]> {
    await this.db.rpc("auto_close_stale");
    await this.db.rpc("purge_expired_photos", { retention_days: PHOTO_RETENTION_DAYS });
    const { data, error } = await this.db
      .from("visits")
      .select()
      .order("submitted_at", { ascending: false })
      .limit(5000);
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

  async updateVisit(id: string, patch: VisitUpdateInput): Promise<Visit | null> {
    const row: Record<string, string> = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.institution !== undefined) row.institution = patch.institution;
    if (patch.phone !== undefined) row.phone = patch.phone;
    if (patch.purpose !== undefined) row.purpose = patch.purpose;
    if (patch.hostName !== undefined) row.host_name = patch.hostName;
    if (patch.hostDepartment !== undefined) row.host_department = patch.hostDepartment;
    if (patch.destination !== undefined) row.destination = patch.destination;
    if (patch.notes !== undefined) row.notes = patch.notes;
    if (Object.keys(row).length === 0) return this.getVisit(id);
    const { data, error } = await this.db
      .from("visits")
      .update(row)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data ? mapVisit(data as VisitRow) : null;
  }

  async deleteVisit(id: string): Promise<boolean> {
    const { error, count } = await this.db
      .from("visits")
      .delete({ count: "exact" })
      .eq("id", id);
    if (error) throw error;
    return (count ?? 0) > 0;
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

  // ---- Incoming Items ----

  async createItem(input: ItemCreateInput, loggedBy: string): Promise<IncomingItem> {
    const { data, error } = await this.db
      .from("incoming_items")
      .insert({
        sender: input.sender,
        item_type: input.itemType,
        description: input.description ?? "",
        recipient_id: input.recipientId ?? null,
        recipient_name: input.recipientName,
        recipient_department: input.recipientDepartment ?? "",
        proof_signature: input.proofSignature ?? null,
        proof_photo: input.proofPhoto ?? null,
        logged_by: loggedBy,
      })
      .select()
      .single();
    if (error) throw error;
    return mapItem(data as ItemRow);
  }

  async listItems(date: string): Promise<IncomingItem[]> {
    const { data, error } = await this.db
      .from("incoming_items")
      .select()
      .eq("received_date", date)
      .order("received_at", { ascending: false });
    if (error) throw error;
    return ((data ?? []) as ItemRow[]).map(mapItem);
  }

  async listAllItems(): Promise<IncomingItem[]> {
    const { data, error } = await this.db
      .from("incoming_items")
      .select()
      .order("received_at", { ascending: false })
      .limit(5000);
    if (error) throw error;
    return ((data ?? []) as ItemRow[]).map(mapItem);
  }

  async getItem(id: string): Promise<IncomingItem | null> {
    const { data, error } = await this.db
      .from("incoming_items")
      .select()
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapItem(data as ItemRow) : null;
  }

  async updateItem(id: string, patch: ItemUpdateInput): Promise<IncomingItem | null> {
    const existing = await this.getItem(id);
    if (!existing) return null;

    const row: Record<string, string | null> = { updated_at: new Date().toISOString() };
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.sender !== undefined) row.sender = patch.sender;
    if (patch.itemType !== undefined) row.item_type = patch.itemType;
    if (patch.description !== undefined) row.description = patch.description;
    if (patch.recipientName !== undefined) row.recipient_name = patch.recipientName;
    if (patch.recipientDepartment !== undefined) row.recipient_department = patch.recipientDepartment;
    if (patch.collectedProof !== undefined) row.collected_proof = patch.collectedProof;
    // Stamp collection once, when the item first reaches "collected".
    if (patch.status === "collected" && !existing.collectedAt) {
      row.collected_at = new Date().toISOString();
    }

    const { data, error } = await this.db
      .from("incoming_items")
      .update(row)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data ? mapItem(data as ItemRow) : null;
  }

  async deleteItem(id: string): Promise<boolean> {
    const { error, count } = await this.db
      .from("incoming_items")
      .delete({ count: "exact" })
      .eq("id", id);
    if (error) throw error;
    return (count ?? 0) > 0;
  }
}
