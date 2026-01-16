/**
 * Advertising Service Types
 */

import type {
  Advertisement,
  AdRequest,
  AdUnit,
  AdCampaign,
  BusinessCategory,
  AdvertisementType,
} from "@prisma/client";

export interface AdRequestContext {
  adUnitId: string;
  userId?: string;
  userAgent?: string;
  ipAddress?: string;
  location?: {
    lat: number;
    lng: number;
    radius?: number; // meters
  };
  pageContext?: {
    url?: string;
    referrer?: string;
    category?: BusinessCategory;
    keywords?: string[];
  };
  device?: {
    type: "mobile" | "desktop" | "tablet";
    os?: string;
    browser?: string;
  };
}

export interface EligibleAd {
  advertisement: Advertisement & {
    campaign: AdCampaign | null;
    business: {
      id: string;
      name: string;
      category: BusinessCategory;
      latitude: number;
      longitude: number;
    };
  };
  relevanceScore: number;
  targetingMatch: boolean;
}

export interface ScoredAd extends EligibleAd {
  qualityScore: number;
  bidAmount: number;
  effectiveBid: number; // bid * qualityScore
}

export interface AdSelectionResult {
  advertisement: Advertisement | null;
  winningBid: number;
  eligibleCount: number;
  auctionType: "first_price" | "second_price";
  qualityScore?: number;
}

export interface AdServeResponse {
  ad: Advertisement | null;
  creative?: {
    html?: string;
    imageUrl?: string;
    linkUrl?: string;
    trackingPixel?: string;
  };
  tracking: {
    impressionUrl: string;
    clickUrl: string;
  };
  metadata?: {
    auctionType: string;
    winningBid: number;
    eligibleAds: number;
  };
}
