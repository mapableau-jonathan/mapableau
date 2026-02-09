/**
 * Zod schemas and helpers for API input validation.
 */

import { z } from "zod";

/** Email with basic format validation */
export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Invalid email format")
  .max(255, "Email too long");

/** Password: min 8 chars, at least one letter and one number */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password too long")
  .regex(
    /^(?=.*[A-Za-z])(?=.*\d)/,
    "Password must contain at least one letter and one number",
  );

/** Optional name, max 200 chars */
export const nameSchema = z
  .string()
  .max(200, "Name too long")
  .optional()
  .transform((v) => (v === "" ? undefined : v));

/** Optional place fields for registration */
export const placeSchema = z
  .object({
    suburb: z.string().max(100).optional(),
    state: z.string().max(50).optional(),
    postcode: z.string().max(20).optional(),
  })
  .optional();

/** Register (participant or provider) */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  role: z.enum(["participant", "provider"]).optional(),
  suburb: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  postcode: z.string().max(20).optional(),
});

/** Provider-only register */
export const registerProviderSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  suburb: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  postcode: z.string().max(20).optional(),
});

/** Claim outlet */
export const claimProfileSchema = z.object({
  outletKey: z.string().min(1, "outletKey is required").max(500),
});

/** Profile PATCH (claimed provider) */
export const profilePatchSchema = z.object({
  phone: z
    .union([z.string().max(100), z.literal("")])
    .optional()
    .transform((v) => (v === "" ? null : v)),
  email: z
    .union([z.string().email().max(255), z.literal("")])
    .optional()
    .transform((v) => (v === "" ? null : v)),
  website: z
    .union([z.string().url().max(500), z.literal("")])
    .optional()
    .transform((v) => (v === "" ? null : v)),
  description: z
    .union([z.string().max(2000), z.literal("")])
    .optional()
    .transform((v) => (v === "" ? null : v)),
  openingHours: z
    .union([z.string().max(500), z.literal("")])
    .optional()
    .transform((v) => (v === "" ? null : v)),
});

/** Onboarding PATCH */
export const onboardingPatchSchema = z.object({
  name: z.string().max(200).optional(),
  abn: z.string().max(20).optional(),
  phone: z.string().max(100).optional(),
  email: z
    .union([z.string().email().max(255), z.literal("")])
    .optional()
    .transform((v) => (v === "" ? null : v)),
  website: z
    .union([z.string().url().max(500), z.literal("")])
    .optional()
    .transform((v) => (v === "" ? null : v)),
  description: z.string().max(2000).optional(),
  openingHours: z.string().max(500).optional(),
  suburb: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  postcode: z.string().max(20).optional(),
  categories: z.array(z.string()).optional(),
  complete: z.boolean().optional(),
  abnVerified: z.boolean().optional(),
});

/** Participant profile PATCH */
export const participantProfilePatchSchema = z.object({
  displayName: z.union([z.string().max(200), z.null()]).optional(),
  visibility: z.enum(["private", "public"]).optional(),
  slug: z.union([z.string().max(100), z.null()]).optional(),
  accessibilityNeeds: z.union([z.string().max(500), z.null()]).optional(),
  preferredCategories: z.array(z.string()).optional(),
  suburb: z.union([z.string().max(100), z.null()]).optional(),
  state: z.union([z.string().max(50), z.null()]).optional(),
  postcode: z.union([z.string().max(20), z.null()]).optional(),
  savedProviderIds: z.array(z.string()).optional(),
});

/** Parse JSON body with schema. Returns [data, null] or [null, error Response]. */
export async function parseBody<T>(
  request: Request,
  schema: z.ZodSchema<T>,
): Promise<[T, null] | [null, Response]> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return [null, Response.json({ error: "Invalid JSON body" }, { status: 400 })];
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.errors[0];
    const msg = first?.message ?? "Validation failed";
    const path = first?.path?.join(".") ?? "";
    const errorMsg = path ? `${path}: ${msg}` : msg;
    return [
      null,
      Response.json({ error: errorMsg, details: result.error.flatten() }, { status: 400 }),
    ];
  }
  return [result.data, null];
}
