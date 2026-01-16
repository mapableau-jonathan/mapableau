/**
 * Publisher Earnings API
 */

import { NextRequest, NextResponse } from "next/server";
import { RevenueCalculator } from "@/lib/services/advertising/revenue-calculator";
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
    const periodStart = searchParams.get("periodStart")
      ? new Date(searchParams.get("periodStart")!)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const periodEnd = searchParams.get("periodEnd")
      ? new Date(searchParams.get("periodEnd")!)
      : new Date();

    const revenueCalculator = new RevenueCalculator();

    // Get earnings summary
    const summary = await revenueCalculator.getPublisherEarningsSummary(
      publisher.id
    );

    // Get detailed earnings for period
    const earnings = await revenueCalculator.calculatePublisherEarnings(
      publisher.id,
      periodStart,
      periodEnd
    );

    return NextResponse.json({
      summary,
      period: {
        start: periodStart,
        end: periodEnd,
      },
      earnings,
    });
  } catch (error: any) {
    logger.error("Error fetching publisher earnings", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch earnings" },
      { status: 500 }
    );
  }
}
