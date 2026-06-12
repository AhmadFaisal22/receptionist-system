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

export const EmployeeSchema = z.object({
  name: z.string().trim().min(2).max(80),
  department: z.string().trim().min(1).max(80),
  active: z.boolean().optional().default(true),
});

export const LoginSchema = z.object({
  username: z.string().trim().min(1).max(40),
  password: z.string().min(1).max(200),
});

export function zodIssues(error: z.ZodError): string[] {
  return error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
}
