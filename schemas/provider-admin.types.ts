import { z } from "zod";

export const adminResponseSchema = z.object({
  role: z.string(),
  canEditOrganization: z.boolean(),
  provider: z.object({
    id: z.string(),
    name: z.string(),
    logoUrl: z.string().nullable(),
    description: z.string().nullable(),
    website: z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    abn: z.string().nullable(),
    businessType: z.string().nullable(),
    ndisRegistered: z.boolean(),
    ndisNumber: z.string().nullable(),
    serviceAreas: z.array(z.string()),
    specialisations: z.array(z.object({ id: z.string(), name: z.string() })),
  }),
  workers: z.array(
    z.object({
      id: z.string(),
      userId: z.string(),
      name: z.string().nullable(),
      email: z.string().nullable(),
      bio: z.string().nullable(),
      qualifications: z.string().nullable(),
      languages: z.array(z.object({ id: z.string(), name: z.string() })),
      specialisations: z.array(z.object({ id: z.string(), name: z.string() })),
    }),
  ),
});

export const patchProviderPayloadSchema = z.object({
  name: z.string().nullable(),
  logoUrl: z.string().nullable(),
  description: z.string().nullable(),
  website: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  abn: z.string().nullable(),
  businessType: z.string().nullable(),
  ndisRegistered: z.boolean().nullable(),
  ndisNumber: z.string().nullable(),
  serviceAreas: z.array(z.string()).nullable(),
  specialisations: z
    .array(z.object({ id: z.string(), name: z.string() }))
    .nullable(),
});

export const patchProviderResponseSchema = z.object({
  provider: patchProviderPayloadSchema.extend({
    id: z.string(),
    specialisations: z.array(z.object({ id: z.string(), name: z.string() })),
  }),
});

export const patchWorkerPayloadSchema = z.object({
  name: z.string().nullable(),
  bio: z.string().nullable(),
  qualifications: z.string().nullable(),
  languageDefinitionIds: z.array(z.string()).nullable(),
  specialisationDefinitionIds: z.array(z.string()).nullable(),
});

export const patchWorkerResponseSchema = z.object({
  worker: z.object({
    id: z.string(),
    userId: z.string(),
    name: z.string().nullable(),
    email: z.string().nullable(),
    bio: z.string().nullable(),
    qualifications: z.string().nullable(),
    languages: z.array(z.object({ id: z.string(), name: z.string() })),
    specialisations: z.array(z.object({ id: z.string(), name: z.string() })),
  }),
});

export const catalogResponseSchema = z.object({
  languages: z.array(z.object({ id: z.string(), name: z.string() })),
  specialisations: z.array(z.object({ id: z.string(), name: z.string() })),
  /** Provider org specialisations (`ProviderSpecialisationDefinition`) */
  providerSpecialisations: z.array(
    z.object({ id: z.string(), name: z.string() }),
  ),
});

export const membershipResponseSchema = z.object({
  memberships: z.array(
    z.object({
      providerId: z.string(),
      providerName: z.string(),
      role: z.string(),
    }),
  ),
});

export type PatchProviderResponse = z.infer<typeof patchProviderResponseSchema>;
export type GetAdminResponse = z.infer<typeof adminResponseSchema>;

export type PatchProviderPayload = z.infer<typeof patchProviderPayloadSchema>;
export type PatchWorkerPayload = z.infer<typeof patchWorkerPayloadSchema>;
export type PatchWorkerResponse = z.infer<typeof patchWorkerResponseSchema>;
export type GetCatalogResponse = z.infer<typeof catalogResponseSchema>;
export type MembershipResponse = z.infer<typeof membershipResponseSchema>;
