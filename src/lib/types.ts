export type VisitStatus = "pending" | "checked_in" | "checked_out";
export type CheckoutMethod = "qr" | "staff" | "auto";
export type Role = "receptionist" | "guard" | "admin";
export type Lang = "id" | "en" | "zh";

export interface Employee {
  id: string;
  name: string;
  department: string;
  active: boolean;
}

export interface Visit {
  id: string;
  code: string;
  status: VisitStatus;
  name: string;
  institution: string;
  phone: string;
  purpose: string;
  hostId: string | null;
  hostName: string;
  hostDepartment: string;
  photoDataUrl: string | null;
  signatureDataUrl: string;
  /** Receptionist note — items brought in/out, remarks. Empty by default. */
  notes: string;
  lang: Lang;
  submittedAt: string;
  checkinAt: string | null;
  checkoutAt: string | null;
  checkoutMethod: CheckoutMethod | null;
  /** Secret known only to the visitor's device; never sent to staff UIs. */
  exitToken: string;
}

export type PublicVisit = Omit<Visit, "exitToken">;
