/**
 * GET /api/admin/reports/venue - List venue reports (admin)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/authorization-utils";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    const where: Parameters<typeof prisma.venueReport.findMany>[0]["where"] = {};
    if (status) {
      const valid = ["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"];
      if (valid.includes(status)) {
        where.status = status as "OPEN" | "IN_REVIEW" | "RESOLVED" | "DISMISSED";
      }
    }
    if (type) {
      if (type === "accessibility" || type === "sponsorship") {
        where.type = type === "accessibility" ? "ACCESSIBILITY" : "SPONSORSHIP";
      }
    }

    const reports = await prisma.venueReport.findMany({
      where,
      include: {
        business: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      reports: reports.map((r) => ({
        id: r.id,
        businessId: r.businessId,
        userId: r.userId,
        type: r.type,
        description: r.description,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        resolvedAt: r.resolvedAt?.toISOString() ?? null,
        business: r.business,
      })),
    });
  } catch (error) {
    logger.error("Error listing venue reports", { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list" },
      { status: 500 }
    );
  }
}
