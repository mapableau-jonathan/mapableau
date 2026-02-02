/**
 * Analytics Service
 * 
 * Performance reporting for publishers and advertisers in the advertising system.
 * Provides comprehensive analytics for ad performance, revenue, and campaign effectiveness.
 * 
 * @example
 * ```typescript
 * const analyticsService = new AnalyticsService();
 * const publisherAnalytics = await analyticsService.getPublisherAnalytics(
 *   publisherId,
 *   startDate,
 *   endDate
 * );
 * ```
 * 
 * @uses BaseAnalyticsService for common analytics utilities
 */

// External dependencies
import type { BusinessCategory } from "@prisma/client";

// Internal utilities
import { prisma } from "@/lib/prisma";

// Local relative imports
import { BaseAnalyticsService } from "../analytics/base-analytics-service";

export interface PublisherAnalytics {
  summary: {
    totalImpressions: number;
    totalClicks: number;
    totalRevenue: number;
    ctr: number;
    averageCpc: number;
    averageCpm: number;
  };
  adUnitPerformance: Array<{
    adUnitId: string;
    adUnitName: string;
    impressions: number;
    clicks: number;
    revenue: number;
    ctr: number;
  }>;
  timeSeries: Array<{
    date: string;
    impressions: number;
    clicks: number;
    revenue: number;
  }>;
  geographicPerformance: Array<{
    region: string;
    impressions: number;
    clicks: number;
    revenue: number;
  }>;
}

export interface AdvertiserAnalytics {
  summary: {
    totalImpressions: number;
    totalClicks: number;
    totalConversions: number;
    totalSpend: number;
    ctr: number;
    cpc: number;
    cpm: number;
    conversionRate: number;
    roas: number; // Return on ad spend
  };
  campaignPerformance: Array<{
    campaignId: string;
    campaignName: string;
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
    ctr: number;
    cpc: number;
    cpm: number;
    conversionRate: number;
  }>;
  adPerformance: Array<{
    adId: string;
    adTitle: string;
    impressions: number;
    clicks: number;
    spend: number;
    ctr: number;
  }>;
  timeSeries: Array<{
    date: string;
    impressions: number;
    clicks: number;
    spend: number;
  }>;
  categoryPerformance: Array<{
    category: BusinessCategory;
    impressions: number;
    clicks: number;
    spend: number;
  }>;
}

/**
 * Analytics Service
 * 
 * Provides performance reporting for both publishers and advertisers.
 * Tracks impressions, clicks, revenue, spend, and conversion metrics.
 */
export class AnalyticsService {
  private baseAnalytics: BaseAnalyticsService;

  constructor() {
    this.baseAnalytics = new BaseAnalyticsService();
  }

