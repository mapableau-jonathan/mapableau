/**
 * GET /api/places/[id]
 * Venue detail with verification, sponsorship disclosure, evidence links.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { PlaceVerificationMethod, PlaceVerificationTier, SponsorshipTier } from "@prisma/client";
import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing place id" }, { status: 400 });
    }

    const business = await prisma.business.findUnique({
      where: { id },
      include: {
        placeVerifications: {
          orderBy: { verifiedAt: "desc" },
          take: 5,
          where: {
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        },
        sponsorships: {
          where: {
            status: "ACTIVE",
            startAt: { lte: new Date() },
            OR: [{ endAt: null }, { endAt: { gte: new Date() } }],
          },
          orderBy: { startAt: "desc" },
          take: 1,
        },
      },
    });

    if (!business) {
      return NextResponse.json({ error: "Place not found" }, { status: 404 });
    }

    const latestVerification = business.placeVerifications[0] ?? null;
    const activeSponsorship = business.sponsorships[0] ?? null;

    const verificationTier = latestVerification?.tier ?? null;
    const verificationMethod = latestVerification?.method ?? null;
    const verifiedAt = latestVerification?.verifiedAt ?? business.verifiedAt;
    const evidenceRefs = latestVerification?.evidenceRefs
      ? (Array.isArray(latestVerification.evidenceRefs)
          ? latestVerification.evidenceRefs
          : []) as string[]
      : null;

    let disclosureText: string | null = null;
    if (activeSponsorship) {
      const tierLabel: Record<SponsorshipTier, string> = {
        ACCESSIBILITY_LEADER: "Accessibility Leader",
        FEATURED_ACCESSIBLE_VENUE: "Featured Accessible Venue",
        COMMUNITY_SUPPORTER: "Community Supporter",
      };
      disclosureText = `This venue is a sponsored ${tierLabel[activeSponsorship.tier]}. Sponsored placement is gated by accessibility verification and never overrides your filters.`;
    }

    return NextResponse.json({
      id: business.id,
      name: business.name,
      description: business.description,
      category: business.category,
      latitude: business.latitude,
      longitude: business.longitude,
      address: business.address,
      city: business.city,
      state: business.state,
      postcode: business.postcode,
      country: business.country,
      phone: business.phone,
      email: business.email,
      website: business.website,
      logoUrl: business.logoUrl,
      imageUrls: business.imageUrls,
      openingHours: business.openingHours,
      amenities: business.amenities,
      accessibility: business.accessibility,
      priceRange: business.priceRange,
      acceptsNDIS: business.acceptsNDIS,
      ndisProviderNumber: business.ndisProviderNumber,
      tags: business.tags,
      keywords: business.keywords,
      verified: business.verified,
      verifiedAt: verifiedAt?.toISOString() ?? null,
      communityScore: business.communityScore,
      accessibilityConfidence: business.accessibilityConfidence,
      // Verification disclosure
      verificationTier,
      verificationMethod: verificationMethod as PlaceVerificationMethod | null,
      evidenceRefs,
      // Sponsorship disclosure
      isSponsored: !!activeSponsorship,
      sponsorshipTier: activeSponsorship?.tier ?? null,
      sponsorshipStartAt: activeSponsorship?.startAt?.toISOString() ?? null,
      sponsorshipEndAt: activeSponsorship?.endAt?.toISOString() ?? null,
      disclosureText,
    });
  } catch (error: unknown) {
    logger.error("Error fetching place detail", { error, id: (await params).id });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch place" },
      { status: 500 }
    );
  }
}
