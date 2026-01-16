/**
 * Advertising Configuration
 * Ad network settings, revenue sharing, and auction parameters
 */

export interface AdvertisingConfig {
  revenueShare: {
    publisher: number; // Default 0.70 (70%)
    platform: number; // Default 0.30 (30%)
  };
  payment: {
    minimumPayout: number; // Default $100 AUD
    paymentFrequency: "weekly" | "monthly" | "quarterly";
  };
  auction: {
    type: "first_price" | "second_price";
    minBid: number; // Minimum bid amount
    reservePrice: number; // Reserve price for auctions
  };
  qualityScore: {
    ctrWeight: number; // Click-through rate weight
    relevanceWeight: number; // Relevance weight
    landingPageWeight: number; // Landing page quality weight
  };
  frequencyCapping: {
    enabled: boolean;
    defaultMaxImpressions: number; // Per user per day
  };
}

export const advertisingConfig: AdvertisingConfig = {
  revenueShare: {
    publisher: parseFloat(process.env.AD_REVENUE_SHARE_PUBLISHER || "0.70"),
    platform: parseFloat(process.env.AD_REVENUE_SHARE_PLATFORM || "0.30"),
  },
  payment: {
    minimumPayout: parseFloat(process.env.AD_MINIMUM_PAYOUT || "100"),
    paymentFrequency: (process.env.AD_PAYMENT_FREQUENCY || "monthly") as "weekly" | "monthly" | "quarterly",
  },
  auction: {
    type: (process.env.AD_AUCTION_TYPE || "first_price") as "first_price" | "second_price",
    minBid: parseFloat(process.env.AD_MIN_BID || "0.01"),
    reservePrice: parseFloat(process.env.AD_RESERVE_PRICE || "0.01"),
  },
  qualityScore: {
    ctrWeight: parseFloat(process.env.AD_QUALITY_CTR_WEIGHT || "0.4"),
    relevanceWeight: parseFloat(process.env.AD_QUALITY_RELEVANCE_WEIGHT || "0.4"),
    landingPageWeight: parseFloat(process.env.AD_QUALITY_LANDING_WEIGHT || "0.2"),
  },
  frequencyCapping: {
    enabled: process.env.AD_FREQUENCY_CAPPING !== "false",
    defaultMaxImpressions: parseInt(process.env.AD_FREQUENCY_CAP || "10", 10),
  },
};
