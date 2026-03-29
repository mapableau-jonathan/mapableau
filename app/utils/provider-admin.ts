import type { ProviderRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  GetAdminResponse,
  GetCatalogResponse,
} from "@/schemas/provider-admin.types";

import { auth } from "../lib/auth";

export function canEditOrganization(role: ProviderRole) {
  return role === "ADMIN" || role === "MANAGER";
}

export function canEditWorkerProfile(params: {
  role: ProviderRole;
  sessionUserId: string;
  workerUserId: string;
}) {
  if (canEditOrganization(params.role)) return true;
  return (
    params.role === "STAFF" && params.sessionUserId === params.workerUserId
  );
}

export async function getSessionUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function getProviderMembership(
  userId: string,
  providerId: string,
) {
  return prisma.providerUserRole.findUnique({
    where: { userId_providerId: { userId, providerId } },
    include: { provider: { select: { id: true, name: true } } },
  });
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidProviderId(id: string) {
  return UUID_RE.test(id);
}

export async function getProviderWithWorkers(providerId: string) {
  return prisma.provider.findUnique({
    where: { id: providerId },
    include: {
      workers: {
        include: {
          worker: {
            include: {
              user: { select: { id: true, name: true, email: true } },
              languages: { select: { id: true, name: true } },
              specialisations: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });
}

export const getAdminResponse = (
  membership: NonNullable<Awaited<ReturnType<typeof getProviderMembership>>>,
  provider: NonNullable<Awaited<ReturnType<typeof getProviderWithWorkers>>>,
): GetAdminResponse => {
  return {
    role: membership.role,
    canEditOrganization: canEditOrganization(membership.role),
    provider: {
      id: provider.id,
      name: provider.name,
      logoUrl: provider.logoUrl,
      description: provider.description,
      website: provider.website,
      email: provider.email,
      phone: provider.phone,
      abn: provider.abn,
      businessType: provider.businessType,
      ndisRegistered: provider.ndisRegistered,
      ndisNumber: provider.ndisNumber,
      serviceAreas: provider.serviceAreas,
      specialisations: provider.specialisations,
    },
    workers: provider.workers.map((wp) => ({
      id: wp.worker.id,
      userId: wp.worker.userId,
      name: wp.worker.user.name,
      email: wp.worker.user.email,
      bio: wp.worker.bio,
      qualifications: wp.worker.qualifications,
      languages: wp.worker.languages,
      specialisations: wp.worker.specialisations,
    })),
  };
};

export const getAdminCatalog = async (): Promise<GetCatalogResponse> => {
  const [languages, specialisations] = await Promise.all([
    prisma.language.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.specialisation.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  return {
    languages,
    specialisations,
  };
};
