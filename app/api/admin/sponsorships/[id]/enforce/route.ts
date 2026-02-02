/**
 * PATCH /api/admin/sponsorships/[id]/enforce - Enforcement ladder (admin)
 * Actions: warn | deboost | suspend | reinstate
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/authorization-utils";
import { z } from "zod";
import type { SponsorshipAuditAction } from "@prisma/client";
import { logger } from "@/lib/logger";

const enforceSchema = z.object({
  action: z.enum(["warn", "deboost", "suspend", "reinstate"]),
  reason: z.string().min(1),
  deboostUntil: z.string().datetime().optional(),
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
    const data = enforceSchema.parse(body);

    const sponsorship = await prisma.sponsorship.findUnique({
      where: { id },
    });
    if (!sponsorship) {
      return NextResponse.json({ error: "Sponsorship not found" }, { status: 404 });
    }

    const auditActionMap: Record<string, SponsorshipAuditAction> = {
      warn: "WARNING",
      deboost: "DEBOOST",
      suspend: "SUSPENDED",
      reinstate: "REINSTATED",
    };
    const auditAction = auditActionMap[data.action];

    let newStatus = sponsorship.status;
    if (data.action === "suspend") {
      newStatus = "SUSPENDED";
    } else if (data.action === "reinstate") {
      newStatus = "ACTIVE";
    }
    // deboost: keep ACTIVE but store deboostUntil in boostPolicy
    const boostPolicy =
      data.action === "deboost" && data.deboostUntil
        ? {
            ...((sponsorship.boostPolicy as Record<string, unknown>) ?? {}),
            deboostUntil: data.deboostUntil,
          }
        : data.action === "reinstate"
          ? {}
          : sponsorship.boostPolicy;

    await prisma.$transaction([
      prisma.sponsorship.update({
        where: { id },
        data: {
          status: newStatus,
          boostPolicy: boostPolicy as object | null,
        },
      }),
      prisma.sponsorshipAuditLog.create({
        data: {
          sponsorshipId: id,
          action: auditAction,
          reason: data.reason,
          actorId: user.id,
          metadata:
            data.action === "deboost" && data.deboostUntil
              ? { deboostUntil: data.deboostUntil }
              : undefined,
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
      boostPolicy: updated!.boostPolicy,
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
    logger.error("Error enforcing sponsorship", { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to enforce" },
      { status: 500 }
    );
  }
}
