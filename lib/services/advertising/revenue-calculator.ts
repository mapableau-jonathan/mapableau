/**
 * Revenue Calculator Service
 * Calculates publisher earnings and advertiser billing
 */

import { prisma } from "@/lib/prisma";
import { advertisingConfig } from "@/lib/config/advertising";
import { Decimal } from "@prisma/client/runtime/library";

export class RevenueCalculator {
  /**
   * Calculate publisher earnings from ad unit revenue
   */
  async calculatePublisherEarnings(
    publisherId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<{
    totalRevenue: number;
    publisherEarnings: number;
    platformCommission: number;
    adUnitBreakdown: Array<{
      adUnitId: string;
      adUnitName: string;
      revenue: number;
      earnings: number;
    }>;
  }> {
    const publisher = await prisma.publisher.findUnique({
      where: { id: publisherId },
      include: {
        adUnits: {
          include: {
            adRequests: {
              where: {
                timestamp: {
                  gte: periodStart,
                  lte: periodEnd,
                },
                served: true,
              },
              include: {
                winningAd: true,
              },
            },
          },
        },
      },
    });

    if (!publisher) {
      throw new Error("Publisher not found");
    }

    let totalRevenue = 0;
    const adUnitBreakdown: Array<{
      adUnitId: string;
      adUnitName: string;
      revenue: number;
      earnings: number;
    }> = [];

    for (const adUnit of publisher.adUnits) {
      const adUnitRevenue = adUnit.adRequests.reduce((sum, request) => {
        return sum + (request.winningBid?.toNumber() || 0);
      }, 0);

      const adUnitEarnings = adUnitRevenue * publisher.revenueShare.toNumber();

      totalRevenue += adUnitRevenue;
      adUnitBreakdown.push({
        adUnitId: adUnit.id,
        adUnitName: adUnit.name,
        revenue: adUnitRevenue,
        earnings: adUnitEarnings,
      });
    }

    const publisherEarnings = totalRevenue * publisher.revenueShare.toNumber();
    const platformCommission = totalRevenue - publisherEarnings;

    return {
      totalRevenue,
      publisherEarnings,
      platformCommission,
      adUnitBreakdown,
    };
  }

  /**
   * Update publisher total earnings
   */
  async updatePublisherEarnings(publisherId: string): Promise<void> {
    const publisher = await prisma.publisher.findUnique({
      where: { id: publisherId },
      include: {
        adUnits: true,
      },
    });

    if (!publisher) {
      return;
    }

    // Calculate total earnings from all ad units
    const totalEarnings = publisher.adUnits.reduce((sum, adUnit) => {
      return sum + adUnit.revenue.toNumber() * publisher.revenueShare.toNumber();
    }, 0);

    await prisma.publisher.update({
      where: { id: publisherId },
      data: {
        totalEarnings: new Decimal(totalEarnings),
      },
    });
  }

  /**
   * Calculate advertiser spend for a period
   */
  async calculateAdvertiserSpend(
    advertiserId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<{
    totalSpend: number;
    campaignBreakdown: Array<{
      campaignId: string;
      campaignName: string;
      spend: number;
      impressions: number;
      clicks: number;
    }>;
  }> {
    const advertiser = await prisma.advertiser.findUnique({
      where: { id: advertiserId },
      include: {
        campaigns: {
          include: {
            advertisements: {
              include: {
                adRequests: {
                  where: {
                    timestamp: {
                      gte: periodStart,
                      lte: periodEnd,
                    },
                    served: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!advertiser) {
      throw new Error("Advertiser not found");
    }

    let totalSpend = 0;
    const campaignBreakdown: Array<{
      campaignId: string;
      campaignName: string;
      spend: number;
      impressions: number;
      clicks: number;
    }> = [];

    for (const campaign of advertiser.campaigns) {
      let campaignSpend = 0;
      let impressions = 0;
      let clicks = 0;

      for (const ad of campaign.advertisements) {
        const adSpend = ad.adRequests.reduce((sum, request) => {
          return sum + (request.winningBid?.toNumber() || 0);
        }, 0);

        campaignSpend += adSpend;
        impressions += ad.adRequests.filter((r) => r.served).length;
        clicks += ad.adRequests.filter((r) => r.clicked).length;
      }

      totalSpend += campaignSpend;
      campaignBreakdown.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        spend: campaignSpend,
        impressions,
        clicks,
      });
    }

    return {
      totalSpend,
      campaignBreakdown,
    };
  }

  /**
   * Check if publisher has reached payment threshold
   */
  async checkPaymentThreshold(publisherId: string): Promise<{
    reached: boolean;
    currentEarnings: number;
    unpaidEarnings: number;
    threshold: number;
  }> {
    const publisher = await prisma.publisher.findUnique({
      where: { id: publisherId },
    });

    if (!publisher) {
      throw new Error("Publisher not found");
    }

    const unpaidEarnings =
      publisher.totalEarnings.toNumber() - publisher.paidEarnings.toNumber();

    return {
      reached: unpaidEarnings >= publisher.paymentThreshold.toNumber(),
      currentEarnings: publisher.totalEarnings.toNumber(),
      unpaidEarnings,
      threshold: publisher.paymentThreshold.toNumber(),
    };
  }

  /**
   * Calculate revenue share for a transaction
   */
  calculateRevenueShare(amount: number, publisherRevenueShare: number): {
    publisherAmount: number;
    platformAmount: number;
  } {
    return {
      publisherAmount: amount * publisherRevenueShare,
      platformAmount: amount * (1 - publisherRevenueShare),
    };
  }

  /**
   * Update ad unit revenue after ad serve
   */
  async updateAdUnitRevenue(
    adUnitId: string,
    revenueAmount: number
  ): Promise<void> {
    await prisma.adUnit.update({
      where: { id: adUnitId },
      data: {
        revenue: {
          increment: revenueAmount,
        },
      },
    });

    // Update publisher earnings
    const adUnit = await prisma.adUnit.findUnique({
      where: { id: adUnitId },
      include: { publisher: true },
    });

    if (adUnit) {
      const publisherEarnings =
        revenueAmount * adUnit.publisher.revenueShare.toNumber();

      await prisma.publisher.update({
        where: { id: adUnit.publisherId },
        data: {
          totalEarnings: {
            increment: publisherEarnings,
          },
        },
      });
    }
  }

  /**
   * Get publisher earnings summary
   */
  async getPublisherEarningsSummary(publisherId: string): Promise<{
    totalEarnings: number;
    paidEarnings: number;
    unpaidEarnings: number;
    paymentThreshold: number;
    canRequestPayout: boolean;
    nextPaymentDate?: Date;
  }> {
    const publisher = await prisma.publisher.findUnique({
      where: { id: publisherId },
    });

    if (!publisher) {
      throw new Error("Publisher not found");
    }

    const unpaidEarnings =
      publisher.totalEarnings.toNumber() - publisher.paidEarnings.toNumber();

    // Calculate next payment date based on payment frequency
    let nextPaymentDate: Date | undefined;
    if (advertisingConfig.payment.paymentFrequency === "monthly") {
      const now = new Date();
      nextPaymentDate = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1
      );
    } else if (advertisingConfig.payment.paymentFrequency === "weekly") {
      const now = new Date();
      const daysUntilNextMonday = (8 - now.getDay()) % 7 || 7;
      nextPaymentDate = new Date(now);
      nextPaymentDate.setDate(now.getDate() + daysUntilNextMonday);
    }

    return {
      totalEarnings: publisher.totalEarnings.toNumber(),
      paidEarnings: publisher.paidEarnings.toNumber(),
      unpaidEarnings,
      paymentThreshold: publisher.paymentThreshold.toNumber(),
      canRequestPayout:
        unpaidEarnings >= publisher.paymentThreshold.toNumber(),
      nextPaymentDate,
    };
  }
}
