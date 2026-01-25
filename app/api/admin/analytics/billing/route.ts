/**
 * Billing Analytics Endpoint (Admin-Only)
 * GET /api/admin/analytics/billing
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/security/authorization-utils";
import { billingAnalyticsService } from "@/lib/services/analytics/billing-analytics-service";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/analytics/billing
 * Get billing analytics (admin-only)
 */
export async function GET(request: NextRequest) {
  try {
    // Require admin role
    await requireAdmin();

    const startDate = request.nextUrl.searchParams.get("startDate")
      ? new Date(request.nextUrl.searchParams.get("startDate")!)
      : undefined;
    const endDate = request.nextUrl.searchParams.get("endDate")
      ? new Date(request.nextUrl.searchParams.get("endDate")!)
      : undefined;

    const analytics = await billingAnalyticsService.getBillingAnalytics(
      startDate,
      endDate
    );

    return NextResponse.json(analytics);
  } catch (error: any) {
    if (error.message?.includes("Forbidden") || error.message?.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    logger.error("Error getting billing analytics", { error });
    return NextResponse.json(
      { error: error.message || "Failed to get billing analytics" },
      { status: 500 }
    );
  }
}
