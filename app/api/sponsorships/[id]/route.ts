/**
 * PATCH /api/sponsorships/[id] - Approve, suspend, or end sponsorship (admin)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/authorization-utils";
import { z } from "zod";
import type { SponsorshipStatus } from "@prisma/client";
import { logger } from "@/lib/logger";

const patchSchema = z.object({
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED", "ENDED"]),
  reason: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin(request);
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing sponsorship id" }, { status: 400 });
    }

    const body = await request.json();
    const data = patchSchema.parse(body);

    const sponsorship = await prisma.sponsorship.findUnique({
      where: { id },
    });
    if (!sponsorship) {
      return NextResponse.json({ error: "Sponsorship not found" }, { status: 404 });
    }

    const auditAction =
      data.status === "ACTIVE"
        ? "APPROVED"
        : data.status === "SUSPENDED"
          ? "SUSPENDED"
          : data.status === "ENDED"
            ? "ENDED"
            : "WARNING";

    await prisma.$transaction([
      prisma.sponsorship.update({
        where: { id },
        data: { status: data.status as SponsorshipStatus },
      }),
      prisma.sponsorshipAuditLog.create({
        data: {
          sponsorshipId: id,
          action: auditAction,
          reason: data.reason ?? null,
          actorId: user.id,
        },
      }),
    ]);

    const updated = await prisma.sponsorship.findUnique({
      where: { id },
      include: { business: { select: { id: true, name: true } } },
    });

    return NextResponse.json({
      id: updated!.id,
      status: updated!.status,
      business: updated!.business,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message.startsWith("Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error updating sponsorship", { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update" },
      { status: 500 }
    );
  }
}
