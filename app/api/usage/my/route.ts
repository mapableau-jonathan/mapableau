/**
 * User's Usage Summary Endpoint
 * GET /api/usage/my
 * Returns user's own usage summary without costs (costs hidden from non-admins)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { usageTracker } from "@/lib/services/usage/usage-tracker";
import { analyticsFilter } from "@/lib/services/analytics/analytics-filter";
import { logger } from "@/lib/logger";

/**
 * GET /api/usage/my
 * Get user's own usage summary (no costs for non-admins)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const startDate = request.nextUrl.searchParams.get("startDate")
      ? new Date(request.nextUrl.searchParams.get("startDate")!)
      : undefined;
    const endDate = request.nextUrl.searchParams.get("endDate")
      ? new Date(request.nextUrl.searchParams.get("endDate")!)
      : undefined;

    const summary = await usageTracker.getUserUsageSummary(
      session.user.id,
      startDate,
      endDate
    );

    // Sanitize to hide costs from non-admins
    const sanitized = analyticsFilter.sanitizeUsageSummary(
      summary,
      session.user.id,
      session.user.role || null
    );

    return NextResponse.json({ usage: sanitized });
  } catch (error: any) {
    logger.error("Error getting user usage summary", { error });
    return NextResponse.json(
      { error: error.message || "Failed to get usage summary" },
      { status: 500 }
    );
  }
}
