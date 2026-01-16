/**
 * Advertiser Analytics API
 */

import { NextRequest, NextResponse } from "next/server";
import { AnalyticsService } from "@/lib/services/advertising/analytics-service";
import { requireAuth } from "@/lib/security/authorization-utils";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(request.url);
    const advertiserId = searchParams.get("advertiserId");

    if (!advertiserId) {
      return NextResponse.json(
        { error: "advertiserId parameter required" },
        { status: 400 }
      );
    }

    // Verify advertiser ownership
    const advertiser = await prisma.advertiser.findUnique({
      where: { id: advertiserId },
    });

    if (!advertiser || advertiser.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized: Advertiser not found or access denied" },
        { status: 403 }
      );
    }

    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : new Date();

    const analyticsService = new AnalyticsService();
    const analytics = await analyticsService.getAdvertiserAnalytics(
      advertiserId,
      startDate,
      endDate
    );

    return NextResponse.json(analytics);
  } catch (error: any) {
    logger.error("Error fetching advertiser analytics", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
