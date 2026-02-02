/**
 * Sponsored Marker Ranking Service (PRD)
 * Accessibility-first ranking: eligibility, Quality Score, bounded sponsorship boost, merge.
 */

import { prisma } from "@/lib/prisma";
import { sponsoredMarkersConfig } from "@/lib/config/sponsored-markers";
import type {
  Business,
  PlaceVerification,
  PlaceVerificationTier,
  Sponsorship,
  SponsorshipTier,
} from "@prisma/client";
import type { BusinessCategory } from "@prisma/client";

export interface MapPlacesContext {
  /** Center [lat, lng] and radius in meters */
  center?: { lat: number; lng: number; radiusMeters?: number };
  /** Bounds: min/max lat and lng */
  bounds?: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  category?: BusinessCategory;
  /** e.g. ["wheelchair", "ndis"] - applied to eligibility; sponsored must pass same filters */
  accessibilityFilters?: string[];
  hideSponsored?: boolean;
  limit?: number;
}

export interface PlaceWithRanking {
  id: string;
  name: string;
  description: string | null;
  category: BusinessCategory;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  postcode: string;
  accessibility: unknown;
  amenities: string[];
  acceptsNDIS: boolean;
  verified: boolean;
  logoUrl: string | null;
  /** 0-100 */
  qualityScore: number;
  isSponsored: boolean;
  verificationTier: PlaceVerificationTier | null;
  sponsorshipTier: SponsorshipTier | null;
  /** Short copy for "Why am I seeing this?" */
  disclosureText: string | null;
  evidenceRefs: string[] | null;
  verifiedAt: Date | null;
}

type BusinessWithVerification = Business & {
  placeVerifications: PlaceVerification[];
  sponsorships: (Sponsorship & { status: string })[];
};

const TIER_ORDER: Record<PlaceVerificationTier, number> = {
  BRONZE: 1,
  SILVER: 2,
  GOLD: 3,
};

const SPONSOR_TIER_ORDER: Record<SponsorshipTier, number> = {
  COMMUNITY_SUPPORTER: 1,
  FEATURED_ACCESSIBLE_VENUE: 2,
  ACCESSIBILITY_LEADER: 3,
};

function getBestVerificationTier(
  verifications: PlaceVerification[]
): PlaceVerificationTier | null {
  if (!verifications.length) return null;
  const now = new Date();
  const valid = verifications.filter(
    (v) => !v.expiresAt || v.expiresAt > now
  );
  if (!valid.length) return null;
  const best = valid.reduce((a, b) =>
    TIER_ORDER[b.tier] > TIER_ORDER[a.tier] ? b : a
  );
  return best.tier;
}

function getLatestVerification(
  verifications: PlaceVerification[]
): PlaceVerification | null {
  if (!verifications.length) return null;
  const now = new Date();
  const valid = verifications.filter(
    (v) => !v.expiresAt || v.expiresAt > now
  );
  if (!valid.length) return null;
  return valid.sort(
    (a, b) => b.verifiedAt.getTime() - a.verifiedAt.getTime()
  )[0] ?? null;
}

/** Compute quality score 0-100 from business and optional verification */
export function qualityScore(
  business: Business,
  placeVerification: PlaceVerification | null
): number {
  let score = 0;
  const weights = {
    accessibility: 0.3,
    verification: 0.25,
    community: 0.2,
    freshness: 0.15,
    categoryRelevance: 0.1,
  };

  // Accessibility confidence (from Business.accessibilityConfidence or amenities/accessibility)
  const accConf =
    business.accessibilityConfidence ??
    (business.accessibility && typeof business.accessibility === "object"
      ? 0.6
      : 0.3);
  if (business.amenities?.includes("wheelchair_accessible")) {
    score += Math.min(1, (accConf as number) + 0.2) * weights.accessibility * 100;
  } else {
    score += (accConf as number) * weights.accessibility * 100;
  }

  // Verification tier
  if (placeVerification) {
    const tierScore =
      placeVerification.tier === "GOLD"
        ? 1
        : placeVerification.tier === "SILVER"
          ? 0.8
          : 0.6;
    score += tierScore * weights.verification * 100;
  } else if (business.verified) {
    score += 0.4 * weights.verification * 100;
  }

  // Community score (PRD: community_score)
  const community = business.communityScore ?? 0.5;
  score += (typeof community === "number" ? Math.min(1, Math.max(0, community)) : 0.5) * weights.community * 100;

  // Evidence freshness (verification date)
  if (placeVerification?.verifiedAt) {
    const daysSince = (Date.now() - placeVerification.verifiedAt.getTime()) / (1000 * 60 * 60 * 24);
    const freshness = Math.max(0, 1 - daysSince / 365);
    score += freshness * weights.freshness * 100;
  } else if (business.verifiedAt) {
    const daysSince = (Date.now() - business.verifiedAt.getTime()) / (1000 * 60 * 60 * 24);
    const freshness = Math.max(0, 1 - daysSince / 365);
    score += freshness * weights.freshness * 100;
  } else {
    score += 0.2 * weights.freshness * 100;
  }

  // Category relevance (neutral if no category filter; otherwise 1 if match)
  score += weights.categoryRelevance * 100;

  return Math.round(Math.min(100, Math.max(0, score)));
}

