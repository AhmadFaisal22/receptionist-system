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
  /** Where in the site the visitor is heading (room/building). */
  destination: string;
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

/** List row for polled endpoints — excludes the heavy base64 image blobs so the
 *  frequent dashboard polls stay tiny. Images load on demand per record. */
export type ListVisit = Omit<PublicVisit, "photoDataUrl" | "signatureDataUrl">;

// ---- Incoming Items module (packages/documents at the gate & reception) ----

export type ItemType =
  | "document"
  | "brochure"
  | "notes"
  | "hampers"
  | "package"
  | "invoice"
  | "certificate"
  | "proposal";
export type ItemStatus = "received_guard" | "at_reception" | "collected";

export interface IncomingItem {
  id: string;
  code: string;
  receivedAt: string;
  sender: string;
  itemType: ItemType;
  description: string;
  recipientId: string | null;
  recipientName: string;
  recipientDepartment: string;
  quantity: number;
  uom: string;
  status: ItemStatus;
  /** Proof captured when logged: digital signature and/or a photo of the label. */
  proofSignature: string | null;
  proofPhoto: string | null;
  /** Role that created the entry (guard/receptionist/admin). */
  loggedBy: string;
  collectedAt: string | null;
  collectedProof: string | null;
  submittedAt: string;
  updatedAt: string;
}

/** List row for polled item endpoints — excludes proof blobs. */
export type ListItem = Omit<
  IncomingItem,
  "proofSignature" | "proofPhoto" | "collectedProof"
> & { hasProof: boolean };
