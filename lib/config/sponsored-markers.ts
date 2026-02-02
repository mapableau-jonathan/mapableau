/**
 * Sponsored Marker System Configuration (PRD)
 * Caps, quality floor, and boost bounds per sponsorship tier.
 */

import type { PlaceVerificationTier, SponsorshipTier } from "@prisma/client";

export interface SponsoredMarkersConfig {
  /** Max sponsored results per map viewport */
  maxSponsoredPerViewport: number;
  /** Max sponsored results per category in viewport */
  maxSponsoredPerCategory: number;
  /** Minimum quality score (0-100) for a place to be eligible for sponsored boost */
  qualityFloor: number;
  /** Boost multiplier cap per tier (applied to quality score; sponsored never suppress organic) */
  boostBoundsPerTier: Record<SponsorshipTier, number>;
  /** Minimum verification tier required for each sponsorship tier (MVP: only Sponsored+Verified) */
  minVerificationTierForSponsorshipTier: Record<SponsorshipTier, PlaceVerificationTier[]>;
  /** Default limit for organic + sponsored places returned per request */
  defaultPlacesLimit: number;
}

const defaultConfig: SponsoredMarkersConfig = {
  maxSponsoredPerViewport: parseInt(
    process.env.SPONSORED_MAX_PER_VIEWPORT || "3",
    10
  ),
  maxSponsoredPerCategory: parseInt(
    process.env.SPONSORED_MAX_PER_CATEGORY || "2",
    10
  ),
  qualityFloor: parseFloat(
    process.env.SPONSORED_QUALITY_FLOOR || "30"
  ), // 0-100 scale; places below this are not eligible for sponsored boost
  boostBoundsPerTier: {
    COMMUNITY_SUPPORTER: 0, // No ranking boost
    FEATURED_ACCESSIBLE_VENUE: parseFloat(
      process.env.SPONSORED_BOOST_FEATURED || "0.15"
    ), // Bounded boost
    ACCESSIBILITY_LEADER: parseFloat(
      process.env.SPONSORED_BOOST_LEADER || "0.25"
    ), // Highest bounded boost
  },
  minVerificationTierForSponsorshipTier: {
    COMMUNITY_SUPPORTER: ["BRONZE", "SILVER", "GOLD"], // Any verified
    FEATURED_ACCESSIBLE_VENUE: ["BRONZE", "SILVER", "GOLD"],
    ACCESSIBILITY_LEADER: ["SILVER", "GOLD"],
  },
  defaultPlacesLimit: parseInt(
    process.env.SPONSORED_PLACES_LIMIT || "50",
    10
  ),
};

export const sponsoredMarkersConfig: SponsoredMarkersConfig = defaultConfig;