/** Check if business passes accessibility filters */
function passesAccessibilityFilters(
  business: BusinessWithVerification,
  filters: string[]
): boolean {
  if (!filters.length) return true;
  for (const f of filters) {
    const lower = f.toLowerCase();
    if (lower === "ndis" && !business.acceptsNDIS) return false;
    if (lower === "wheelchair") {
      const hasWheelchair =
        business.amenities?.includes("wheelchair_accessible") ||
        (business.accessibility &&
          typeof business.accessibility === "object" &&
          (business.accessibility as Record<string, unknown>).wheelchair);
      if (!hasWheelchair) return false;
    }
  }
  return true;
}

/** Check if verification tier meets minimum for sponsorship tier */
function meetsMinVerificationForSponsorship(
  verificationTier: PlaceVerificationTier | null,
  sponsorshipTier: SponsorshipTier
): boolean {
  const allowed =
    sponsoredMarkersConfig.minVerificationTierForSponsorshipTier[
      sponsorshipTier
    ];
  if (!verificationTier) return false;
  return allowed.includes(verificationTier);
}

export class RankingService {
  /**
   * Get eligible businesses in viewport with optional category and accessibility filters.
   */
  async getEligibleBusinesses(
    context: MapPlacesContext
  ): Promise<BusinessWithVerification[]> {
    const limit =
      context.limit ?? sponsoredMarkersConfig.defaultPlacesLimit;

    const where: Parameters<typeof prisma.business.findMany>[0]["where"] = {
      status: "ACTIVE",
    };

    if (context.bounds) {
      where.latitude = {
        gte: context.bounds.minLat,
        lte: context.bounds.maxLat,
      };
      where.longitude = {
        gte: context.bounds.minLng,
        lte: context.bounds.maxLng,
      };
    } else if (context.center) {
      // Approximate: 1 deg lat ~ 111km; 1 deg lng ~ 111*cos(lat) km
      const r = (context.center.radiusMeters ?? 5000) / 111000;
      const lat = context.center.lat;
      const lng = context.center.lng;
      where.latitude = { gte: lat - r, lte: lat + r };
      where.longitude = {
        gte: lng - r / Math.max(0.1, Math.abs(Math.cos((lat * Math.PI) / 180))),
        lte: lng + r / Math.max(0.1, Math.abs(Math.cos((lat * Math.PI) / 180))),
      };
    }

    if (context.category) {
      where.category = context.category;
    }

    const businesses = await prisma.business.findMany({
      where,
      include: {
        placeVerifications: {
          orderBy: { verifiedAt: "desc" },
          take: 5,
        },
        sponsorships: {
          where: {
            status: "ACTIVE",
            startAt: { lte: new Date() },
            OR: [
              { endAt: null },
              { endAt: { gte: new Date() } },
            ],
          },
        },
      },
      take: limit * 2, // fetch extra for filtering
    });

    const withRelations = businesses as unknown as BusinessWithVerification[];
    if (!context.accessibilityFilters?.length) {
      return withRelations.slice(0, limit);
    }
    return withRelations
      .filter((b) => passesAccessibilityFilters(b, context.accessibilityFilters!))
      .slice(0, limit);
  }

