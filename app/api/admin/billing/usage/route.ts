/**
 * Usage Billing Management Endpoint (Admin-Only)
 * GET /api/admin/billing/usage
 * POST /api/admin/billing/usage
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/security/authorization-utils";
import { usageBillingService } from "@/lib/services/billing/usage-billing-service";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/billing/usage
 * Get usage billing records
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const userId = request.nextUrl.searchParams.get("userId") || undefined;
    const status = request.nextUrl.searchParams.get("status") || undefined;

    if (userId) {
      // Get periods for specific user
      const periods = await prisma.usageBillingPeriod.findMany({
        where: {
          userId,
          ...(status && { status }),
        },
        orderBy: { startDate: "desc" },
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              status: true,
              totalAmount: true,
            },
          },
        },
      });

      return NextResponse.json({ periods });
    }

    // Get all periods
    const periods = await prisma.usageBillingPeriod.findMany({
      where: status ? { status } : undefined,
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

    logger.error("Error getting usage billing records", { error });
    return NextResponse.json(
      { error: error.message || "Failed to get usage billing records" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/billing/usage
 * Generate invoices from usage or close billing periods
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { action, periodId, userId } = body;

    if (action === "closePeriod" && periodId) {
      const result = await usageBillingService.closeBillingPeriod(
        periodId,
        body.autoGenerateInvoice !== false
      );
      return NextResponse.json(result);
    }

    if (action === "processOpenPeriods") {
      const result = await usageBillingService.processOpenPeriods();
      return NextResponse.json(result);
    }

    if (action === "generateInvoice" && periodId) {
      const invoice = await usageBillingService.generateInvoiceFromPeriod(periodId);
      return NextResponse.json({ invoice });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error: any) {
    logger.error("Error in usage billing action", { error });
    return NextResponse.json(
      { error: error.message || "Failed to process billing action" },
      { status: 500 }
    );
  }
}
