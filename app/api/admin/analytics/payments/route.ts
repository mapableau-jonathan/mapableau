/**
 * Payment Analytics Endpoint (Admin-Only)
 * GET /api/admin/analytics/payments
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/security/authorization-utils";
import { paymentAnalyticsService } from "@/lib/services/analytics/payment-analytics-service";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/analytics/payments
 * Get payment analytics (admin-only)
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

    const analytics = await paymentAnalyticsService.getPaymentAnalytics(
      startDate,
      endDate
    );

    // Get payment method preferences if requested
    const includePreferences = request.nextUrl.searchParams.get("includePreferences") === "true";
    if (includePreferences) {
      const preferences = await paymentAnalyticsService.getPaymentMethodPreferences(
        startDate,
        endDate
      );
      return NextResponse.json({
        ...analytics,
        paymentMethodPreferences: preferences,
      });
    }

    return NextResponse.json(analytics);
  } catch (error: any) {
    if (error.message?.includes("Forbidden") || error.message?.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    logger.error("Error getting payment analytics", { error });
    return NextResponse.json(
      { error: error.message || "Failed to get payment analytics" },
      { status: 500 }
    );
  }
}
