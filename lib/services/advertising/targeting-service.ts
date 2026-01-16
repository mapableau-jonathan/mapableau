/**
 * Targeting Service
 * Handles contextual, geographic, and audience targeting for ads
 */

import { prisma } from "@/lib/prisma";
import type { AdRequestContext, EligibleAd } from "./types";
import type { Advertisement, AdCampaign, BusinessCategory } from "@prisma/client";

export class TargetingService {
  /**
   * Get eligible ads based on targeting criteria
   */
  async getEligibleAds(
    context: AdRequestContext,
    adUnit: { format: string; targetingRules?: any }
  ): Promise<EligibleAd[]> {
    const now = new Date();
    const eligibleAds: EligibleAd[] = [];

    // Get active ads that match the ad unit format
    const ads = await prisma.advertisement.findMany({
      where: {
        status: "ACTIVE",
        type: adUnit.format as any,
        OR: [
          { startDate: null },
          { startDate: { lte: now } },
        ],
        AND: [
          {
            OR: [
              { endDate: null },
              { endDate: { gte: now } },
            ],
          },
        ],
        OR: [
          { maxImpressions: null },
          { currentImpressions: { lt: prisma.raw("max_impressions") } },
        ],
        OR: [
          { maxClicks: null },
          { currentClicks: { lt: prisma.raw("max_clicks") } },
        ],
      },
      include: {
        campaign: true,
        business: {
          select: {
            id: true,
            name: true,
            category: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    });

    for (const ad of ads) {
      const targetingMatch = await this.checkTargeting(ad, context);
      if (targetingMatch.matches) {
        eligibleAds.push({
          advertisement: ad,
          relevanceScore: targetingMatch.relevanceScore,
          targetingMatch: true,
        });
      }
    }

    return eligibleAds;
  }

  /**
   * Check if ad matches targeting criteria
   */
  private async checkTargeting(
    ad: Advertisement & { campaign: AdCampaign | null; business: any },
    context: AdRequestContext
  ): Promise<{ matches: boolean; relevanceScore: number }> {
    let relevanceScore = 0;
    let matches = true;

    const campaign = ad.campaign;

    // Geographic targeting
    if (context.location && (ad.targetLocation || campaign?.geoTargeting)) {
      const geoMatch = this.checkGeoTargeting(
        ad,
        campaign,
        context.location
      );
      if (!geoMatch.matches) {
        return { matches: false, relevanceScore: 0 };
      }
      relevanceScore += geoMatch.score * 0.3;
    }

    // Category targeting
    if (ad.targetCategory || campaign?.targetCategories) {
      const categoryMatch = this.checkCategoryTargeting(
        ad,
        campaign,
        context.pageContext?.category
      );
      if (!categoryMatch.matches && campaign?.targetCategories.length > 0) {
        return { matches: false, relevanceScore: 0 };
      }
      relevanceScore += categoryMatch.score * 0.2;
    }

    // Keyword/contextual targeting
    if (
      (ad.targetKeywords && ad.targetKeywords.length > 0) ||
      (campaign?.contextualTargeting && Object.keys(campaign.contextualTargeting).length > 0)
    ) {
      const keywordMatch = this.checkKeywordTargeting(
        ad,
        campaign,
        context.pageContext?.keywords || []
      );
      relevanceScore += keywordMatch.score * 0.3;
    }

    // Device targeting
    if (campaign?.deviceTargeting && campaign.deviceTargeting.length > 0) {
      const deviceMatch = this.checkDeviceTargeting(
        campaign,
        context.device
      );
      if (!deviceMatch) {
        return { matches: false, relevanceScore: 0 };
      }
    }

    // Day parting (time-based targeting)
    if (campaign?.dayParting) {
      const dayPartMatch = this.checkDayParting(campaign);
      if (!dayPartMatch) {
        return { matches: false, relevanceScore: 0 };
      }
    }

    // Budget checks
    if (campaign) {
      if (campaign.dailyBudget) {
        const todaySpent = await this.getTodaySpent(campaign.id);
        if (todaySpent >= campaign.dailyBudget.toNumber()) {
          return { matches: false, relevanceScore: 0 };
        }
      }

      if (campaign.totalBudget) {
        if (campaign.spentAmount.toNumber() >= campaign.totalBudget.toNumber()) {
          return { matches: false, relevanceScore: 0 };
        }
      }
    }

    return { matches, relevanceScore: Math.min(1, relevanceScore) };
  }

  private checkGeoTargeting(
    ad: any,
    campaign: any,
    location: { lat: number; lng: number; radius?: number }
  ): { matches: boolean; score: number } {
    // Check ad-level targeting
    if (ad.targetLocation) {
      const targetLoc = ad.targetLocation as any;
      if (targetLoc.point) {
        const distance = this.calculateDistance(
          location.lat,
          location.lng,
          targetLoc.point.lat,
          targetLoc.point.lng
        );
        const radius = targetLoc.radius || location.radius || 5000;
        if (distance > radius) {
          return { matches: false, score: 0 };
        }
        return { matches: true, score: 1 - distance / radius };
      }
    }

    // Check campaign-level targeting
    if (campaign?.geoTargeting) {
      const geo = campaign.geoTargeting as any;
      if (geo.points) {
        for (const point of geo.points) {
          const distance = this.calculateDistance(
            location.lat,
            location.lng,
            point.lat,
            point.lng
          );
          if (distance <= (point.radius || 5000)) {
            return { matches: true, score: 1 - distance / (point.radius || 5000) };
          }
        }
      }
    }

    // Check business location as fallback
    if (ad.business?.latitude && ad.business?.longitude) {
      const distance = this.calculateDistance(
        location.lat,
        location.lng,
        ad.business.latitude,
        ad.business.longitude
      );
      const radius = location.radius || 10000; // 10km default
      if (distance <= radius) {
        return { matches: true, score: 1 - distance / radius };
      }
    }

    return { matches: true, score: 0.5 }; // Default match with lower score
  }

  private checkCategoryTargeting(
    ad: any,
    campaign: any,
    pageCategory?: BusinessCategory
  ): { matches: boolean; score: number } {
    if (!pageCategory) {
      return { matches: true, score: 0.5 };
    }

    if (ad.targetCategory && ad.targetCategory === pageCategory) {
      return { matches: true, score: 1.0 };
    }

    if (campaign?.targetCategories && campaign.targetCategories.length > 0) {
      if (campaign.targetCategories.includes(pageCategory)) {
        return { matches: true, score: 1.0 };
      }
      return { matches: false, score: 0 };
    }

    return { matches: true, score: 0.3 };
  }

  private checkKeywordTargeting(
    ad: any,
    campaign: any,
    pageKeywords: string[]
  ): { matches: boolean; score: number } {
    if (pageKeywords.length === 0) {
      return { matches: true, score: 0.3 };
    }

    let matchCount = 0;
    const adKeywords = ad.targetKeywords || [];
    const campaignKeywords =
      (campaign?.contextualTargeting as any)?.keywords || [];

    const allTargetKeywords = [...adKeywords, ...campaignKeywords];

    for (const keyword of pageKeywords) {
      const lowerKeyword = keyword.toLowerCase();
      for (const targetKeyword of allTargetKeywords) {
        if (targetKeyword.toLowerCase().includes(lowerKeyword) ||
            lowerKeyword.includes(targetKeyword.toLowerCase())) {
          matchCount++;
          break;
        }
      }
    }

    if (allTargetKeywords.length === 0) {
      return { matches: true, score: 0.3 };
    }

    const score = matchCount / Math.max(pageKeywords.length, allTargetKeywords.length);
    return { matches: score > 0, score };
  }

  private checkDeviceTargeting(
    campaign: any,
    device?: { type: string }
  ): boolean {
    if (!device || !campaign.deviceTargeting || campaign.deviceTargeting.length === 0) {
      return true;
    }

    return campaign.deviceTargeting.includes(device.type);
  }

  private checkDayParting(campaign: any): boolean {
    if (!campaign.dayParting) {
      return true;
    }

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const hour = now.getHours();

    const schedule = campaign.dayParting as any;
    if (schedule.days && !schedule.days.includes(dayOfWeek)) {
      return false;
    }

    if (schedule.hours) {
      const [startHour, endHour] = schedule.hours;
      if (hour < startHour || hour >= endHour) {
        return false;
      }
    }

    return true;
  }

  private async getTodaySpent(campaignId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const requests = await prisma.adRequest.findMany({
      where: {
        winningAd: {
          campaignId: campaignId,
        },
        timestamp: {
          gte: today,
        },
        served: true,
      },
      include: {
        winningAd: true,
      },
    });

    return requests.reduce((sum, req) => {
      return sum + (req.winningBid?.toNumber() || 0);
    }, 0);
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}