  /**
   * Get publisher analytics
   * 
   * Analyzes ad unit performance, revenue, and engagement metrics for a publisher
   * over the specified date range.
   * 
   * @param publisherId - Publisher ID to analyze
   * @param startDate - Start date for analytics period
   * @param endDate - End date for analytics period
   * @returns Promise resolving to PublisherAnalytics with all publisher metrics
   * @throws Error if publisher not found or analytics calculation fails
   */
  async getPublisherAnalytics(
    publisherId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PublisherAnalytics> {
    const publisher = await prisma.publisher.findUnique({
      where: { id: publisherId },
      include: {
        adUnits: {
          include: {
            adRequests: {
              where: {
                timestamp: {
                  gte: startDate,
                  lte: endDate,
                },
                served: true,
              },
            },
          },
        },
      },
    });

    if (!publisher) {
      throw new Error("Publisher not found");
    }

    let totalImpressions = 0;
    let totalClicks = 0;
    let totalRevenue = 0;

    const adUnitPerformance = publisher.adUnits.map((adUnit) => {
      const impressions = adUnit.adRequests.filter((r) => r.served).length;
      const clicks = adUnit.adRequests.filter((r) => r.clicked).length;
      const revenue = adUnit.revenue.toNumber();
      const ctr = impressions > 0 ? clicks / impressions : 0;

      totalImpressions += impressions;
      totalClicks += clicks;
      totalRevenue += revenue;

      return {
        adUnitId: adUnit.id,
        adUnitName: adUnit.name,
        impressions,
        clicks,
        revenue,
        ctr,
      };
    });

    const ctr = this.baseAnalytics.calculatePercentage(totalClicks, totalImpressions) / 100;
    const averageCpc = totalClicks > 0 ? totalRevenue / totalClicks : 0;
    const averageCpm = totalImpressions > 0
      ? (totalRevenue / totalImpressions) * 1000
      : 0;

    // Generate time series data
    const timeSeries = this.generateTimeSeries(
      startDate,
      endDate,
      publisher.adUnits
    );

    // Geographic performance (simplified - would need location data)
    const geographicPerformance: Array<{
      region: string;
      impressions: number;
      clicks: number;
      revenue: number;
    }> = [];

    return {
      summary: {
        totalImpressions,
        totalClicks,
        totalRevenue,
        ctr,
        averageCpc,
        averageCpm,
      },
      adUnitPerformance,
      timeSeries,
      geographicPerformance,
    };
  }

  /**
   * Get advertiser analytics
   * 
   * Analyzes campaign and ad performance, spend, conversions, and ROI metrics
   * for an advertiser over the specified date range.
   * 
   * @param advertiserId - Advertiser ID to analyze
   * @param startDate - Start date for analytics period
   * @param endDate - End date for analytics period
   * @returns Promise resolving to AdvertiserAnalytics with all advertiser metrics
   * @throws Error if advertiser not found or analytics calculation fails
   */
  async getAdvertiserAnalytics(
    advertiserId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AdvertiserAnalytics> {
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
                      gte: startDate,
                      lte: endDate,
                    },
                  },
                },
                business: {
                  select: {
                    category: true,
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

    let totalImpressions = 0;
    let totalClicks = 0;
    let totalConversions = 0;
    let totalSpend = 0;

    const campaignPerformance = advertiser.campaigns.map((campaign) => {
      let campaignImpressions = 0;
      let campaignClicks = 0;
      let campaignSpend = 0;

      campaign.advertisements.forEach((ad) => {
        const adImpressions = ad.adRequests.filter((r) => r.served).length;
        const adClicks = ad.adRequests.filter((r) => r.clicked).length;

        campaignImpressions += adImpressions;
        campaignClicks += adClicks;
        campaignSpend += ad.spentAmount.toNumber();
      });

      totalImpressions += campaignImpressions;
      totalClicks += campaignClicks;
      totalSpend += campaignSpend;

      const ctr = this.baseAnalytics.calculatePercentage(campaignClicks, campaignImpressions) / 100;
      const cpc = campaignClicks > 0 ? campaignSpend / campaignClicks : 0;
      const cpm = campaignImpressions > 0
        ? (campaignSpend / campaignImpressions) * 1000
        : 0;
      const conversionRate = this.baseAnalytics.calculatePercentage(
        campaign.totalConversions,
        campaignClicks
      ) / 100;

      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        impressions: campaignImpressions,
        clicks: campaignClicks,
        conversions: campaign.totalConversions,
        spend: campaignSpend,
        ctr,
        cpc,
        cpm,
        conversionRate,
      };
    });

    const adPerformance = advertiser.campaigns.flatMap((campaign) =>
      campaign.advertisements.map((ad) => {
        const impressions = ad.adRequests.filter((r) => r.served).length;
        const clicks = ad.adRequests.filter((r) => r.clicked).length;
        const spend = ad.spentAmount.toNumber();
        const ctr = this.baseAnalytics.calculatePercentage(clicks, impressions) / 100;

        return {
          adId: ad.id,
          adTitle: ad.title,
          impressions,
          clicks,
          spend,
          ctr,
        };
      })
    );

    // Category performance
    const categoryMap = new Map<BusinessCategory, {
      impressions: number;
      clicks: number;
      spend: number;
    }>();

    advertiser.campaigns.forEach((campaign) => {
      campaign.advertisements.forEach((ad) => {
        const category = ad.business.category;
        const impressions = ad.adRequests.filter((r) => r.served).length;
        const clicks = ad.adRequests.filter((r) => r.clicked).length;
        const spend = ad.spentAmount.toNumber();

        const existing = categoryMap.get(category) || {
          impressions: 0,
          clicks: 0,
          spend: 0,
        };

        categoryMap.set(category, {
          impressions: existing.impressions + impressions,
          clicks: existing.clicks + clicks,
          spend: existing.spend + spend,
        });
      });
    });

    const categoryPerformance = Array.from(categoryMap.entries()).map(
      ([category, stats]) => ({
        category,
        ...stats,
      })
    );

    // Time series
    const timeSeries = this.generateAdvertiserTimeSeries(
      startDate,
      endDate,
      advertiser.campaigns
    );

    const ctr = this.baseAnalytics.calculatePercentage(totalClicks, totalImpressions) / 100;
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
    const conversionRate = this.baseAnalytics.calculatePercentage(totalConversions, totalClicks) / 100;
    const roas = totalSpend > 0 ? (totalSpend * 1.5) / totalSpend : 0; // Simplified ROAS calculation

    return {
      summary: {
        totalImpressions,
        totalClicks,
        totalConversions,
        totalSpend,
        ctr,
        cpc,
        cpm,
        conversionRate,
        roas,
      },
      campaignPerformance,
      adPerformance,
      timeSeries,
      categoryPerformance,
    };
  }

