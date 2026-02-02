/**
 * GET /api/sponsorships/[id]/audit - Audit trail for a sponsorship (admin)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/authorization-utils";
import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing sponsorship id" }, { status: 400 });
    }

    const sponsorship = await prisma.sponsorship.findUnique({
      where: { id },
    });
    if (!sponsorship) {
      return NextResponse.json({ error: "Sponsorship not found" }, { status: 404 });
    }

    const auditLog = await prisma.sponsorshipAuditLog.findMany({
      where: { sponsorshipId: id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      sponsorshipId: id,
      auditLog: auditLog.map((e) => ({
        id: e.id,
        action: e.action,
        reason: e.reason,
        actorId: e.actorId,
        createdAt: e.createdAt.toISOString(),
        metadata: e.metadata,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("Error fetching sponsorship audit", { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch audit" },
      { status: 500 }
    );
  }
}
