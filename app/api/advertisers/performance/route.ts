/**
 * Advertiser Performance API
 */

import { NextRequest, NextResponse } from "next/server";
import { RevenueCalculator } from "@/lib/services/advertising/revenue-calculator";
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

    const periodStart = searchParams.get("periodStart")
      ? new Date(searchParams.get("periodStart")!)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const periodEnd = searchParams.get("periodEnd")
      ? new Date(searchParams.get("periodEnd")!)
      : new Date();

    const revenueCalculator = new RevenueCalculator();
    const spend = await revenueCalculator.calculateAdvertiserSpend(
      advertiserId,
      periodStart,
      periodEnd
    );

    // Get campaign performance
    const campaigns = await prisma.adCampaign.findMany({
      where: {
        advertiserId,
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      include: {
        advertisements: {
          include: {
            adRequests: {
              where: {
                timestamp: {
                  gte: periodStart,
                  lte: periodEnd,
                },
              },
            },
          },
        },
      },
    });

    const campaignPerformance = campaigns.map((campaign) => {
      const impressions = campaign.advertisements.reduce(
        (sum, ad) => sum + ad.adRequests.filter((r) => r.served).length,
        0
      );
      const clicks = campaign.advertisements.reduce(
        (sum, ad) => sum + ad.adRequests.filter((r) => r.clicked).length,
        0
      );
      const ctr = impressions > 0 ? clicks / impressions : 0;
      const cpc = clicks > 0 ? campaign.spentAmount.toNumber() / clicks : 0;
      const cpm = impressions > 0
        ? (campaign.spentAmount.toNumber() / impressions) * 1000
        : 0;

      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        impressions,
        clicks,
        conversions: campaign.totalConversions,
        spend: campaign.spentAmount.toNumber(),
        ctr,
        cpc,
        cpm,
        status: campaign.status,
      };
    });

    return NextResponse.json({
      advertiser: {
        id: advertiser.id,
        balance: advertiser.balance.toNumber(),
        totalSpent: advertiser.totalSpent.toNumber(),
        creditLimit: advertiser.creditLimit.toNumber(),
      },
      period: {
        start: periodStart,
        end: periodEnd,
      },
      spend,
      campaignPerformance,
    });
  } catch (error: any) {
    logger.error("Error fetching advertiser performance", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch performance" },
      { status: 500 }
    );
  }
}