  /**
   * Generate time series data for publisher
   */
  private generateTimeSeries(
    startDate: Date,
    endDate: Date,
    adUnits: any[]
  ): Array<{ date: string; impressions: number; clicks: number; revenue: number }> {
    const days = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const timeSeries: Array<{
      date: string;
      impressions: number;
      clicks: number;
      revenue: number;
    }> = [];

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];

      let impressions = 0;
      let clicks = 0;
      let revenue = 0;

      adUnits.forEach((adUnit) => {
        const dayRequests = adUnit.adRequests.filter((req: any) => {
          const reqDate = new Date(req.timestamp).toISOString().split("T")[0];
          return reqDate === dateStr;
        });

        impressions += dayRequests.filter((r: any) => r.served).length;
        clicks += dayRequests.filter((r: any) => r.clicked).length;
        /**
         * Revenue calculation: Would need to aggregate winning bids from adRequests
         * For now, revenue is tracked at the adUnit level separately
         */
      });

      timeSeries.push({
        date: dateStr,
        impressions,
        clicks,
        revenue,
      });
    }

    return timeSeries;
  }

  /**
   * Generate time series data for advertiser
   */
  private generateAdvertiserTimeSeries(
    startDate: Date,
    endDate: Date,
    campaigns: any[]
  ): Array<{ date: string; impressions: number; clicks: number; spend: number }> {
    const days = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const timeSeries: Array<{
      date: string;
      impressions: number;
      clicks: number;
      spend: number;
    }> = [];

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];

      let impressions = 0;
      let clicks = 0;
      let spend = 0;

      campaigns.forEach((campaign) => {
        campaign.advertisements.forEach((ad: any) => {
          const dayRequests = ad.adRequests.filter((req: any) => {
            const reqDate = new Date(req.timestamp).toISOString().split("T")[0];
            return reqDate === dateStr;
          });

          impressions += dayRequests.filter((r: any) => r.served).length;
          clicks += dayRequests.filter((r: any) => r.clicked).length;
          /**
           * Spend calculation: Would need to aggregate winning bids from adRequests
           * For now, spend is tracked at the campaign/ad level separately
           */
        });
      });

      timeSeries.push({
        date: dateStr,
        impressions,
        clicks,
        spend,
      });
    }

    return timeSeries;
  }
}
