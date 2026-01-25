/**
 * Usage Analytics Endpoint (Admin-Only)
 * GET /api/admin/analytics/usage
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/security/authorization-utils";
import { usageAnalyticsService } from "@/lib/services/analytics/usage-analytics-service";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/analytics/usage
 * Get usage analytics (admin-only)
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
    const userId = request.nextUrl.searchParams.get("userId") || undefined;

    let analytics;
    if (userId) {
      analytics = await usageAnalyticsService.getUserUsageAnalytics(
        userId,
        startDate,
        endDate
      );
    } else {
      analytics = await usageAnalyticsService.getUsageAnalytics(
        startDate,
        endDate
      );
    }

    return NextResponse.json(analytics);
  } catch (error: any) {
    if (error.message?.includes("Forbidden") || error.message?.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    logger.error("Error getting usage analytics", { error });
    return NextResponse.json(
      { error: error.message || "Failed to get usage analytics" },
      { status: 500 }
    );
  }
}
