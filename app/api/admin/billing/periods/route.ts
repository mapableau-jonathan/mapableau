/**
 * Billing Periods Management Endpoint (Admin-Only)
 * GET /api/admin/billing/periods
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/security/authorization-utils";
import { usageBillingService } from "@/lib/services/billing/usage-billing-service";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/billing/periods
 * Get billing periods
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const userId = request.nextUrl.searchParams.get("userId") || undefined;
    const status = request.nextUrl.searchParams.get("status") || undefined;
    const periodId = request.nextUrl.searchParams.get("periodId") || undefined;

    if (periodId) {
      // Get specific period summary
      const summary = await usageBillingService.getPeriodSummary(periodId);
      return NextResponse.json(summary);
    }

    // List periods
    const where: any = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;

    const periods = await prisma.usageBillingPeriod.findMany({
      where,
      orderBy: { startDate: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            totalAmount: true,
          },
        },
        _count: {
          select: {
            usageRecords: true,
          },
        },
      },
      take: 100,
    });

    return NextResponse.json({ periods });
  } catch (error: any) {
    if (error.message?.includes("Forbidden") || error.message?.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    logger.error("Error getting billing periods", { error });
    return NextResponse.json(
      { error: error.message || "Failed to get billing periods" },
      { status: 500 }
    );
  }
}