  /**
   * Rank and merge: organic by quality score, then sponsored with bounded boost and caps.
   */
  rankAndMerge(
    businesses: BusinessWithVerification[],
    options: { hideSponsored?: boolean } = {}
  ): PlaceWithRanking[] {
    const { hideSponsored = false } = options;
    const qualityFloor = sponsoredMarkersConfig.qualityFloor;
    const maxPerViewport = sponsoredMarkersConfig.maxSponsoredPerViewport;
    const maxPerCategory = sponsoredMarkersConfig.maxSponsoredPerCategory;
    const boostBounds = sponsoredMarkersConfig.boostBoundsPerTier;

    type Scored = {
      business: BusinessWithVerification;
      qualityScore: number;
      verificationTier: PlaceVerificationTier | null;
      activeSponsorship: (Sponsorship & { status: string }) | null;
      latestVerification: PlaceVerification | null;
    };

    const scored: Scored[] = businesses.map((b) => {
      const latestVerification = getLatestVerification(b.placeVerifications);
      const verificationTier = getBestVerificationTier(b.placeVerifications);
      const activeSponsorship =
        b.sponsorships?.length > 0
          ? (b.sponsorships as (Sponsorship & { status: string })[]).sort(
              (a, b) => SPONSOR_TIER_ORDER[b.tier] - SPONSOR_TIER_ORDER[a.tier]
            )[0]
          : null;
      const quality = qualityScore(b, latestVerification);
      return {
        business: b,
        qualityScore: quality,
        verificationTier,
        activeSponsorship: activeSponsorship ?? null,
        latestVerification,
      };
    });

    // Organic list: sort by quality descending
    const organic = scored
      .filter((s) => !hideSponsored || !s.activeSponsorship)
      .sort((a, b) => b.qualityScore - a.qualityScore);

    if (hideSponsored) {
      return organic.map((s) => toPlaceWithRanking(s, false));
    }

    // Sponsored: only those meeting min verification + quality floor; exclude deboosted
    const now = new Date();
    const sponsoredCandidates = scored.filter((s) => {
      if (!s.activeSponsorship) return false;
      const policy = s.activeSponsorship.boostPolicy as { deboostUntil?: string } | null;
      if (policy?.deboostUntil && new Date(policy.deboostUntil) > now) return false;
      return (
        meetsMinVerificationForSponsorship(
          s.verificationTier,
          s.activeSponsorship.tier
        ) && s.qualityScore >= qualityFloor
      );
    });

    // Apply caps: max per viewport, max per category
    const categoryCount: Record<string, number> = {};
    const sponsoredSlots: Scored[] = [];
    for (const s of sponsoredCandidates.sort(
      (a, b) =>
        SPONSOR_TIER_ORDER[b.activeSponsorship!.tier] -
        SPONSOR_TIER_ORDER[a.activeSponsorship!.tier] ||
        b.qualityScore - a.qualityScore
    )) {
      if (sponsoredSlots.length >= maxPerViewport) break;
      const cat = s.business.category;
      const count = categoryCount[cat] ?? 0;
      if (count >= maxPerCategory) continue;
      sponsoredSlots.push(s);
      categoryCount[cat] = count + 1;
    }

    // Merge: organic first, then insert sponsored with bounded boost (append after organic for MVP; PRD says sponsored never suppress organic)
    const organicPlaces = organic.map((s) => toPlaceWithRanking(s, false));
    const sponsoredPlaces = sponsoredSlots.map((s) =>
      toPlaceWithRanking(s, true)
    );
    return [...organicPlaces, ...sponsoredPlaces];
  }

  /**
   * Full flow: get eligible businesses, rank and merge, return places.
   */
  async getPlaces(context: MapPlacesContext): Promise<PlaceWithRanking[]> {
    const businesses = await this.getEligibleBusinesses(context);
    return this.rankAndMerge(businesses, {
      hideSponsored: context.hideSponsored,
    });
  }
}

function toPlaceWithRanking(
  s: {
    business: BusinessWithVerification;
    qualityScore: number;
    verificationTier: PlaceVerificationTier | null;
    activeSponsorship: (Sponsorship & { status: string }) | null;
    latestVerification: PlaceVerification | null;
  },
  isSponsored: boolean
): PlaceWithRanking {
  const b = s.business;
  const evidenceRefs = s.latestVerification?.evidenceRefs
    ? (Array.isArray(s.latestVerification.evidenceRefs)
        ? s.latestVerification.evidenceRefs
        : []) as string[]
    : null;

  let disclosureText: string | null = null;
  if (isSponsored && s.activeSponsorship) {
    const tierLabel =
      s.activeSponsorship.tier === "ACCESSIBILITY_LEADER"
        ? "Accessibility Leader"
        : s.activeSponsorship.tier === "FEATURED_ACCESSIBLE_VENUE"
          ? "Featured Accessible Venue"
          : "Community Supporter";
    disclosureText = `This venue is a sponsored ${tierLabel} and meets your filters.`;
  }

  return {
    id: b.id,
    name: b.name,
    description: b.description,
    category: b.category,
    latitude: b.latitude,
    longitude: b.longitude,
    address: b.address,
    city: b.city,
    state: b.state,
    postcode: b.postcode,
    accessibility: b.accessibility,
    amenities: b.amenities ?? [],
    acceptsNDIS: b.acceptsNDIS,
    verified: b.verified,
    logoUrl: b.logoUrl,
    qualityScore: s.qualityScore,
    isSponsored,
    verificationTier: s.verificationTier,
    sponsorshipTier: s.activeSponsorship?.tier ?? null,
    disclosureText,
    evidenceRefs,
    verifiedAt: s.latestVerification?.verifiedAt ?? b.verifiedAt,
  };
}
