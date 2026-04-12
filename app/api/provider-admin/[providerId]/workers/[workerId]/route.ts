import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  canEditWorkerProfile,
  getProviderMembership,
  getSessionUserId,
  isValidProviderId,
} from "@/app/utils/provider-admin";
import { prisma } from "@/lib/prisma";
import {
  PatchWorkerPayload,
  patchWorkerPayloadSchema,
  PatchWorkerResponse,
} from "@/schemas/provider-admin.types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidWorkerId(id: string) {
  return UUID_RE.test(id);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ providerId: string; workerId: string }> },
): Promise<NextResponse<PatchWorkerResponse | { error: string }>> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { providerId, workerId } = await params;
  if (!isValidProviderId(providerId) || !isValidWorkerId(workerId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const membership = await getProviderMembership(userId, providerId);
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const link = await prisma.providerWorker.findUnique({
    where: {
      workerId_providerId: { workerId, providerId },
    },
    include: {
      worker: { include: { user: { select: { id: true } } } },
    },
  });

  if (!link) {
    return NextResponse.json(
      { error: "Worker not found for this provider" },
      {
        status: 404,
      },
    );
  }

  if (
    !canEditWorkerProfile({
      role: membership.role,
      sessionUserId: userId,
      workerUserId: link.worker.userId,
    })
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: PatchWorkerPayload;
  try {
    const json = await request.json();
    // parse
    const parsed = patchWorkerPayloadSchema.parse(json);
    body = parsed;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const hasProfileField =
    body.name !== undefined ||
    body.bio !== undefined ||
    body.qualifications !== undefined;
  const hasRelField =
    body.languageDefinitionIds !== undefined ||
    body.specialisationDefinitionIds !== undefined;

  if (!hasProfileField && !hasRelField) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  if (body.languageDefinitionIds !== undefined) {
    if (!Array.isArray(body.languageDefinitionIds)) {
      return NextResponse.json(
        { error: "languageDefinitionIds must be an array" },
        { status: 400 },
      );
    }
    const langs = await prisma.languageDefinition.findMany({
      where: { id: { in: body.languageDefinitionIds } },
      select: { id: true },
    });
    if (langs.length !== body.languageDefinitionIds.length) {
      return NextResponse.json(
        { error: "One or more language ids are invalid" },
        { status: 400 },
      );
    }
  }

  if (body.specialisationDefinitionIds !== undefined) {
    if (!Array.isArray(body.specialisationDefinitionIds)) {
      return NextResponse.json(
        { error: "specialisationIds must be an array" },
        { status: 400 },
      );
    }
    const specs = await prisma.specialisationDefinition.findMany({
      where: { id: { in: body.specialisationDefinitionIds } },
      select: { id: true },
    });
    if (specs.length !== body.specialisationDefinitionIds.length) {
      return NextResponse.json(
        { error: "One or more specialisation ids are invalid" },
        { status: 400 },
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    if (body.name !== undefined && body.name !== null) {
      await tx.user.update({
        where: { id: link.worker.userId },
        data: { name: body.name.trim() },
      });
    }

    await tx.worker.update({
      where: { id: workerId },
      data: {
        ...(body.bio !== undefined && {
          bio: body.bio?.trim() || null,
        }),
        ...(body.qualifications !== undefined && {
          qualifications: body.qualifications?.trim() || null,
        }),
        ...(body.languageDefinitionIds !== undefined &&
          body.languageDefinitionIds !== null && {
            languages: {
              deleteMany: {},
              create: body.languageDefinitionIds.map((id) => ({
                languageDefinitionId: id,
              })),
            },
          }),
        ...(body.specialisationDefinitionIds !== undefined &&
          body.specialisationDefinitionIds !== null && {
            specialisations: {
              deleteMany: {},
              create: body.specialisationDefinitionIds.map((id) => ({
                specialisationDefinitionId: id,
              })),
            },
          }),
      },
    });
  });

  revalidatePath(`/provider/${providerId}`);

  const worker = await prisma.worker.findUnique({
    where: { id: workerId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      languages: {
        select: { languageDefinition: { select: { id: true, name: true } } },
      },
      specialisations: {
        select: {
          specialisationDefinition: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!worker) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    worker: {
      id: worker.id,
      userId: worker.userId,
      name: worker.user.name,
      email: worker.user.email,
      bio: worker.bio,
      qualifications: worker.qualifications,
      languages: worker.languages.map((l) => l.languageDefinition),
      specialisations: worker.specialisations.map(
        (s) => s.specialisationDefinition,
      ),
    },
  });
}
