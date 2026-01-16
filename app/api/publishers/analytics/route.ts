/**
 * Publisher Analytics API
 */

import { NextRequest, NextResponse } from "next/server";
import { AnalyticsService } from "@/lib/services/advertising/analytics-service";
import { requireAuth } from "@/lib/security/authorization-utils";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const publisher = await prisma.publisher.findUnique({
      where: { userId: user.id },
    });

    if (!publisher) {
      return NextResponse.json(
        { error: "Publisher account not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : new Date();

    const analyticsService = new AnalyticsService();
    const analytics = await analyticsService.getPublisherAnalytics(
      publisher.id,
      startDate,
      endDate
    );

    return NextResponse.json(analytics);
  } catch (error: any) {
    logger.error("Error fetching publisher analytics", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
