import { z } from "zod";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const CheckinSchema = z.object({
  name: z.string().trim().min(2).max(80),
  institution: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9][0-9 ()\-.]{6,19}$/, "invalid phone number"),
  // A preset chip value (meeting/delivery/…) or free text typed under "Other".
  purpose: z.string().trim().min(2).max(120),
  hostId: z.string().max(64).nullish(),
  hostName: z.string().trim().min(2).max(80),
  hostDepartment: z.string().trim().max(80).optional().default(""),
  destination: z.string().trim().max(120).optional().default(""),
  // Selfie is downscaled client-side; cap defends against oversized bodies.
  photoDataUrl: z
    .string()
    .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/)
    .max(4_000_000)
    .nullish(),
  signatureDataUrl: z
    .string()
    .regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/)
    .max(400_000),
  lang: z.enum(["id", "en", "zh"]).default("id"),
});
export type CheckinInput = z.infer<typeof CheckinSchema>;

export const CheckoutSchema = z.union([
  z.object({ token: z.string().regex(UUID_RE) }),
  z.object({
    code: z.string().trim().regex(/^SEG-\d{4,6}$/),
    phone: z.string().trim().min(7).max(20),
  }),
]);

// Fields a receptionist may correct after a visit was submitted. Times, photo,
// signature, status and the visit code are intentionally not editable here.
export const VisitUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    institution: z.string().trim().min(2).max(120),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9][0-9 ()\-.]{6,19}$/, "invalid phone number"),
    purpose: z.string().trim().min(2).max(120),
    hostName: z.string().trim().min(2).max(80),
    hostDepartment: z.string().trim().max(80),
    destination: z.string().trim().max(120),
    notes: z.string().trim().max(500),
  })
  .partial();
export type VisitUpdateInput = z.infer<typeof VisitUpdateSchema>;

export const EmployeeSchema = z.object({
  name: z.string().trim().min(2).max(80),
  department: z.string().trim().min(1).max(80),
  active: z.boolean().optional().default(true),
});

export const LoginSchema = z.object({
  username: z.string().trim().min(1).max(40),
  password: z.string().min(1).max(200),
});

// ---- Incoming Items ----

export const ITEM_TYPES = ["document", "brochure", "notes", "hampers", "package"] as const;
export const ITEM_STATUSES = ["received_guard", "at_reception", "collected"] as const;

const signatureData = z
  .string()
  .regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/)
  .max(400_000);
const photoData = z
  .string()
  .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/)
  .max(4_000_000);

export const ItemCreateSchema = z.object({
  sender: z.string().trim().min(1).max(120),
  itemType: z.enum(ITEM_TYPES),
  description: z.string().trim().max(300).optional().default(""),
  recipientId: z.string().max(64).nullish(),
  recipientName: z.string().trim().min(2).max(80),
  recipientDepartment: z.string().trim().max(80).optional().default(""),
  quantity: z.number().int().min(0).max(100_000).optional().default(1),
  uom: z.string().trim().min(1).max(20).optional().default("pcs"),
  proofSignature: signatureData.nullish(),
  proofPhoto: photoData.nullish(),
});
export type ItemCreateInput = z.infer<typeof ItemCreateSchema>;

export const ItemUpdateSchema = z
  .object({
    status: z.enum(ITEM_STATUSES),
    sender: z.string().trim().min(1).max(120),
    itemType: z.enum(ITEM_TYPES),
    description: z.string().trim().max(300),
    recipientName: z.string().trim().min(2).max(80),
    recipientDepartment: z.string().trim().max(80),
    quantity: z.number().int().min(0).max(100_000),
    uom: z.string().trim().min(1).max(20),
    collectedProof: signatureData,
  })
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: "no fields to update" });
export type ItemUpdateInput = z.infer<typeof ItemUpdateSchema>;

export function zodIssues(error: z.ZodError): string[] {
  return error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
}
