import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  canEditOrganization,
  getProviderMembership,
  getProviderWithWorkers,
  getSessionUserId,
  isValidProviderId,
} from "@/app/utils/provider-admin";
import { prisma } from "@/lib/prisma";
import {
  PatchProviderPayload,
  patchProviderPayloadSchema,
  PatchProviderResponse,
  type GetAdminResponse,
} from "@/schemas/provider-admin.types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ providerId: string }> },
): Promise<NextResponse<GetAdminResponse | { error: string }>> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { providerId } = await params;
  if (!isValidProviderId(providerId)) {
    return NextResponse.json({ error: "Invalid provider id" }, { status: 400 });
  }

  const membership = await getProviderMembership(userId, providerId);
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const provider = await getProviderWithWorkers(providerId);

  if (!provider) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
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
      specialisations: provider.specialisations.map(
        (s) => s.specialisationDefinition,
      ),
    },
    workers: provider.workers.map((wp) => ({
      id: wp.worker.id,
      userId: wp.worker.userId,
      name: wp.worker.user.name,
      email: wp.worker.user.email,
      bio: wp.worker.bio,
      qualifications: wp.worker.qualifications,
      languages: wp.worker.languages.map((l) => l.languageDefinition),
      specialisations: wp.worker.specialisations.map(
        (s) => s.specialisationDefinition,
      ),
    })),
  } satisfies GetAdminResponse);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ providerId: string }> },
): Promise<NextResponse<PatchProviderResponse | { error: string }>> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { providerId } = await params;
  if (!isValidProviderId(providerId)) {
    return NextResponse.json({ error: "Invalid provider id" }, { status: 400 });
  }

  const membership = await getProviderMembership(userId, providerId);
  if (!membership || !canEditOrganization(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: PatchProviderPayload;
  try {
    const json = await request.json();
    // parse
    const parsed = patchProviderPayloadSchema.parse(json);
    body = parsed;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data: Prisma.ProviderUpdateInput = {};

  const str = (key: keyof PatchProviderPayload) =>
    body[key] === undefined
      ? undefined
      : body[key] === null
        ? null
        : String(body[key]);

  if (body.name !== undefined) {
    const name = str("name");
    if (!name?.trim()) {
      return NextResponse.json(
        { error: "name cannot be empty" },
        { status: 400 },
      );
    }
    data.name = name.trim();
  }

  if (body.logoUrl !== undefined) data.logoUrl = str("logoUrl");
  if (body.description !== undefined) data.description = str("description");
  if (body.website !== undefined) data.website = str("website");
  if (body.email !== undefined) data.email = str("email");
  if (body.phone !== undefined) data.phone = str("phone");
  if (body.abn !== undefined) data.abn = str("abn");
  if (body.businessType !== undefined) data.businessType = str("businessType");
  if (body.ndisNumber !== undefined) data.ndisNumber = str("ndisNumber");

  if (body.ndisRegistered !== undefined) {
    data.ndisRegistered = Boolean(body.ndisRegistered);
  }

  if (body.serviceAreas !== undefined) {
    if (!Array.isArray(body.serviceAreas)) {
      return NextResponse.json(
        { error: "serviceAreas must be an array of strings" },
        { status: 400 },
      );
    }
    data.serviceAreas = body.serviceAreas
      .map((s) => String(s).trim())
      .filter(Boolean);
  }

  if (body.specialisations !== undefined) {
    if (!Array.isArray(body.specialisations)) {
      return NextResponse.json(
        { error: "specialisations must be an array" },
        { status: 400 },
      );
    }
    // todo: check if this is correct
    data.specialisations = {
      deleteMany: {},
      create: body.specialisations
        .filter((s) => s.id.trim())
        .map((s) => ({
          specialisationDefinitionId: s.id,
        })),
    };
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 },
    );
  }

  const updated = await prisma.provider.update({
    where: { id: providerId },
    data,
    include: {
      specialisations: {
        select: {
          specialisationDefinition: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  revalidatePath(`/provider/${providerId}`);

  // todo: check if null is ok and what it will do in my db
  return NextResponse.json({
    provider: {
      id: updated.id,
      name: updated.name,
      logoUrl: updated.logoUrl,
      description: updated.description,
      website: updated.website,
      email: updated.email,
      phone: updated.phone,
      abn: updated.abn,
      businessType: updated.businessType,
      ndisRegistered: updated.ndisRegistered,
      ndisNumber: updated.ndisNumber,
      serviceAreas: updated.serviceAreas,
      specialisations: updated.specialisations.map(
        (s) => s.specialisationDefinition,
      ),
    },
  } satisfies PatchProviderResponse);
}
