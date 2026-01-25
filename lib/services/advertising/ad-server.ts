/**
 * Ad Server Service
 * Core ad serving logic with real-time selection and auction
 */

import { prisma } from "@/lib/prisma";
import { TargetingService } from "./targeting-service";
import { AuctionService } from "./auction-service";
import { advertisingConfig } from "@/lib/config/advertising";
import type {
  AdRequestContext,
  EligibleAd,
  ScoredAd,
  AdSelectionResult,
  AdServeResponse,
} from "./types";
import type { Advertisement, AdUnit, AuctionType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export class AdServer {
  private targetingService: TargetingService;
  private auctionService: AuctionService;

  constructor() {
    this.targetingService = new TargetingService();
    this.auctionService = new AuctionService();
  }

  /**
   * Select and serve an ad for a request
   */
  async selectAd(context: AdRequestContext): Promise<AdSelectionResult> {
    // 1. Get ad unit
    const adUnit = await prisma.adUnit.findUnique({
      where: { id: context.adUnitId },
    });

    if (!adUnit || adUnit.status !== "ACTIVE") {
      return {
        advertisement: null,
        winningBid: 0,
        eligibleCount: 0,
        auctionType: "first_price",
      };
    }

    // 2. Get eligible ads based on targeting
    const eligibleAds = await this.targetingService.getEligibleAds(
      context,
      adUnit
    );

    if (eligibleAds.length === 0) {
      return {
        advertisement: null,
        winningBid: 0,
        eligibleCount: 0,
        auctionType: "first_price",
      };
    }

    // 3. Apply frequency capping
    const cappedAds = await this.applyFrequencyCapping(
      eligibleAds,
      context
    );

    if (cappedAds.length === 0) {
      return {
        advertisement: null,
        winningBid: 0,
        eligibleCount: eligibleAds.length,
        auctionType: "first_price",
      };
    }

    // 4. Calculate quality scores
    const scoredAds = await this.calculateQualityScores(cappedAds, context);

    // 5. Run auction
    const auctionType = advertisingConfig.auction.type === "first_price"
      ? "FIRST_PRICE"
      : "SECOND_PRICE";
    const result = await this.auctionService.runAuction(scoredAds, auctionType);

    // 6. Record ad request and get request ID
    let requestId = "";
    if (result.advertisement) {
      requestId = await this.recordAdRequest(context, result);
      // Store request ID in result for API response
      (result as any).requestId = requestId;
    }

    return result;
  }

  /**
   * Apply frequency capping
   */
  private async applyFrequencyCapping(
    eligibleAds: EligibleAd[],
    context: AdRequestContext
  ): Promise<EligibleAd[]> {
    if (!advertisingConfig.frequencyCapping.enabled || !context.userId) {
      return eligibleAds;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cappedAds: EligibleAd[] = [];

    for (const eligibleAd of eligibleAds) {
      const ad = eligibleAd.advertisement;
      const campaign = ad.campaign;

      // Check campaign-level frequency cap
      let maxImpressions = advertisingConfig.frequencyCapping.defaultMaxImpressions;
      if (campaign?.frequencyCapping) {
        maxImpressions = campaign.frequencyCapping;
      }

      // Count today's impressions for this user
      const todayImpressions = await prisma.adRequest.count({
        where: {
          userId: context.userId,
          winningAdId: ad.id,
          timestamp: {
            gte: today,
          },
          served: true,
        },
      });

      if (todayImpressions < maxImpressions) {
        cappedAds.push(eligibleAd);
      }
    }

    return cappedAds;
  }

  /**
   * Calculate quality scores for ads
   */
  private async calculateQualityScores(
    eligibleAds: EligibleAd[],
    context: AdRequestContext
  ): Promise<ScoredAd[]> {
    const scoredAds: ScoredAd[] = [];

    for (const eligibleAd of eligibleAds) {
      const ad = eligibleAd.advertisement;
      const campaign = ad.campaign;

      // Calculate CTR (click-through rate)
      const ctr = ad.currentImpressions > 0
        ? ad.currentClicks / ad.currentImpressions
        : 0.01; // Default CTR for new ads

      // Calculate relevance score (from targeting)
      const relevanceScore = eligibleAd.relevanceScore;

      // Landing page quality (simplified - could be enhanced)
      const landingPageScore = ad.linkUrl ? 0.8 : 0.5;

      // Calculate quality score
      const qualityScore =
        ctr * advertisingConfig.qualityScore.ctrWeight +
        relevanceScore * advertisingConfig.qualityScore.relevanceWeight +
        landingPageScore * advertisingConfig.qualityScore.landingPageWeight;

      // Get bid amount
      let bidAmount = 0.01; // Default minimum bid
      if (campaign?.maxBid) {
        bidAmount = campaign.maxBid.toNumber();
      } else if (ad.costPerClick) {
        bidAmount = ad.costPerClick.toNumber();
      } else if (ad.costPerImpression) {
        bidAmount = ad.costPerImpression.toNumber() * 1000; // Convert CPM to per impression
      }

      // Calculate effective bid
      const effectiveBid = this.auctionService.calculateEffectiveBid(
        bidAmount,
        qualityScore
      );

      scoredAds.push({
        ...eligibleAd,
        qualityScore,
        bidAmount,
        effectiveBid,
      });
    }

    return scoredAds;
  }

  /**
   * Record ad request and update statistics
   */
  private async recordAdRequest(
    context: AdRequestContext,
    result: AdSelectionResult
  ): Promise<string> {
    if (!result.advertisement) {
      return "";
    }

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create ad request record
    await prisma.adRequest.create({
      data: {
        adUnitId: context.adUnitId,
        requestId,
        userId: context.userId,
        userAgent: context.userAgent,
        ipAddress: context.ipAddress,
        location: context.location
          ? {
              lat: context.location.lat,
              lng: context.location.lng,
              radius: context.location.radius,
            }
          : null,
        pageContext: context.pageContext || null,
        keywords: context.pageContext?.keywords || [],
        winningAdId: result.advertisement.id,
        winningBid: new Decimal(result.winningBid),
        auctionType: result.auctionType === "first_price" ? "FIRST_PRICE" : "SECOND_PRICE",
        eligibleAds: [], // Will be populated if needed
        served: false, // Will be set to true when ad is actually served
      },
    });

    return requestId;
  }

  /**
   * Mark ad as served
   */
  async markAdServed(requestId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const adRequest = await tx.adRequest.findUnique({
        where: { requestId },
        include: { winningAd: { include: { campaign: true } } },
      });

      if (!adRequest || !adRequest.winningAd) {
        return;
      }

      // Update ad request
      await tx.adRequest.update({
        where: { id: adRequest.id },
        data: { served: true },
      });

      // Update advertisement stats
      await tx.advertisement.update({
        where: { id: adRequest.winningAd.id },
        data: {
          currentImpressions: { increment: 1 },
          spentAmount: {
            increment: adRequest.winningBid || 0,
          },
        },
      });

      // Update ad unit stats
      await tx.adUnit.update({
        where: { id: adRequest.adUnitId },
        data: {
          impressions: { increment: 1 },
          revenue: {
            increment: (adRequest.winningBid || new Decimal(0)).mul(
              advertisingConfig.revenueShare.platform
            ),
          },
        },
      });

      // Update campaign stats if exists
      if (adRequest.winningAd.campaignId) {
        await tx.adCampaign.update({
          where: { id: adRequest.winningAd.campaignId },
          data: {
            totalImpressions: { increment: 1 },
            spentAmount: {
              increment: adRequest.winningBid || 0,
            },
          },
        });
      }
    });
  }

  /**
   * Mark ad as clicked
   */
  async markAdClicked(requestId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const adRequest = await tx.adRequest.findUnique({
        where: { requestId },
        include: { winningAd: { include: { campaign: true } } },
      });

      if (!adRequest || !adRequest.winningAd) {
        return;
      }

      // Update ad request
      await tx.adRequest.update({
        where: { id: adRequest.id },
        data: { clicked: true },
      });

      // Update advertisement stats
      await tx.advertisement.update({
        where: { id: adRequest.winningAd.id },
        data: {
          currentClicks: { increment: 1 },
        },
      });

      // Update ad unit stats
      await tx.adUnit.update({
        where: { id: adRequest.adUnitId },
        data: {
          clicks: { increment: 1 },
        },
      });

      // Update campaign stats if exists
      if (adRequest.winningAd.campaignId) {
        await tx.adCampaign.update({
          where: { id: adRequest.winningAd.campaignId },
          data: {
            totalClicks: { increment: 1 },
          },
        });
      }
    });
  }

  /**
   * Generate ad serve response with creative and tracking
   */
  async generateAdResponse(
    result: AdSelectionResult,
    requestId: string
  ): Promise<AdServeResponse> {
    if (!result.advertisement) {
      return {
        ad: null,
        tracking: {
          impressionUrl: `/api/ads/track/impression?requestId=${requestId}`,
          clickUrl: `/api/ads/track/click?requestId=${requestId}`,
        },
      };
    }

    const ad = result.advertisement;

    // Get business data for the ad
    const business = await prisma.business.findUnique({
      where: { id: ad.businessId },
      select: {
        id: true,
        name: true,
        category: true,
        latitude: true,
        longitude: true,
        logoUrl: true,
        verified: true,
      },
    });

    // Format ad response with business data
    const adResponse = {
      id: ad.id,
      type: ad.type,
      title: ad.title,
      description: ad.description || undefined,
      imageUrl: ad.imageUrl || undefined,
      linkUrl: ad.linkUrl || undefined,
      callToAction: ad.callToAction || undefined,
      business: business || {
        id: ad.businessId,
        name: ad.title,
        category: (ad.targetCategory || "OTHER") as any,
        latitude: 0,
        longitude: 0,
      },
    };

    return {
      ad: adResponse as any,
      creative: {
        imageUrl: ad.imageUrl || undefined,
        linkUrl: ad.linkUrl || undefined,
        html: this.generateAdHTML(ad),
      },
      tracking: {
        impressionUrl: `/api/ads/track/impression?requestId=${requestId}`,
        clickUrl: `/api/ads/track/click?requestId=${requestId}`,
      },
      metadata: {
        auctionType: result.auctionType,
        winningBid: result.winningBid,
        eligibleAds: result.eligibleCount,
      },
    };
  }

  /**
   * Generate HTML for ad creative
   */
  private generateAdHTML(ad: Advertisement): string {
    if (ad.imageUrl && ad.linkUrl) {
      return `
        <a href="${ad.linkUrl}" target="_blank" rel="noopener noreferrer" class="ad-link">
          <img src="${ad.imageUrl}" alt="${ad.title}" class="ad-image" />
          ${ad.callToAction ? `<span class="ad-cta">${ad.callToAction}</span>` : ""}
        </a>
      `;
    }

    return `
      <div class="ad-creative">
        <h3>${ad.title}</h3>
        ${ad.description ? `<p>${ad.description}</p>` : ""}
        ${ad.linkUrl ? `<a href="${ad.linkUrl}" class="ad-link">${ad.callToAction || "Learn More"}</a>` : ""}
      </div>
    `;
  }
}
